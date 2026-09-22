import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "소원 자물쇠 | 명운",
  description:
    "소원을 적은 자물쇠를 난간에 겁니다. 한 번 걸면 사라지지 않고 영구히 보관됩니다.",
};

export default function LockLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
