import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { TaekilClient } from "./TaekilClient";

export const metadata: Metadata = {
  title: "택일 | 이사·계약·결혼 좋은 날 고르기 — 명운",
  description:
    "생년월일로 계산한 택일. 이사·계약·고백·결혼식·개업 등 목적을 고르면 앞으로 3개월 중 나에게 좋은 날과 피할 날을 알려 드려요. 두 사람 모두 좋은 날도 고를 수 있어요.",
  keywords: ["택일", "이사 좋은 날", "손 없는 날", "결혼 날짜", "계약 좋은 날", "길일"],
  alternates: { canonical: "https://saju.ymstudio.co.kr/taekil" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/taekil",
    siteName: "명운(命運)",
    title: "좋은 날 고르기(택일) — 명운",
    description: "이사·계약·결혼… 앞으로 3개월 중 나에게 좋은 날은?",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

export default function TaekilPage() {
  return (
    <>
      <PageViewTracker page="taekil" />
      <TaekilClient />
    </>
  );
}
