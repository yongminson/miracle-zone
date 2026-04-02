import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Metadata } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Props = { params: Promise<{ id: string }> };

// 🚀 카톡 공유 시 나타나는 예쁜 썸네일과 제목(OG 태그) 설정
export async function generateMetadata(props: Props): Promise<Metadata> {
  const resolvedParams = await props.params; // Next.js 15 호환 비동기 추출!
  const { data } = await supabase.from("dreams").select("*").eq("id", resolvedParams.id).single();
  
  if (!data) return { title: "명운(命運) - 꿈 해몽" };
  
  const type = data.dream_type || "꿈 해몽";
  const summary = data.summary || "소름돋는 꿈 해몽 결과를 확인하세요.";

  return {
    title: `[${type}] ${summary} | 명운`,
    description: data.details?.substring(0, 60) + "...",
    openGraph: {
      title: `[${type}] ${summary}`,
      description: data.details?.substring(0, 60) + "...",
      images: ["/bg_dream.png"], // 카톡 공유 시 뜨는 썸네일
    },
  };
}

export default async function DreamSharePage(props: Props) {
  // 🚀 비동기로 안전하게 id 추출 (404 에러의 원인 해결)
  const resolvedParams = await props.params;
  const { data: dream, error } = await supabase
    .from("dreams")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();

  if (error || !dream) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <h1 className="text-2xl font-bold text-rose-400 mb-4">결과를 찾을 수 없습니다 😢</h1>
        <p className="text-white/70 mb-8">존재하지 않거나 삭제된 꿈 해몽입니다.</p>
        <Link href="/?tab=dream" className="px-6 py-3 bg-blue-500/20 text-blue-300 border border-blue-500/50 hover:bg-blue-500/30 rounded-xl font-bold transition-colors">
          명운(命運)에서 새로 꿈 해몽하기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: "url('/bg_dream.png')" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center p-6 pt-12 pb-20 min-h-full w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="명운 로고" className="w-12 h-12 object-contain mx-auto mb-3 opacity-80" />
          <h1 className="text-2xl font-extrabold text-blue-200 drop-shadow-lg">누군가의 무의식 분석 결과</h1>
        </div>

        <div className="w-full rounded-3xl border border-white/20 bg-slate-900/85 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-fade-in-up">
          <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-4">
            <span className={`px-4 py-1.5 text-sm font-bold rounded-full ${dream.dream_type?.includes("길몽") ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50" : dream.dream_type?.includes("흉몽") ? "bg-red-500/20 text-red-400 border border-red-500/50" : "bg-blue-500/20 text-blue-400 border border-blue-500/50"}`}>
              {dream.dream_type || "꿈 해몽"}
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-blue-300 mb-4 leading-relaxed break-keep">{dream.summary}</h3>
          
          {dream.user_input && (
            <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-blue-300 mb-1">📝 꾼 꿈의 내용</p>
              <p className="text-sm text-white/80 leading-relaxed">&quot;{dream.user_input}&quot;</p>
            </div>
          )}

          <p className="text-sm text-white/90 leading-loose break-keep mb-6 p-5 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
            {dream.details}
          </p>
          
          {dream.action_guide && (
            <div className="rounded-2xl bg-indigo-900/40 border border-indigo-500/40 p-5 mb-8">
              <p className="text-xs font-bold text-indigo-300 mb-2 flex items-center gap-2"><span>💡</span> 행동 지침</p>
              <p className="text-sm text-white font-medium leading-relaxed">{dream.action_guide}</p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-3">
            <p className="text-center text-xs text-white/50 mb-1">나도 어젯밤 꾼 꿈이 궁금하다면?</p>
            <Link href="/?tab=dream" className="w-full text-center rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 px-4 py-4 text-base font-bold text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02] transition-transform">
              🌙 내 꿈도 무료로 해몽하기
            </Link>
            <Link href="/?tab=fortune" className="w-full text-center rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-sm font-medium text-white/80 hover:bg-white/10 transition-colors">
              ✨ 명운(命運) 홈으로 가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}