// 📝 app/blog/layout.tsx (새로 만들거나 수정하세요)
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | 명운(命運) 매거진",
    default: "명운(命運) 매거진 - 운명의 모든 것",
  },
  description: "사주팔자, 띠별 운세, 길몽과 흉몽 구별법, 로또 명당 등 기적을 부르는 운명 정보를 제공합니다.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 🎨 신비로운 고문서 배경 이미지 적용 (blog-bg.png)
    <div 
      className="min-h-screen text-white pt-24 pb-16 px-4"
      style={{
        backgroundImage: "url('/blog-bg.png')", // 다운로드 받은 파일명과 일치해야 합니다
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', // 스크롤 시 배경은 고정
      }}
    >
      {children}
    </div>
  );
}