"use client";

import { useEffect, useState } from "react";
import { Compass } from "lucide-react";

export const VIP_LOADER_MESSAGES = [
  "입력 정보를 확인하고 있습니다...",
  "연주·월주·일주 정보를 정리하고 있습니다...",
  "성향을 돌아볼 질문을 구성하고 있습니다...",
  "생활에 적용할 실천 가이드를 작성하고 있습니다...",
  "사주 인사이트 리포트를 마무리하고 있습니다...",
] as const;

const ROTATE_MS = 4000;

export type DynamicLoaderProps = {
  /** 보조 한 줄 (예: PDF 생성 단계) */
  subtitle?: string | null;
  className?: string;
};

/** 황금 나침반 + 순환 메시지 (VIP 등 장시간 대기용) */
export function DynamicLoader({ subtitle, className = "" }: DynamicLoaderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % VIP_LOADER_MESSAGES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-8 text-center ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div
          className="absolute inset-0 rounded-full border-2 border-amber-500/25 shadow-[0_0_40px_rgba(245,158,11,0.15)]"
          aria-hidden
        />
        <div
          className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-500/65"
          style={{ animationDuration: "2.6s" }}
          aria-hidden
        />
        <div
          className="relative z-[1] flex animate-spin items-center justify-center text-amber-400 drop-shadow-[0_0_14px_rgba(251,191,36,0.5)]"
          style={{ animationDuration: "4.2s", animationTimingFunction: "linear" }}
          aria-hidden
        >
          <Compass className="h-16 w-16" strokeWidth={1.35} />
        </div>
      </div>

      <div className="max-w-md px-4">
        <p className="font-serif text-lg leading-relaxed text-amber-50 transition-opacity duration-500">
          {VIP_LOADER_MESSAGES[index]}
        </p>
        {subtitle ? (
          <p className="mt-4 text-sm text-amber-200/65">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
