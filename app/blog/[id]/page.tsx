import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/app/lib/supabase"; // 🚀 수파베이스 파이프 연결!

export default async function BlogPost({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await params;
  const slug = resolvedParams.id; // URL 주소에 있는 값 (예: first-automation)

  // 🗄️ DB에서 해당 slug와 일치하는 글 하나만 딱 가져옵니다!
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !post) {
    notFound(); // 글이 없으면 404 페이지로 보냅니다.
  }

  return (
    <div className="min-h-screen text-gray-200 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto bg-[#111111]/80 backdrop-blur-md rounded-3xl p-6 md:p-10 border border-gray-800 shadow-2xl">
        
        <Link href="/blog" className="inline-block text-gray-400 hover:text-yellow-400 mb-8 transition-colors text-sm">
          ← 목록으로 돌아가기
        </Link>

        <div className="mb-10 border-b border-gray-800 pb-8">
          <span className="text-xs font-semibold px-3 py-1 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-full mb-4 inline-block">
            {post.category}
          </span>
          <h1 className="text-2xl md:text-4xl font-bold mb-4 text-white leading-snug">
            {post.title}
          </h1>
          <p className="text-gray-500 text-sm">
             {new Date(post.created_at).toLocaleDateString()}
          </p>
        </div>

        <div className="prose prose-invert max-w-none mb-16 text-gray-300 leading-relaxed text-lg">
          {/* 🚀 DB에 저장된 본문 내용 출력 (줄바꿈/엔터 완벽 적용) */}
          <div className="whitespace-pre-wrap">{post.content}</div>
          <p className="mt-8 text-yellow-400 font-medium">더 자세하고 소름 돋는 결과는 아래에서 직접 확인해 보세요!</p>
        </div>

        <div className="text-center bg-black/60 backdrop-blur-sm p-8 rounded-2xl border border-yellow-500/30">
          <h3 className="text-xl font-bold mb-6 text-white">당신의 진짜 운명이 궁금하다면?</h3>
          <Link href="/">
            <button className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold rounded-xl text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              ✨ 나의 운명 확인하러 가기
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}