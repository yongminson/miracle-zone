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
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/vip`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/lotto`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...blogUrls,
  ];
}