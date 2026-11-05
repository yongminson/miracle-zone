import type { Metadata } from "next";

// /tools 는 화면이 클라이언트 전용이라 여기서 검색 정보를 준다. ?tab= 은 모두 이 주소를 원본으로 본다(기능별 입구 페이지는 따로 있다).
export const metadata: Metadata = {
  title: "무료 사주 도구 모음 — 오늘의 운세·궁합·꿈해몽·관상·로또 | 명운",
  description:
    "오늘의 운세, 띠별 운세, 궁합, 꿈해몽, 관상·이름풀이, 손금, MBTI, 내 사주 행운 번호까지. 생년월일만 넣으면 바로 볼 수 있는 명운의 무료 도구예요.",
  alternates: { canonical: "https://saju.ymstudio.co.kr/tools" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/tools",
    siteName: "명운(命運)",
    title: "무료 사주 도구 모음 | 명운",
    description: "오늘의 운세·궁합·꿈해몽·관상·로또까지, 생년월일만 넣으면 바로.",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
