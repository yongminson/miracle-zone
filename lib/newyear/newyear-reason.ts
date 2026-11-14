import type { NewYearMonth, NewYearResult } from "./newyear-types";
import { CLASH_MARK, HARMONY_MARK } from "./newyear-keys";

/**
 * 신년운세 "왜 이런 결과인가요?" 한 줄 근거 (2026-11-15).
 * 계산 엔진이 이미 낸 값(일간·십성·월 간지·일지 충합)만 풀어 쓴다 — 새로 지어내는 내용은 없다.
 * 서버 응답 형식은 그대로 두고 화면에서만 만든다(앱인토스도 같은 /api/newyear 를 쓴다).
 */

const STEM_INFO: Record<string, { element: string; hanja: string }> = {
  갑: { element: "목", hanja: "甲" }, 을: { element: "목", hanja: "乙" },
  병: { element: "화", hanja: "丙" }, 정: { element: "화", hanja: "丁" },
  무: { element: "토", hanja: "戊" }, 기: { element: "토", hanja: "己" },
  경: { element: "금", hanja: "庚" }, 신: { element: "금", hanja: "辛" },
  임: { element: "수", hanja: "壬" }, 계: { element: "수", hanja: "癸" },
};

/** 십성을 일간과의 관계로 쉽게 — 오행이 나를 낳는지, 내가 낳는지… */
export const TEN_GOD_RELATION: Record<string, string> = {
  비견: "나와 같은 기운",
  겁재: "나와 같은 기운",
  식신: "내가 낳는 기운",
  상관: "내가 낳는 기운",
  편재: "내가 다스리는 기운",
  정재: "내가 다스리는 기운",
  편관: "나를 다스리는 기운",
  정관: "나를 다스리는 기운",
  편인: "나를 낳아 주는 기운",
  정인: "나를 낳아 주는 기운",
};

/** 받침이 있으면 a, 없으면 b — 예) 목(木)은 / 화(火)는 */
function josa(word: string, a: string, b: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return a;
  return code % 28 === 0 ? b : a;
}

function stemLabel(stemKo: string): string {
  const info = STEM_INFO[stemKo];
  return info ? `${stemKo}${info.element}(${info.hanja})` : stemKo;
}

/** 한 해 총운의 근거 — 예) 나(갑목·甲 일간)에게 2027년 정화(丁)는 '식신', 내가 낳는 기운이에요. */
export function newYearYearReason(result: NewYearResult): string {
  const yearStem = stemLabel(result.yearGanjiKorean.slice(0, 1));
  const relation = TEN_GOD_RELATION[result.tenGod] ?? "";
  return `나(${result.dayMaster.korean}${result.dayMaster.element}·${result.dayMaster.hanja} 일간)에게 ${result.year}년 ${yearStem}${josa(STEM_INFO[result.yearGanjiKorean.slice(0, 1)]?.element ?? "", "은", "는")} '${result.tenGod}'${
    relation ? ` — ${relation}` : ""
  }이에요. 그래서 "${result.title}"로 봐요.`;
}

/** 달의 근거 — 예) 병진월: 병화(丙)가 나에게 '식신'(내가 낳는 기운) · 진이 내 일지와 충 */
export function newYearMonthReason(month: NewYearMonth): string {
  const stem = month.ganjiKorean.slice(0, 1);
  const branch = month.ganjiKorean.slice(1, 2);
  const relation = TEN_GOD_RELATION[month.tenGod];
  let text = `${month.ganjiKorean}월 — ${stemLabel(stem)}${josa(STEM_INFO[stem]?.element ?? "", "이", "가")} 나에게 '${month.tenGod}'${relation ? `(${relation})` : ""}`;
  if (month.line.includes(CLASH_MARK)) text += ` · 이 달의 '${branch}'${josa(branch, "이", "가")} 태어난 날 지지(일지)와 충(沖)`;
  else if (month.line.includes(HARMONY_MARK)) text += ` · 이 달의 '${branch}'${josa(branch, "이", "가")} 태어난 날 지지(일지)와 합(合)`;
  return text;
}
