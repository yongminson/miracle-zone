"use client";

import { useEffect, useRef, useState } from "react";
import { logEvent } from "@/lib/analytics";

/**
 * 웹 방문자를 구글 앱으로 — 2026-09-29~10-23 데이터: 앱 손님은 23% 가 다시 오고 매출 전부가 앱에서 났다.
 * 웹 손님은 3% 만 다시 왔다. 운세 결과처럼 마음이 움직인 자리에서 앱을 권한다.
 *
 * 2026-11-22: 예전 카드(앱 장점 3줄)는 한 달간 클릭 4번뿐이었고, 로또 화면의
 * "앱에서 광고 1번 보면 고급 번호 무료" 한 줄은 카드 없이도 3번 눌렸다 → 구체적인 이득(웹 1,900원 → 앱 무료)을
 * 맨 앞에, 자리마다 다른 첫 줄로. 보임 기록은 화면에 절반 이상 실제로 보였을 때만 남긴다(전엔 그려지기만 해도 기록).
 *
 * 앱 안·토스·아이폰(앱 없음)에서는 보이지 않는다. 닫으면 7일 동안 숨긴다.
 */

const PLAY_PACKAGE = "kr.co.ymstudio.myeongun";
const DISMISS_KEY = "mu_app_cta_dismissed_at";
const HIDE_DAYS = 7;

export type AppCtaPlace = "fortune" | "newyear" | "landing" | "zodiac" | "monthly";

function playUrl(place: AppCtaPlace): string {
  const referrer = `utm_source=web&utm_medium=app_cta&utm_campaign=${place}`;
  return `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&referrer=${encodeURIComponent(referrer)}`;
}

/** 자리마다 첫 줄 — 그 화면을 본 손님이 가장 끌릴 이득 하나 */
const HEADLINE: Record<AppCtaPlace, string> = {
  fortune: "내일 운세는 아침 8시에 먼저 받아 보세요",
  newyear: "관상·손금·이름 풀이, 앱에서는 무료예요",
  zodiac: "관상·손금·이름 풀이, 앱에서는 무료예요",
  landing: "관상·손금·이름 풀이, 앱에서는 무료예요",
  monthly: "매일 아침 8시, 오늘의 흐름을 알려 드려요",
};

export function AppInstallCta({ place }: { place: AppCtaPlace }) {
  const [visible, setVisible] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const device = useRef<"android" | "pc">("pc");

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
    device.current = /Android/i.test(ua) ? "android" : "pc";
    setVisible(true);
  }, [place]);

  // 실제로 화면에 절반 이상 보였을 때 한 번만 기록
  useEffect(() => {
    const el = boxRef.current;
    if (!visible || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      void logEvent("app_cta_view", { place, device: device.current });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void logEvent("app_cta_view", { place, device: device.current });
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, place]);

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
    <div
      ref={boxRef}
      className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-950/60 via-slate-950/80 to-amber-950/40 px-5 py-4 text-left shadow-[0_0_30px_-12px_rgba(52,211,153,0.5)]"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="닫기"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white/80"
      >
        ×
      </button>
      <p className="pr-6 text-[15px] font-bold leading-snug text-emerald-50 break-keep">📱 {HEADLINE[place]}</p>
      {/* 가장 센 이득: 웹에서 돈 내는 풀이가 앱에선 광고 1번 */}
      <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2 text-xs">
        <span className="shrink-0 text-white/70">관상·손금·이름</span>
        <span className="text-white/40 line-through">웹 1,900원</span>
        <span className="text-white/40">→</span>
        <span className="font-bold text-emerald-300">앱 광고 1번 무료</span>
      </div>
      <ul className="mt-2 space-y-0.5 text-[11px] leading-relaxed text-emerald-50/65">
        <li>· 매일 아침 8시 오늘의 흐름 알림 · 토요일엔 이번 주 로또 번호</li>
        <li>· 고급 로또 번호도 광고 1번이면 받을 수 있어요</li>
      </ul>
      <a
        href={playUrl(place)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          const logged = logEvent("app_cta_click", { place, device: device.current });
          // 안드로이드 폰은 누르자마자 Play 스토어 앱으로 넘어가 기록 전송이 끊길 수 있다 —
          // 기록을 먼저 보내고(최대 0.6초 기다림) 이동한다. PC 는 새 탭으로 열려 이 화면이 남으므로 그대로 둔다.
          if (!/Android/i.test(navigator.userAgent)) return;
          e.preventDefault();
          const url = e.currentTarget.href;
          void Promise.race([logged, new Promise((r) => setTimeout(r, 600))]).then(() => {
            window.location.href = url;
          });
        }}
        className="mt-3 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 py-2.5 text-sm font-bold text-stone-950 shadow-md transition hover:brightness-105 active:scale-[0.98]"
      >
        앱 받고 무료로 보기
      </a>
      <p className="mt-1.5 text-center text-[10px] text-white/40">Google Play · 안드로이드 앱 · 설치 무료</p>
    </div>
  );
}
