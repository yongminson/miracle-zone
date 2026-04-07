import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script"; // 🚀 1. 구글 스크립트용 컴포넌트 불러오기
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "명운(命運) - 기적을 부르는 운세",
  description: "사주, 관상, 꿈 해몽, 궁합, 타로, 로또까지 당신의 운명을 밝혀주는 프리미엄 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* 🚀 2. 대표님의 구글 애드센스 코드 (스크린샷 ID 적용 완료) */}
        <Script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5451727566627568" 
          crossOrigin="anonymous" 
          strategy="afterInteractive"
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}