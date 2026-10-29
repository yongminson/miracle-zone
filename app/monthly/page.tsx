import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { MonthlyClient } from "./MonthlyClient";

export const metadata: Metadata = {
  title: "이달의 운세 | 한 달 흐름과 좋은 날·조심할 날 — 명운",
  description:
    "생년월일로 계산한 이번 달 운세. 한 달의 기운과 좋은 날·조심할 날, 계약·고백·이사 같은 목적별 좋은 날까지 확인하세요.",
  keywords: ["이달의 운세", "월운", "이번달 운세", "월별 운세", "좋은 날", "길일"],
  alternates: { canonical: "https://saju.ymstudio.co.kr/monthly" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/monthly",
    siteName: "명운(命運)",
    title: "이달의 운세 — 명운",
    description: "이번 달 나의 흐름은? 좋은 날·조심할 날과 목적별 좋은 날까지.",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

export default function MonthlyPage() {
  return (
    <>
      <PageViewTracker page="monthly" />
      <MonthlyClient />
    </>
  );
}
