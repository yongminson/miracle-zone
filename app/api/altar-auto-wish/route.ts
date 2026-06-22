import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WISH_THEMES = [
  "신용불량 직전, 이번 달 카드값도 막막한 상황",
  "감당하기 힘든 대출 이자와 생활고",
  "폐업 직전 자영업자의 마지막 버팀목",
  "월세조차 못 내고 쫓겨날 위기",
  "갑자기 실직해서 가족 생계가 막막한 상황",
  "전세 사기 피해로 보증금을 날린 절망",
  "청약 10년째 낙첨, 내 집 마련의 꿈",
  "수년째 반복되는 취업/시험 탈락의 절망감",
  "30대에 다시 시작한 공무원 시험 준비",
  "대기업 최종면접 탈락을 반복하는 취준생의 좌절",
  "편입 시험을 앞둔 마지막 도전",
  "사랑하는 부모님의 갑작스러운 암 진단",
  "어린 자녀가 희귀병 진단을 받은 부모의 기도",
  "배우자의 큰 수술을 앞두고 밤새 잠 못 드는 마음",
  "노부모님 치매 간병으로 지쳐가는 중",
  "사고 후유증으로 일을 못 하게 된 가장의 간절함",
  "뼈저리게 후회되는 이별과 재회에 대한 간절함",
  "10년 지기 친구와 크게 다투고 연락이 끊긴 상황",
  "가족과 오랜 불화로 연락을 못 하는 상황",
  "이혼 위기에 처한 부부의 마지막 간절함",
  "앞이 보이지 않는 막막한 미래와 고독감",
  "50대에 느끼는 인생의 허무함과 방향 상실",
  "반복되는 우울감과 무기력에서 벗어나고 싶은 마음",
  "간절히 바라는 아기, 시험관 시술을 반복 중",
  "유산을 겪은 후 다시 임신을 기도하는 마음",
];

const WISH_STYLES = [
  "누군가에게 하소연하듯 절박하고 눈물겹게",
  "감정을 꾹꾹 눌러담아 담담하지만 뼈저리게 간절하게",
  "지친 하루 끝에 일기장에 적듯 솔직하고 현실적으로",
  "새벽 3시에 혼자 중얼거리듯 체념 섞인 간절함으로",
  "억울하고 분하지만 결국 기댈 곳 없어 빌 수밖에 없는 심정으로",
];

const WISH_PERSONAS = [
  "43세 가장", "28세 취준생", "55세 자영업자", "35세 워킹맘",
  "62세 할머니", "19세 수험생", "40대 주부", "30대 직장인",
  "50대 간병인", "25세 사회초년생",
];

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

async function generateWish(): Promise<string> {
  const theme = randomPick(WISH_THEMES);
  const style = randomPick(WISH_STYLES);
  const persona = randomPick(WISH_PERSONAS);

  const { data: recentWishes } = await supabase
    .from("wishes")
    .select("content")
    .eq("is_auto", true)
    .order("created_at", { ascending: false })
    .limit(8);

  const avoidClause =
    recentWishes && recentWishes.length > 0
      ? "\n[아래 최근 소원과 비슷한 내용/표현 절대 금지]\n" +
        recentWishes.map((w) => `- ${w.content}`).join("\n") +
        "\n"
      : "";

  const prompt =
    `너는 현재 한국에 살며 극심한 현실적 어려움과 절망 속에 있는 ${persona}이다.\n` +
    `'기적의 제단'이라는 곳에 지푸라기라도 잡는 심정으로 올릴 소원 1개를 작성해라.\n\n` +
    `[절대 규칙]\n` +
    `1. 이모지, 특수기호 절대 사용 금지. 텍스트와 기본 문장 부호(!, ?, ., ,)만 사용.\n` +
    `2. 길이는 공백 포함 20자~45자 이내. 1~2문장으로 끝낼 것.\n` +
    `3. AI 특유의 번역투("~하기를 바랍니다", "~할 수 있도록 도와주세요") 절대 금지.\n` +
    `4. 진짜 사람이 쓴 것처럼 현실적이고 구체적인 구어체, 독백체 사용.\n` +
    avoidClause +
    `\n주제: "${theme}"\n` +
    `말투: ${style}\n` +
    `페르소나: ${persona}\n\n` +
    `다른 설명 없이 오직 소원글 텍스트 딱 1줄만 출력해.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 100,
      temperature: 0.9,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text: string = data.choices?.[0]?.message?.content?.trim() ?? "";

  const cleaned = text
    .replace(
      /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
      ""
    )
    .trim();

  if (!cleaned || cleaned.length < 5) {
    return "앞이 보이지 않지만, 내일은 조금 더 나아지길 기도합니다.";
  }

  return cleaned;
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const count: number = body.count ?? 1;
  const duration: string = body.duration ?? "1h";

  const results: { success: boolean; content?: string; error?: string }[] = [];

  for (let i = 0; i < count; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 300));

    try {
      const content = await generateWish();
      const badge = randomPick(NAME_BADGES);
      const displayName =
        duration === "1h"
          ? ""
          : `[${badge} 님의 ${duration === "24h" ? "24시간" : "특별기원"}]`;

      const { error } = await supabase.from("wishes").insert({
        content,
        duration,
        display_mode: "anonymous",
        display_name: displayName,
        is_auto: true,
      });

      if (error) {
        results.push({ success: false, error: error.message });
      } else {
        results.push({ success: true, content });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown error";
      results.push({ success: false, error: msg });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  return NextResponse.json({
    message: `${successCount}/${count}개 소원 생성 완료`,
    results,
  });
}