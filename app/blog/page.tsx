// 📝 app/blog/page.tsx (기존 코드를 지우고 이 코드로 덮어쓰세요)
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "명운(命運) 매거진 - 사주, 꿈해몽, 운세의 모든 것",
  description: "사주팔자, 띠별 운세, 길몽과 흉몽 구별법, 로또 명당 등 기적을 부르는 운명 정보를 제공합니다.",
};

// 📝 임시 블로그 글 데이터 (나중에 DB로 빼거나 이 배열에 글을 추가하면 됩니다)
const blogPosts = [
  {
    id: "fortune-2026",
    title: "2026년 하반기, 무조건 대박 나는 사주 특징 3가지",
    summary: "올해 하반기, 어떤 사주를 가진 사람들이 재물운이 터질까요? 명운에서 빅데이터로 분석해 보았습니다.",
    date: "2026.04.08",
    category: "사주/운세",
  },
  {
    id: "dream-secret",
    title: "절대 남에게 말하면 안 되는 대박 길몽 TOP 5",
    summary: "돼지꿈, 똥꿈 등 꾸고 나서 절대 입 밖으로 꺼내면 안 되는 대박 꿈해몽을 정리해 드립니다.",
    date: "2026.04.07",
    category: "꿈해몽",
  },
  {
    id: "lotto-dreams",
    title: "로또 1등 당첨자들이 공통적으로 꾼 소름돋는 꿈",
    summary: "통계로 알아보는 로또 당첨자들의 꿈 이야기와 인공지능 로또 번호 추천의 비밀.",
    date: "2026.04.05",
    category: "로또/행운",
  },
];

export default function BlogPage() {
  return (
    // 🎨 최상위 레이아웃에서 배경을 처리하므로 여기는 배경 코드를 삭제합니다.
    <div className="max-w-4xl mx-auto">
      
      {/* 헤더 섹션 - 박스를 제거하고 중앙 정렬 */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-yellow-100 text-transparent bg-clip-text">
          명운(命運) 매거진
        </h1>
        <p className="text-gray-300">
          당신의 운명을 밝혀줄 소름 돋는 정보와 비법들을 확인하세요.
          {/* (마케팅 훅 추가) - 나중에 AI 자동화가 되면 주석 해제 */}
          {/* <span className="text-yellow-400 font-medium"> [매일 아침 9시 새로운 글 업로드!]</span> */}
        </p>
      </div>

      {/* 블로그 리스트 섹션 */}
      <div className="grid gap-6">
        {blogPosts.map((post) => (
          <Link href={`/blog/${post.id}`} key={post.id}>
            {/* 블로그 카드 디자인 강화 - 더 두꺼운 테두리와 선명한 그림자 */}
            <div className="bg-[#111111]/80 p-6 rounded-2xl border-2 border-gray-800 hover:border-yellow-500/80 hover:shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all duration-300 group cursor-pointer backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                  {post.category}
                </span>
                <span className="text-sm text-gray-500">{post.date}</span>
              </div>
              <h2 className="text-xl font-bold mb-2 text-white group-hover:text-yellow-400 transition-colors">
                {post.title}
              </h2>
              <p className="text-gray-400 text-sm line-clamp-2">
                {post.summary}
              </p>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}