import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VIP CS | 명운",
  robots: { index: false, follow: false },
};

export default function YongmincucuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
