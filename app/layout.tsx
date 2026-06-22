import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import CustomAnalytics from "@/components/Analytics";
import { GlobalSiteFooter } from "@/components/layout/GlobalSiteFooter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "명운(命運) - 무료 사주 운세 | 오늘의 운세 관상 궁합 꿈해몽",
  description: "AI 명리학 기반 무료 사주 운세 서비스. 오늘의 운세, 관상 분석, 이름풀이, 소름돋는 궁합, MBTI 사주, 꿈해몽까지. 지금 바로 무료로 확인하세요.",

  keywords: [
    "무료사주", "오늘의운세", "사주팔자", "관상분석", "이름풀이", "궁합",
    "꿈해몽", "MBTI사주", "무료운세", "사주운세", "AI사주", "명리학",
    "무료관상", "사주궁합", "오늘운세", "무료이름풀이"
  ],

  alternates: {
    canonical: "https://saju.ymstudio.co.kr",
  },

  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr",
    siteName: "명운(命運)",
    title: "명운(命運) - 무료 사주 운세 | 오늘의 운세 관상 궁합",
    description: "AI 명리학 기반 무료 사주 운세. 오늘의 운세, 관상, 이름풀이, 궁합, 꿈해몽까지 무료로 확인하세요.",
    images: [
      {
        url: "https://saju.ymstudio.co.kr/og-image.png",
        width: 1200,
        height: 630,
        alt: "명운 - AI 사주 운세 서비스",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "명운(命運) - 무료 사주 운세",
    description: "AI 명리학 기반 무료 사주 운세. 오늘의 운세, 관상, 이름풀이, 궁합까지 무료로!",
    images: ["https://saju.ymstudio.co.kr/og-image.png"],
  },

  verification: {
    google: "mTatlpiTN0G1CZ1XKfH_gHsYoV183kAtBlZVBxKp4fg",
    other: {
      "naver-site-verification": "6c6aa7651e110462af3e09226fe9a9e8ead3d282",
    },
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#030712] text-slate-100 min-h-screen flex flex-col`}>
        {/* 앱 전용 빌드: 포트원/애드센스/PWA 미사용 */}

        {/* 🚀 네이버 애널리틱스 */}
        <Script id="naver-analytics" strategy="afterInteractive">
          {`
            if(!wcs_add) var wcs_add = {};
            wcs_add["wa"] = "588480255fbec0";
            if(window.wcs) {
              wcs_do();
            }
          `}
        </Script>
        <Script src="//wcs.naver.net/wcslog.js" strategy="afterInteractive" />

        {/* 메인 콘텐츠 */}
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <GlobalSiteFooter />
        </div>
        <CustomAnalytics />
        <Analytics />
      </body>
    </html>
  );
}