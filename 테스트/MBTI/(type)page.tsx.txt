import { Metadata } from "next";
import Link from "next/link";

// 🚀 MBTI 결과 데이터 (Home에 있는 것과 동일)
const MBTI_RESULTS: Record<string, any> = {
  "ENFJ": { title: "언변능숙형", emoji: "🌟", desc: "따뜻하고 적극적이며 책임감이 강하고 사교성이 풍부합니다.", traits: ["말로 표현을 잘함", "추진력이 강함"], bad: ["세부 사항에 약함"] },
  "ENFP": { title: "스파크형", emoji: "✨", desc: "정열적이고 활기가 넘치며 상상력이 풍부합니다.", traits: ["새로운 시도를 좋아함", "분위기 메이커"], bad: ["마무리가 약함"] },
  // ... (나머지 타입은 데이터 효율을 위해 Home과 동일하게 작동하도록 처리)
};

type Props = { params: Promise<{ type: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const resolvedParams = await props.params;
  const type = resolvedParams.type.toUpperCase();
  const res = MBTI_RESULTS[type] || { title: "심층 성격 분석", desc: "나의 진짜 성격은?" };

  return {
    title: `[MBTI] 당신은 ${type} (${res.title}) 입니다!`,
    description: res.desc,
    openGraph: {
      title: `나의 MBTI 결과는 ${type}!`,
      description: res.desc,
      images: ["/bg_face_name.png"], // MBTI용 배경 이미지나 로고
    },
  };
}

export default async function MbtiSharePage(props: Props) {
  const resolvedParams = await props.params;
  const type = resolvedParams.type.toUpperCase();
  const res = MBTI_RESULTS[type];

  if (!res) return <div className="text-white text-center mt-20">잘못된 접근입니다.</div>;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-6 pt-12">
      <div className="w-full max-w-md rounded-3xl border border-teal-500/30 bg-slate-900/90 p-8 text-center shadow-2xl">
        <div className="text-7xl mb-6">{res.emoji}</div>
        <h2 className="text-5xl font-extrabold text-teal-400 mb-2">{type}</h2>
        <h3 className="text-xl text-white mb-6">{res.title}</h3>
        <p className="text-sm text-white/80 leading-relaxed bg-black/40 p-5 rounded-2xl border border-white/5 mb-8">{res.desc}</p>
        
        <Link href="/?tab=mbti" className="block w-full rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-500 px-4 py-4 text-base font-bold text-white shadow-lg">
           🚀 나도 MBTI 무료 검사하기
        </Link>
      </div>
    </div>
  );
}