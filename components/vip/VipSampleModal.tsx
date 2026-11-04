"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, X } from "lucide-react";
import { logEvent } from "@/lib/analytics";

/**
 * 사주 인사이트 결제 전 견본 미리보기 (2026-11-04).
 * 가상의 인물(1992년 3월 14일 오전 9시 20분생 여성, ENFP)로 실제 리포트 생성기를 돌려 만든 결과에서
 * 핵심 답변·목차·제1–2장·제6장(재물운)만 잘라 public/samples/vip-sample.md 에 두었다. 14장 중 4개 장 분량.
 * 리포트 생성기(프롬프트·모델)를 크게 바꾸면 견본도 다시 만들 것.
 */

const SAMPLE_URL = "/samples/vip-sample.md";

const mdComponents = {
  h1: (props: React.ComponentProps<"h1">) => (
    <h1 className="mb-3 mt-8 border-b border-amber-500/30 pb-2 font-serif text-lg font-bold text-amber-200" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => <h2 className="mb-2 mt-6 text-base font-bold text-amber-100" {...props} />,
  h3: (props: React.ComponentProps<"h3">) => <h3 className="mb-2 mt-4 text-sm font-bold text-amber-100/90" {...props} />,
  p: (props: React.ComponentProps<"p">) => <p className="my-2 text-[13px] leading-relaxed text-slate-200" {...props} />,
  ul: (props: React.ComponentProps<"ul">) => <ul className="my-2 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-200" {...props} />,
  ol: (props: React.ComponentProps<"ol">) => <ol className="my-2 list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-slate-200" {...props} />,
  strong: (props: React.ComponentProps<"strong">) => <strong className="font-bold text-amber-100" {...props} />,
  hr: () => <hr className="my-6 border-slate-700/60" />,
  table: (props: React.ComponentProps<"table">) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-[12px] text-slate-200" {...props} />
    </div>
  ),
  th: (props: React.ComponentProps<"th">) => <th className="border border-slate-700 bg-slate-800/80 px-2 py-1.5 text-left font-bold text-amber-100" {...props} />,
  td: (props: React.ComponentProps<"td">) => <td className="border border-slate-700 px-2 py-1.5 align-top" {...props} />,
};

export function VipSampleButton() {
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || markdown !== null) return;
    fetch(SAMPLE_URL)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then(setMarkdown)
      .catch(() => setFailed(true));
  }, [open, markdown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void logEvent("vip_sample_open", {});
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/5 px-5 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/10"
      >
        <BookOpen className="h-4 w-4" />
        결제 전에 리포트 견본 먼저 보기
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="사주 인사이트 리포트 견본"
            onClick={(e) => e.stopPropagation()}
            className="mx-auto flex h-full w-full max-w-2xl flex-col bg-[#0b0f1a] shadow-2xl sm:my-6 sm:h-[calc(100%-3rem)] sm:rounded-2xl sm:border sm:border-amber-500/30"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-amber-200">사주 인사이트 리포트 견본</p>
                <p className="text-[11px] text-slate-400">가상의 인물(1992년 3월 14일생) · 14장 중 4개 장 미리보기</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 pt-2">
              {markdown ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                  {markdown}
                </ReactMarkdown>
              ) : (
                <p className="py-16 text-center text-sm text-slate-400">
                  {failed ? "견본을 불러오지 못했어요. 잠시 후 다시 열어 주세요." : "견본을 불러오는 중..."}
                </p>
              )}
              {markdown ? (
                <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-center text-[13px] leading-relaxed text-amber-100/90">
                  실제 리포트는 <b>내 생년월일·태어난 시</b>로 새로 계산해 14장 전체(대운 지도, 5년 흐름, 직장·연애·관계·건강, 실행 계획)를 써 드려요.
                  PDF로 저장해 두고 볼 수 있어요.
                </div>
              ) : null}
            </div>

            <div className="border-t border-slate-800 px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-500 px-5 py-3 text-sm font-bold text-stone-950"
              >
                내 생일로 14장 전체 받으러 가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
