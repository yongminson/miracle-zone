import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function Home() {
  return (
    <div className="relative flex-1 bg-[#030712] text-slate-100 pb-20">
      <div className="absolute inset-0 z-0 bg-[url('/images/bg-main.jpg')] bg-cover bg-center bg-fixed opacity-30" />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#030712]/80 via-transparent to-[#030712]" />

      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto max-w-5xl px-4 pt-20 sm:px-6">

          {/* ① 히어로 섹션 */}
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-500/80">
              Miracle Zone · Premium Destiny
            </p>
            <h1 className="mt-6 font-serif text-4xl font-bold leading-tight tracking-tight text-amber-50 sm:text-5xl">
              오늘의 나를 돌아보는<br />
              <span className="text-amber-400">사주와 AI 인사이트</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300">
              AI 명리학 기반 무료 사주 운세 · 관상 분석 · 궁합 · 꿈해몽까지.<br />
              입력 정보를 차분히 정리한 사주 인사이트 리포트로 나만의 흐름을 살펴보세요.
            </p>

            {/* CTA 버튼 2개 */}
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/tools?tab=fortune"
                className="inline-block rounded-2xl border border-amber-500/40 bg-amber-500/10 px-7 py-3.5 font-serif text-base font-bold text-amber-300 shadow transition hover:bg-amber-500/20"
              >
                ✨ 오늘의 운세 무료로 보기
              </Link>
              <Link
                href="/vip"
                className="inline-block rounded-2xl bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-500 px-7 py-3.5 font-serif text-base font-bold tracking-wide text-stone-950 shadow-[0_0_30px_-5px_rgba(245,158,11,0.5)] transition hover:brightness-105"
              >
                🔥 사주 인사이트 리포트 받기
              </Link>
            </div>
          </div>

          {/* ② 제공 방식 */}
          <div className="mt-16 grid grid-cols-3 gap-3 sm:gap-5">
            {[
              { number: "PDF", label: "다운로드 제공" },
              { number: "1회", label: "결제당 리포트 발급" },
              { number: "참고용", label: "자기이해 콘텐츠" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                <p className="text-lg font-bold text-amber-300 sm:text-xl">{item.number}</p>
                <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">{item.label}</p>
              </div>
            ))}
          </div>

          {/* ③ 메뉴 카드 */}
          <div className="mt-20 border-t border-slate-800/60 pt-16">
            <h2 className="text-center font-serif text-2xl font-semibold text-slate-200">명운 오리지널 메뉴</h2>
            <p className="mt-2 text-center text-sm text-slate-400">매일의 운세를 점치고 나를 알아가는 공식 도구</p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { href: "/tools?tab=fortune", emoji: "✨", title: "오늘의 운세", desc: "음양오행 기반 금전·직장·애정운 분석", badge: "무료", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
                { href: "/tools?tab=zodiac", emoji: "🐉", title: "띠별 운세", desc: "12띠 오행 기운 · 재물·연애·직업운 분석", badge: "무료", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
                { href: "/tools?tab=saju", emoji: "👁️", title: "관상 / 이름 풀이", desc: "AI 관상 분석 · 성명학 이름풀이", badge: "1,900원", badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                { href: "/tools?tab=palmistry", emoji: "✋", title: "손금 분석", desc: "AI 손금 분석 · 재물·결혼·건강·직업운", badge: "1,900원", badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
                { href: "/tools?tab=match", emoji: "❤️", title: "소름 돋는 궁합", desc: "오행 기반 두 사람의 인연 깊이 분석", badge: "무료", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
                { href: "/tools?tab=mbti", emoji: "🧠", title: "MBTI 심층 검사", desc: "사주 × MBTI 맞춤 연애·직업 솔루션", badge: "무료", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
                { href: "/tools?tab=dream", emoji: "📖", title: "꿈 해몽", desc: "무의식이 보내는 메시지 해석", badge: "무료", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
                { href: "/tools?tab=altar", emoji: "🕯️", title: "기적의 제단", desc: "소원을 우주에 띄우는 에너지 집중", badge: "무료~", badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
                { href: "/tools?tab=lotto", emoji: "🎰", title: "행운의 로또", desc: "AI 통계 기반 행운 번호 추출", badge: "무료", badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
                { href: "/vip", emoji: "👑", title: "사주 인사이트", desc: "입력 정보 기반 해설 + PDF 리포트 + 실천 가이드", badge: "4,400원", badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
              ].map((menu) => (
                <Link
                  key={menu.href}
                  href={menu.href}
                  className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-amber-500/50 hover:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-2xl">{menu.emoji}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${menu.badgeColor}`}>
                      {menu.badge}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-base text-amber-100">{menu.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{menu.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* ④ 하단 신뢰 문구 */}
          <div className="mt-20 border-t border-slate-800/60 pt-12 pb-4">
            <div className="mx-auto max-w-2xl text-center space-y-3">
              <p className="text-sm font-serif text-amber-200/80">명운(命運) — 동양 명리학과 현대 AI 기술의 만남</p>
              <p className="text-xs leading-relaxed text-slate-500">
                명운은 수천 년 전통 해석 체계를 동양 명리학(사주팔자·음양오행·만세력)을 AI로 분석하여
                사용자가 입력한 정보를 바탕으로 참고용 콘텐츠를 쉽게 살펴볼 수 있도록 설계된 서비스입니다.
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                당신이 직면한 문제들, 운세가 가진 수천 년의 지혜를 현대적으로 재해석하여
                스스로를 돌아볼 질문과 일상에서 활용할 아이디어를 제공합니다.
              </p>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
