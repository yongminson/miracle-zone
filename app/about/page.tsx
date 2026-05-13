import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "명운(命運) 소개 | 정통 명리학 기반 사주 풀이 서비스",
  description:
    "명운은 수천 년의 역사를 가진 정통 명리학을 바탕으로, 사주팔자·관상·이름풀이·궁합 등 다양한 운세 분석을 제공하는 AI 기반 사주 서비스입니다.",
  keywords: [
    "사주풀이",
    "명리학",
    "운세",
    "관상",
    "이름풀이",
    "궁합",
    "사주팔자",
    "무료사주",
    "AI사주",
  ],
  openGraph: {
    title: "명운(命運) 소개 | 정통 명리학 기반 사주 풀이 서비스",
    description:
      "수천 년의 역사를 가진 정통 명리학을 바탕으로 한 AI 사주 서비스, 명운을 소개합니다.",
    url: "https://saju.ymstudio.co.kr/about",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* 히어로 섹션 */}
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950 py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-yellow-500/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-yellow-400/80">
            About 명운(命運)
          </p>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            수천 년의 지혜를 담은
            <br />
            <span className="text-yellow-400">정통 명리학 서비스</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/60">
            명운(命運)은 동양 철학의 정수인 명리학을 현대적으로 재해석하여,
            누구나 쉽고 깊이 있게 자신의 운명을 탐구할 수 있도록 돕는
            AI 기반 사주 풀이 서비스입니다.
          </p>
        </div>
      </section>

      {/* 명리학이란 */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">
              명리학(命理學)이란 무엇인가요?
            </h2>
            <div className="mx-auto h-1 w-16 rounded-full bg-yellow-400" />
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 text-3xl">📜</div>
              <h3 className="mb-3 text-xl font-bold text-yellow-400">
                4,000년의 역사
              </h3>
              <p className="leading-relaxed text-white/70">
                명리학은 중국 고대 철학에서 비롯된 학문으로, 사람이 태어난
                연(年)·월(月)·일(日)·시(時)의 네 기둥, 즉 사주팔자(四柱八字)를
                분석하여 인간의 성격, 재능, 운명의 흐름을 파악합니다.
                수천 년간 동아시아 문화권에서 중요한 인생 지침으로 활용되어 왔습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 text-3xl">☯️</div>
              <h3 className="mb-3 text-xl font-bold text-yellow-400">
                음양오행의 원리
              </h3>
              <p className="leading-relaxed text-white/70">
                명리학의 핵심은 음양(陰陽)과 오행(五行: 木·火·土·金·水)입니다.
                자연의 변화 원리를 인간의 삶에 적용하여, 타고난 기운의 균형과
                흐름을 읽어냅니다. 강한 오행과 약한 오행의 조화를 통해
                개인의 강점과 보완할 부분을 파악할 수 있습니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 text-3xl">🔢</div>
              <h3 className="mb-3 text-xl font-bold text-yellow-400">
                천간(天干)과 지지(地支)
              </h3>
              <p className="leading-relaxed text-white/70">
                10개의 천간(갑·을·병·정·무·기·경·신·임·계)과 12개의 지지(자·축·인·묘·진·사·오·미·신·유·술·해)의
                조합으로 사주팔자를 구성합니다. 이 60갑자 체계는 우주의 순환 주기를
                반영하며, 각 개인의 독특한 에너지 패턴을 분석하는 기반이 됩니다.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mb-4 text-3xl">🌊</div>
              <h3 className="mb-3 text-xl font-bold text-yellow-400">
                대운(大運)과 세운(歲運)
              </h3>
              <p className="leading-relaxed text-white/70">
                명리학에서는 태어난 사주 외에도 10년 단위로 변화하는 대운(大運)과
                매년 바뀌는 세운(歲運)을 함께 분석합니다. 이를 통해 현재의 운기 흐름과
                앞으로의 변화 시점을 예측하고, 중요한 결정의 시기를 파악할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 서비스 소개 */}
      <section className="border-t border-white/10 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">
              명운이 제공하는 서비스
            </h2>
            <div className="mx-auto h-1 w-16 rounded-full bg-yellow-400" />
            <p className="mt-4 text-white/60">
              정통 명리학의 깊이와 현대 AI 기술의 정확성을 결합했습니다
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                icon: "🌟",
                title: "사주팔자 풀이",
                desc: "생년월일시를 기반으로 사주팔자를 분석하여 타고난 성격, 적성, 재물운, 건강운, 직업운을 종합적으로 풀이합니다. 오행의 균형과 용신(用神)을 파악하여 개인에게 최적화된 인생 방향을 안내합니다.",
              },
              {
                icon: "👁️",
                title: "관상(觀相) 분석",
                desc: "동양 관상학의 원리를 바탕으로 얼굴형, 이목구비의 특징을 분석합니다. 관상은 외형이 아닌 그 사람의 기운과 에너지를 읽는 학문으로, 성격과 운세의 경향을 파악하는 데 활용됩니다.",
              },
              {
                icon: "✍️",
                title: "이름 풀이 & 작명",
                desc: "성명학(姓名學)에 근거하여 이름의 획수, 오행, 음양 배합을 분석합니다. 이름이 가진 고유한 에너지가 삶에 미치는 영향을 파악하고, 필요시 좋은 기운을 담은 이름을 추천해드립니다.",
              },
              {
                icon: "💑",
                title: "궁합(宮合) 분석",
                desc: "두 사람의 사주팔자를 대조하여 음양오행의 조화를 분석하는 궁합은 연애·결혼은 물론 비즈니스 파트너십, 우정 등 다양한 관계에 적용할 수 있습니다. 相生(상생)과 相剋(상극)의 원리로 관계의 특성을 풀이합니다.",
              },
              {
                icon: "😴",
                title: "꿈 해몽",
                desc: "동양 전통 해몽 원리를 바탕으로 꿈의 상징과 의미를 분석합니다. 꿈은 무의식의 메시지이자 운세의 신호로 여겨져 왔으며, 꿈 속 상징들을 통해 현재 상황과 앞으로의 흐름을 읽어드립니다.",
              },
              {
                icon: "🧠",
                title: "MBTI × 사주 융합 분석",
                desc: "현대 심리학의 MBTI 성격 유형과 전통 명리학의 사주 분석을 융합하여, 동서양의 시각으로 개인의 성격과 잠재력을 다각도로 탐구합니다.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-yellow-400/30 hover:bg-white/8"
              >
                <span className="shrink-0 text-2xl">{item.icon}</span>
                <div>
                  <h3 className="mb-1 font-bold text-yellow-400">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-white/65">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 왜 명운인가 */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">
              왜 명운(命運)인가요?
            </h2>
            <div className="mx-auto h-1 w-16 rounded-full bg-yellow-400" />
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: "🎯",
                title: "정통 명리학 기반",
                desc: "수천 년간 검증된 정통 명리학 이론을 바탕으로, 단순한 흥미 위주가 아닌 학술적 근거를 갖춘 풀이를 제공합니다.",
              },
              {
                icon: "🤖",
                title: "AI 기술의 정확성",
                desc: "최신 AI 기술을 활용하여 방대한 명리학 데이터를 학습하고, 개인화된 정확한 분석 결과를 제공합니다.",
              },
              {
                icon: "🔒",
                title: "개인정보 완전 보호",
                desc: "입력하신 생년월일, 이름 등 모든 개인 정보는 분석 즉시 폐기되며, 서버에 영구 저장되지 않습니다.",
              },
              {
                icon: "📱",
                title: "언제 어디서나",
                desc: "PC, 태블릿, 스마트폰 등 어떤 기기에서도 편리하게 이용할 수 있는 반응형 서비스입니다.",
              },
              {
                icon: "💫",
                title: "무료 기본 서비스",
                desc: "핵심 사주 풀이 서비스를 무료로 제공합니다. 더 깊은 분석이 필요하신 분들을 위한 프리미엄 리포트도 준비되어 있습니다.",
              },
              {
                icon: "🌏",
                title: "글로벌 서비스",
                desc: "한국을 비롯하여 전 세계 한국어 사용자들이 이용할 수 있도록 설계된 글로벌 사주 서비스입니다.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center"
              >
                <div className="mb-3 text-3xl">{item.icon}</div>
                <h3 className="mb-2 font-bold text-yellow-400">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/65">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 운영사 정보 */}
      <section className="border-t border-white/10 bg-slate-900/50 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white">운영사 소개</h2>
            <div className="mx-auto h-1 w-16 rounded-full bg-yellow-400" />
          </div>
          <div className="mx-auto max-w-2xl rounded-2xl border border-yellow-400/20 bg-yellow-400/5 p-8">
            <h3 className="mb-6 text-xl font-bold text-yellow-400">
              와이엠 스튜디오 (YM Studio)
            </h3>
            <dl className="space-y-3 text-sm">
              {[
                ["대표자", "손용민"],
                ["사업자등록번호", "510-21-21827"],
                ["통신판매업신고번호", "제 2026-충남아산-0479 호"],
                ["주소", "충청남도 아산시 둔포면 운교길 129번길 14-71"],
                ["고객센터", "0507-1385-9994"],
                ["이메일", "support@ymstudio.co.kr"],
                ["운영시간", "평일 10:00 ~ 18:00 (주말·공휴일 제외)"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <dt className="w-32 shrink-0 font-medium text-white/50">{label}</dt>
                  <dd className="text-white/80">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-8 text-center text-sm leading-relaxed text-white/40">
            본 서비스에서 제공하는 모든 운세, 사주, 관상, 이름 풀이 결과는
            정통 명리학에 기반한 통계적·학술적 해석으로, 절대적인 미래를 예측하거나
            보장하지 않으며 법적·의료적·재정적 조언을 대체하지 않습니다.
            서비스 이용 결과에 대한 최종 판단과 책임은 이용자 본인에게 있습니다.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-center sm:py-20">
        <div className="mx-auto max-w-xl px-4">
          <h2 className="mb-4 text-2xl font-bold text-white">
            지금 바로 나의 운명을 탐구해보세요
          </h2>
          <p className="mb-8 text-white/60">
            무료로 제공되는 사주팔자 풀이로 나의 타고난 기운과 올해의 운세를 확인해보세요.
          </p>
          <a
            href="/tools"
            className="inline-block rounded-2xl bg-yellow-400 px-8 py-4 font-bold text-slate-950 shadow-lg shadow-yellow-400/20 transition-all hover:bg-yellow-300 hover:shadow-yellow-300/30"
          >
            무료 사주 풀이 시작하기 →
          </a>
        </div>
      </section>
    </main>
  );
}