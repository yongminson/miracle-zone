import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 🚀 검색엔진 최적화(SEO) 및 카카오톡 공유 썸네일 세팅 완료
export const metadata: Metadata = {
  title: "명운(命運) - 프리미엄 운세 및 기적의 제단",
  description: "정통 명리학 기반 오늘의 운세, 소름 돋는 AI 꿈 해몽, 관상과 이름 풀이, 행운의 로또까지. 당신의 운명을 확인하세요.",
  keywords: ["운세", "오늘의운세", "꿈해몽", "사주", "관상", "이름풀이", "로또번호", "길몽", "무료운세"],
  openGraph: {
    title: "명운(命運) - 프리미엄 운세 및 기적의 제단",
    description: "정통 명리학 기반 오늘의 운세와 소름 돋는 꿈 해몽을 지금 바로 확인해보세요.",
    url: "https://ymstudio.co.kr", // 대표님 실제 도메인 적용
    siteName: "명운(命運)",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}