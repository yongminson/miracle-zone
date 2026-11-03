import { Solar } from "lunar-javascript";
import { CLASH, calculateNewYear, isHarmony, toSolar } from "@/lib/newyear/newyear-engine";
import type { NewYearCalendarType, NewYearGender } from "@/lib/newyear/newyear-types";

/**
 * 궁합 — 두 사람의 사주(년·월·일주, 태어난 시간은 쓰지 않음)로 계산한다. AI 없이, 무작위 없이.
 *
 * 2026-10-29 전까지 무료 궁합은 이름·생일 문자열을 섞은 숫자(50~98점)였고 "사주 기운"도
 * (년+월+일)÷5 나머지였다. 유료 심층 풀이를 진짜 계산으로 만들면서 무료도 같은 계산으로 바꿨다 —
 * 무료 점수와 유료 풀이가 어긋나면 결제한 손님이 믿지 않는다.
 *
 * 보는 것:
 *  - 일간(나 자신)끼리 — 천간합(끌림) / 상생(서로 키움) / 같은 기운 / 상극(부딪힘)
 *  - 일지(배우자 자리)끼리 — 합 / 충
 *  - 띠(년지)끼리 — 합 / 충
 *  - 오행 보완 — 내게 없는 기운을 상대가 가졌는지
 * A·B 자리를 바꿔도 같은 점수가 나온다.
 */

export type MatchPerson = {
  name: string;
  birthDate: string;
  calendarType: NewYearCalendarType;
  gender: NewYearGender;
};

export type MatchElement = "목" | "화" | "토" | "금" | "수";

export type MatchSide = {
  dayMaster: { korean: string; hanja: string; element: string };
  zodiac: string;
  /** 년·월·일주 여섯 글자의 오행 개수 */
  elements: Record<MatchElement, number>;
  missing: MatchElement[];
};

export type MatchCalc = {
  score: number;
  grade: "천생연분" | "좋음" | "보통" | "주의";
  categoryScores: { personality: number; values: number; money: number; love: number; future: number };
  /** 일간 관계 */
  stemRelation: "합" | "상생" | "같은 기운" | "상극";
  /** 일지(배우자 자리) 관계 */
  dayBranchRelation: "합" | "충" | "무난";
  /** 띠 관계 */
  zodiacRelation: "합" | "충" | "무난";
  /** 서로 채워 주는 기운 (A 에게 없는데 B 에게 있는 것 + 그 반대) */
  complements: { to: "a" | "b"; element: MatchElement }[];
  a: MatchSide;
  b: MatchSide;
  /** 두 사람의 일간·일지 한자 (좋은 날·조심할 날, 오행 관계 문장 계산용) */
  dayStems?: { a: string; b: string };
  dayBranches?: { a: string; b: string };
};

const ELEMENTS: MatchElement[] = ["목", "화", "토", "금", "수"];
const STEM_ELEMENT: Record<string, MatchElement> = {
  甲: "목", 乙: "목", 丙: "화", 丁: "화", 戊: "토", 己: "토", 庚: "금", 辛: "금", 壬: "수", 癸: "수",
};
const BRANCH_ELEMENT: Record<string, MatchElement> = {
  子: "수", 丑: "토", 寅: "목", 卯: "목", 辰: "토", 巳: "화", 午: "화", 未: "토", 申: "금", 酉: "금", 戌: "토", 亥: "수",
};
/** 천간합: 갑기·을경·병신·정임·무계 */
const STEM_HARMONY: Record<string, string> = {
  甲: "己", 己: "甲", 乙: "庚", 庚: "乙", 丙: "辛", 辛: "丙", 丁: "壬", 壬: "丁", 戊: "癸", 癸: "戊",
};
/** 상생: 목→화→토→금→수→목 */
const GENERATES: Record<MatchElement, MatchElement> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
/** 상극: 목→토→수→화→금→목 (앞이 뒤를 누른다 = 앞의 재성이 뒤) */
const CONTROLS: Record<MatchElement, MatchElement> = { 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" };

export const ELEMENT_LABEL: Record<MatchElement, string> = {
  목: "나무의 기운(木)",
  화: "불의 기운(火)",
  토: "흙의 기운(土)",
  금: "쇠의 기운(金)",
  수: "물의 기운(水)",
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function readSide(person: MatchPerson) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(person.birthDate.trim());
  if (!match) throw new Error("생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.");
  const solar = toSolar(Number(match[1]), Number(match[2]), Number(match[3]), person.calendarType);
  if (!solar) throw new Error("존재하지 않는 날짜입니다. 생년월일과 양력·음력을 확인해 주세요.");
  // 태어난 시간은 쓰지 않는다. 정오로 두면 날짜가 바뀌지 않는다
  const ec = Solar.fromYmdHms(solar.year, solar.month, solar.day, 12, 0, 0).getLunar().getEightChar();
  ec.setSect(2);
  const chars = [ec.getYearGan(), ec.getYearZhi(), ec.getMonthGan(), ec.getMonthZhi(), ec.getDayGan(), ec.getDayZhi()];
  const elements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 } as Record<MatchElement, number>;
  chars.forEach((c, i) => {
    const el = i % 2 === 0 ? STEM_ELEMENT[c] : BRANCH_ELEMENT[c];
    if (el) elements[el] += 1;
  });
  const ny = calculateNewYear(person);
  const side: MatchSide = {
    dayMaster: ny.dayMaster,
    zodiac: ny.zodiac,
    elements,
    missing: ELEMENTS.filter((e) => elements[e] === 0),
  };
  return { side, dayStem: ec.getDayGan(), dayBranch: ec.getDayZhi(), yearBranch: ec.getYearZhi() };
}

function branchRelation(x: string, y: string): "합" | "충" | "무난" {
  if (CLASH[x] === y) return "충";
  if (isHarmony(x, y)) return "합";
  return "무난";
}

export function calculateMatch(a: MatchPerson, b: MatchPerson): MatchCalc {
  const A = readSide(a);
  const B = readSide(b);
  const ea = STEM_ELEMENT[A.dayStem];
  const eb = STEM_ELEMENT[B.dayStem];

  const stemRelation: MatchCalc["stemRelation"] =
    STEM_HARMONY[A.dayStem] === B.dayStem
      ? "합"
      : GENERATES[ea] === eb || GENERATES[eb] === ea
        ? "상생"
        : ea === eb
          ? "같은 기운"
          : "상극";
  const dayBranchRelation = branchRelation(A.dayBranch, B.dayBranch);
  const zodiacRelation = branchRelation(A.yearBranch, B.yearBranch);

  const complements: MatchCalc["complements"] = [
    ...A.side.missing.filter((e) => B.side.elements[e] > 0).map((element) => ({ to: "a" as const, element })),
    ...B.side.missing.filter((e) => A.side.elements[e] > 0).map((element) => ({ to: "b" as const, element })),
  ];

  const personality = { 합: 96, 상생: 88, "같은 기운": 74, 상극: 58 }[stemRelation];
  const love = { 합: 94, 무난: 76, 충: 52 }[dayBranchRelation];
  const values = { 합: 90, 무난: 76, 충: 56 }[zodiacRelation];
  // 돈: 한쪽의 기운이 다른 쪽이 다스리는 기운(재성)이면 돈 흐름을 서로 챙겨 준다. 같은 기운이면 내 몫을 다툰다
  const money = CONTROLS[ea] === eb || CONTROLS[eb] === ea ? 88 : ea === eb ? 60 : 72;
  const future = clamp(58 + complements.length * 10, 55, 96);

  const categoryScores = { personality, values, money, love, future };
  const raw = personality * 0.25 + love * 0.3 + values * 0.15 + money * 0.1 + future * 0.2;
  // 가운데(75)에서 1.6배로 넓힌다 — 그대로 두면 열에 일곱이 "보통"이라 차이가 안 느껴진다
  const score = clamp(75 + (raw - 75) * 1.6, 50, 98);
  const grade: MatchCalc["grade"] = score >= 90 ? "천생연분" : score >= 80 ? "좋음" : score >= 70 ? "보통" : "주의";

  return {
    score,
    grade,
    categoryScores,
    stemRelation,
    dayBranchRelation,
    zodiacRelation,
    complements,
    a: A.side,
    b: B.side,
    dayStems: { a: A.dayStem, b: B.dayStem },
    dayBranches: { a: A.dayBranch, b: B.dayBranch },
  };
}

const ELEMENT_NOUN: Record<MatchElement, string> = { 목: "나무", 화: "불", 토: "흙", 금: "쇠", 수: "물" };
/** 상생 — 앞 기운이 뒤 기운을 살린다 */
const GENERATE_PHRASE: Record<MatchElement, string> = {
  목: "나무가 불을 지펴 주는",
  화: "불이 흙을 단단하게 굳혀 주는",
  토: "흙이 쇠를 품어 길러 주는",
  금: "쇠가 물을 맑게 모아 주는",
  수: "물이 나무를 키워 주는",
};
/** 상극 — 앞 기운이 뒤 기운을 누른다 */
const CONTROL_PHRASE: Record<MatchElement, string> = {
  목: "나무가 흙을 파고드는",
  토: "흙이 물을 막아서는",
  수: "물이 불을 끄는",
  화: "불이 쇠를 녹이는",
  금: "쇠가 나무를 베는",
};
const BRANCH_ANIMAL: Record<string, string> = {
  子: "쥐", 丑: "소", 寅: "범", 卯: "토끼", 辰: "용", 巳: "뱀", 午: "말", 未: "양", 申: "원숭이", 酉: "닭", 戌: "개", 亥: "돼지",
};
/** 받침 있으면 a, 없으면 b (과/와, 이/가) */
function josa(word: string, withFinal: string, without: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? withFinal : without;
}
const BRANCH_ORDER = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/**
 * 오행 관계 한 줄 — 예전엔 AI 가 써서 "물이 금을 녹인다" 같은 틀린 문장이 나올 수 있었다.
 * 두 사람 일간의 실제 관계(합·상생·같은 기운·상극)와 방향으로 서버가 쓴다.
 */
export function describeElementRelation(calc: MatchCalc, aName: string, bName: string): string {
  const ea = (calc.a.dayMaster.element as MatchElement) || "토";
  const eb = (calc.b.dayMaster.element as MatchElement) || "토";
  const a = aName || "나";
  const b = bName || "상대";
  if (calc.stemRelation === "합") {
    return `${a}님의 ${calc.a.dayMaster.korean}(${calc.a.dayMaster.hanja})${josa(calc.a.dayMaster.korean, "과", "와")} ${b}님의 ${calc.b.dayMaster.korean}(${calc.b.dayMaster.hanja})${josa(calc.b.dayMaster.korean, "이", "가")} 천간합을 이뤄요 — 기운은 달라도 서로 끌어당기는 인연이에요.`;
  }
  if (calc.stemRelation === "상생") {
    const [giver, taker, el] = GENERATES[ea] === eb ? [a, b, ea] : [b, a, eb];
    return `${GENERATE_PHRASE[el]} 상생 관계 — ${giver}님이 ${taker}님을 밀어주고, ${taker}님은 그 힘으로 꽃피우는 조합이에요.`;
  }
  if (calc.stemRelation === "같은 기운") {
    return `둘 다 ${ELEMENT_NOUN[ea]}의 기운 — 말이 잘 통하지만, 고집이 부딪히면 둘 다 물러서지 않아요.`;
  }
  const [ctrl, target, el] = CONTROLS[ea] === eb ? [a, b, ea] : [b, a, eb];
  return `${CONTROL_PHRASE[el]} 상극 관계 — ${ctrl}님 기운이 ${target}님을 누르기 쉬워, 말투와 주도권 조절이 관계의 열쇠예요.`;
}

/**
 * 함께하면 좋은 날·조심할 날 — 예전엔 AI 가 "수요일, 매월 7일"처럼 지어냈다.
 * 일진(그날의 지지)이 두 사람 일지(배우자 자리)와 합이 드는 날 / 충이 드는 날로 정한다.
 * 결과가 저장돼 오래 보여도 틀리지 않게 특정 날짜 대신 "○○날"(12일마다 돌아옴)로 쓴다.
 */
export function describeMatchDays(calc: MatchCalc, aName: string, bName: string): { luckyDay: string; carefulDay: string } {
  const a = aName || "나";
  const b = bName || "상대";
  const da = calc.dayBranches?.a;
  const db = calc.dayBranches?.b;
  if (!da || !db) return { luckyDay: "", carefulDay: "" };
  const label = (x: string) => `${BRANCH_ANIMAL[x]}(${x})날`;

  const clashA = CLASH[da];
  const clashB = CLASH[db];
  const candidates = BRANCH_ORDER.filter((x) => x !== clashA && x !== clashB);
  const both = candidates.filter((x) => isHarmony(x, da) && isHarmony(x, db));
  const one = candidates.filter((x) => isHarmony(x, da) !== isHarmony(x, db));
  let luckyDay: string;
  if (both.length) {
    luckyDay = `${both.slice(0, 2).map(label).join("·")} — 두 사람 배우자 자리에 모두 합이 드는 날이에요. 일진은 12일마다 돌아와요.`;
  } else if (one.length) {
    const picked = one.slice(0, 2);
    const whoOf = (x: string) => (isHarmony(x, da) ? a : b);
    luckyDay =
      picked.length === 2 && whoOf(picked[0]) !== whoOf(picked[1])
        ? `${label(picked[0])}은 ${whoOf(picked[0])}님, ${label(picked[1])}은 ${whoOf(picked[1])}님 배우자 자리에 합이 드는 날이에요. 둘 다 부딪히지 않고, 12일마다 돌아와요.`
        : `${picked.map(label).join("·")} — ${whoOf(picked[0])}님 배우자 자리에 합이 들고 둘 다 부딪히지 않는 날이에요. 12일마다 돌아와요.`;
  } else {
    luckyDay = `${candidates.slice(0, 2).map(label).join("·")} — 두 사람 모두 부딪히지 않는 편안한 날이에요.`;
  }

  const carefulDay =
    clashA === clashB
      ? `${label(clashA)} — 두 사람 배우자 자리와 모두 부딪히는 날이라, 예민한 대화·큰 결정은 피하세요.`
      : `${label(clashA)}·${label(clashB)} — 각각 ${a}님·${b}님 배우자 자리와 부딪히는 날이라 예민해지기 쉬워요.`;
  return { luckyDay, carefulDay };
}

/** AI 에게 넘기는 계산 근거(무료·유료 공통) */
export function describeMatchFacts(calc: MatchCalc, aName: string, bName: string): string {
  const el = (s: MatchSide) => ELEMENT_LABEL[(s.dayMaster.element as MatchElement) || "토"] ?? s.dayMaster.element;
  const comp = calc.complements.length
    ? calc.complements
        .map((c) => `${c.to === "a" ? aName : bName}에게 없는 ${ELEMENT_LABEL[c.element]}을 ${c.to === "a" ? bName : aName}이(가) 채워 줌`)
        .join(" / ")
    : "서로 채워 주는 기운이 따로 없음";
  return `[${aName}] 일간 ${calc.a.dayMaster.korean}(${el(calc.a)}), ${calc.a.zodiac}띠, 없는 기운: ${calc.a.missing.join("·") || "없음"}
[${bName}] 일간 ${calc.b.dayMaster.korean}(${el(calc.b)}), ${calc.b.zodiac}띠, 없는 기운: ${calc.b.missing.join("·") || "없음"}
두 사람 기운(일간) 관계: ${calc.stemRelation}
배우자 자리(일지) 관계: ${calc.dayBranchRelation}
띠 관계: ${calc.zodiacRelation}
오행 보완: ${comp}
점수: 종합 ${calc.score}(${calc.grade}) / 성격 ${calc.categoryScores.personality} · 가치관 ${calc.categoryScores.values} · 돈 ${calc.categoryScores.money} · 애정 ${calc.categoryScores.love} · 미래 ${calc.categoryScores.future}`;
}
