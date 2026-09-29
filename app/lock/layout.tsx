import type { Metadata } from "next";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

export const metadata: Metadata = {
  title: "소원 자물쇠 | 명운",
  description:
    "소원을 적은 자물쇠를 난간에 겁니다. 한 번 걸면 사라지지 않고 영구히 보관됩니다.",
};

export default function LockLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* 공유 링크(/lock/아이디)로 바로 들어온 방문의 유입 경로를 남긴다 */}
      <PageViewTracker page="lock" />
      {children}
    </>
  );
}
