import { Solar } from "lunar-javascript";
import { calculateDayLuck, kstToday } from "@/lib/calendar/day-luck";
import type { DayLuck } from "@/lib/calendar/day-luck-types";
import {
  CLASH,
  calculateNewYear,
  ganjiKorean,
  isHarmony,
  tenGodForStem,
  toSolar,
} from "@/lib/newyear/newyear-engine";
import type { MonthlyInput, MonthlyPurpose, MonthlyPurposeKey, MonthlyResult } from "./monthly-types";

/**
 * 이달의 운세 — AI 없이 계산만으로 나오는 부분.
 *
 * 그달 한가운데(15일)의 월 간지 천간이 내 일간에게 어떤 십성인지로 그달의 성격을 정하고,
 * 월 지지가 내 일지와 충이면 변동이 많은 달, 합이면 사람 운이 따르는 달로 본다(신년운세 월별 계산과 같은 방식).
 * 날마다의 흐름은 운세 캘린더(lib/calendar/day-luck.ts)를 그달 전체로 넓혀 쓴다.
 * 같은 생년월일·같은 달이면 언제 봐도 같은 결과가 나온다(무작위 없음).
 */

const MONTH_TEXT: Record<string, { title: string; keywords: string[]; summary: string; base: number }> = {
  비견: {
    title: "손잡을수록 커지는 달",
    keywords: ["협력", "자신감", "고집 주의"],
    summary: "스스로 해내려는 힘이 붙는 달입니다. 뜻이 맞는 사람과 역할을 나누면 혼자일 때보다 훨씬 멀리 갑니다.",
    base: 68,
  },
  겁재: {
    title: "지갑과 내 몫을 지키는 달",
    keywords: ["지출 관리", "경쟁", "승부욕"],
    summary: "나갈 돈과 경쟁이 늘기 쉬운 달입니다. 벌기보다 지키는 쪽에 무게를 두면 오히려 남는 것이 많습니다.",
    base: 58,
  },
  식신: {
    title: "하고 싶던 일을 시작하는 달",
    keywords: ["시작", "표현", "여유"],
    summary: "즐기면서 할 수 있는 일이 잘 풀리는 달입니다. 미뤄 둔 취미·부업·배움을 시작하기 좋습니다.",
    base: 82,
  },
  상관: {
    title: "틀을 바꾸고 싶어지는 달",
    keywords: ["변화", "아이디어", "말조심"],
    summary: "답답한 것을 바꾸고 싶은 마음이 커지는 달입니다. 생각은 과감하게, 말과 글은 한 박자 쉬고 내보내세요.",
    base: 64,
  },
  편재: {
    title: "기회에 먼저 손 내미는 달",
    keywords: ["기회", "활동", "뜻밖의 수입"],
    summary: "활동 범위가 넓어지고 뜻밖의 기회가 보이는 달입니다. 사람을 만날수록 운이 커지지만 욕심은 반만 내세요.",
    base: 78,
  },
  정재: {
    title: "차곡차곡 쌓이는 달",
    keywords: ["정리", "저축", "성실"],
    summary: "성실하게 한 만큼 돌아오는 달입니다. 큰 한 방보다 정리·저축·밀린 일 처리가 결실로 이어집니다.",
    base: 80,
  },
  편관: {
    title: "버티는 힘이 실력이 되는 달",
    keywords: ["책임", "압박", "컨디션"],
    summary: "책임과 압박이 커지는 달입니다. 일을 다 떠안지 말고 잠과 컨디션부터 챙기면 이 시기가 실력으로 남습니다.",
    base: 60,
  },
  정관: {
    title: "노력이 인정받는 달",
    keywords: ["인정", "평판", "약속"],
    summary: "노력이 제대로 평가받기 쉬운 달입니다. 약속과 규칙을 지킬수록 평판이 올라갑니다.",
    base: 76,
  },
  편인: {
    title: "생각을 정리하는 달",
    keywords: ["계획", "공부", "직관"],
    summary: "혼자 생각하고 계획하는 시간이 필요한 달입니다. 배움과 준비에 쓰면 다음 달이 가벼워집니다.",
    base: 62,
  },
  정인: {
    title: "도움의 손길이 닿는 달",
    keywords: ["도움", "문서", "안정"],
    summary: "주변의 도움을 받기 좋은 달입니다. 계약·서류·집과 관련된 일이 순조롭게 풀리기 쉽습니다.",
    base: 75,
  },
};

const PURPOSES: { key: MonthlyPurposeKey; label: string; tenGods: string[]; tip: string }[] = [
  { key: "contract", label: "계약·서류", tenGods: ["정인", "정재", "정관"], tip: "도장 찍기·서류 내기·큰 결제는 이날로 잡아 보세요." },
  { key: "meet", label: "고백·소개·만남", tenGods: ["편재", "식신", "비견"], tip: "먼저 연락하거나 약속을 잡기 좋은 날이에요." },
  { key: "move", label: "이사·여행·이동", tenGods: ["정인", "편인", "비견", "정재"], tip: "이동·이사·여행 출발일로 무난한 날이에요." },
  { key: "exam", label: "면접·시험·발표", tenGods: ["정관", "정인", "편인", "식신"], tip: "실력을 보여 줘야 하는 자리에 힘이 실리는 날이에요." },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function kstParts(now: Date): { y: number; m: number; d: number } {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now).split("-").map(Number);
  return { y, m, d };
}

function keyOf(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function nextKey(y: number, m: number): string {
  return m === 12 ? keyOf(y + 1, 1) : keyOf(y, m + 1);
}

/** 지금 파는 달 — 21일부터는 남은 날이 적어 다음 달을 판다(한국 시간) */
export function monthlySaleKey(now = new Date()): string {
  const { y, m, d } = kstParts(now);
  return d >= 21 ? nextKey(y, m) : keyOf(y, m);
}

/** 결제 직후 날짜가 넘어가도 받을 수 있게 이번 달·다음 달 둘 다 받는다 */
export function isSellableMonthKey(key: string, now = new Date()): boolean {
  const { y, m } = kstParts(now);
  return key === keyOf(y, m) || key === nextKey(y, m);
}

function parseKey(key: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2026 || year > 2100) return null;
  return { year, month };
}

function birthPillars(input: MonthlyInput): { dayStem: string; dayBranch: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.birthDate.trim());
  if (!match) throw new Error("생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.");
  const solar = toSolar(Number(match[1]), Number(match[2]), Number(match[3]), input.calendarType);
  if (!solar) throw new Error("존재하지 않는 날짜입니다. 생년월일과 양력·음력을 확인해 주세요.");
  // 태어난 시간은 쓰지 않는다. 정오로 두면 날짜가 바뀌지 않는다
  const eightChar = Solar.fromYmdHms(solar.year, solar.month, solar.day, 12, 0, 0).getLunar().getEightChar();
  eightChar.setSect(2);
  return { dayStem: eightChar.getDayGan(), dayBranch: eightChar.getDayZhi() };
}

function monthDays(input: MonthlyInput, year: number, month: number): DayLuck[] {
  const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return calculateDayLuck({
    birthDate: input.birthDate,
    calendarType: input.calendarType,
    start: `${keyOf(year, month)}-01`,
    days: length,
  }).days;
}

export function calculateMonthly(input: MonthlyInput, monthKey: string): MonthlyResult {
  const parsed = parseKey(monthKey);
  if (!parsed) throw new Error("달을 확인해 주세요.");
  const { dayStem, dayBranch } = birthPillars(input);
  // 일간 이름·오행은 신년운세 계산과 같은 값을 쓴다
  const { dayMaster } = calculateNewYear(input);

  const ganji = Solar.fromYmdHms(parsed.year, parsed.month, 15, 12, 0, 0).getLunar().getEightChar().getMonth();
  const tenGod = tenGodForStem(dayStem, ganji[0]);
  const text = MONTH_TEXT[tenGod];

  let score = text.base;
  let note: string | null = null;
  if (CLASH[dayBranch] === ganji[1]) {
    score -= 14;
    note = "이동·변동이 생기기 쉬운 달이에요. 큰 결정은 서두르지 말고 일정에 여유를 두세요.";
  } else if (isHarmony(dayBranch, ganji[1])) {
    score += 8;
    note = "사람 운이 따르는 달이에요. 만남과 협력이 잘 풀리기 쉬워요.";
  }

  const days = monthDays(input, parsed.year, parsed.month);
  return {
    monthKey,
    year: parsed.year,
    month: parsed.month,
    ganjiKorean: ganjiKorean(ganji),
    tenGod,
    dayMaster,
    title: text.title,
    keywords: text.keywords,
    summary: text.summary,
    score: clamp(score, 40, 95),
    goodCount: days.filter((d) => d.tone === "good").length,
    cautionCount: days.filter((d) => d.tone === "caution").length,
    note,
  };
}

/** 유료 — 그달 전체 달력과 목적별 날짜 */
export function calculateMonthlyCalendar(
  input: MonthlyInput,
  monthKey: string,
): { days: DayLuck[]; purposes: MonthlyPurpose[] } {
  const parsed = parseKey(monthKey);
  if (!parsed) throw new Error("달을 확인해 주세요.");
  const days = monthDays(input, parsed.year, parsed.month);

  // 이번 달을 중간에 샀으면 지난 날은 고르지 않는다
  const today = kstToday();
  const ahead = days.filter((d) => d.date >= today);
  const pool = ahead.length >= 5 ? ahead : days;
  const byScore = (a: DayLuck, b: DayLuck) => b.score - a.score || a.date.localeCompare(b.date);
  const fallback = pool.filter((d) => d.tone !== "caution").sort(byScore);

  const purposes: MonthlyPurpose[] = PURPOSES.map((p) => {
    const matched = pool.filter((d) => d.tone !== "caution" && p.tenGods.includes(d.tenGod)).sort(byScore);
    const picked = (matched.length ? matched : fallback).slice(0, 2).map((d) => d.date).sort();
    return { key: p.key, label: p.label, dates: picked, tip: p.tip };
  });

  const careful = pool
    .filter((d) => d.tone === "caution" || d.tenGod === "겁재")
    .sort((a, b) => a.score - b.score || a.date.localeCompare(b.date))
    .slice(0, 2)
    .map((d) => d.date)
    .sort();
  purposes.push({
    key: "money",
    label: "지갑·약속 조심",
    dates: careful,
    tip: careful.length
      ? "충동 구매·돈 빌려주기·무리한 약속은 이날을 피해 보세요."
      : "이달은 크게 조심할 날이 없어요. 평소 리듬을 지키면 충분해요.",
  });

  return { days, purposes };
}
