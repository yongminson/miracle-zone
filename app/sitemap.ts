// app/sitemap.ts
import { MetadataRoute } from 'next';
import { supabase } from '@/app/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://saju.ymstudio.co.kr';

  // 🗄️ 수파베이스에서 모든 블로그 글의 주소(slug)와 작성일(created_at)을 가져옵니다.
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, created_at')
    .order('created_at', { ascending: false });

  // 가져온 글들을 지도 형식에 맞게 변환합니다.
  const blogUrls = posts?.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.created_at),
  })) || [];

  return [
    {
      url: baseUrl, // 메인 페이지
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/blog`, // 블로그 목록 페이지
      lastModified: new Date(),
    },
    ...blogUrls, // 🚀 AI가 작성한 모든 블로그 상세 페이지들!
  ];
}