// app/robots.ts
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*', // 모든 검색엔진 로봇 환영!
      allow: '/',     // 모든 페이지 접근 허용!
    },
    // 나중에 구글에 제출할 지도의 위치를 미리 알려줍니다.
    sitemap: 'https://saju.ymstudio.co.kr/sitemap.xml',
  };
}