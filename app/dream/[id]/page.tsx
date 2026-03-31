import { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

// 🚀 [보안 프리패스] 서버 컴포넌트이므로 안전하게 관리자 키(SERVICE_ROLE_KEY)를 사용하여 무조건 데이터를 긁어옵니다!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data } = await supabase.from("dreams").select("*").eq("id", params.id).single();

  if (!data) return { title: "꿈 해몽 | 명운" };

  return {
    title: `${data.title} | 명운 해몽 백과`,
    description: data.summary,
    openGraph: {
      title: data.title,
      description: data.summary,
      type: "article",
      siteName: "명운",
    },
    twitter: {
      title: data.title,
      description: data.summary,
      card: "summary",
    }
  };
}

export default async function DreamPost({ params }: { params: { id: string } }) {
  // DB에서 데이터 직통으로 긁어오기 (에러가 나면 error 변수에 담김)
  const { data: dream, error } = await supabase.from("dreams").select("*").eq("id", params.id).single();

  if (error || !dream) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold text-yellow-400 mb-4">해몽 정보를 찾을 수 없습니다.</h1>
        {error && <p className="text-red-400 mb-6 text-sm">에러 상세: {error.message}</p>}
        <Link href="/?tab=dream" className="px-6 py-3 bg-white/10 rounded-xl hover:bg-white/20">
          돌아가기
        </Link>
      </div>
    );
  }

  // 🚀 조회수 1 증가 (Supabase는 자체적으로 에러를 흡수하므로 catch가 필요 없습니다)
  await supabase.rpc('increment_dream_view', { row_id: params.id });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-10 px-4 sm:px-6 md:px-8 font-sans">
      <article className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* 블로그 헤더 */}
        <header className="px-6 py-8 sm:p-10 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${dream.dream_type.includes("길몽") ? "bg-yellow-500/20 text-yellow-400" : dream.dream_type.includes("흉몽") ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
              {dream.dream_type}
            </span>
            <span className="text-xs text-slate-400">
              조회수 {dream.view_count || 0}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight mb-4">
            {dream.title}
          </h1>
          <div className="p-4 bg-black/40 rounded-xl border border-slate-800 text-sm sm:text-base text-slate-300 leading-relaxed italic">
            &quot;{dream.user_input}&quot;
          </div>
        </header>

        {/* 블로그 본문 (SEO 최적화) */}
        <div className="p-6 sm:p-10 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-blue-400 mb-3 flex items-center gap-2">
              <span>💡</span> 해몽 핵심 요약
            </h2>
            <p className="text-base leading-relaxed text-slate-300 bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10">
              {dream.summary}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">🔍 상세 풀이</h2>
            <p className="text-base leading-loose text-slate-300 whitespace-pre-wrap">
              {dream.details}
            </p>
          </section>

          {dream.action_guide && (
            <section className="bg-indigo-900/20 border border-indigo-500/20 p-6 rounded-2xl mt-8">
              <h2 className="text-lg font-bold text-indigo-400 mb-2">행동 지침 (가이드)</h2>
              <p className="text-indigo-200/80 leading-relaxed">{dream.action_guide}</p>
            </section>
          )}
        </div>

        {/* 하단 푸터 (메인 서비스로 유도하는 CTA) */}
        <footer className="p-6 sm:p-10 bg-slate-950 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-400 mb-6">나도 어젯밤 꾼 꿈의 의미가 궁금하다면?</p>
          <Link href="/?tab=dream" className="inline-block w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-900/20 hover:scale-105 transition-transform">
            무료 꿈 해몽하기
          </Link>
        </footer>
      </article>
    </div>
  );
}