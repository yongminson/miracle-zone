import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

export const metadata: Metadata = {
  title: "사주 인사이트 리포트 — 만세력 기반 14장 사주 풀이 PDF | 명운(命運)",
  description:
    "생년월일과 태어난 시로 계산한 사주 여덟 글자·십성·10년 대운·5년 흐름을 재물·직장·연애·관계·건강 14개 장으로 풀어 PDF로 드려요. 결제 전에 견본을 먼저 볼 수 있어요.",
  alternates: { canonical: "https://saju.ymstudio.co.kr/vip" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/vip",
    siteName: "명운(命運)",
    title: "사주 인사이트 리포트 — 14장 사주 풀이 PDF | 명운(命運)",
    description: "사주 여덟 글자·10년 대운·5년 흐름을 14개 장으로. 결제 전 견본 미리보기.",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

/**
 * 이 화면으로 바로 들어온 방문(블로그 링크·공유 링크)의 유입 경로를 남긴다.
 * 예전에는 랜딩과 도구 화면에서만 기록해서, 여기로 바로 온 사람은 빠졌다.
 */
export default function VipLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageViewTracker page="vip" />
      {children}
    </>
  );
}
