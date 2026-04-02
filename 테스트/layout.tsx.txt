import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script"; // 🚀 포트원 스크립트 불러오기 추가!

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
  icons: {
    icon: "/logo.png", // 브라우저 탭 창에 뜨는 아이콘 (파비콘)
    shortcut: "/logo.png", 
    apple: "/logo.png", // 🍎 아이폰/안드로이드 바탕화면에 추가할 때 뜨는 앱 아이콘
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* 🚀 포트원(아임포트) 결제 라이브러리 추가! */}
        <Script src="https://cdn.iamport.kr/v1/iamport.js" strategy="beforeInteractive" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}