import { supabase } from "@/app/lib/supabase";
import { isIndexablePost } from "@/lib/blog/daily-post";

// 블로그 RSS (2026-11-04) — 네이버 서치어드바이저 "RSS 제출"용. 매일 자동으로 쓰는 블로그 글(blog_posts) 최신 50개.
// 새 글을 네이버가 빨리 알아채게 한다. 한 시간마다 다시 만든다.
export const revalidate = 3600;

const BASE = "https://saju.ymstudio.co.kr";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, title, category, summary, content, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const items = (posts ?? [])
    .filter((post) => isIndexablePost(post))
    .slice(0, 50)
    .map((post) => {
      const link = `${BASE}/blog/${post.slug}`;
      const description = (post.summary || String(post.content ?? "").slice(0, 200)).trim();
      return `    <item>
      <title>${escapeXml(post.title ?? "")}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(description)}</description>
      ${post.category ? `<category>${escapeXml(post.category)}</category>` : ""}
      <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>명운(命運) 블로그 — 오늘의 운세·사주 이야기</title>
    <link>${BASE}/blog</link>
    <description>명운이 매일 전하는 오늘의 운세, 사주, 꿈해몽, 행운 이야기</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
