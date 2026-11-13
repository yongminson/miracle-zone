/**
 * 검색엔진·AI 가 자바스크립트 없이도 읽는 설명 + 자주 묻는 질문 + 구조화 데이터(JSON-LD). 2026-11-14
 * 화면에 보이는 글과 JSON-LD 내용이 같아야 한다(보이지 않는 글만 넣으면 검색엔진이 불이익을 준다).
 * 서버 컴포넌트 — 클라이언트 도구 화면(만세력·신년운세 등) 아래에 붙인다.
 */

const SITE = "https://saju.ymstudio.co.kr";

export type SeoFaq = { q: string; a: string };

export function SeoInfo({
  path,
  name,
  description,
  intro,
  faq,
}: {
  /** 예: "/manse" */
  path: string;
  /** 기능 이름 — 예: "무료 만세력" */
  name: string;
  /** 한 줄 설명(JSON-LD description) */
  description: string;
  /** 화면에 보이는 설명 문단들 */
  intro?: string[];
  faq: SeoFaq[];
}) {
  const url = `${SITE}${path}`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: `${name} | 명운(命運)`,
        url,
        description,
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web, Android",
        inLanguage: "ko",
        offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
        publisher: { "@type": "Organization", name: "명운(命運)", alternateName: ["명운", "명운 사주"], url: SITE },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "명운(命運)", item: SITE },
          { "@type": "ListItem", position: 2, name, item: url },
        ],
      },
    ],
  };

  return (
    <section aria-label={`${name} 안내`} className="mx-auto mt-10 max-w-2xl space-y-3 px-4 text-[13px] leading-relaxed text-white/60 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      {intro?.map((p) => (
        <p key={p} className="break-keep">{p}</p>
      ))}
      <h2 className="pt-2 text-base font-bold text-white/85">자주 묻는 질문</h2>
      <dl className="space-y-3">
        {faq.map((f) => (
          <div key={f.q}>
            <dt className="font-bold text-white/80 break-keep">Q. {f.q}</dt>
            <dd className="mt-1 break-keep">{f.a}</dd>
          </div>
        ))}
      </dl>
      <p className="pt-2 text-[11px] text-white/35">명운(命運) · saju.ymstudio.co.kr — 만세력 계산 기반 사주 운세 서비스</p>
    </section>
  );
}
