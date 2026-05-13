// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: "https://saju.ymstudio.co.kr/sitemap.xml",
    host: "https://saju.ymstudio.co.kr",
  };
}