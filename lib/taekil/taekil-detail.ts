import OpenAI from "openai";
import { kstToday } from "@/lib/calendar/day-luck";
import { calculateTaekil, taekilLabel } from "./taekil-engine";
import type { TaekilDay, TaekilDetail, TaekilInput, TaekilPaid } from "./taekil-types";

/**
 * 택일 상세(유료 2,200원) — 계산으로 고른 날짜마다 AI 가 준비·조언을 쓴다.
 * 날짜·순위는 계산이 정하고 AI 는 바꾸지 못한다. 결제 1건당 한 번만 부르고 저장한다.
 */

const SYSTEM_PROMPT = `당신은 한국 명리학에 밝은 택일(좋은 날 고르기) 상담가입니다. 계산으로 고른 날짜를 바탕으로 조언을 씁니다.

규칙:
1. 날짜와 순위는 이미 정해져 있습니다. 날짜를 바꾸거나 새 날짜를 추천하지 않습니다.
2. 겁주거나 단정하지 않습니다. "반드시 성공한다", "이날 하면 망한다" 같은 표현을 쓰지 않습니다. 좋은 날은 "힘이 실리는 날"로, 피할 날은 "가능하면 피하면 좋은 날"로 씁니다.
3. 한자·전문용어(십성, 간지, 일지, 충, 합 등)는 쓰지 않고 누구나 알아듣는 말로 풉니다.
4. 날짜별 조언(tip)은 그 목적을 그날 실제로 할 때 도움이 되는 구체적인 행동으로 씁니다(시간대, 준비물, 말하는 방법 등).
5. 건강·법률·투자 판단은 전문가와 상의하라는 범위 안에서만 조언합니다.

반드시 아래 JSON 형식으로만 답합니다.
{
  "overview": "이번 택일 결과 총평 3~4문장(1순위 날짜와 그 이유를 먼저)",
  "tips": [{"date": "YYYY-MM-DD", "tip": "그날 이 목적을 할 때의 조언 1~2문장"}, ...순위 날짜 수만큼],
  "prepare": ["그날까지 미리 준비하면 좋은 것 1문장", "...", "..."],
  "motto": "한 마디(20자 안팎)"
}`;

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : fallback;
}

function line(d: TaekilDay, i?: number) {
  return `${i !== undefined ? `${i + 1}순위 ` : ""}${d.date}(${d.weekday}) — ${d.title}. ${d.why}`;
}

export async function generateTaekilDetail(input: TaekilInput): Promise<TaekilDetail> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY 없음");
  const start = kstToday();
  const { ranked, avoid } = calculateTaekil(input, start);
  const who = input.b
    ? `${input.a.name || "나"}와(과) ${input.b.name || "함께하는 사람"} 두 사람 모두에게 좋은 날`
    : `${input.a.name || "나"}에게 좋은 날`;

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    // 유료 풀이라 다른 상세 풀이와 같은 4o 를 쓴다(1건 약 15원 추정)
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `[목적] ${taekilLabel(input.purpose)}
[기준] ${who}, ${start}부터 90일

[계산으로 고른 순위]
${ranked.map((d, i) => line(d, i)).join("\n") || "없음"}

[가능하면 피할 날]
${avoid.map((d) => line(d)).join("\n") || "없음"}

위 결과를 바탕으로 JSON 으로 작성해 주세요.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 1500,
  });

  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(completion.choices[0]?.message?.content ?? "") as Record<string, unknown>;
  } catch {
    throw new Error("택일 풀이 형식이 올바르지 않습니다.");
  }
  const rawTips = Array.isArray(raw.tips) ? (raw.tips as Record<string, unknown>[]) : [];
  const prepare = Array.isArray(raw.prepare) ? raw.prepare.map((p) => text(p, "")).filter(Boolean).slice(0, 3) : [];
  return {
    start,
    overview: text(raw.overview, ranked[0] ? `가장 힘이 실리는 날은 ${ranked[0].date}(${ranked[0].weekday})이에요. ${ranked[0].why}` : "고른 날짜를 확인해 주세요."),
    // 날짜는 계산 순위를 따르고, AI 조언은 같은 날짜에만 붙인다
    tips: ranked.map((d) => ({ date: d.date, tip: text(rawTips.find((t) => t?.date === d.date)?.tip, d.why) })),
    prepare: prepare.length ? prepare : ["필요한 서류와 일정을 하루 전에 한 번 더 확인해 두세요."],
    motto: text(raw.motto, "준비된 날이 가장 좋은 날").slice(0, 60),
  };
}

export function buildTaekil(input: TaekilInput, detail: TaekilDetail): Omit<TaekilPaid, "reopened"> {
  const { preview, ranked, avoid } = calculateTaekil(input, detail.start);
  return { input, preview, ranked, avoid, detail };
}
