import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script"; // 🚀 포트원 & 구글 애드센스 스크립트 불러오기
import Analytics from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "명운(命運) - 당신의 운명을 밝히다",
  description: "AI 기반 소름 돋는 사주, 궁합, 타로, 꿈 해몽 서비스",

  verification: {
    google: "mTatlpiTN0G1CZ1XKfH_gHsYoV183kAtBlZVBxKp4fg", // 구글 검색 콘솔 (유지)
    other: {
      "naver-site-verification": "6c6aa7651e110462af3e09226fe9a9e8ead3d282", // 네이버 (유지)
      "google-adsense-account": "ca-pub-5451727566627568", // 🚀 구글 애드센스 소유권 확인 태그 추가!
    },
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png", 
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* 🚀 1. 포트원(아임포트) 결제 라이브러리 */}
        <Script 
          src="https://cdn.iamport.kr/v1/iamport.js" 
          strategy="beforeInteractive" 
        />
        
        {/* 🚀 2. 구글 애드센스 자동 광고 및 심사용 스크립트 */}
        <Script 
          id="google-adsense"
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5451727566627568" 
          crossOrigin="anonymous" 
          strategy="afterInteractive"
        />

        {/* 🚀 3. 메인 콘텐츠 및 분석 툴 */}
        {children}
        <Analytics />
      </body>
    </html>
  );
}