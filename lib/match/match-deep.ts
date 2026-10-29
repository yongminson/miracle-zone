import OpenAI from "openai";
import { calculateDayLuck, kstToday } from "@/lib/calendar/day-luck";
import { calculateMatch, describeMatchFacts, type MatchCalc, type MatchPerson } from "./match-engine";
import {
  MATCH_RELATIONS,
  type MatchDeepDetail,
  type MatchDeepInput,
  type MatchDeepPaid,
  type MatchTogetherDay,
} from "./match-deep-types";

/**
 * 궁합 심층 풀이(유료 2,200원) — 계산(match-engine)을 근거로 AI 가 깊게 쓴다.
 * 무료 궁합과 같은 계산이라 점수·등급이 어긋나지 않는다. 결제 1건당 한 번만 부르고 저장한다.
 */

const AREA_LABELS: Record<MatchDeepDetail["areas"][number]["key"], string> = {
  talk: "성격·대화",
  money: "돈·생활",
  love: "애정·신뢰",
  future: "미래·함께 갈 길",
};

/** 앞으로 30일 중 두 사람 모두 조심할 날이 아니고, 한 사람 이상 좋은 날 — 점수 합이 높은 3일 */
export function togetherDays(input: MatchDeepInput): MatchTogetherDay[] {
  const start = kstToday();
  const a = calculateDayLuck({ birthDate: input.a.birthDate, calendarType: input.a.calendarType, start, days: 30 }).days;
  const b = calculateDayLuck({ birthDate: input.b.birthDate, calendarType: input.b.calendarType, start, days: 30 }).days;
  return a
    .map((d, i) => ({ d, e: b[i] }))
    .filter(({ d, e }) => e && d.tone !== "caution" && e.tone !== "caution" && (d.tone === "good" || e.tone === "good"))
    .sort((x, y) => y.d.score + y.e.score - (x.d.score + x.e.score) || x.d.date.localeCompare(y.d.date))
    .slice(0, 3)
    .map(({ d }) => ({ date: d.date, title: d.title }))
    .sort((x, y) => x.date.localeCompare(y.date));
}

export function readMatchDeepInput(body: Record<string, unknown>): MatchDeepInput | null {
  const raw = (body.input && typeof body.input === "object" ? body.input : null) as Record<string, unknown> | null;
  if (!raw) return null;
  const person = (v: unknown): MatchPerson | null => {
    const p = (v && typeof v === "object" ? v : null) as Record<string, unknown> | null;
    if (!p) return null;
    const birthDate = typeof p.birthDate === "string" ? p.birthDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    const year = Number(birthDate.slice(0, 4));
    if (year < 1920 || year > 2026) return null;
    return {
      name: typeof p.name === "string" ? p.name.trim().slice(0, 20) : "",
      birthDate,
      calendarType: p.calendarType === "lunar" || p.calendarType === "lunar-leap" ? p.calendarType : "solar",
      gender: p.gender === "female" ? "female" : "male",
    };
  };
  const a = person(raw.a);
  const b = person(raw.b);
  if (!a || !b) return null;
  const relationship = typeof raw.relationship === "string" && MATCH_RELATIONS[raw.relationship] ? raw.relationship : "lover";
  return { a, b, relationship };
}

const SYSTEM_PROMPT = `당신은 한국 명리학에 밝은 궁합 상담가입니다. 주어진 두 사람의 사주 계산 결과를 바탕으로 궁합 심층 풀이를 씁니다.

규칙:
1. 계산 결과(일간 관계·배우자 자리 관계·띠 관계·오행 보완·점수)와 어긋나는 말을 하지 않습니다. 점수가 높으면 장점을 중심으로, 낮으면 부딪히는 지점과 해결법을 중심으로 씁니다.
2. 겁주거나 단정하지 않습니다. "헤어진다", "반드시 ~된다" 같은 표현을 쓰지 않습니다. 낮은 궁합도 노력으로 맞춰 갈 수 있다는 관점으로 씁니다.
3. 한자·전문용어는 본문에 쓰지 않고 누구나 알아듣는 말로 풉니다. 특히 "일간, 일지, 십성, 천간, 지지, 상생, 상극, 육합, 삼합, 충" 같은 단어는 쓰지 않습니다(예: "상생 관계" → "서로를 키워 주는 사이").
4. 두 사람을 이름으로 부르고, 관계 유형(연인·부부·친구·가족·비즈니스)에 맞는 현실적인 상황을 예로 듭니다.
5. 팁·습관·해결법은 실제로 해 볼 수 있는 구체적인 행동으로 씁니다("대화를 많이 하세요" 같은 뻔한 말 대신 언제·무엇을·어떻게).
6. 무료 결과(한 줄 요약·좋은 점·주의할 점)를 그대로 되풀이하지 말고 한 단계 더 깊게 씁니다.

반드시 아래 JSON 형식으로만 답합니다.
{
  "overview": "두 사람 궁합 심층 총평 5~6문장",
  "areas": [
    {"key": "talk", "summary": "3문장", "tip": "1문장"},
    {"key": "money", "summary": "3문장", "tip": "1문장"},
    {"key": "love", "summary": "3문장", "tip": "1문장"},
    {"key": "future", "summary": "3문장", "tip": "1문장"}
  ],
  "goodPoints": ["잘 맞는 점 1문장", "...", "..."],
  "clashPoints": [{"point": "부딪히기 쉬운 상황 1문장", "fix": "그럴 때 해결법 1문장"}, {...}, {...}],
  "habits": ["관계를 오래 가게 하는 습관 1문장", "...", "..."],
  "motto": "두 사람을 위한 한 마디(20자 안팎)"
}`;

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 600) : fallback;
}

function list(value: unknown, count: number, fallback: string): string[] {
  const arr = Array.isArray(value) ? value.map((v) => text(v, "")).filter(Boolean) : [];
  while (arr.length < count) arr.push(fallback);
  return arr.slice(0, count);
}

export async function generateMatchDeep(input: MatchDeepInput, calc: MatchCalc): Promise<MatchDeepDetail> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY 없음");
  const aName = input.a.name || "A";
  const bName = input.b.name || "B";
  const rel = MATCH_RELATIONS[input.relationship] ?? "연인";

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    // 유료 풀이라 신년운세·이달의 운세와 같은 4o 를 쓴다(1건 약 25원 추정)
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `[관계] ${rel}
[${aName}] ${input.a.gender === "female" ? "여성" : "남성"}, ${input.a.birthDate.slice(0, 4)}년생
[${bName}] ${input.b.gender === "female" ? "여성" : "남성"}, ${input.b.birthDate.slice(0, 4)}년생

[사주 계산 결과]
${describeMatchFacts(calc, aName, bName)}

위 계산 결과를 근거로 궁합 심층 풀이를 JSON 으로 작성해 주세요.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2500,
  });

  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(completion.choices[0]?.message?.content ?? "") as Record<string, unknown>;
  } catch {
    throw new Error("궁합 심층 풀이 형식이 올바르지 않습니다.");
  }

  const rawAreas = Array.isArray(raw.areas) ? (raw.areas as Record<string, unknown>[]) : [];
  const rawClash = Array.isArray(raw.clashPoints) ? (raw.clashPoints as Record<string, unknown>[]) : [];
  return {
    overview: text(raw.overview, `두 사람의 궁합은 ${calc.score}점(${calc.grade})입니다.`),
    areas: (Object.keys(AREA_LABELS) as MatchDeepDetail["areas"][number]["key"][]).map((key) => {
      const found = rawAreas.find((a) => a && a.key === key) ?? {};
      return { key, label: AREA_LABELS[key], summary: text(found.summary, ""), tip: text(found.tip, "") };
    }),
    goodPoints: list(raw.goodPoints, 3, "서로의 다른 점을 채워 주는 관계예요."),
    clashPoints: [0, 1, 2].map((i) => ({
      point: text(rawClash[i]?.point, "생각이 엇갈릴 때가 있어요."),
      fix: text(rawClash[i]?.fix, "결론보다 서로의 이유를 먼저 들어 보세요."),
    })),
    habits: list(raw.habits, 3, "한 주에 한 번은 휴대폰을 내려놓고 서로의 이야기를 들어 보세요."),
    motto: text(raw.motto, calc.grade).slice(0, 60),
  };
}

export function buildMatchDeep(input: MatchDeepInput, detail: MatchDeepDetail): Omit<MatchDeepPaid, "reopened"> {
  return { input, calc: calculateMatch(input.a, input.b), togetherDays: togetherDays(input), detail };
}
