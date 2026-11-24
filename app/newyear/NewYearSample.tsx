"use client";

import { useEffect, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { logEvent } from "@/lib/analytics";
import type { NewYearDetail, NewYearGender, NewYearResult } from "@/lib/newyear/newyear-types";
import { DetailView } from "./NewYearDetail";

/**
 * 신년운세 상세 풀이 결제 전 견본 (2026-11-24).
 * 사주 인사이트는 결제 직전에 견본을 연 손님이 산 경우가 많았다(11/8·11/14 구매 4건) — 신년 상세에도 같은 길을 둔다.
 * 견본은 가상의 인물(1992년 3월 14일생 여성)로 실제 계산·풀이 생성기를 돌린 결과(scripts/make-newyear-sample.ts)를
 * 결제한 손님이 보는 화면(DetailView)으로 그대로 보여 준다. 풀이 생성기를 크게 바꾸면 견본도 다시 만들 것.
 */

const SAMPLE_URL = "/samples/newyear-sample.json";

type Sample = { input: { gender: NewYearGender }; result: NewYearResult; detail: NewYearDetail };

export function NewYearSampleButton() {
  const [open, setOpen] = useState(false);
  const [sample, setSample] = useState<Sample | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || sample) return;
    fetch(SAMPLE_URL)
      .then((res) => (res.ok ? (res.json() as Promise<Sample>) : Promise.reject(new Error(String(res.status)))))
      .then(setSample)
      .catch(() => setFailed(true));
  }, [open, sample]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // 뒤 화면이 같이 스크롤되지 않게
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void logEvent("newyear_sample_open", {});
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/40 bg-amber-500/5 px-5 py-3 text-sm font-bold text-amber-200 transition hover:bg-amber-500/10"
      >
        <BookOpen className="h-4 w-4" />
        결제 전에 상세 풀이 견본 먼저 보기
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="2027 신년운세 상세 풀이 견본"
            onClick={(e) => e.stopPropagation()}
            className="mx-auto flex h-full w-full max-w-2xl flex-col bg-[#0b0f1a] text-left shadow-2xl sm:my-6 sm:h-[calc(100%-3rem)] sm:rounded-2xl sm:border sm:border-amber-500/30"
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-amber-200">2027 상세 풀이 견본</p>
                <p className="text-[11px] text-slate-400">가상의 인물(1992년 3월 14일생 여성) · 결제하면 보이는 화면 그대로</p>
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

            <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4">
              {sample ? (
                <>
                  <DetailView detail={sample.detail} result={sample.result} gender={sample.input.gender} sample />
                  <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-center text-[13px] leading-relaxed text-amber-100/90 break-keep">
                    실제 상세 풀이는 <b>내 생년월일</b>로 새로 계산해 써 드려요. 돈·연애·일이 풀리는 달과 12개월 할 일·피할 일이 사람마다 달라요.
                  </div>
                </>
              ) : (
                <p className="py-16 text-center text-sm text-slate-400">
                  {failed ? "견본을 불러오지 못했어요. 잠시 후 다시 열어 주세요." : "견본을 불러오는 중..."}
                </p>
              )}
            </div>

            <div className="border-t border-slate-800 px-4 py-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-rose-400 px-5 py-3 text-sm font-black text-stone-950"
              >
                내 생일로 상세 풀이 받으러 가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
