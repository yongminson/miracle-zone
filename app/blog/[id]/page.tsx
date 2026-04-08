import Link from "next/link";
import { notFound } from "next/navigation";

// 📝 임시 상세 글 데이터
const postDetails: Record<string, any> = {
  "fortune-2026": {
    title: "2026년 하반기, 무조건 대박 나는 사주 특징 3가지",
    date: "2026.04.08",
    category: "사주/운세",
    content: "올해 하반기, 어떤 사주를 가진 사람들이 재물운이 터질까요? 첫 번째 특징은 바로 '물(水)'의 기운을 가진 사람들입니다... (중략) ... 과연 내 사주에는 어떤 기운이 흐르고 있을까요?",
    buttonText: "✨ 내 사주 재물운 확인하기",
  },
  "dream-secret": {
    title: "절대 남에게 말하면 안 되는 대박 길몽 TOP 5",
    summary: "돼지꿈, 똥꿈 등 꾸고 나서 절대 입 밖으로 꺼내면 안 되는 대박 꿈해몽을 정리해 드립니다.",
    date: "2026.04.07",
    category: "꿈해몽",
    content: "어젯밤 화장실에서 똥을 밟는 꿈을 꾸셨나요? 절대 누구에게도 말하지 마세요! 그건 바로... (중략) ... 어젯밤 꾼 내 꿈의 진짜 의미, 완벽하게 풀이해 드립니다.",
    buttonText: "🌙 내 꿈 길몽인지 확인하기",
  },
  "lotto-dreams": {
    title: "로또 1등 당첨자들이 공통적으로 꾼 소름돋는 꿈",
    summary: "통계로 알아보는 로또 당첨자들의 꿈 이야기와 인공지능 로또 번호 추천의 비밀.",
    date: "2026.04.05",
    category: "로또/행운",
    content: "역대 로또 1등 당첨자 100명을 분석한 결과, 가장 많이 꾼 꿈 1위는 조상님 꿈이 아니었습니다. 바로... (중략) ... 지금 바로 명운의 기운을 담아 이번 주 로또 번호를 발급받아 보세요.",
    buttonText: "💰 이번 주 로또 번호 무료 발급",
  },
};

// 🚀 Next.js 최신 버전에 맞춘 비동기(async/await) 파라미터 처리
export default async function BlogPost({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  // params가 Promise일 경우를 대비해 await로 풀어줍니다.
  const resolvedParams = await params;
  const post = postDetails[resolvedParams.id];

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto bg-[#1a1a1a] rounded-3xl p-6 md:p-10 border border-gray-800 shadow-2xl">
        
        {/* 뒤로가기 버튼 */}
        <Link href="/blog" className="inline-block text-gray-400 hover:text-yellow-400 mb-8 transition-colors text-sm">
          ← 목록으로 돌아가기
        </Link>

        {/* 본문 헤더 */}
        <div className="mb-10 border-b border-gray-800 pb-8">
          <span className="text-xs font-semibold px-3 py-1 bg-yellow-500/10 text-yellow-500 rounded-full mb-4 inline-block">
            {post.category}
          </span>
          <h1 className="text-2xl md:text-4xl font-bold mb-4 text-white leading-snug">
            {post.title}
          </h1>
          <p className="text-gray-500 text-sm">{post.date}</p>
        </div>

        {/* 본문 내용 */}
        <div className="prose prose-invert max-w-none mb-16 text-gray-300 leading-relaxed text-lg">
          <p>{post.content}</p>
          <p className="mt-8 text-yellow-400 font-medium">더 자세하고 소름 돋는 결과는 아래에서 직접 확인해 보세요!</p>
        </div>

        {/* 🚀 핵심 마케팅 훅 (메인 앱으로 납치하는 버튼) */}
        <div className="text-center bg-black/50 p-8 rounded-2xl border border-yellow-500/30">
          <h3 className="text-xl font-bold mb-6 text-white">당신의 진짜 운명이 궁금하다면?</h3>
          <Link href="/">
            <button className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black font-bold rounded-xl text-lg hover:scale-105 transition-transform shadow-[0_0_20px_rgba(234,179,8,0.3)]">
              {post.buttonText}
            </button>
          </Link>
        </div>

      </div>
    </div>
  );
}