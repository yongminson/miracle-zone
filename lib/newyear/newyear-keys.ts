import type { NewYearGender, NewYearMonth, NewYearResult } from "./newyear-types";

/**
 * 신년운세 "핵심 달" — 결제 전 미리보기(가린 채로)와 결제 후 풀이(공개)가 같이 쓴다. (2026-11-12)
 *
 * 무료 결과에는 달마다 점수·한 줄만 보이고 그 달의 십성은 보이지 않는다.
 * 여기서는 그 십성과 일지 합으로 달을 주제별로 고른다. 지어낸 값이 아니라 계산값이다.
 * - 돈: 재성(정재·편재) 달. 없으면 식상(식신·상관 — 재능·활동이 돈이 되는 흐름) 달.
 * - 인연: 일지(배우자 자리)와 합이 드는 달 + 배우자 별(여성 관성, 남성 재성) 달.
 * - 일·이동: 관성(정관·편관 — 직장·평가) 달 + 일지와 충이 드는 달(이동·변동).
 * 각 주제는 점수 높은 순으로 최대 2달. 미리보기에서 약속한 달은 유료 풀이 프롬프트에도 그대로 넣어 반드시 다룬다.
 */

export type NewYearKeyTopic = "money" | "love" | "work";

export type NewYearKeyMonths = Record<NewYearKeyTopic, number[]>;

const WEALTH = ["정재", "편재"];
const OUTPUT = ["식신", "상관"];
const OFFICER = ["정관", "편관"];

// 엔진이 달 한 줄에 붙이는 문장으로 일지 합·충을 알아본다(newyear-engine.ts 와 같은 문구)
const HARMONY_MARK = "사람 운이 따라";
const CLASH_MARK = "이동·변동";

function pick(months: NewYearMonth[], test: (m: NewYearMonth) => boolean, limit = 2): number[] {
  return months
    .filter(test)
    .sort((a, b) => b.score - a.score || a.month - b.month)
    .slice(0, limit)
    .map((m) => m.month)
    .sort((a, b) => a - b);
}

export function newYearKeyMonths(result: NewYearResult, gender: NewYearGender): NewYearKeyMonths {
  const months = result.months;
  let money = pick(months, (m) => WEALTH.includes(m.tenGod));
  if (money.length === 0) money = pick(months, (m) => OUTPUT.includes(m.tenGod));

  const spouseStar = gender === "female" ? OFFICER : WEALTH;
  // 일지 합을 먼저, 그다음 배우자 별
  const harmony = pick(months, (m) => m.line.includes(HARMONY_MARK));
  const love = harmony.length >= 2
    ? harmony
    : [...harmony, ...pick(months, (m) => spouseStar.includes(m.tenGod) && !harmony.includes(m.month), 2 - harmony.length)].sort((a, b) => a - b);

  const officer = pick(months, (m) => OFFICER.includes(m.tenGod));
  const work = officer.length >= 2
    ? officer
    : [...officer, ...pick(months, (m) => m.line.includes(CLASH_MARK) && !officer.includes(m.month), 2 - officer.length)].sort((a, b) => a - b);

  return { money, love, work };
}

export const KEY_TOPIC_LABEL: Record<NewYearKeyTopic, { emoji: string; title: string; hint: string }> = {
  money: { emoji: "💰", title: "돈이 움직이는 달", hint: "들어오는 돈을 잡고, 새는 돈을 막을 달" },
  love: { emoji: "💞", title: "인연·사람 운이 열리는 달", hint: "새 인연, 고백, 화해가 잘 풀리는 달" },
  work: { emoji: "💼", title: "일·이동 신호가 오는 달", hint: "이직·평가·이사 같은 변화가 오는 달" },
};

/** 유료 풀이 프롬프트에 넣는 문장 — 화면에서 보여 주는 핵심 달과 반드시 같아야 한다 */
export function keyMonthsForPrompt(keys: NewYearKeyMonths): string {
  const line = (topic: NewYearKeyTopic) =>
    keys[topic].length ? `${KEY_TOPIC_LABEL[topic].title}: ${keys[topic].join(", ")}월` : `${KEY_TOPIC_LABEL[topic].title}: 없음`;
  return [line("money"), line("love"), line("work")].join("\n");
}
