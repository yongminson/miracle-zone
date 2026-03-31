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
  title: "명운 - 당신의 운명을 밝히다",
  description: "정통 명리학 기반 오늘의 운세, 사주, 타로, 꿈 해몽 서비스",
  // 🚀 브라우저 탭에 로고 띄우기 (public/logo.jpg 파일 사용)
  icons: {
    icon: "/logo.jpg", 
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