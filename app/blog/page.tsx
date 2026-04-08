// app/blog/page.tsx
import Link from "next/link";
import { supabase } from "@/lib/supabase"; // 👈 방금 만든 파이프(연결 통로)를 불러옵니다!

// 🚀 Next.js 최신 규격 (서버에서 페이지를 만들 때마다 매번 최신 데이터를 가져옵니다)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BlogPage() {
  // 🗄️ 수파베이스 'blog_posts' 테이블에서 모든 글(*)을 최신순(created_at 내림차순)으로 가져와!
  const { data: blogPosts, error } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("데이터 로딩 실패:", error);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-yellow-100 text-transparent bg-clip-text">
          명운(命運) 매거진
        </h1>
        <p className="text-gray-300">당신의 운명을 밝혀줄 소름 돋는 정보와 비법들을 확인하세요.</p>
      </div>

      <div className="grid gap-6">
        {/* DB에서 가져온 글이 하나도 없으면 안내문구 표시 */}
        {!blogPosts || blogPosts.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            아직 작성된 운명의 글이 없습니다.
          </div>
        ) : (
          /* DB에서 가져온 글(blogPosts)을 하나씩 꺼내서 카드로 만듭니다 */
          blogPosts.map((post) => (
            <Link href={`/blog/${post.slug}`} key={post.id}>
              <div className="bg-[#111111]/80 p-6 rounded-2xl border-2 border-gray-800 hover:border-yellow-500/80 hover:shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all duration-300 group cursor-pointer backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                    {post.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold mb-2 text-white group-hover:text-yellow-400 transition-colors">
                  {post.title}
                </h2>
                <p className="text-gray-400 text-sm line-clamp-2">{post.summary}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}