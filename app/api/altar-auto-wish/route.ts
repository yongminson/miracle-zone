// 📁 app/api/altar-auto-wish/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ← 서비스 롤 키 (RLS 우회)
);

// ─── 소원 유형 풀 (AI 프롬프트용 힌트) ───────────────────────────────
const WISH_THEMES = [
  "건강과 치유",
  "사랑과 인연",
  "재물과 풍요",
  "취업과 직장",
  "합격과 성공",
  "가족의 평안",
  "소중한 관계 회복",
  "꿈과 목표 달성",
  "감사와 위로",
  "새로운 시작",
  "용기와 자신감",
  "평화로운 일상",
];

// ─── 소원 스타일 풀 ──────────────────────────────────────────────────
const WISH_STYLES = [
  "간절하고 진심 어린 말투로",
  "짧고 강렬하게",
  "따뜻하고 부드러운 말투로",
  "담담하지만 간절하게",
  "희망차고 긍정적으로",
  "혼잣말처럼 진솔하게",
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

  const prompt = `당신은 기적의 제단에 소원을 올리는 한국인 사용자입니다.
주제: "${theme}"
말투: ${style}

조건:
- 1~3문장으로 짧게 작성
- 실제 사람이 쓴 것처럼 자연스럽게
- 종교적 내용, 욕설, 혐오, 정치적 내용 절대 금지
- 이모지 1~2개 자연스럽게 포함 가능
- 따옴표나 설명 없이 소원 내용만 출력

예시:
올해는 꼭 좋은 사람 만나게 해주세요. 혼자인 시간이 너무 길었어요 🙏
건강하게만 있어줘. 그것만으로도 충분해 💛
이번 시험, 내가 할 수 있는 최선을 다했습니다. 제발 붙게 해주세요.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 120,
      temperature: 1.1, // 다양성 극대화
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";

  // 안전 필터: 빈 값이면 fallback
  if (!text || text.length < 5) {
    return "오늘도 좋은 일이 가득하길 바랍니다 🙏";
  }
  return text;
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
        duration === "1h" ? "" : `[✨ ${badge} 님의 ${duration === "24h" ? "24시간" : "특별기원"}]`;

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