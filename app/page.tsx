import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function Home() {
  return (
    <div className="relative flex-1 bg-[#030712] text-slate-100 pb-20"> 
      {/* 배경 이미지: bg-main.jpg 유지 */}
      <div 
        className="absolute inset-0 z-0 bg-[url('/images/bg-main.jpg')] bg-cover bg-center bg-fixed opacity-30" 
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#030712]/80 via-transparent to-[#030712]" />

      <div className="relative z-10">
        <SiteHeader />
        
        <main className="mx-auto max-w-5xl px-4 pt-20 sm:px-6">
          {/* 히어로 섹션 (원상 복구) */}
          <div className="text-center">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-500/80">
              Miracle Zone · Premium Destiny
            </p>
            <h1 className="mt-6 font-serif text-4xl font-bold leading-tight tracking-tight text-amber-50 sm:text-5xl">
              당신의 운명을 바꿀<br />
              <span className="text-amber-400">단 하나의 마스터피스</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300">
              만세력 명식과 AI 심층 해설을 한 장의 프리미엄 PDF로 압축합니다. 지금 입력하면 리포트가 바로 준비됩니다.
            </p>
            <div className="mt-10">
              <Link 
                href="/vip"
                className="inline-block rounded-2xl bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-500 px-8 py-4 font-serif text-lg font-bold tracking-wide text-stone-950 shadow-[0_0_30px_-5px_rgba(245,158,11,0.5)] transition hover:brightness-105"
              >
                🔥 내 운명의 그릇 확인하기 (VIP 리포트)
              </Link>
            </div>
          </div>

          {/* 명운 오리지널 6개 메뉴 (실제 라우팅 주소 완벽 적용) */}
          <div className="mt-32 border-t border-slate-800/60 pt-16">
            <h2 className="text-center font-serif text-2xl font-semibold text-slate-200">명운 오리지널 메뉴</h2>
            <p className="mt-2 text-center text-sm text-slate-400">매일의 운세를 점치고 나를 알아가는 기본 공식 도구</p>
            
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/tools?tab=fortune" className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-amber-500/50 hover:bg-slate-800/50">
                <h3 className="font-serif text-lg text-amber-100">✨ 오늘의 운세</h3>
                <p className="mt-2 text-sm text-slate-400">음양오행, 금전, 직장 등 오늘 하루 흐름</p>
              </Link>
              <Link href="/tools?tab=saju" className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-amber-500/50 hover:bg-slate-800/50">
                <h3 className="font-serif text-lg text-amber-100">👁️ 관상 / 이름 풀이</h3>
                <p className="mt-2 text-sm text-slate-400">관상 분석, 직업, 관자 운세</p>
              </Link>
              <Link href="/tools?tab=match" className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-amber-500/50 hover:bg-slate-800/50">
                <h3 className="font-serif text-lg text-amber-100">❤️ 소름 돋는 궁합</h3>
                <p className="mt-2 text-sm text-slate-400">두 사람의 인연 깊이 분석</p>
              </Link>
              <Link href="/tools?tab=mbti" className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-amber-500/50 hover:bg-slate-800/50">
                <h3 className="font-serif text-lg text-amber-100">🧠 MBTI 심층 검사</h3>
                <p className="mt-2 text-sm text-slate-400">성향 파악과 맞춤 연애/직업 솔루션</p>
              </Link>
              <Link href="/tools?tab=dream" className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-amber-500/50 hover:bg-slate-800/50">
                <h3 className="font-serif text-lg text-amber-100">📖 꿈 해몽</h3>
                <p className="mt-2 text-sm text-slate-400">무의식이 보내는 메시지 해석</p>
              </Link>
              <Link href="/tools?tab=altar" className="group rounded-2xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-amber-500/50 hover:bg-slate-800/50">
                <h3 className="font-serif text-lg text-amber-100">🕯️ 기적의 제단</h3>
                <p className="mt-2 text-sm text-slate-400">소원 성취의 에너지 집중</p>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}