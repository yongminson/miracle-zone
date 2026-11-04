import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { TogetherClient } from "./TogetherClient";

export const metadata: Metadata = {
  title: "단톡방 궁합 순위 · 우리 둘 궁합 카드 — 명운",
  description:
    "링크 하나를 단톡방에 올리면 친구마다 생일만 넣고, 누가 누구랑 찰떡인지 사주 궁합 순위가 나와요. 둘이 보는 궁합 카드도 무료, 로그인 없이.",
  keywords: ["단톡방 궁합", "친구 궁합", "궁합 순위", "커플 궁합", "생일 궁합", "무료 궁합"],
  alternates: { canonical: "https://saju.ymstudio.co.kr/together" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/together",
    siteName: "명운(命運)",
    title: "우리 단톡방, 누가 누구랑 찰떡일까? — 명운",
    description: "생일만 넣으면 사주 궁합 순위가 나와요. 무료·로그인 없이.",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

export default function TogetherPage() {
  return (
    <>
      <PageViewTracker page="together" />
      <TogetherClient />
    </>
  );
}
