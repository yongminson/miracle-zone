import type { Metadata } from "next";

// 준비 중인 화면이라 검색에 잡히지 않게 한다. 공개할 때 이 설정을 지운다.
export const metadata: Metadata = {
  title: "소원 자물쇠 (준비 중)",
  robots: { index: false, follow: false },
};

export default function LockLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
