import OpenAI from "openai";
import type { DayLuck } from "@/lib/calendar/day-luck-types";
import type {
  MonthlyArea,
  MonthlyDetail,
  MonthlyInput,
  MonthlyPurpose,
  MonthlyResult,
  MonthlyWeek,
} from "./monthly-types";

/**
 * 이달의 운세 상세 풀이(유료) 작성.
 *
 * 계산 결과(그달 십성·충·합·날마다의 좋음/조심·목적별 날짜)를 근거로만 쓰게 한다.
 * 무료 결과·달력과 말이 어긋나면 결제한 사람이 믿지 않기 때문이다.
 * 결제 1건당 한 번만 부르고 결과는 DB 에 저장해 다시 볼 때는 부르지 않는다.
 */

// 신년운세와 같은 이유로 4o 를 쓴다(4o-mini 는 무료 결과를 되풀이하는 경향이 크다). 1건 약 25원 추정
const MODEL = "gpt-4o";

const AREA_LABELS: Record<MonthlyArea["key"], string> = {
  money: "재물",
  love: "연애·관계",
  work: "일·학업",
  health: "건강",
};

const SYSTEM_PROMPT = `당신은 한국 명리학에 밝은 상담가입니다. 주어진 계산 결과를 바탕으로 한 달 운세 상세 풀이를 씁니다.

규칙:
1. 계산 결과의 십성·충·합·점수·날짜별 좋음/조심과 어긋나는 말을 하지 않습니다. 좋은 날이 많은 주는 좋게, 조심할 날이 있는 주는 조심스럽게 씁니다.
2. 겁주거나 단정하지 않습니다. "반드시 ~된다", "큰일 난다" 같은 표현을 쓰지 않습니다.
3. 건강은 병명·진단을 말하지 않고 생활 습관 수준으로만 조언합니다. 재물은 특정 종목·상품 투자를 권하지 않습니다.
4. 한자·전문용어(십성 이름, 간지)는 본문에 쓰지 않고 누구나 알아듣는 말로 풉니다.
5. 존댓말로, 읽는 사람을 "님"으로 부르지 말고 자연스럽게 씁니다.
6. 할 일(doThis)과 피할 일(avoid)은 실제로 해 볼 수 있는 구체적인 행동으로 씁니다. "신중하게", "잘 관리하세요" 같은 뻔한 말 대신 무엇을 언제 어떻게 할지 씁니다.
7. 무료 결과(이달의 한 줄 요약)를 그대로 되풀이하지 않습니다. 그 사람의 나이대와 성별에 맞는 현실적인 상황(직장·가정·연애·돈 관리 등)을 예로 들어 한 단계 더 깊게 씁니다.
8. 주별 풀이에는 그 주에 있는 좋은 날·조심할 날을 "O일"처럼 날짜로 짚어 줍니다.
9. 그달 특이 사항(충·합)이 있으면 총평에서 반드시 짚고 어떻게 대비할지 알려 줍니다.

반드시 아래 JSON 형식으로만 답합니다.
{
  "overview": "이달 상세 총평 4~5문장",
  "weeks": [
    {"index": 1, "focus": "그 주에 생기기 쉬운 상황과 흐름 2~3문장", "doThis": "1문장"}
    ... 주어진 주 수만큼
  ],
  "areas": [
    {"key": "money", "summary": "2~3문장", "doThis": "1문장", "avoid": "1문장"},
    {"key": "love", "summary": "...", "doThis": "...", "avoid": "..."},
    {"key": "work", "summary": "...", "doThis": "...", "avoid": "..."},
    {"key": "health", "summary": "...", "doThis": "...", "avoid": "..."}
  ],
  "motto": "이달을 위한 한 마디(20자 안팎)"
}`;

/** 1~7일, 8~14일, 15~21일, 22~말일 — 달력 주가 아니라 날짜로 나눠 누구나 같은 주로 본다 */
export function splitWeeks(days: DayLuck[]): { index: number; start: string; end: string; days: DayLuck[] }[] {
  const ranges = [
    [0, 7],
    [7, 14],
    [14, 21],
    [21, days.length],
  ];
  return ranges
    .map(([a, b], i) => ({ index: i + 1, days: days.slice(a, b) }))
    .filter((w) => w.days.length > 0)
    .map((w) => ({ ...w, start: w.days[0].date, end: w.days[w.days.length - 1].date }));
}

function dayNum(date: string): number {
  return Number(date.slice(8, 10));
}

function describeInput(input: MonthlyInput, result: MonthlyResult, days: DayLuck[], purposes: MonthlyPurpose[]): string {
  const birthYear = Number(input.birthDate.slice(0, 4));
  const age = Number.isFinite(birthYear) ? result.year - birthYear + 1 : null;
  const weeks = splitWeeks(days)
    .map((w) => {
      const good = w.days.filter((d) => d.tone === "good").map((d) => `${dayNum(d.date)}일(${d.title})`);
      const caution = w.days.filter((d) => d.tone === "caution").map((d) => `${dayNum(d.date)}일(${d.title})`);
      return `${w.index}주(${dayNum(w.start)}~${dayNum(w.end)}일): 좋은 날 ${good.join(", ") || "없음"} / 조심할 날 ${caution.join(", ") || "없음"}`;
    })
    .join("\n");
  const purposeLines = purposes
    .map((p) => `${p.label}: ${p.dates.map((d) => `${dayNum(d)}일`).join(", ") || "없음"}`)
    .join("\n");

  return `[대상]
성별: ${input.gender === "female" ? "여성" : "남성"}${age ? `, 나이 ${age}세(한국 나이)` : ""}
일간: ${result.dayMaster.korean}${result.dayMaster.element}

[${result.year}년 ${result.month}월 계산 결과]
그달 십성: ${result.tenGod} — "${result.title}" (${result.keywords.join(", ")})
점수: ${result.score}
요약: ${result.summary}
특이 사항: ${result.note ?? "없음"}
좋은 날 ${result.goodCount}일 / 조심할 날 ${result.cautionCount}일

[주별 날짜]
${weeks}

[목적별 날짜]
${purposeLines}

위 계산 결과를 근거로 상세 풀이를 JSON 으로 작성해 주세요. 주는 ${splitWeeks(days).length}개입니다.`;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 600) : fallback;
}

/** AI 답이 형식을 조금 어겨도 화면이 깨지지 않게 주·영역을 채워 맞춘다 */
function normalize(raw: unknown, result: MonthlyResult, days: DayLuck[]): MonthlyDetail {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const rawWeeks = Array.isArray(obj.weeks) ? (obj.weeks as Record<string, unknown>[]) : [];
  const weeks: MonthlyWeek[] = splitWeeks(days).map((w) => {
    const found = rawWeeks.find((x) => x && Number(x.index) === w.index) ?? {};
    const best = [...w.days].sort((a, b) => b.score - a.score)[0];
    return {
      index: w.index,
      start: w.start,
      end: w.end,
      focus: text(found.focus, best ? `${dayNum(best.date)}일이 이 주에서 가장 힘이 실리는 날이에요. ${best.title}.` : result.summary),
      doThis: text(found.doThis, best?.action ?? result.summary),
    };
  });

  const rawAreas = Array.isArray(obj.areas) ? (obj.areas as Record<string, unknown>[]) : [];
  const areas: MonthlyArea[] = (Object.keys(AREA_LABELS) as MonthlyArea["key"][]).map((key) => {
    const found = rawAreas.find((a) => a && a.key === key) ?? {};
    return {
      key,
      label: AREA_LABELS[key],
      summary: text(found.summary, result.summary),
      doThis: text(found.doThis, "이달 좋은 날에 미뤄 둔 일을 하나씩 처리해 보세요."),
      avoid: text(found.avoid, "서두른 결정은 한 번 더 살펴보세요."),
    };
  });

  return {
    overview: text(obj.overview, `${result.summary}${result.note ? ` ${result.note}` : ""}`),
    weeks,
    areas,
    motto: text(obj.motto, result.keywords.join(" · ")).slice(0, 60),
  };
}

export async function generateMonthlyDetail(
  input: MonthlyInput,
  result: MonthlyResult,
  days: DayLuck[],
  purposes: MonthlyPurpose[],
): Promise<MonthlyDetail> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY 없음");

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: describeInput(input, result, days, purposes) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 2500,
  });

  const content = completion.choices[0]?.message?.content ?? "";
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("상세 풀이 형식이 올바르지 않습니다.");
  }
  return normalize(parsed, result, days);
}
