"use client";

import { useEffect, useState } from "react";
import { logEvent } from "@/lib/analytics";

/**
 * 웹 방문자를 구글 앱으로 — 2026-09-29~10-23 데이터: 앱 손님은 23% 가 다시 오고 매출 전부가 앱에서 났다.
 * 웹 손님은 3% 만 다시 왔다. 운세 결과처럼 마음이 움직인 자리에서 앱을 권한다.
 *
 * 앱 안·토스·아이폰(앱 없음)에서는 보이지 않는다. 닫으면 7일 동안 숨긴다.
 */

const PLAY_PACKAGE = "kr.co.ymstudio.myeongun";
const DISMISS_KEY = "mu_app_cta_dismissed_at";
const HIDE_DAYS = 7;

export type AppCtaPlace = "fortune" | "newyear" | "landing";

function playUrl(place: AppCtaPlace): string {
  const referrer = `utm_source=web&utm_medium=app_cta&utm_campaign=${place}`;
  return `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&referrer=${encodeURIComponent(referrer)}`;
}

export function AppInstallCta({ place }: { place: AppCtaPlace }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_PLATFORM === "toss") return;
    const ua = navigator.userAgent;
    if (ua.includes("MyeongunApp") || /iPhone|iPad|iPod/i.test(ua)) return;
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (at && Date.now() - at < HIDE_DAYS * 86_400_000) return;
    } catch {
      // 저장소가 막혀 있으면 그냥 보여 준다
    }
    setVisible(true);
    void logEvent("app_cta_view", { place });
  }, [place]);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // 무시
    }
    setVisible(false);
    void logEvent("app_cta_dismiss", { place });
  };

  return (
    <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-950/60 via-slate-950/80 to-amber-950/40 px-5 py-4 text-left shadow-[0_0_30px_-12px_rgba(52,211,153,0.5)]">
      <button
        type="button"
        onClick={dismiss}
        aria-label="닫기"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white/80"
      >
        ×
      </button>
      <p className="pr-6 text-sm font-bold text-emerald-100">📱 매일 아침 8시, 오늘의 운세가 먼저 찾아와요</p>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed text-emerald-50/75">
        <li>· 명운 앱에서 아침 알림을 켜면 매일 나만의 흐름을 알려 드려요</li>
        <li>· 관상·이름·손금 심층 풀이를 광고 보고 무료로 볼 수 있어요</li>
        <li>· 생일에는 축하 선물도 준비돼 있어요</li>
      </ul>
      <a
        href={playUrl(place)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => void logEvent("app_cta_click", { place })}
        className="mt-3 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 py-2.5 text-sm font-bold text-stone-950 shadow-md transition hover:brightness-105 active:scale-[0.98]"
      >
        Google Play에서 무료로 받기
      </a>
      <p className="mt-1.5 text-center text-[10px] text-white/40">안드로이드 앱 · 무료</p>
    </div>
  );
}
