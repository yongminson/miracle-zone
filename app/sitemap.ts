// app/sitemap.ts
import { MetadataRoute } from 'next';
import { supabase } from '@/app/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://saju.ymstudio.co.kr';

  // 🗄️ 수파베이스에서 모든 블로그 글 가져오기
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, created_at')
    .order('created_at', { ascending: false });

  // 💡 수정된 부분: url 배열을 명확하게 생성
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
    ...blogUrls, // 블로그 상세 글들
  ];
}