import Link from "next/link";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MenuTabs } from "@/components/layout/MenuTabs";
import { FEATURE_PAGES, featureJsonLd, type FeatureKey } from "@/lib/seo/feature-pages";

// 기능별 검색 입구 페이지의 공통 화면 (2026-11-05). 서버에서 그려서 검색엔진·AI 가 JS 없이도 내용을 읽는다.
// 실제 기능은 /tools?tab=… 에 있고, 여기는 설명과 바로 가기 버튼만 둔다. children 은 페이지별 추가 내용(로또 당첨번호 등).
export function FeatureLanding({ feature, children }: { feature: FeatureKey; children?: React.ReactNode }) {
  const p = FEATURE_PAGES[feature];
  const jsonLd = JSON.stringify(featureJsonLd(feature)).replace(/</g, "\\u003c");

  return (
    <div className="min-h-screen bg-[#07060c] text-slate-100">
      <PageViewTracker page={`seo_${feature}`} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <SiteHeader variant="marketing" />
      <MenuTabs active={p.menu} />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-amber-300/80">{p.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-amber-100 sm:text-4xl">{p.h1}</h1>
        </header>

        <div className="mt-6 space-y-3 text-[15px] leading-relaxed text-white/80">
          {p.intro.map((line) => (
            <p key={line} className="break-keep">{line}</p>
          ))}
        </div>

        <Link
          href={p.cta.href}
          className="mt-6 block rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-4 text-center text-base font-bold text-slate-900 shadow-lg shadow-amber-900/30"
        >
          {p.cta.label} →
        </Link>

        {children}

        {p.sections.map((s) => (
          <section key={s.heading} className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-5">
            <h2 className="text-base font-bold text-white">{s.heading}</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-white/75">
              {s.items.map((item) => (
                <li key={item} className="break-keep">{item}</li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-bold text-white">자주 묻는 것</h2>
          {p.faq.map((f) => (
            <details key={f.q} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3" open>
              <summary className="cursor-pointer text-sm font-bold text-white/90">{f.q}</summary>
              <p className="mt-2 text-[13px] leading-relaxed text-white/70 break-keep">{f.a}</p>
            </details>
          ))}
        </section>

        <Link
          href={p.cta.href}
          className="mt-8 block rounded-2xl border border-amber-400/50 bg-amber-500/10 px-5 py-4 text-center text-sm font-bold text-amber-100"
        >
          {p.cta.label} →
        </Link>

        <nav aria-label="관련 메뉴" className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-white/55">
          {p.related.map((r) => (
            <Link key={r.href} href={r.href} className="underline">{r.label}</Link>
          ))}
        </nav>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-white/35 break-keep">
          명운의 결과는 전통 명리·상법을 참고한 콘텐츠이며 미래를 보장하지 않아요. 의료·법률·재정 판단은 전문가와 상의해 주세요.
        </p>
      </main>
    </div>
  );
}
