import OpenAI from "openai";
import type {
  NewYearDetail,
  NewYearDetailArea,
  NewYearDetailInput,
  NewYearDetailMonth,
  NewYearResult,
} from "./newyear-types";
import { keyMonthsForPrompt, newYearKeyMonths } from "./newyear-keys";

/**
 * 신년운세 상세 풀이(유료) 작성.
 *
 * 계산 결과(십성·충·합·좋은 달·조심할 달)를 근거로만 쓰게 한다. 무료 결과와
 * 말이 어긋나면 결제한 사람이 믿지 않기 때문이다. 결제 1건당 한 번만 부르고
 * 결과는 DB 에 저장해 다시 볼 때는 부르지 않는다.
 */

// 유료 풀이라 구체성이 중요하다. 4o-mini 는 무료 결과를 되풀이하는 경향이 커서 4o 를 쓴다(1건 약 40원 추정)
const MODEL = "gpt-4o";

const AREA_LABELS: Record<NewYearDetailArea["key"], string> = {
  money: "재물",
  love: "연애·관계",
  work: "직장·학업",
  health: "건강",
};

const SYSTEM_PROMPT = `당신은 한국 명리학에 밝은 상담가입니다. 주어진 계산 결과를 바탕으로 2027년(정미년) 신년운세 상세 풀이를 씁니다.

규칙:
1. 계산 결과에 있는 십성·충·합·점수·좋은 달·조심할 달과 어긋나는 말을 하지 않습니다. 좋은 달은 좋게, 조심할 달은 조심스럽게 씁니다.
2. 겁주거나 단정하지 않습니다. "반드시 ~된다", "큰일 난다" 같은 표현을 쓰지 않습니다.
3. 건강은 병명·진단을 말하지 않고 생활 습관 수준으로만 조언합니다. 재물은 특정 종목·상품 투자를 권하지 않습니다.
4. 한자·전문용어(십성 이름, 간지)는 본문에 쓰지 않고 누구나 알아듣는 말로 풉니다.
5. 존댓말로, 읽는 사람을 "님"으로 부르지 말고 자연스럽게 씁니다.
6. 할 일(doThis)과 피할 일(avoid)은 실제로 해 볼 수 있는 구체적인 행동으로 씁니다. "신중하게", "잘 관리하세요" 같은 뻔한 말 대신 무엇을 언제 어떻게 할지 씁니다.
7. 무료 결과(총운·월별 한 줄)를 그대로 되풀이하지 않습니다. 유료 풀이이므로 한 단계 더 깊게, 그 사람의 나이대와 성별에 맞는 현실적인 상황(직장·가정·연애·돈 관리 등)을 예로 들어 풀어 씁니다.
8. 특이 사항(삼재·충·합)이 있으면 총평과 관련 영역·달에서 반드시 짚고, 어떻게 대비할지 알려 줍니다.
9. 영역 풀이에는 그 영역에 특히 좋은 달이나 조심할 달이 있으면 몇 월인지 짚어 줍니다.
10. [핵심 달]은 결제 전 화면에서 "이 달을 알려 드린다"고 약속한 달입니다. 재물(money)에는 "돈이 움직이는 달", 연애·관계(love)에는 "인연·사람 운이 열리는 달", 직장·학업(work)에는 "일·이동 신호가 오는 달"을 반드시 몇 월인지 밝히고, 그 달에 무엇을 하면 좋은지 구체적으로 씁니다. 해당 달의 months 풀이에서도 같은 주제를 짚습니다. "없음"이면 그 영역에서 억지로 달을 만들지 않습니다.
11. 조심할 달은 months 풀이의 avoid 에 "그 달에 하지 말아야 할 일"을 구체적인 행동으로 씁니다.
12. 달마다 [월별 계산]의 십성 뜻을 생활 말로 풀어 그 달 이야기의 근거로 씁니다(십성 이름은 쓰지 않습니다).
   정재=월급·고정 수입·저축, 편재=부수입·거래·큰돈이 들고 남, 식신=재능·먹고사는 일·몸을 쓰는 활동, 상관=말·표현·이직 욕구·윗사람과 부딪힘,
   정관=직장 평가·승진·규칙과 책임, 편관=압박·경쟁·갑작스러운 일, 정인=문서·자격증·도와주는 사람, 편인=혼자 공부·직감·거리 두기,
   비견=동료·독립·내 몫 챙기기, 겁재=경쟁자·돈이 새는 일·지인과의 돈 거래.
   그래서 같은 "좋은 달"이라도 무엇이 좋은지(돈인지, 사람인지, 문서인지)가 달마다 달라야 합니다.
13. 다음 같은 뻔한 말은 쓰지 않습니다: "현명한", "신중하게", "균형", "주의하세요", "잘 관리", "긍정적인 흐름", "기회를 잡으세요", "열린 마음".
   그 대신 실제로 해 볼 수 있는 행동을 씁니다. 예) "새 카드 발급이나 지인 보증 서명은 다음 달로 미루기", "이력서와 포트폴리오를 이 달 안에 고쳐 두기", "오래 연락 못 한 사람에게 먼저 안부 보내기".
14. 투자·대출·특정 상품을 권하지 않습니다. 재물은 "수입을 늘리는 행동"과 "새는 돈을 막는 행동"으로만 씁니다.
15. [대상]의 나이와 성별에 맞는 현실 장면을 영역마다 하나씩 넣되, 결혼·자녀·직업을 단정하지 않고 "~라면" 식으로 씁니다.

반드시 아래 JSON 형식으로만 답합니다.
{
  "overview": "한 해 상세 총평 5~6문장",
  "areas": [
    {"key": "money", "summary": "3~4문장", "doThis": "1문장", "avoid": "1문장"},
    {"key": "love", "summary": "...", "doThis": "...", "avoid": "..."},
    {"key": "work", "summary": "...", "doThis": "...", "avoid": "..."},
    {"key": "health", "summary": "...", "doThis": "...", "avoid": "..."}
  ],
  "months": [
    {"month": 1, "focus": "그 달에 생기기 쉬운 상황과 흐름 3문장", "doThis": "1문장", "avoid": "1문장"}
    ... 1월부터 12월까지 12개
  ],
  "motto": "올해를 위한 한 마디(20자 안팎)"
}`;

function describeInput(input: NewYearDetailInput, result: NewYearResult): string {
  const birthYear = Number(input.birthDate.slice(0, 4));
  const age = Number.isFinite(birthYear) ? 2027 - birthYear + 1 : null;
  const months = result.months
    .map(
      (m) =>
        `${m.month}월: 십성 ${m.tenGod}, 점수 ${m.score}${m.tag === "good" ? " (좋은 달)" : m.tag === "caution" ? " (조심할 달)" : ""} — ${m.line}`,
    )
    .join("\n");
  const flags = result.flags.length
    ? result.flags.map((f) => `- ${f.title}: ${f.text}`).join("\n")
    : "- 없음";

  return `[대상]
성별: ${input.gender === "female" ? "여성" : "남성"}${age ? `, 2027년 나이 ${age}세(한국 나이)` : ""}, ${result.zodiac}띠
일간: ${result.dayMaster.korean}${result.dayMaster.element}

[2027년 계산 결과]
올해 십성: ${result.tenGod} — "${result.title}" (${result.keyword})
종합 점수: ${result.score}
총운: ${result.summary}
조언: ${result.advice}
좋은 달: ${result.bestMonths.join(", ")}월 / 조심할 달: ${result.cautionMonths.join(", ")}월

[특이 사항]
${flags}

[핵심 달 — 결제한 사람에게 화면에서도 그대로 보여 준다]
${keyMonthsForPrompt(newYearKeyMonths(result, input.gender))}

[월별 계산]
${months}

위 계산 결과를 근거로 상세 풀이를 JSON 으로 작성해 주세요.`;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 600) : fallback;
}

/** AI 답이 형식을 조금 어겨도 화면이 깨지지 않게 12달·4영역을 채워 맞춘다 */
function normalize(raw: unknown, result: NewYearResult): NewYearDetail {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const rawAreas = Array.isArray(obj.areas) ? (obj.areas as Record<string, unknown>[]) : [];
  const areas: NewYearDetailArea[] = (Object.keys(AREA_LABELS) as NewYearDetailArea["key"][]).map((key) => {
    const found = rawAreas.find((a) => a && a.key === key) ?? {};
    return {
      key,
      label: AREA_LABELS[key],
      summary: text(found.summary, result.summary),
      doThis: text(found.doThis, result.advice),
      avoid: text(found.avoid, "서두른 결정은 한 번 더 살펴보세요."),
    };
  });

  const rawMonths = Array.isArray(obj.months) ? (obj.months as Record<string, unknown>[]) : [];
  const months: NewYearDetailMonth[] = result.months.map((base) => {
    const found = rawMonths.find((m) => m && Number(m.month) === base.month) ?? {};
    return {
      month: base.month,
      focus: text(found.focus, base.line),
      doThis: text(found.doThis, base.line),
      avoid: text(found.avoid, "무리한 약속과 충동적인 지출은 피하세요."),
    };
  });

  return {
    overview: text(obj.overview, `${result.summary} ${result.advice}`),
    areas,
    months,
    motto: text(obj.motto, result.keyword).slice(0, 60),
  };
}

export async function generateNewYearDetail(
  input: NewYearDetailInput,
  result: NewYearResult,
): Promise<NewYearDetail> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY 없음");

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: describeInput(input, result) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 4000,
  });

  const content = completion.choices[0]?.message?.content ?? "";
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("상세 풀이 형식이 올바르지 않습니다.");
  }
  return normalize(parsed, result);
}
