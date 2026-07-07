"use client";

import { useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/** A4 세로 (mm) */
const PDF_PAGE_W_MM = 210;
const PDF_PAGE_H_MM = 297;

export const VIP_PDF_FILENAME = "명운_VIP_대운리포트.pdf";

export type UsePdfDownloadOptions = {
  /** html2canvas scale — 선명도 (메모리↑) */
  scale?: number;
};

/** Blob URL만 반환 — 다운로드는 화면의 순수 `<a href download>`로 처리 (모바일 인앱 호환) */
export type VipPdfDownloadResult =
  | { ok: true; blobUrl: string; filename: string; revoke: () => void }
  | { ok: false; error: string };

/**
 * 루트 요소의 자식 중 `[data-pdf-page]` 각각을 한 PDF 페이지로 캡처합니다.
 * (프로그래매틱 `a.click()` 없음 — 모바일 인앱에서 막히는 방식 제거)
 */
export function usePdfDownload(options: UsePdfDownloadOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const buildPdfBlob = useCallback(
    async (root: HTMLElement | null): Promise<VipPdfDownloadResult | null> => {
      if (!root) {
        return { ok: false, error: "PDF 루트 요소가 없습니다." };
      }

      // VIP 리포트 이어보기 직후에는 일시적으로
      // 표지 + 명식요약 + markdown 전체 fallback = 3장 상태가 될 수 있음.
      // 이 상태에서 PDF를 만들면 3장 PDF가 생성된다.
      // 따라서 data-pdf-page 개수가 "더 이상 늘지 않고 안정될 때까지" 기다린다.
      // (분할이 끝나면 개수가 고정됨. 무한 대기 방지 위해 최대 8초.)
      await new Promise<void>((resolve) => {
        let last = -1;
        let stable = 0;
        let tries = 0;
        const tick = () => {
          const n = root.querySelectorAll("[data-pdf-page]").length;
          if (n > 0 && n === last) {
            stable += 1;
          } else {
            stable = 0;
          }
          last = n;
          tries += 1;
          // 개수가 12프레임(약 0.2초) 연속 동일 = 분할 완료로 간주.
          // 또는 최대 480프레임(약 8초) 경과 시 진행.
          if ((n > 0 && stable >= 12) || tries > 480) {
            resolve();
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      });

      const pages = root.querySelectorAll<HTMLElement>("[data-pdf-page]");
      if (pages.length === 0) {
        return { ok: false, error: "PDF 페이지 노드([data-pdf-page])를 찾지 못했습니다." };
      }

      const scale = options.scale ?? 2;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      setIsGenerating(true);
      try {
        for (let i = 0; i < pages.length; i += 1) {
          const el = pages[i];
          const canvas = await html2canvas(el, {
            scale,
            useCORS: true,
            logging: false,
            backgroundColor: "#060a12",
            scrollX: 0,
            scrollY: 0,
            windowWidth: el.scrollWidth,
            windowHeight: el.scrollHeight,
          });

          const imgData = canvas.toDataURL("image/png", 1.0);
          if (i > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, 0, PDF_PAGE_W_MM, PDF_PAGE_H_MM, undefined, "FAST");
        }

        const blob = pdf.output("blob");
        const blobUrl = URL.createObjectURL(blob);
        const filename = VIP_PDF_FILENAME;

        return {
          ok: true,
          blobUrl,
          filename,
          revoke: () => {
            try {
              URL.revokeObjectURL(blobUrl);
            } catch {
              /* ignore */
            }
          },
        };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, error: msg };
      } finally {
        setIsGenerating(false);
      }
    },
    [options.scale],
  );

  return { buildPdfBlob, isGenerating };
}
