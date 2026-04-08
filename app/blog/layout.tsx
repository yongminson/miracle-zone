// 📝 app/blog/layout.tsx (기존 코드를 지우고 이 코드로 덮어쓰세요)
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
    // 🎨 최상위 body 레벨에서 배경을 처리합니다.
    <div 
      className="min-h-screen text-white pt-24 pb-16 px-4"
      style={{
        // 🚀 깔끔한 배경 이미지로 변경!
        backgroundImage: "url('/blog-bg-clean.png')", // 새로 다운로드 받은 파일명과 일치해야 합니다
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed', // 스크롤 시 배경은 고정 (매우 중요!)
      }}
    >
      {/* 💡 탭 메뉴 상/하단 짤림 해결: 
         전체 페이지가 이 div 안에 렌더링되므로 
         배경이 항상 전체를 커버합니다. 
      */}
      {children}
    </div>
  );
}