import { Metadata } from "next";
import Link from "next/link";

// 🚀 16개 MBTI 전체 데이터 완벽 복구
const MBTI_RESULTS: Record<string, any> = {
  "ENFJ": { title: "언변능숙형", emoji: "🌟", desc: "따뜻하고 적극적이며 책임감이 강하고 사교성이 풍부하고 동정심이 많습니다." },
  "ENFP": { title: "스파크형", emoji: "✨", desc: "정열적이고 활기가 넘치며 상상력이 풍부하고 온정적입니다." },
  "ENTJ": { title: "지도자형", emoji: "🚀", desc: "열성이 많고 솔직하고 단호하며 통솔력이 있습니다." },
  "ENTP": { title: "발명가형", emoji: "💡", desc: "민첩하고 독창적이며 안목이 넓고 다방면에 관심과 재능이 많습니다." },
  "ESFJ": { title: "친선도모형", emoji: "🤝", desc: "동정심이 많고 다른 사람에게 관심을 쏟으며 인화를 중시합니다." },
  "ESFP": { title: "사교적인 유형", emoji: "🎉", desc: "사교적이고 활동적이며 수용력이 강하고 친절하며 낙천적입니다." },
  "ESTJ": { title: "사업가형", emoji: "💼", desc: "구체적이고 현실적이고 사실적이며 활동을 조직화하고 주도해 나가는 지도력이 있습니다." },
  "ESTP": { title: "수완좋은 활동가형", emoji: "🏎️", desc: "현실적인 문제 해결에 능하며 적응력이 강하고 관용적입니다." },
  "INFJ": { title: "예언자형", emoji: "🔮", desc: "인내심이 많고 통찰력과 직관력이 뛰어나며 양심이 바르고 화합을 추구합니다." },
  "INFP": { title: "잔다르크형", emoji: "🕊️", desc: "정열적이고 충실하며 목가적이고, 낭만적이며 내적 신념이 깊습니다." },
  "INTJ": { title: "과학자형", emoji: "♟️", desc: "사고가 독창적이고 창의력이 뛰어나며, 비판적인 분석력이 탁월합니다." },
  "INTP": { title: "아이디어 뱅크형", emoji: "🔬", desc: "조용하고 과묵하며 논리와 분석으로 문제를 해결하기 좋아합니다." },
  "ISFJ": { title: "임금 뒷면의 권력형", emoji: "🛡️", desc: "조용하고 차분하며 친근하고 책임감이 있으며 헌신적입니다." },
  "ISFP": { title: "성인군자형", emoji: "🎨", desc: "말없이 다정하고 온화하며 친절하고 연기력이 뛰어나며 겸손합니다." },
  "ISTJ": { title: "세상의 소금형", emoji: "📋", desc: "실제 사실에 대하여 정확하고 체계적으로 기억하며 일 처리에 있어서도 신중하고 책임감이 있습니다." },
  "ISTP": { title: "백과사전형", emoji: "🛠️", desc: "조용하고 과묵하고 절제된 호기심으로 인생을 관찰하며 상황을 파악하는 민감성과 도구를 다루는 뛰어난 능력이 있습니다." },
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
      images: ["/bg_mbti.png"], // 나중에 만드실 배경 이미지 연동 완료
    },
  };
}

export default async function MbtiSharePage(props: Props) {
  const resolvedParams = await props.params;
  const type = resolvedParams.type.toUpperCase();
  const res = MBTI_RESULTS[type];

  if (!res) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-xl font-bold">존재하지 않는 결과입니다 😢</div>;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* 배경 */}
      <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/bg_mbti.png')" }} />
      
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-teal-500/30 bg-slate-900/90 p-8 md:p-10 text-center shadow-[0_0_40px_rgba(20,184,166,0.2)] backdrop-blur-xl animate-fade-in-up">
        <div className="text-8xl mb-6 animate-bounce">{res.emoji}</div>
        <h2 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-400 mb-4 drop-shadow-lg">
          {type}
        </h2>
        <h3 className="text-2xl font-bold text-white mb-6">{res.title}</h3>
        <p className="text-sm text-white/90 leading-loose break-keep bg-black/40 p-6 rounded-2xl border border-white/10 mb-8 shadow-inner">
          {res.desc}
        </p>
        
        <Link href="/?tab=mbti" className="block w-full rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-500 px-4 py-4 text-base font-bold text-white shadow-lg shadow-teal-900/50 hover:scale-[1.02] transition-transform">
           🚀 나도 MBTI 무료 검사하기
        </Link>
      </div>
    </div>
  );
}