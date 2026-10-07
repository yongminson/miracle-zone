import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { MenuTabs } from "@/components/layout/MenuTabs";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ZODIAC_2027, findZodiac, zodiacBirthYears, zodiacMonths } from "@/lib/newyear/zodiac-2027";

/**
 * 띠별 2027 신년운세 — "2027 양띠 운세" 같은 검색으로 들어오는 사람의 첫 화면.
 * 띠는 태어난 해 하나만 본 풀이라, 끝에서 생년월일로 보는 개인 풀이(/newyear)로 이어 준다.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return ZODIAC_2027.map((z) => ({ slug: z.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const z = findZodiac(slug);
  if (!z) return {};
  const years = zodiacBirthYears(z.branch)
    .filter((y) => y.age >= 20 && y.age <= 80)
    .map((y) => `${String(y.year).slice(2)}년생`)
    .join("·");
  const title = `2027 ${z.animal}띠 운세 — ${z.relation.title.split(" (")[0].replace(" — ", ": ")} | 명운`;
  const description = `2027년 정미년 ${z.animal}띠(${years}) 총운·재물·연애·직장·건강과 좋은 달·조심할 달을 무료로 확인하세요. ${z.keyword}`;
  const url = `https://saju.ymstudio.co.kr/newyear/${z.slug}`;
  return {
    title,
    description,
    keywords: [`2027 ${z.animal}띠 운세`, `${z.animal}띠 2027`, `2027년 ${z.animal}띠`, "2027 신년운세", "정미년 운세", "2027 삼재"],
    alternates: { canonical: url },
    openGraph: { type: "article", locale: "ko_KR", url, siteName: "명운(命運)", title, description },
  };
}

const TONE: Record<string, string> = {
  good: "border-emerald-400/30 bg-emerald-950/30",
  caution: "border-amber-400/30 bg-amber-950/30",
  neutral: "border-white/15 bg-white/[0.04]",
};

export default async function ZodiacNewYearPage({ params }: Props) {
  const { slug } = await params;
  const z = findZodiac(slug);
  if (!z) notFound();

  const months = zodiacMonths(z.branch);
  const years = zodiacBirthYears(z.branch).filter((y) => y.age >= 2 && y.age <= 95);
  const ctaHref = `/newyear?utm_source=zodiac_page&utm_medium=cta&utm_campaign=${z.slug}`;

  return (
    <div className="min-h-screen bg-[#07060b] text-slate-100">
      <PageViewTracker page={`newyear_${z.slug}`} />
      <SiteHeader variant="marketing" />
      <MenuTabs active="newyear" />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6">
        <header className="text-center">
          <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-3xl border border-rose-400/30">
            <Image src={`/images/zodiac-${z.slug}.png`} alt={`${z.animal}띠`} fill className="object-cover" />
          </div>
          <p className="mt-4 text-xs font-semibold tracking-[0.3em] text-rose-300/80">2027 丁未年</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-rose-300 via-amber-200 to-rose-300 bg-clip-text text-transparent">
              2027 {z.animal}띠 운세
            </span>
          </h1>
          <p className="mt-2 text-sm text-rose-200/80">{z.keyword}</p>
        </header>

        <section className={`mt-6 rounded-2xl border p-4 ${TONE[z.relation.tone]}`}>
          <h2 className="text-sm font-bold text-white/90">{z.relation.title}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{z.relation.text}</p>
        </section>

        <section className="mt-4 rounded-3xl border border-rose-500/20 bg-gradient-to-b from-rose-950/30 to-black/40 p-5">
          <h2 className="text-sm font-bold text-amber-100">2027년 {z.animal}띠 총운</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/75">{z.summary}</p>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["재물운", z.money],
            ["연애운", z.love],
            ["직장·학업운", z.work],
            ["건강운", z.health],
          ].map(([label, text]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <h3 className="text-sm font-bold text-rose-200">{label}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{text}</p>
            </div>
          ))}
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-400/25 bg-emerald-950/25 p-4 text-center">
            <p className="text-[11px] text-emerald-200/70">{z.animal}띠 좋은 달</p>
            <p className="mt-1 text-lg font-black text-emerald-200">{months.good.map((m) => `${m}월`).join(" · ")}</p>
          </div>
          <div className="rounded-2xl border border-amber-400/25 bg-amber-950/25 p-4 text-center">
            <p className="text-[11px] text-amber-200/70">{z.animal}띠 조심할 달</p>
            <p className="mt-1 text-lg font-black text-amber-200">{months.caution.map((m) => `${m}월`).join(" · ")}</p>
          </div>
        </section>
        <p className="mt-2 text-[11px] leading-relaxed text-white/35">
          달의 기운이 {z.animal}띠와 합을 이루면 좋은 달, 정면으로 부딪히면 조심할 달로 봤어요. 월은 양력 기준이에요.
        </p>

        {/* 개인 풀이로 이어 주기 — 이 페이지의 핵심 행동 */}
        <section className="mt-6 rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-950/40 to-rose-950/30 p-5 text-center">
          <p className="text-sm font-bold text-amber-100">같은 {z.animal}띠라도 사람마다 달라요</p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/60">
            띠는 태어난 해 하나만 본 거예요. 생년월일을 넣으면 나에게 맞춘 2027년 점수와 월별 흐름, 좋은 달·조심할 달을 무료로 볼 수 있어요.
          </p>
          <Link
            href={ctaHref}
            className="mt-4 block rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-900/40"
          >
            내 생년월일로 2027년 운세 보기 (무료)
          </Link>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold text-white/80">{z.animal}띠 출생 연도 · 2027년 나이</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {years.map((y) => (
              <span key={y.year} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/60">
                {y.year}년생 · {y.age}세
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-white/35">나이는 2027년 연 나이(2027 − 출생 연도)예요. 만 나이는 생일 전이면 한 살 적어요. 띠는 설날·입춘 무렵에 바뀌어서, 1~2월생은 앞 해의 띠일 수 있어요.</p>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-white/80">다른 띠 2027년 운세</h2>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {ZODIAC_2027.map((other) => (
              <Link
                key={other.slug}
                href={`/newyear/${other.slug}`}
                className={`rounded-xl border px-2 py-2 text-center text-xs transition ${
                  other.slug === z.slug
                    ? "border-rose-400/60 bg-rose-500/15 text-rose-100"
                    : "border-white/10 text-white/60 hover:border-white/30"
                }`}
              >
                {other.animal}띠
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/35">
          명리학의 띠 관계를 바탕으로 정리한 참고용 콘텐츠예요. 중요한 결정은 스스로의 판단을 우선해 주세요.
        </p>
      </main>
    </div>
  );
}
