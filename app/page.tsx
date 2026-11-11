import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { BirthdayGiftBanner } from "@/components/birthday/BirthdayGiftBanner";
import { AppInstallCta } from "@/components/app/AppInstallCta";
import { QuickFortune } from "@/components/landing/QuickFortune";

export const metadata: Metadata = {
  alternates: { canonical: "https://saju.ymstudio.co.kr" },
};

/**
 * 메인 화면 (2026-11-11 정리).
 * 최근 2주 첫 방문 기기의 86% 가 한 화면만 보고 나갔다. 그래서
 * ① 첫 화면 위쪽에 생일 입력(오늘의 운세)과 지금 시즌 메뉴(신년운세)만 두고
 * ② 메뉴 17개를 고민별 5묶음으로 나눠, 무엇을 볼지 바로 고르게 했다(경쟁 서비스들도 고민·주제별로 나눈다).
 * 앱(명운-rn)도 이 화면으로 열린다 — 앱 설치 안내는 AppInstallCta 가 앱 안에서 스스로 숨는다.
 */

type Menu = { href: string; emoji: string; title: string; desc: string; badge: string; tone: "free" | "paid" | "new" | "vip" };

const BADGE: Record<Menu["tone"], string> = {
  free: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  new: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  paid: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  vip: "bg-purple-500/15 text-purple-300 border-purple-500/30",
};

const GROUPS: { title: string; sub: string; menus: Menu[] }[] = [
  {
    title: "올해·오늘 내 흐름은?",
    sub: "신년운세부터 오늘 하루까지",
    menus: [
      { href: "/newyear", emoji: "🐑", title: "2027 신년운세", desc: "정미년 총운 · 좋은 달과 조심할 달", badge: "무료", tone: "new" },
      { href: "/tools?tab=fortune", emoji: "✨", title: "오늘의 운세", desc: "금전·직장·애정운", badge: "무료", tone: "free" },
      { href: "/monthly", emoji: "📅", title: "이달의 운세", desc: "좋은 날·조심할 날 달력", badge: "무료~", tone: "free" },
      { href: "/tools?tab=zodiac", emoji: "🐉", title: "띠별 운세", desc: "12띠 재물·연애·직업운", badge: "무료", tone: "free" },
    ],
  },
  {
    title: "그 사람과 나는?",
    sub: "연인·친구·단톡방까지",
    menus: [
      { href: "/tools?tab=match", emoji: "❤️", title: "소름 돋는 궁합", desc: "두 사람 사주로 계산한 궁합", badge: "무료~", tone: "free" },
      { href: "/together", emoji: "👥", title: "단톡방 궁합", desc: "친구들 넣고 궁합 순위 보기", badge: "무료", tone: "free" },
      { href: "/tools?tab=mbti", emoji: "🧠", title: "MBTI × 사주", desc: "연애·직업 맞춤 풀이", badge: "무료", tone: "free" },
    ],
  },
  {
    title: "돈·행운, 좋은 날은?",
    sub: "로또 번호와 날짜 고르기",
    menus: [
      { href: "/tools?tab=lotto", emoji: "🎰", title: "내 사주 로또 번호", desc: "생일로 고른 번호 6개", badge: "무료", tone: "free" },
      { href: "/taekil", emoji: "🗓️", title: "좋은 날 고르기", desc: "이사·계약·고백 날짜", badge: "무료~", tone: "free" },
      { href: "/sonday", emoji: "🏠", title: "손없는날", desc: "이사·개업 길일 달력", badge: "무료", tone: "free" },
      { href: "/season", emoji: "📝", title: "시험 합격운", desc: "시험 날 흐름 · 준비 계획", badge: "무료~", tone: "free" },
    ],
  },
  {
    title: "나는 어떤 사람일까?",
    sub: "타고난 기운과 얼굴·손·이름",
    menus: [
      { href: "/vip", emoji: "👑", title: "사주 인사이트", desc: "성향·흐름 리포트 + PDF", badge: "4,400원", tone: "vip" },
      { href: "/tools?tab=saju", emoji: "👁️", title: "관상 / 이름 풀이", desc: "얼굴 사진 · 성명학", badge: "1,900원", tone: "paid" },
      { href: "/tools?tab=palmistry", emoji: "✋", title: "손금 분석", desc: "재물·결혼·건강선", badge: "1,900원", tone: "paid" },
      { href: "/manse", emoji: "📜", title: "무료 만세력", desc: "내 사주팔자 바로 보기", badge: "무료", tone: "free" },
    ],
  },
  {
    title: "마음을 내려놓고 싶을 때",
    sub: "꿈 풀이와 소원",
    menus: [
      { href: "/tools?tab=dream", emoji: "📖", title: "꿈 해몽", desc: "어젯밤 꿈의 의미", badge: "무료", tone: "free" },
      { href: "/tools?tab=altar", emoji: "🕯️", title: "기적의 제단", desc: "소원을 적어 올리기", badge: "무료~", tone: "free" },
      { href: "/lock", emoji: "🔐", title: "소원 자물쇠", desc: "자물쇠에 소원을 걸기", badge: "1,000원~", tone: "paid" },
    ],
  },
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
            <h1 className="mt-3 font-serif text-[28px] font-bold leading-snug tracking-tight text-amber-50 sm:text-4xl">
              내 생일로 보는 <span className="text-amber-400">오늘·올해 운세</span>
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

          {/* ② 고민별 메뉴 */}
          <div className="mt-10 space-y-8">
            {GROUPS.map((group) => (
              <section key={group.title} aria-label={group.title}>
                <div className="flex items-baseline justify-between gap-2 px-1">
                  <h2 className="font-serif text-lg font-bold text-amber-100">{group.title}</h2>
                  <p className="text-[11px] text-slate-500">{group.sub}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                  {group.menus.map((menu) => (
                    <Link
                      key={menu.href}
                      href={menu.href}
                      className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-amber-500/50 hover:bg-slate-800/60"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-xl leading-none">{menu.emoji}</span>
                        <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${BADGE[menu.tone]}`}>
                          {menu.badge}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-amber-50 break-keep">{menu.title}</h3>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-400 break-keep">{menu.desc}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>

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
