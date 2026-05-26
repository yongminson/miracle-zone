import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script"; // 🚀 포트원 & 구글 애드센스 스크립트 불러오기
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
  manifest: "/manifest.json",
  themeColor: "#f59e0b",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "명운",
  },
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
      "google-adsense-account": "ca-pub-5451727566627568",
    },
  },

  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
        {/* 🚀 1. 포트원(아임포트) 결제 라이브러리 */}
        <Script 
          src="https://cdn.portone.io/v2/browser-sdk.js" 
          strategy="afterInteractive" 
        />
        
        {/* 🚀 2. 구글 애드센스 자동 광고 및 심사용 스크립트 */}
        <Script 
          id="google-adsense"
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5451727566627568" 
          crossOrigin="anonymous" 
          strategy="afterInteractive"
        />

        {/* 🚀 4. 네이버 애널리틱스 스크립트 (명운 전용) */}
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

        {/* 🚀 3. 메인 콘텐츠 및 분석 툴 */}
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <GlobalSiteFooter />
        </div>
        <Script id="sw-register" strategy="afterInteractive">{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(() => {
              console.log('SW 등록 완료');
            });
          }
        `}</Script>
        <CustomAnalytics />
        <Analytics />
      </body>
    </html>
  );
}