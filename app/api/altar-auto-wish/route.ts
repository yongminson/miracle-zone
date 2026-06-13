// 📁 app/api/altar-auto-wish/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ← 서비스 롤 키 (RLS 우회)
);

// ─── 💡 마스터의 0.1% 수익화: 소원 유형 풀 (극사실주의 현실 기반) ───
const WISH_THEMES = [
  "감당하기 힘든 대출 이자와 생활고",
  "수년째 반복되는 취업/시험 탈락의 절망감",
  "사랑하는 가족(부모님/자녀)의 갑작스러운 중병과 수술",
  "뼈저리게 후회되는 이별과 재회에 대한 간절함",
  "앞이 보이지 않는 막막한 미래와 고독감",
  "간절히 바라는 아기(난임) 문제",
];

// ─── 💡 소원 스타일 풀 (기계적 말투 원천 차단) ───
const WISH_STYLES = [
  "누군가에게 하소연하듯 절박하고 눈물겹게",
  "감정을 꾹꾹 눌러담아 담담하지만 뼈저리게 간절하게",
  "지친 하루 끝에 일기장에 적듯 솔직하고 현실적으로",
];

// ─── 이름 배지 풀 ────────────────────────────────────────────────────
const NAME_BADGES = [
  "익명",
  "소망하는 자",
  "간절한 마음",
  "오늘도 버티는 중",
  "희망을 품은 자",
  "나아가는 자",
  "새벽의 기도자",
];

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── AI 소원 생성 ────────────────────────────────────────────────────
async function generateWish(): Promise<string> {
  const theme = randomPick(WISH_THEMES);
  const style = randomPick(WISH_STYLES);

  // 💡 핵심 프롬프트 엔지니어링: 번역투 및 이모지 절대 금지
  const prompt = `너는 현재 한국에 살며 극심한 현실적 어려움과 절망 속에 있는 평범한 사람이다. 
'기적의 제단'이라는 곳에 지푸라기라도 잡는 심정으로 올릴 소원 1개를 작성해라.

[절대 규칙 - 위반 시 치명적 에러]
1. 이모지, 특수기호(✨, 🙏, ❤️, 🍀, ㅠㅠ, ㅋㅋ 등) 절대 사용 금지. 오직 텍스트와 기본 문장 부호(!, ?, ., ,)만 사용.
2. 길이는 공백 포함 20자~45자 이내. 무조건 1~2문장으로 끝낼 것.
3. AI 특유의 번역투("~하기를 바랍니다", "~할 수 있도록 도와주세요") 절대 금지.
4. 진짜 사람이 쓴 것처럼 현실적이고 구체적인 구어체, 독백체 사용.

주제: "${theme}"
말투: ${style}

[완벽한 작성 예시]
- 다음 주 아빠 위암 수술입니다. 제발 무사히 끝나게 해주세요.
- 3년 준비한 공무원 시험, 이번엔 진짜 꼭 붙어서 엄마 호강시켜드리고 싶어요.
- 전세 대출 이자 때문에 매일 밤이 지옥 같습니다. 제발 숨통 좀 트이게 해주세요.
- 5년 만난 그 사람, 제가 다 잘못했어요. 딱 한 번만 다시 기회를 주세요.
- 시험관 4차 준비 중입니다. 이번에는 꼭 우리 부부에게 예쁜 천사가 찾아오길.

위 규칙을 엄격히 적용하여 다른 설명 없이 오직 '소원글 텍스트 딱 1줄'만 출력해.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 100,
      temperature: 0.8, // 적당한 감정적 변주 허용
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";

  // 💡 안전 필터: 이모지 원천 차단 정규식 강화 및 불필요한 return 제거
  const cleaned = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  
  if (!cleaned || cleaned.length < 5) {
    return "앞이 보이지 않지만, 내일은 조금 더 나아지길 기도합니다.";
  }
  
  return cleaned;
}

// ─── 메인 핸들러 ─────────────────────────────────────────────────────
export async function POST(req: Request) {
  // 보안: 내부 Cron 호출 전용 시크릿 검증
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const count: number = body.count ?? 1; // 한 번에 생성할 소원 수
  const duration: string = body.duration ?? "1h"; // "1h" | "24h" | "10d"

  const results: { success: boolean; content?: string; error?: string }[] = [];

  for (let i = 0; i < count; i++) {
    // 요청 사이 살짝 딜레이 (OpenAI rate limit 방지)
    if (i > 0) await new Promise((r) => setTimeout(r, 300));

    try {
      const content = await generateWish();
      const badge = randomPick(NAME_BADGES);
      const displayName =
        duration === "1h" ? "" : `[${badge} 님의 ${duration === "24h" ? "24시간" : "특별기원"}]`;

      const { error } = await supabase.from("wishes").insert({
        content,
        duration,
        display_mode: "anonymous",
        display_name: displayName,
        is_auto: true, // ← wishes 테이블에 이 컬럼 추가 필요 (선택사항)
      });

      if (error) {
        results.push({ success: false, error: error.message });
      } else {
        results.push({ success: true, content });
      }
    } catch (e: any) {
      results.push({ success: false, error: e.message });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    message: `✅ ${successCount}/${count}개 소원 생성 완료`,
    results,
  });
}