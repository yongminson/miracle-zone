import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { SeasonClient } from "./SeasonClient";

export const metadata: Metadata = {
  title: "시험 합격운 | 수능·공무원·자격증 시험 운세 — 명운",
  description:
    "생년월일로 계산한 시험 합격운. 시험 날의 흐름, 시험 전까지 집중하기 좋은 날과 컨디션을 지킬 날, D-day 준비 계획까지 알려 드려요.",
  keywords: ["수능 운세", "시험 합격운", "수능 합격 운세", "공무원 시험 운세", "자격증 시험 운세"],
  alternates: { canonical: "https://saju.ymstudio.co.kr/season" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/season",
    siteName: "명운(命運)",
    title: "시험 합격운 — 명운",
    description: "시험 날 나의 흐름은? 집중하기 좋은 날과 D-day 준비 계획까지.",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

export default function SeasonPage() {
  return (
    <>
      <PageViewTracker page="season" />
      <SeasonClient />
    </>
  );
}
