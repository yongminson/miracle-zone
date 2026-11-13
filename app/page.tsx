import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { BirthdayGiftBanner } from "@/components/birthday/BirthdayGiftBanner";
import { AppInstallCta } from "@/components/app/AppInstallCta";
import { QuickFortune } from "@/components/landing/QuickFortune";
import { isSeasonOver } from "@/lib/menu/core-menu";

export const metadata: Metadata = {
  alternates: { canonical: "https://saju.ymstudio.co.kr" },
};

// 시즌 메뉴(시험 합격운)가 날짜가 지나면 배포 없이도 빠지도록 한 시간마다 다시 만든다
export const revalidate = 3600;

/**
 * 메인 화면 (2026-11-11 정리).
 * 최근 2주 첫 방문 기기의 86% 가 한 화면만 보고 나갔다. 그래서
 * ① 첫 화면 위쪽에 생일 입력(오늘의 운세)과 지금 시즌 메뉴(신년운세)만 두고
 * ② (2026-11-14) 메뉴를 핵심 6개(크게)와 다른 메뉴(작게)로 줄였다 — 30일 사용·매출 기준, lib/menu/core-menu.ts 참고.
 * 앱(명운-rn)도 이 화면으로 열린다 — 앱 설치 안내는 AppInstallCta 가 앱 안에서 스스로 숨는다.
 */

type Menu = { href: string; emoji: string; title: string; desc: string; badge: string; tone: "free" | "paid" | "new" | "vip" };

const BADGE: Record<Menu["tone"], string> = {
  free: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  new: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  paid: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  vip: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

// 핵심 메뉴 6개(최근 30일 사용·매출 상위, lib/menu/core-menu.ts 와 같은 판단) — 크게
const CORE: Menu[] = [
  { href: "/newyear", emoji: "🐑", title: "2027 신년운세", desc: "정미년 총운 · 좋은 달과 조심할 달", badge: "무료", tone: "new" },
  { href: "/tools?tab=fortune", emoji: "✨", title: "오늘의 운세", desc: "내 사주로 본 금전·직장·애정운", badge: "무료", tone: "free" },
  { href: "/vip", emoji: "👑", title: "사주 인사이트", desc: "타고난 성향·10년 흐름 리포트", badge: "4,400원", tone: "vip" },
  { href: "/tools?tab=match", emoji: "❤️", title: "궁합", desc: "둘이 보는 궁합 · 단톡방 순위", badge: "무료~", tone: "free" },
  { href: "/tools?tab=lotto", emoji: "🎰", title: "내 사주 로또 번호", desc: "생일로 고른 이번 주 번호 6개", badge: "무료", tone: "free" },
  { href: "/manse", emoji: "📜", title: "무료 만세력", desc: "사주팔자·십성·대운 바로 보기", badge: "무료", tone: "free" },
];

// 나머지는 작게 한 줄로(페이지는 그대로 열린다). season 은 수능 다음 날부터 숨긴다
const MORE: { href: string; label: string; id?: string }[] = [
  { href: "/together", label: "👥 단톡방 궁합" },
  { href: "/monthly", label: "📅 이달의 운세" },
  { href: "/tools?tab=zodiac", label: "🐉 띠별 운세" },
  { href: "/tools?tab=saju", label: "👁️ 관상·이름 풀이" },
  { href: "/tools?tab=palmistry", label: "✋ 손금" },
  { href: "/tools?tab=dream", label: "📖 꿈 해몽" },
  { href: "/taekil", label: "🗓️ 좋은 날 고르기" },
  { href: "/sonday", label: "🏠 손없는날" },
  { href: "/tools?tab=mbti", label: "🧠 MBTI × 사주" },
  { href: "/season", label: "📝 시험 합격운", id: "season" },
  { href: "/tools?tab=altar", label: "🕯️ 기적의 제단" },
  { href: "/lock", label: "🔐 소원 자물쇠" },
];

export default function Home() {
  return (
    <div className="relative flex-1 bg-[#030712] text-slate-100 pb-20">
      {/* 랜딩 방문·유입 경로 기록 (화면에는 아무것도 그리지 않는다) */}
      <PageViewTracker page="landing" />
      {/* 검색엔진·AI 용 서비스 설명 (화면에 보이는 내용과 같아야 한다) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: "명운(命運)",
                alternateName: ["명운", "Myeongun"],
                url: "https://saju.ymstudio.co.kr",
                inLanguage: "ko",
              },
              {
                "@type": "Organization",
                name: "명운(命運)",
                url: "https://saju.ymstudio.co.kr",
                logo: "https://saju.ymstudio.co.kr/logo.png",
                sameAs: ["https://play.google.com/store/apps/details?id=kr.co.ymstudio.myeongun"],
              },
              {
                "@type": "WebApplication",
                name: "명운(命運)",
                url: "https://saju.ymstudio.co.kr",
                description:
                  "만세력 계산 기반 사주 운세 서비스. 2027 신년운세, 오늘의 운세, 궁합, 단톡방 궁합, 꿈해몽, 관상, 이름풀이, 손금, 만세력, 손없는날, 내 사주 행운 번호를 제공합니다.",
                applicationCategory: "LifestyleApplication",
                operatingSystem: "Web, Android",
                inLanguage: "ko",
              },
            ],
          }).replace(/</g, "\\u003c"),
        }}
      />
      <div className="absolute inset-0 z-0 bg-[url('/images/bg-main.jpg')] bg-cover bg-center bg-fixed opacity-30" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#030712]/80 via-transparent to-[#030712]" />

      <div className="relative z-10">
        <SiteHeader />

        <div className="pt-16">
          <BirthdayGiftBanner />
        </div>

        <main className="mx-auto max-w-5xl px-4 pt-2 sm:px-6">
          {/* ① 첫 화면: 생일 입력과 지금 시즌 메뉴만 */}
          <div className="text-center">
            <p className="text-xs font-medium tracking-[0.2em] text-amber-500/80">만세력 계산 기반 무료 사주</p>
            <h1 className="mt-3 font-serif text-[28px] font-bold leading-snug tracking-tight text-amber-50 break-keep sm:text-4xl">
              내 생일로 보는<br className="sm:hidden" /> <span className="text-amber-400">오늘·올해 운세</span>
            </h1>

            {/* 들어오자마자 생년월일만 넣고 오늘의 운세 — 소개만 보고 나가던 손님을 붙잡는다 */}
            <QuickFortune />

            <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-2">
              <Link
                href="/newyear"
                className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-3 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-500/20"
              >
                🐑 2027 신년운세
                <span className="mt-0.5 block text-[11px] font-medium text-rose-200/70">무료 · 좋은 달 미리 보기</span>
              </Link>
              <Link
                href="/vip"
                className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-3 py-3 text-sm font-bold text-amber-100 transition hover:bg-amber-500/20"
              >
                👑 사주 인사이트
                <span className="mt-0.5 block text-[11px] font-medium text-amber-200/70">성향·흐름 리포트 4,400원</span>
              </Link>
            </div>

            <div className="mt-6">
              <AppInstallCta place="landing" />
            </div>
          </div>

          {/* ② 핵심 메뉴 6개 */}
          <section aria-label="많이 찾는 메뉴" className="mt-10">
            <h2 className="px-1 font-serif text-lg font-bold text-amber-100">많이 찾는 메뉴</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              {CORE.map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-amber-500/50 hover:bg-slate-800/60"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-2xl leading-none">{menu.emoji}</span>
                    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${BADGE[menu.tone]}`}>
                      {menu.badge}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-[15px] font-bold text-amber-50 break-keep">{menu.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-400 break-keep">{menu.desc}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* ③ 다른 메뉴 — 작게 */}
          <section aria-label="다른 메뉴" className="mt-8">
            <h2 className="px-1 text-sm font-bold text-slate-300">다른 메뉴</h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {MORE.filter((m) => !m.id || !isSeasonOver(m.id)).map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="rounded-full border border-slate-700/70 bg-slate-900/50 px-3 py-1.5 text-[12px] text-slate-300 transition hover:border-amber-500/50 hover:text-amber-100"
                >
                  {m.label}
                </Link>
              ))}
            </div>
          </section>

          {/* ③ 하단 소개 (검색엔진도 읽는다) */}
          <div className="mt-16 border-t border-slate-800/60 pt-10 pb-4">
            <div className="mx-auto max-w-2xl space-y-3 text-center">
              <p className="font-serif text-sm text-amber-200/80">명운(命運) — 정확한 만세력 계산과 정통 명리 해석</p>
              <p className="text-xs leading-relaxed text-slate-500">
                명운은 동양 명리학(사주팔자·음양오행)의 전통 해석 체계를 만세력으로 계산해, 입력한 생년월일을 바탕으로
                오늘의 운세·신년운세·궁합·관상·꿈해몽 같은 참고용 콘텐츠를 쉽게 살펴볼 수 있게 만든 서비스입니다.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
