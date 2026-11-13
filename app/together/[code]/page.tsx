import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { RoomClient } from "./RoomClient";

// 방 화면은 링크를 받은 사람만 본다 — 검색에 나오지 않게
export const metadata: Metadata = {
  title: "우리 궁합 방 | 명운(命運)",
  description: "생일만 넣으면 이 방에서 누가 누구랑 잘 맞는지 사주 궁합이 나와요. 무료·로그인 없이.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "명운(命運)",
    title: "생일만 넣으면 우리 궁합이 나와요 | 명운(命運)",
    description: "누가 누구랑 찰떡일까? 무료·로그인 없이 1분.",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <>
      <PageViewTracker page="together_room" />
      <RoomClient code={code} />
    </>
  );
}
