import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "사주 인사이트 CS | 명운",
  robots: { index: false, follow: false },
};

export default function YongmincucuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
