import OpenAI from "openai";
import { kstToday } from "@/lib/calendar/day-luck";
import type { DayLuck } from "@/lib/calendar/day-luck-types";
import { calculateSeason } from "./season-engine";
import type { SeasonDetail, SeasonInput, SeasonPaid } from "./season-types";

/**
 * 시험 합격운 상세(유료 2,200원) — 계산(시험 날 흐름·집중할 날·쉬어 갈 날)을 근거로 AI 가 준비 계획과 응원을 쓴다.
 * 합격·불합격을 예언하지 않는다. 결제 1건당 한 번만 부르고 저장한다.
 */

const SYSTEM_PROMPT = `당신은 한국 명리학에 밝고 수험생을 따뜻하게 응원하는 상담가입니다. 계산 결과를 바탕으로 시험 준비 조언을 씁니다.

규칙:
1. 합격·불합격·점수를 예언하지 않습니다. "반드시 붙는다", "떨어진다" 같은 말을 쓰지 않습니다. 흐름은 "힘을 어디에 쓰면 좋은지"로만 말합니다.
2. 시험 날 흐름이 '조심'이어도 겁주지 않고, 실수를 줄이는 구체적인 방법(시간 배분, 검토 순서 등)으로 안내합니다.
3. 한자·전문용어(십성, 간지 등)는 쓰지 않습니다.
4. 조언은 수험생이 실제로 해 볼 수 있는 행동(수면 시간, 아침 식사, 오답 정리, 실전 모의고사 시간표 맞추기 등)으로 씁니다. 약·영양제·의학적 처방은 권하지 않습니다.
5. 존댓말로 따뜻하게 씁니다.

반드시 아래 JSON 형식으로만 답합니다.
{
  "overview": "시험까지의 흐름 총평 3~4문장",
  "eventDayTips": ["시험 당일 팁 1문장", "...", "..."],
  "plan": [{"label": "기간 이름(예: D-30~D-8)", "text": "그 기간에 할 일 2문장"}, ...2~3개],
  "cheer": "응원 한마디(30자 안팎)"
}`;

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 500) : fallback;
}

const day = (d: DayLuck) => `${d.date}(${d.weekday}) ${d.title}${d.note ? ` — ${d.note}` : ""}`;

export async function generateSeasonDetail(input: SeasonInput): Promise<SeasonDetail> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY 없음");
  const start = kstToday();
  const { preview, eventDay, focusDays, restDays } = calculateSeason(input, start);
  const birthYear = Number(input.person.birthDate.slice(0, 4));

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    // 유료 풀이라 다른 상세 풀이와 같은 4o 를 쓴다(1건 약 15원 추정)
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `[수험생] ${input.person.gender === "female" ? "여성" : "남성"}, ${birthYear}년생
[시험] ${input.eventDate} (오늘 ${start} 기준 D-${preview.dDay})

[시험 날 흐름] ${day(eventDay)} / ${eventDay.tone === "good" ? "좋음" : eventDay.tone === "caution" ? "조심" : "보통"}
[집중하기 좋은 날] ${focusDays.map(day).join(" / ") || "없음"}
[컨디션을 지킬 날] ${restDays.map(day).join(" / ") || "없음"}

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
    throw new Error("시즌 운세 형식이 올바르지 않습니다.");
  }
  const tips = Array.isArray(raw.eventDayTips) ? raw.eventDayTips.map((t) => text(t, "")).filter(Boolean).slice(0, 4) : [];
  const plan = Array.isArray(raw.plan)
    ? (raw.plan as Record<string, unknown>[])
        .map((p) => ({ label: text(p?.label, ""), text: text(p?.text, "") }))
        .filter((p) => p.label && p.text)
        .slice(0, 3)
    : [];
  return {
    start,
    overview: text(raw.overview, `시험까지 D-${preview.dDay}. 시험 날은 "${eventDay.title}"이에요. ${eventDay.action}`),
    eventDayTips: tips.length ? tips : [eventDay.action],
    plan: plan.length ? plan : [{ label: `D-${preview.dDay}~D-1`, text: "집중하기 좋은 날에 실전 모의고사를 풀고, 쉬어 갈 날엔 오답만 가볍게 보세요." }],
    cheer: text(raw.cheer, "지금까지 한 만큼 충분히 해낼 거예요").slice(0, 80),
  };
}

export function buildSeason(input: SeasonInput, detail: SeasonDetail): Omit<SeasonPaid, "reopened"> {
  return { input, ...calculateSeason(input, detail.start), detail };
}
