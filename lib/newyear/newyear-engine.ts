import KoreanLunarCalendar from "korean-lunar-calendar";
import { Solar } from "lunar-javascript";

/**
 * 2027 신년운세 — AI 없이 계산만으로 나오는 무료 결과.
 *
 * 태어난 날의 일간(日干)과 2027년(정미년)·각 달의 천간을 비교해 십성을 구하고,
 * 띠(년지)·일지와 정미년·각 달 지지의 충·합으로 좋은 달과 조심할 달을 가른다.
 * 같은 생년월일이면 언제 봐도 같은 결과가 나온다(무작위 없음).
 *
 * 연도가 바뀌면 NEWYEAR 만 고치면 된다. 월 간지는 라이브러리가 절기 기준으로 계산한다.
 */

export const NEWYEAR = {
  year: 2027,
  stem: "丁",
  branch: "未",
  ganjiHanja: "丁未",
  ganjiKorean: "정미",
  nickname: "붉은 양의 해",
} as const;

import type {
  NewYearCalendarType,
  NewYearGender,
  NewYearFlag,
  NewYearMonth,
  NewYearResult,
} from "./newyear-types";

export type {
  NewYearCalendarType,
  NewYearGender,
  NewYearFlag,
  NewYearMonth,
  NewYearResult,
};

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const STEM_KO: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
const BRANCH_KO: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};
const ZODIAC: Record<string, string> = {
  子: "쥐", 丑: "소", 寅: "호랑이", 卯: "토끼", 辰: "용", 巳: "뱀",
  午: "말", 未: "양", 申: "원숭이", 酉: "닭", 戌: "개", 亥: "돼지",
};
const ELEMENT_OF_STEM = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];

export const CLASH: Record<string, string> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
};
const SIX_HARMONY: Record<string, string> = {
  子: "丑", 丑: "子", 寅: "亥", 亥: "寅", 卯: "戌", 戌: "卯",
  辰: "酉", 酉: "辰", 巳: "申", 申: "巳", 午: "未", 未: "午",
};
const THREE_HARMONY = ["申子辰", "亥卯未", "寅午戌", "巳酉丑"];

export function ganjiKorean(ganji: string): string {
  return `${STEM_KO[ganji[0]] ?? ganji[0]}${BRANCH_KO[ganji[1]] ?? ganji[1]}`;
}

/** 일간 기준으로 다른 천간이 어떤 십성인지 (VIP 엔진과 같은 규칙) */
export function tenGodForStem(dayStem: string, targetStem: string): string {
  const dayIndex = STEMS.indexOf(dayStem);
  const targetIndex = STEMS.indexOf(targetStem);
  if (dayIndex < 0 || targetIndex < 0) return "비견";
  const dayElement = Math.floor(dayIndex / 2);
  const targetElement = Math.floor(targetIndex / 2);
  const samePolarity = dayIndex % 2 === targetIndex % 2;
  if (dayElement === targetElement) return samePolarity ? "비견" : "겁재";
  if ((dayElement + 1) % 5 === targetElement) return samePolarity ? "식신" : "상관";
  if ((dayElement + 2) % 5 === targetElement) return samePolarity ? "편재" : "정재";
  if ((targetElement + 1) % 5 === dayElement) return samePolarity ? "편인" : "정인";
  return samePolarity ? "편관" : "정관";
}

/** 두 지지가 합(육합 또는 삼합의 반합)인지 */
export function isHarmony(a: string, b: string): boolean {
  if (a === b) return false;
  if (SIX_HARMONY[a] === b) return true;
  return THREE_HARMONY.some((group) => group.includes(a) && group.includes(b));
}

type YearText = { title: string; keyword: string; summary: string; advice: string; base: number };

/** 정미년 천간(丁)이 내 일간에게 어떤 십성인지에 따른 한 해의 흐름 */
const YEAR_TEXT: Record<string, YearText> = {
  비견: {
    title: "내 편을 만드는 해",
    keyword: "독립 · 협력",
    summary:
      "나와 비슷한 기운이 들어와 자신감이 붙고 스스로 해내려는 힘이 커집니다. 뜻이 맞는 사람과 손잡으면 혼자일 때보다 멀리 갈 수 있지만, 고집이 세지면 부딪힘도 생기는 해입니다.",
    advice: "혼자 다 하려 하지 말고 믿을 만한 한두 사람과 역할을 나누세요.",
    base: 70,
  },
  겁재: {
    title: "지키는 힘이 필요한 해",
    keyword: "경쟁 · 지출 관리",
    summary:
      "경쟁자가 늘고 돈이 나갈 일이 많아지기 쉬운 해입니다. 대신 승부욕이 살아나 밀어붙이는 힘은 강해집니다. 벌기보다 지키는 쪽에 무게를 두면 오히려 남는 것이 많습니다.",
    advice: "보증·동업·큰 투자는 한 번 더 따져 보고, 지출 기록을 습관으로 만드세요.",
    base: 60,
  },
  식신: {
    title: "재능이 꽃피는 해",
    keyword: "표현 · 여유",
    summary:
      "하고 싶은 일을 즐기면서 할 수 있는 해입니다. 손재주·말솜씨·아이디어가 빛을 보고, 먹고 사는 문제도 비교적 넉넉하게 풀립니다. 새로 배우거나 시작한 일이 오래 가는 자산이 됩니다.",
    advice: "미뤄 둔 취미나 부업을 시작해 보세요. 즐기는 만큼 결과가 따라옵니다.",
    base: 82,
  },
  상관: {
    title: "틀을 깨고 나서는 해",
    keyword: "변화 · 말조심",
    summary:
      "답답한 틀을 벗어나고 싶은 마음이 커지는 해입니다. 기발한 생각과 추진력이 살아나 변화를 만들기 좋지만, 말이 앞서면 윗사람·조직과 부딪히기 쉽습니다.",
    advice: "바꾸고 싶은 것은 과감히 바꾸되, 말과 글은 한 박자 쉬고 내보내세요.",
    base: 64,
  },
  편재: {
    title: "기회를 붙잡는 해",
    keyword: "활동 · 뜻밖의 수입",
    summary:
      "활동 범위가 넓어지고 뜻밖의 기회와 수입이 보이는 해입니다. 사람을 많이 만날수록 운이 커지지만, 크게 벌려는 욕심은 크게 잃는 길이 될 수도 있습니다.",
    advice: "기회는 적극적으로 잡되, 투자는 잃어도 괜찮은 만큼만 하세요.",
    base: 76,
  },
  정재: {
    title: "차곡차곡 쌓이는 해",
    keyword: "안정 · 저축",
    summary:
      "성실하게 한 만큼 정직하게 돌아오는 해입니다. 큰 한 방보다 꾸준한 수입과 저축이 늘고, 생활이 안정됩니다. 관계에서도 믿음이 쌓여 약속한 일이 잘 지켜집니다.",
    advice: "매달 조금씩이라도 모으는 구조를 만들어 두세요. 연말에 차이가 납니다.",
    base: 80,
  },
  편관: {
    title: "시험대에 오르는 해",
    keyword: "책임 · 건강 관리",
    summary:
      "책임과 압박이 커지고 버텨야 할 일이 생기는 해입니다. 힘들지만 이 시기를 넘기면 실력과 위치가 한 단계 올라갑니다. 무리하면 몸이 먼저 신호를 보내니 체력 관리가 곧 운 관리입니다.",
    advice: "일을 다 떠안지 말고, 잠과 운동부터 챙기세요. 버티는 힘이 곧 성과가 됩니다.",
    base: 62,
  },
  정관: {
    title: "인정받는 해",
    keyword: "승진 · 명예",
    summary:
      "노력이 제대로 평가받는 해입니다. 승진·합격·자격 같은 공식적인 성과가 따라오기 좋고, 주변의 신뢰도 높아집니다. 규칙과 약속을 지킬수록 운이 더 단단해집니다.",
    advice: "미뤄 둔 시험·승진·이직 준비가 있다면 올해 도전하세요.",
    base: 80,
  },
  편인: {
    title: "생각이 깊어지는 해",
    keyword: "공부 · 직관",
    summary:
      "혼자 생각하고 배우는 시간이 늘어나는 해입니다. 직관이 날카로워지고 전문 분야를 파고들기 좋지만, 걱정이 많아지거나 결정을 미루기 쉽습니다.",
    advice: "자격증·공부처럼 한 가지를 깊게 파 보세요. 생각은 기록으로 남기면 힘이 됩니다.",
    base: 66,
  },
  정인: {
    title: "도움을 받는 해",
    keyword: "귀인 · 문서운",
    summary:
      "주변의 도움과 지지를 받기 좋은 해입니다. 윗사람이나 가족이 힘이 되어 주고, 계약·문서·집과 관련된 일이 순조롭게 풀립니다. 마음이 편안해지고 배움에도 운이 따릅니다.",
    advice: "계약이나 집 문제가 있다면 올해 정리하세요. 도움을 청하는 것도 실력입니다.",
    base: 80,
  },
};

/** 각 달의 천간이 내 일간에게 어떤 십성인지에 따른 한 줄 */
const MONTH_TEXT: Record<string, { line: string; base: number }> = {
  비견: { line: "주변과 손잡으면 힘이 커지는 달. 혼자 떠안지 마세요.", base: 68 },
  겁재: { line: "지출과 경쟁이 늘기 쉬운 달. 돈 거래는 한 번 더 확인하세요.", base: 58 },
  식신: { line: "하고 싶던 일을 시작하기 좋은 달. 즐기는 만큼 결과가 따라옵니다.", base: 82 },
  상관: { line: "아이디어는 넘치지만 말이 앞서기 쉬운 달. 한 박자 쉬고 말하세요.", base: 64 },
  편재: { line: "뜻밖의 기회와 수입이 보이는 달. 욕심은 반만 내세요.", base: 78 },
  정재: { line: "성실함이 보상받는 달. 모으고 정리하기 좋습니다.", base: 80 },
  편관: { line: "책임과 압박이 커지는 달. 무리하지 말고 컨디션부터 챙기세요.", base: 60 },
  정관: { line: "노력이 인정받는 달. 약속과 규칙을 지키면 평판이 오릅니다.", base: 76 },
  편인: { line: "혼자 생각할 시간이 필요한 달. 배움과 계획에 좋습니다.", base: 62 },
  정인: { line: "도움의 손길이 닿는 달. 계약·문서 일이 순조롭습니다.", base: 75 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** 생년월일(양력·음력)을 양력으로 바꾼다. 잘못된 날짜면 null */
export function toSolar(
  year: number,
  month: number,
  day: number,
  calendarType: NewYearCalendarType,
): { year: number; month: number; day: number } | null {
  const cal = new KoreanLunarCalendar();
  if (calendarType === "solar") {
    if (!cal.setSolarDate(year, month, day)) return null;
    return { year, month, day };
  }
  if (!cal.setLunarDate(year, month, day, calendarType === "lunar-leap")) return null;
  const solar = cal.getSolarCalendar();
  return { year: solar.year, month: solar.month, day: solar.day };
}

export function calculateNewYear(input: {
  birthDate: string;
  calendarType: NewYearCalendarType;
  gender: NewYearGender;
}): NewYearResult {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.birthDate.trim());
  if (!match) throw new Error("생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.");
  const solar = toSolar(Number(match[1]), Number(match[2]), Number(match[3]), input.calendarType);
  if (!solar) throw new Error("존재하지 않는 날짜입니다. 생년월일과 양력·음력을 확인해 주세요.");

  // 태어난 시간은 쓰지 않는다(일간·일지·띠만 본다). 정오로 두면 날짜가 바뀌지 않는다
  const eightChar = Solar.fromYmdHms(solar.year, solar.month, solar.day, 12, 0, 0).getLunar().getEightChar();
  eightChar.setSect(2);
  const dayStem = eightChar.getDayGan();
  const dayBranch = eightChar.getDayZhi();
  const yearBranch = eightChar.getYearZhi();

  const tenGod = tenGodForStem(dayStem, NEWYEAR.stem);
  const text = YEAR_TEXT[tenGod];

  // ── 한 해 전체에 걸리는 표시(삼재·충·합) ──
  const flags: NewYearFlag[] = [];
  let yearScore = text.base;

  if (THREE_HARMONY[1].includes(yearBranch)) {
    // 사오미(巳午未)년이 해묘미 띠의 삼재 — 정미년은 마지막 해(날삼재)
    flags.push({
      kind: "samjae",
      tone: "neutral",
      title: "날삼재 — 삼재가 떠나가는 해",
      text: `${ZODIAC[yearBranch]}띠는 2027년이 삼재의 마지막 해입니다. 삼재가 물러가는 시기라 크게 걱정하기보다, 지난 2년 동안 벌여 둔 일을 깔끔하게 마무리하는 데 힘을 쓰세요.`,
    });
    yearScore -= 4;
  }
  if (yearBranch === NEWYEAR.branch) {
    flags.push({
      kind: "own",
      tone: "neutral",
      title: "내 띠의 해",
      text: "12년 만에 돌아온 양띠의 해입니다. 나를 돌아보고 새 판을 짜기 좋은 때이니, 한 해 목표를 분명하게 세워 두세요.",
    });
  }
  if (CLASH[yearBranch] === NEWYEAR.branch) {
    flags.push({
      kind: "clash",
      tone: "caution",
      title: "띠와 부딪히는 해 (축미충)",
      text: "소띠는 올해 기운과 띠가 정면으로 부딪힙니다. 이사·이직 같은 변화가 생기기 쉬우니, 떠밀려 움직이기보다 미리 계획을 세우고 움직이세요.",
    });
    yearScore -= 8;
  }
  if (CLASH[dayBranch] === NEWYEAR.branch) {
    flags.push({
      kind: "clash",
      tone: "caution",
      title: "생활 기반이 흔들리기 쉬운 해",
      text: "태어난 날의 기운(일지)과 올해 기운이 부딪힙니다. 집·건강·가까운 관계에 변동이 생기기 쉬우니 큰 결정은 서두르지 마세요.",
    });
    yearScore -= 6;
  } else if (isHarmony(dayBranch, NEWYEAR.branch)) {
    flags.push({
      kind: "harmony",
      tone: "good",
      title: "올해 기운과 잘 맞는 해",
      text: "태어난 날의 기운(일지)이 올해 기운과 합을 이룹니다. 사람 운이 좋아 만남·협력·계약이 순조롭게 풀리기 쉽습니다.",
    });
    yearScore += 6;
  }

  // ── 달마다 (양력 15일은 어느 해든 절기로 나뉜 달의 한가운데에 들어간다) ──
  const months: NewYearMonth[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const ganji = Solar.fromYmdHms(NEWYEAR.year, month, 15, 12, 0, 0).getLunar().getEightChar().getMonth();
    const monthTenGod = tenGodForStem(dayStem, ganji[0]);
    const base = MONTH_TEXT[monthTenGod];
    let score = base.base;
    let line = base.line;
    if (CLASH[dayBranch] === ganji[1]) {
      score -= 14;
      line += " 다만 이동·변동이 생기기 쉬우니 큰 결정은 미루세요.";
    } else if (isHarmony(dayBranch, ganji[1])) {
      score += 8;
      line += " 사람 운이 따라 만남과 협력은 잘 풀립니다.";
    }
    months.push({
      month,
      ganjiKorean: ganjiKorean(ganji),
      tenGod: monthTenGod,
      score: clamp(score, 40, 95),
      line,
      tag: null,
    });
  }

  // 점수 높은 두 달·낮은 두 달. 같은 점수면 앞선 달을 먼저 고른다
  const ranked = [...months].sort((a, b) => b.score - a.score || a.month - b.month);
  const bestMonths = ranked.slice(0, 2).map((item) => item.month).sort((a, b) => a - b);
  const cautionMonths = [...months]
    .sort((a, b) => a.score - b.score || a.month - b.month)
    .slice(0, 2)
    .map((item) => item.month)
    .sort((a, b) => a - b);
  for (const item of months) {
    if (bestMonths.includes(item.month)) item.tag = "good";
    else if (cautionMonths.includes(item.month)) item.tag = "caution";
  }

  const dayStemIndex = STEMS.indexOf(dayStem);
  return {
    year: NEWYEAR.year,
    yearGanjiKorean: NEWYEAR.ganjiKorean,
    yearNickname: NEWYEAR.nickname,
    zodiac: ZODIAC[yearBranch] ?? "",
    dayMaster: {
      korean: STEM_KO[dayStem] ?? dayStem,
      hanja: dayStem,
      element: ELEMENT_OF_STEM[dayStemIndex] ?? "",
    },
    tenGod,
    title: text.title,
    keyword: text.keyword,
    summary: text.summary,
    advice: text.advice,
    score: clamp(yearScore, 45, 95),
    flags,
    months,
    bestMonths,
    cautionMonths,
  };
}
