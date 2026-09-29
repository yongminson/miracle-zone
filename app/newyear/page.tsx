import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { NewYearClient } from "./NewYearClient";

export const metadata: Metadata = {
  title: "2027 신년운세 무료 | 정미년 붉은 양의 해 — 명운",
  description:
    "2027년 정미년 무료 신년운세. 생년월일만으로 한 해 총운, 월별 흐름, 좋은 달과 조심할 달, 삼재까지 바로 확인하세요.",
  keywords: ["2027 신년운세", "2027년 운세", "정미년 운세", "무료 신년운세", "2027 삼재", "신년운세 무료"],
  alternates: { canonical: "https://saju.ymstudio.co.kr/newyear" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/newyear",
    siteName: "명운(命運)",
    title: "2027 신년운세 무료 — 명운",
    description: "붉은 양의 해, 나의 2027년은? 총운·월별 흐름·좋은 달·조심할 달을 무료로.",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

export default function NewYearPage() {
  return (
    <>
      <PageViewTracker page="newyear" />
      <NewYearClient />
    </>
  );
}
