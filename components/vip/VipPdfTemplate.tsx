"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** html2canvas 호환: lab/oklch 대신 Hex·rgba만 사용 */
const COL = {
  pageBg: "#060a12",
  wrapBg: "#0f172a",
  wrapText: "#ffffff",
  textMain: "#e2e8f0",
  textSoft: "#cbd5e1",
  amberHi: "#fef3c7",
  amberMd: "#fde68a",
  amberBr: "#fcd34d",
  amberAccent: "#fbbf24",
  amberStrong: "#f59e0b",
  amberBorder25: "rgba(245, 158, 11, 0.25)",
  amberBorder40: "rgba(245, 158, 11, 0.4)",
  amberBorder20: "rgba(245, 158, 11, 0.2)",
  black25: "rgba(0, 0, 0, 0.25)",
  black20: "rgba(0, 0, 0, 0.2)",
  black35: "rgba(0, 0, 0, 0.35)",
  watermark: "rgba(251, 191, 36, 0.35)",
  coverLine: "rgba(245, 158, 11, 0.6)",
  slateFoot: "rgba(148, 163, 184, 0.85)",
  imgShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
} as const;

const avoidSplit: CSSProperties = {
  breakInside: "avoid",
  pageBreakInside: "avoid",
};

const avoidBreakAfterHeading: CSSProperties = {
  breakInside: "avoid",
  pageBreakInside: "avoid",
  breakAfter: "avoid",
  pageBreakAfter: "avoid",
};

/** prose-xl에 가깝게 — Typography 플러그인 없이 html2canvas 안전 색상만 사용 */
const MARKDOWN_ROOT_CLASS =
  "vip-pdf-markdown-root vip-pdf-prose-xl flex max-w-none flex-col gap-6 font-serif leading-relaxed";

/** 인쇄·페이지 분할 힌트: 본문 마크다운 전용 래퍼 (react-markdown 직계 부모) */
const MARKDOWN_PRINT_WRAP_CLASS =
  "vip-pdf-markdown-print-wrap min-w-0 w-full [&_h1]:break-before-page print:[&_h1]:break-before-page";

const MARKDOWN_PRINT_WRAP_STYLE: CSSProperties = {
  width: "100%",
  breakInside: "auto",
};

/** prose 등 외부 스타일보다 우선 — 마크다운 본문 h1마다 인쇄용 페이지 분할 */
const VIP_MARKDOWN_H1_PRINT_CSS = `
.vip-pdf-markdown-root h1 {
  page-break-before: always !important;
  break-before: page !important;
}
`;

const chapterH1BreakBefore: CSSProperties = {
  breakBefore: "page",
  pageBreakBefore: "always",
};

/** 96dpi 기준 A4 너비에 근접 */
export const VIP_PDF_PAGE_WIDTH_PX = 794;
/** 210:297 비율 유지 */
export const VIP_PDF_PAGE_HEIGHT_PX = Math.round((VIP_PDF_PAGE_WIDTH_PX * 297) / 210);

const INNER_HORIZONTAL_PADDING_PX = 80;
const INNER_BOTTOM_RESERVED_PX = 56;
/** 큰 글꼴에 맞춰 블록 간 패킹 간격 확대 */
const SECTION_GAP_PX = 22;

export const VIP_PDF_INNER_CONTENT_WIDTH_PX = VIP_PDF_PAGE_WIDTH_PX - INNER_HORIZONTAL_PADDING_PX;

const MAX_INNER_HEIGHT_PX = VIP_PDF_PAGE_HEIGHT_PX - 40 - INNER_BOTTOM_RESERVED_PX;

export type VipPdfUserInfo = {
  name: string;
  sajuSummary: string;
  issuedAt?: string;
};

export type VipPdfTemplateProps = {
  markdownData: string;
  userInfo: VipPdfUserInfo;
};

function splitMarkdownSections(md: string): string[] {
  const t = md.trim();
  if (!t) return [];
  /** `#제 N장`(공백 없음)과 `# 제 N장`, `## 목차` 등 모든 표준 헤딩에서 분리 */
  const parts = t.split(/\n(?=#{1,6}(?:\s*제\s*\d+장\b|\s))/);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function splitByParagraphs(section: string): string[] {
  return section.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
}

function splitByLines(section: string): string[] {
  return section.split(/\n/).map((p) => p.trim()).filter(Boolean);
}

/** '#제 N장' / '# 제 N장' 등 본편 챕터 블록 시작 여부 — PDF 페이지 분할용 */
function isMainChapterH1MarkdownBlock(md: string): boolean {
  const firstLine = md.trimStart().split(/\r?\n/)[0]?.trim() ?? "";
  return /^#\s*제\s*\d+장\b/.test(firstLine);
}

function chunkLinesPreservingMarkdownTables(lines: string[], maxNonTableLines: number): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*\|/.test(line)) {
      let j = i + 1;
      while (j < lines.length && /^\s*\|/.test(lines[j])) j += 1;
      chunks.push(lines.slice(i, j).join("\n"));
      i = j;
      continue;
    }
    const start = i;
    let count = 0;
    while (
      i < lines.length &&
      !/^\s*\|/.test(lines[i]) &&
      count < maxNonTableLines
    ) {
      i += 1;
      count += 1;
    }
    if (start < i) chunks.push(lines.slice(start, i).join("\n"));
  }
  return chunks;
}

type MdComponents = ComponentProps<typeof ReactMarkdown>["components"];

const vipMarkdownComponents: MdComponents = {
  h1: ({ children }) => (
    <h1
      style={{
        color: COL.amberHi,
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: COL.amberBorder25,
        ...chapterH1BreakBefore,
        ...avoidBreakAfterHeading,
      }}
      className="break-before-page pb-3 font-serif text-[28px] font-semibold tracking-tight print:break-before-page sm:text-[30px]"
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      style={{ color: COL.amberMd, ...avoidBreakAfterHeading }}
      className="font-serif text-[22px] font-semibold tracking-wide first:mt-0 sm:text-[24px]"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ color: COL.amberBr, ...avoidBreakAfterHeading }} className="font-serif text-[18px] font-medium sm:text-[19px]">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p
      style={{ color: "rgba(226, 232, 240, 0.94)", ...avoidSplit }}
      className="font-serif text-[15px] leading-relaxed sm:text-[16px]"
    >
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul
      style={{ color: "rgba(226, 232, 240, 0.92)", ...avoidSplit }}
      className="list-disc space-y-3 pl-6 font-serif text-[15px] leading-relaxed sm:text-[16px]"
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      style={{ color: "rgba(226, 232, 240, 0.92)", ...avoidSplit }}
      className="list-decimal space-y-3 pl-6 font-serif text-[15px] leading-relaxed sm:text-[16px]"
    >
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ color: "rgba(226, 232, 240, 0.92)", ...avoidSplit }} className="pl-0.5">
      {children}
    </li>
  ),
  strong: ({ children }) => (
    <strong style={{ color: "rgba(253, 230, 138, 0.96)" }} className="font-semibold">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em style={{ color: "rgba(254, 243, 199, 0.88)" }} className="italic">
      {children}
    </em>
  ),
  hr: () => (
    <hr
      style={{ borderColor: COL.amberBorder20, borderTopWidth: 1, borderBottomWidth: 0, borderStyle: "solid", ...avoidSplit }}
      className="my-2"
    />
  ),
  table: ({ children }) => (
    <div style={{ ...avoidSplit }} className="my-4 w-full overflow-x-auto">
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: COL.amberBorder25,
        }}
        className="font-serif text-[14px] leading-snug sm:text-[15px]"
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr
      style={{
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: COL.amberBorder20,
      }}
    >
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th
      style={{
        color: COL.amberMd,
        backgroundColor: COL.black35,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: COL.amberBorder25,
        padding: "10px 12px",
        textAlign: "left",
      }}
      className="font-semibold"
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{
        color: "rgba(226, 232, 240, 0.94)",
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: COL.amberBorder20,
        padding: "10px 12px",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  ),
  blockquote: ({ children }) => (
    <blockquote
      style={{
        color: "rgba(203, 213, 225, 0.92)",
        borderLeftWidth: 3,
        borderLeftStyle: "solid",
        borderLeftColor: COL.amberBorder40,
        backgroundColor: COL.black20,
        ...avoidSplit,
      }}
      className="py-3 pl-5 font-serif text-[15px] italic leading-relaxed sm:text-[16px]"
    >
      {children}
    </blockquote>
  ),
  img: ({ src, alt, title }) => {
    const url = typeof src === "string" ? src : "";
    return (
      <figure
        style={avoidSplit}
        className="mx-auto my-10 flex flex-col items-center break-inside-avoid text-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- html2canvas PDF 캡처용 원본 img */}
        <img
          src={url}
          alt={alt ?? ""}
          title={title ?? undefined}
          width={256}
          height={256}
          className="h-64 w-64 rounded-2xl object-cover shadow-2xl"
          style={{
            boxShadow: COL.imgShadow,
            border: `1px solid ${COL.amberBorder25}`,
          }}
          crossOrigin="anonymous"
          loading="eager"
          decoding="async"
        />
        {alt ? (
          <figcaption style={{ color: COL.amberMd }} className="mt-4 max-w-md font-serif text-sm">
            {alt}
          </figcaption>
        ) : null}
      </figure>
    );
  },
};

function Watermark() {
  return (
    <div className="pointer-events-none absolute bottom-5 left-0 right-0 text-center">
      <span style={{ color: COL.watermark }} className="font-serif text-[10px] tracking-[0.35em]">
        saju.ymstudio.co.kr
      </span>
    </div>
  );
}

function PdfPageShell({ children }: { children: React.ReactNode }) {
  return (
    <section
      data-pdf-page
      className="relative box-border shrink-0 overflow-hidden rounded-sm shadow-none"
      style={{
        width: VIP_PDF_PAGE_WIDTH_PX,
        height: VIP_PDF_PAGE_HEIGHT_PX,
        backgroundColor: COL.pageBg,
        color: COL.textMain,
      }}
    >
      {children}
      <Watermark />
    </section>
  );
}

function formatKstIssued(d: Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function useIssuedLabel(issuedAt?: string) {
  const [label, setLabel] = useState(issuedAt ?? "");

  useEffect(() => {
    if (issuedAt) {
      setLabel(issuedAt);
      return;
    }
    setLabel(formatKstIssued(new Date()));
  }, [issuedAt]);

  return label;
}

function usePackedMarkdownPages(markdownData: string) {
  const [blocks, setBlocks] = useState<string[]>(() => splitMarkdownSections(markdownData));
  const [packedPages, setPackedPages] = useState<string[]>(() =>
    markdownData.trim() ? [markdownData] : []
  );
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPackedPages([]);
    setBlocks(splitMarkdownSections(markdownData));
  }, [markdownData]);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root || blocks.length === 0) {
      setPackedPages([]);
      return;
    }

    const els = [...root.querySelectorAll<HTMLElement>("[data-measure-block]")];
    if (els.length !== blocks.length) return;

    const heights = els.map((e) => e.offsetHeight);

    let expanded = [...blocks];
    let heightsWorking = [...heights];

    for (let i = 0; i < heightsWorking.length; i += 1) {
      if (heightsWorking[i] <= MAX_INNER_HEIGHT_PX) continue;

      const paras = splitByParagraphs(expanded[i]);
      if (paras.length > 1) {
        expanded.splice(i, 1, ...paras);
        setBlocks(expanded);
        return;
      }

      const lines = splitByLines(expanded[i]);
      if (lines.length > 1) {
        const chunks = chunkLinesPreservingMarkdownTables(lines, 18);
        if (chunks.length > 1) {
          expanded.splice(i, 1, ...chunks);
          setBlocks(expanded);
          return;
        }
      }

      const hard = expanded[i];
      if (hard.length < 2) break;
      const mid = Math.ceil(hard.length / 2);
      expanded.splice(i, 1, hard.slice(0, mid), hard.slice(mid));
      setBlocks(expanded);
      return;
    }

    const pages: string[][] = [];
    let current: string[] = [];
    let sum = 0;

    for (let i = 0; i < expanded.length; i += 1) {
      const h = heightsWorking[i];
      const gap = current.length === 0 ? 0 : SECTION_GAP_PX;
      const forcePageBeforeChapter =
        current.length > 0 && isMainChapterH1MarkdownBlock(expanded[i]);

      if (forcePageBeforeChapter) {
        pages.push(current);
        current = [expanded[i]];
        sum = h;
        continue;
      }

      if (sum + gap + h > MAX_INNER_HEIGHT_PX && current.length > 0) {
        pages.push(current);
        current = [expanded[i]];
        sum = h;
      } else {
        current.push(expanded[i]);
        sum += gap + h;
      }
    }
    if (current.length) pages.push(current);

    setPackedPages(pages.map((parts) => parts.join("\n\n")));
  }, [blocks]);

  return { measureRef, measureBlocks: blocks, packedPages };
}

export const VipPdfTemplate = forwardRef<HTMLDivElement, VipPdfTemplateProps>(function VipPdfTemplate(
  { markdownData, userInfo },
  ref,
) {
  const issuedLabel = useIssuedLabel(userInfo.issuedAt);
  const showSummaryPage = userInfo.sajuSummary.trim().length > 0;

  const { measureRef, measureBlocks, packedPages } = usePackedMarkdownPages(markdownData);

  const displayPages = useMemo(() => {
    if (!markdownData.trim()) return ["_리포트 본문이 비어 있습니다._"];
    // packedPages 계산 전엔 마크다운 전체를 1페이지로 fallback (무한 대기 방지)
    return packedPages.length > 0 ? packedPages : [markdownData];
  }, [markdownData, packedPages]);

  const measureTreeStyle = useMemo(
    () =>
      ({
        width: VIP_PDF_PAGE_WIDTH_PX,
        backgroundColor: COL.pageBg,
        color: COL.textMain,
      }) as const,
    [],
  );

  const measureInnerMarkdownStyle = useMemo(
    () =>
      ({
        width: VIP_PDF_INNER_CONTENT_WIDTH_PX,
        color: COL.textMain,
        backgroundColor: COL.pageBg,
      }) as const,
    [],
  );

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute left-[-9999px] top-0 z-[-1] flex flex-col gap-0"
      style={{
        color: COL.wrapText,
        backgroundColor: COL.wrapBg,
      }}
      aria-hidden
    >
      {/* eslint-disable-next-line react/no-danger -- PDF/인쇄용 스코프 스타일만 주입 */}
      <style dangerouslySetInnerHTML={{ __html: VIP_MARKDOWN_H1_PRINT_CSS }} />
      <div ref={measureRef} className="flex flex-col" style={measureTreeStyle}>
        {measureBlocks.map((block, i) => (
          <div
            key={`m-${i}-${block.slice(0, 24)}`}
            data-measure-block
            className="box-border px-10 pt-10"
            style={{ width: VIP_PDF_PAGE_WIDTH_PX, backgroundColor: COL.pageBg, color: COL.textMain }}
          >
            <div style={measureInnerMarkdownStyle} className={MARKDOWN_ROOT_CLASS}>
              <div className={MARKDOWN_PRINT_WRAP_CLASS} style={MARKDOWN_PRINT_WRAP_STYLE}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={vipMarkdownComponents}>
                  {block}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
      </div>

      <PdfPageShell>
        <div
          className="flex h-full flex-col justify-between px-10 pb-14 pt-16"
          style={{
            background: `linear-gradient(to bottom, #050810 0%, #0a1628 50%, #03060c 100%)`,
            color: COL.textMain,
          }}
        >
          <div />
          <div className="text-center">
            <p style={{ color: "rgba(245, 158, 11, 0.9)" }} className="font-serif text-[13px] font-medium tracking-[0.55em]">
              명운<span style={{ color: "rgba(251, 191, 36, 0.7)" }} className="mx-1">命運</span>
            </p>
            <div
              className="mx-auto my-10 h-px w-32"
              style={{
                background: `linear-gradient(to right, transparent, ${COL.coverLine}, transparent)`,
              }}
            />
            <h1 style={{ color: COL.amberHi }} className="font-serif text-[26px] font-semibold tracking-[0.12em]">
              VIP 대운 종합 분석 리포트
            </h1>
            <p style={{ color: "rgba(253, 230, 138, 0.75)" }} className="mt-6 font-serif text-[13px] tracking-[0.2em]">
              Miracle Zone · Premium Destiny Insight
            </p>
            <div
              className="mx-auto mt-14 max-w-md rounded-lg px-8 py-6"
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: COL.amberBorder25,
                backgroundColor: COL.black25,
              }}
            >
              <p style={{ color: "rgba(245, 158, 11, 0.6)" }} className="font-serif text-[12px] tracking-[0.35em]">
                내담자
              </p>
              <p style={{ color: COL.amberHi }} className="mt-3 font-serif text-xl font-medium">
                {userInfo.name}
              </p>
              <p style={{ color: "rgba(253, 230, 138, 0.45)" }} className="mt-8 font-serif text-[11px] leading-relaxed">
                발행 {issuedLabel}
              </p>
            </div>
          </div>
          <p style={{ color: COL.slateFoot }} className="text-center font-serif text-[10px] tracking-[0.4em]">
            CONFIDENTIAL · VIP ONLY
          </p>
        </div>
      </PdfPageShell>

      {showSummaryPage ? (
        <PdfPageShell>
          <div className="box-border flex h-full flex-col px-10 pb-14 pt-10" style={{ color: COL.textMain }}>
            <h2
              style={{
                color: COL.amberHi,
                borderBottomWidth: 1,
                borderBottomStyle: "solid",
                borderBottomColor: COL.amberBorder25,
              }}
              className="pb-3 font-serif text-[18px] font-semibold"
            >
              내담자 명식 요약
            </h2>
            <div
              className="mt-6 flex-1 rounded-xl p-6"
              style={{
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: COL.amberBorder20,
                background: `linear-gradient(to bottom right, ${COL.black35}, rgba(69, 26, 3, 0.1))`,
              }}
            >
              <p style={{ color: "rgba(226, 232, 240, 0.9)" }} className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed sm:text-[16px]">
                {userInfo.sajuSummary}
              </p>
            </div>
          </div>
        </PdfPageShell>
      ) : null}

      {displayPages.map((pageMd, idx) => (
        <PdfPageShell key={`doc-${idx}`}>
          <div
            className="box-border h-full overflow-hidden px-10 pb-14 pt-10"
            style={{ width: VIP_PDF_PAGE_WIDTH_PX, backgroundColor: COL.pageBg, color: COL.textMain }}
          >
            <article style={{ width: VIP_PDF_INNER_CONTENT_WIDTH_PX, color: COL.textMain, backgroundColor: COL.pageBg }} className={MARKDOWN_ROOT_CLASS}>
              <div className={MARKDOWN_PRINT_WRAP_CLASS} style={MARKDOWN_PRINT_WRAP_STYLE}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={vipMarkdownComponents}>
                  {pageMd}
                </ReactMarkdown>
              </div>
            </article>
          </div>
        </PdfPageShell>
      ))}
    </div>
  );
});

VipPdfTemplate.displayName = "VipPdfTemplate";
