"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { createClient } from "@supabase/supabase-js";
import {
  Sparkles,
  BookOpen,
  Flame,
  Heart,
  Activity,
  FileText,
  ChevronRight,
} from "lucide-react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** 실제 라우트: `app/tools/page.tsx` 탭 쿼리와 동일 (`useEffect` URL 파싱과 일치) */
const ORIGINAL_MENUS: {
  href: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
}[] = [
  {
    href: "/tools?tab=fortune",
    title: "오늘의 운세",
    description: "총운·애정·금전·직장 등 오늘 하루 흐름",
    icon: Sparkles,
  },
  {
    href: "/tools?tab=saju",
    title: "관상 / 이름 풀이",
    description: "관상 분석·작명·한자 운세",
    icon: FileText,
  },
  {
    href: "/tools?tab=match",
    title: "소름 돋는 궁합",
    description: "두 사람의 인연 깊이 분석",
    icon: Heart,
  },
  {
    href: "/tools?tab=mbti",
    title: "MBTI - 심층 성격 검사",
    description: "성향 패턴과 관계 시나리오",
    icon: Activity,
  },
  {
    href: "/tools?tab=dream",
    title: "꿈 해몽",
    description: "꿈 상징과 오늘의 메시지",
    icon: BookOpen,
  },
  {
    href: "/tools?tab=altar",
    title: "기적의 제단",
    description: "소원 공양과 에너지 집중",
    icon: Flame,
  },
];

function usePaymentReturnRedirect() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const looksLikePayment =
      params.has("paymentId") ||
      params.has("imp_uid") ||
      params.has("imp_success") ||
      params.has("merchant_uid") ||
      (params.has("success") && (params.has("imp_uid") || params.has("paymentId")));

    if (!looksLikePayment) return;

    window.location.replace(`/tools${window.location.search}`);
  }, []);
}

function useVisitorPing() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const trackVisitor = async () => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
      if (localStorage.getItem("visited_today") === today) return;
      const { error } = await supabase.rpc("increment_visitor");
      if (!error) localStorage.setItem("visited_today", today);
    };
    trackVisitor();
  }, []);
}

export function LandingPage() {
  usePaymentReturnRedirect();
  useVisitorPing();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#030712] text-slate-100">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[url('/images/bg-main.jpg')] bg-cover bg-center bg-fixed opacity-[0.32]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#030712]/88 via-[#030712]/72 to-[#030712]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(217,119,6,0.12),transparent_55%)]" />

      <SiteHeader variant="marketing" />

      <main className="relative z-10 mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <section className="text-center" aria-labelledby="hero-heading">
          <p className="text-xs font-medium uppercase tracking-[0.4em] text-amber-500/75">
            Miracle Zone · Premium Destiny
          </p>
          <h1
            id="hero-heading"
            className="mx-auto mt-6 max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight text-amber-50 sm:text-4xl md:text-[2.65rem] md:leading-[1.15]"
          >
            당신의 운명을 바꿀
            <br />
            단 하나의 마스터피스
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
            10년 대운의 흐름부터 재물·인연·맞춤 부적까지 담은 VIP 리포트와, 오리지널 메뉴에서 오늘의 운도 열어 보세요.
          </p>

          <div className="mx-auto mt-10 flex flex-col items-center gap-4 sm:mt-12">
            <Link
              href="/vip"
              className="group relative inline-flex w-full max-w-md items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-400 px-8 py-5 font-serif text-base font-bold tracking-wide text-stone-950 shadow-[0_0_48px_-10px_rgba(245,158,11,0.55)] transition hover:brightness-105 sm:text-lg"
            >
              <span className="relative z-10 flex items-center gap-2">
                🔥 내 운명의 그릇 확인하기 (VIP 리포트)
                <ChevronRight className="h-5 w-5 transition group-hover:translate-x-0.5" aria-hidden />
              </span>
              <span className="absolute inset-0 bg-gradient-to-t from-black/15 to-white/25 opacity-40" />
            </Link>
            <Link
              href="#original-menus"
              className="text-xs font-medium text-amber-200/50 underline-offset-4 transition hover:text-amber-200/80 hover:underline"
            >
              오리지널 메뉴로 분위기 보기 ↓
            </Link>
          </div>
        </section>

        <section
          id="original-menus"
          className="mt-24 scroll-mt-28 border-t border-amber-500/10 pt-16"
          aria-labelledby="tools-heading"
        >
          <h2 id="tools-heading" className="text-center font-serif text-xl font-semibold text-amber-100 sm:text-2xl">
            명운 오리지널 메뉴
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
            프로젝트 기본 6종 분석 도구입니다. VIP 리포트는 만세력·대운·부적 처방까지 한 번에 담습니다.
          </p>

          <ul className="mt-10 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ORIGINAL_MENUS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex h-full flex-col rounded-2xl border border-slate-700/60 bg-slate-950/55 p-5 shadow-lg shadow-black/30 backdrop-blur-sm transition hover:border-amber-500/35 hover:bg-slate-900/65"
                  >
                    <div className="flex items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/12 text-amber-400">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-base font-semibold text-amber-50">{item.title}</h3>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-amber-600/50" aria-hidden />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
