import type { Metadata } from "next";
import Link from "next/link";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MenuTabs } from "@/components/layout/MenuTabs";
import { ManseClient } from "./ManseClient";

export const metadata: Metadata = {
  title: "무료 만세력 — 내 사주팔자 여덟 글자·십성·대운 바로 보기 | 명운",
  description:
    "생년월일시만 넣으면 사주 여덟 글자, 십성, 지장간, 12운성, 납음, 오행 분포, 신강·신약, 대운·세운까지 바로 계산해요. 절기 기준, 양력·음력·윤달 모두 지원. 무료·로그인 없이.",
  keywords: ["만세력", "무료 만세력", "사주팔자", "사주 보기", "대운", "십성", "오행", "일간"],
  alternates: { canonical: "https://saju.ymstudio.co.kr/manse" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/manse",
    siteName: "명운(命運)",
    title: "무료 만세력 — 명운",
    description: "생일만 넣으면 사주 여덟 글자와 대운까지 바로",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

export default function MansePage() {
  return (
    <div className="min-h-screen bg-[#080608] text-slate-100">
      <PageViewTracker page="manse" />
      <SiteHeader variant="marketing" />
      <MenuTabs active="manse" />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-amber-300/80">무료 · 로그인 없이</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">만세력</span>
          </h1>
          <p className="mt-2 text-sm text-white/60 break-keep">생일을 넣으면 사주 여덟 글자와 오행, 대운을 바로 세워 드려요.</p>
        </header>

        <ManseClient />

        <section className="mt-10 space-y-3 text-[13px] leading-relaxed text-white/60">
          <h2 className="text-base font-bold text-white/85">만세력 보는 법</h2>
          <p className="break-keep">사주는 태어난 해·달·날·시를 각각 하늘의 글자(천간)와 땅의 글자(지지) 두 글자로 적은 여덟 글자예요. 그중 태어난 날의 천간(일간)이 &lsquo;나&rsquo;이고, 나머지 글자가 나와 어떤 관계인지(십성)를 봐요.</p>
          <p className="break-keep">해와 달은 양력 1월 1일이 아니라 절기(입춘·각 달의 절입)로 바뀌어요. 그래서 1~2월생은 띠가 전해와 같을 수 있어요. 태어난 시간을 모르면 시주를 빼고 여섯 글자로 봐요.</p>
          <p className="break-keep">대운은 10년마다 바뀌는 큰 흐름, 세운은 해마다의 흐름이에요. 지금 대운과 올해 세운이 노란 칸이에요.</p>
          <p>
            <Link href="/sonday" className="text-amber-200/80 underline">손없는날 달력</Link>
            {" · "}
            <Link href="/taekil" className="text-amber-200/80 underline">내 사주로 좋은 날 고르기</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
