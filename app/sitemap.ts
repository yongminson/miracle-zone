// app/sitemap.ts
import { MetadataRoute } from 'next';
import { supabase } from '@/app/lib/supabase';

// 🚀 베르첼의 고집불통 캐시를 강제로 부수고 항상 최신 지도를 만들게 하는 마법의 주문!
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://saju.ymstudio.co.kr';

  // 🗄️ 수파베이스에서 모든 블로그 글 가져오기
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, created_at')
    .order('created_at', { ascending: false });

  // 가져온 글들을 지도 형식에 맞게 변환
  const blogUrls = posts?.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.created_at),
  })) || [];

  return [
    {
      url: `${baseUrl}/`, // 메인 페이지
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/blog`, // 블로그 목록 페이지
      lastModified: new Date(),
    },
    ...blogUrls, // 블로그 상세 글들
  ];
}