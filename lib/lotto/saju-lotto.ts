import { Solar } from "lunar-javascript";
import {
  buildFortuneProfile,
  elementLabel,
  getSajuStrength,
  type FortuneEngineInput,
  type SajuElement,
} from "@/app/api/fortune/fortune-engine";
import { ganjiKorean } from "@/lib/newyear/newyear-engine";
import { BRANCH_ELEMENT, STEM_ELEMENT } from "@/lib/saju/strength";

// 내 사주 행운 번호 (2026-11-03) — 생년월일로 이번 주 로또 번호 6개를 고른다. AI·무작위 없음.
//  1) 원국의 신강·신약으로 나에게 필요한 오행(오늘의 운세·운세 캘린더와 같은 판정)을 찾는다
//  2) 하도(河圖) 수로 오행을 숫자에 잇는다 — 수 1·6, 화 2·7, 목 3·8, 금 4·9, 토 5·10(끝자리 0)
//     1~45 를 끝자리로 나누면 오행마다 9개씩 똑같이 나뉜다
//  3) 필요한 오행에서 4개, 이번 주 추첨일(토요일) 일진의 천간·지지 오행에서 1개씩 고른다
//  같은 오행 안에서 어떤 번호를 고를지는 "생일 + 회차"로 정해진다 — 같은 사람은 그 주에 언제 봐도 같은 번호, 매주 바뀐다.
//  ⚠ 당첨 확률을 높여 주는 계산이 아니다. 화면에도 그렇게 적는다(지어낸 결과 금지 원칙).

const HADO_DIGITS: Record<SajuElement, number[]> = {
  water: [1, 6],
  fire: [2, 7],
  wood: [3, 8],
  metal: [4, 9],
  earth: [5, 0],
};

const ELEMENT_HANJA: Record<SajuElement, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
const ELEMENT_KO: Record<SajuElement, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };

export const HADO_TEXT = "하도(河圖) 수: 수 1·6 · 화 2·7 · 목 3·8 · 금 4·9 · 토 5·10";

export type SajuLottoPick = {
  number: number;
  element: SajuElement;
  elementLabel: string;
  source: "need" | "draw";
  reason: string;
};

export type SajuLottoResult = {
  numbers: number[];
  picks: SajuLottoPick[];
  round: number;
  drawDate: string;
  drawDayGanji: string;
  dayMaster: string;
  isStrong: boolean;
  favorable: string[];
  lines: string[];
  hado: string;
  notice: string;
};

/** 받침이 있으면 a, 없으면 b — "임수예요" / "갑목이에요" */
function josa(word: string, a: string, b: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? a : b;
}

function elementOfNumber(n: number): SajuElement {
  const digit = n % 10;
  return (Object.keys(HADO_DIGITS) as SajuElement[]).find((el) => HADO_DIGITS[el].includes(digit))!;
}

function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 이번 주 추첨일(토요일, 한국 시간). 토요일 저녁 9시(추첨 20:35) 이후면 다음 주 토요일 */
export function upcomingDrawDate(now = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay();
  let add = (6 - day + 7) % 7;
  if (add === 0 && kst.getUTCHours() >= 21) add = 7;
  const draw = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + add));
  return draw.toISOString().slice(0, 10);
}

/** 추첨일의 회차 (1회 = 2002-12-07) */
export function drawRound(drawDate: string): number {
  const first = Date.UTC(2002, 11, 7);
  const [y, m, d] = drawDate.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - first) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/** 사주(필요한 오행)와 이번 주 추첨일 일진 — 이번 주 번호·고급 번호가 같이 쓴다 */
function sajuLottoBase(input: FortuneEngineInput, now: Date) {
  const profile = buildFortuneProfile(input);
  const dayMasterEl = profile.dayMasterElement;
  const { isStrong, favorable } = getSajuStrength(dayMasterEl, profile.elementCounts);

  const drawDate = upcomingDrawDate(now);
  const round = drawRound(drawDate);
  const [y, m, d] = drawDate.split("-").map(Number);
  const drawChar = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
  drawChar.setSect(2);
  const drawStem = drawChar.getDayGan();
  const drawBranch = drawChar.getDayZhi();
  const drawGanjiKo = ganjiKorean(drawStem + drawBranch);
  const drawGanji = `${drawGanjiKo}(${drawStem}${drawBranch})`;

  const dp = profile.dayPillar;
  return {
    profile,
    isStrong,
    favorable: favorable as SajuElement[],
    drawDate,
    round,
    month: m,
    day: d,
    drawGanji,
    drawGanjiKo,
    drawStemEl: STEM_ELEMENT[drawStem],
    drawBranchEl: BRANCH_ELEMENT[drawBranch],
    dayMaster: `${dp.stem}${ELEMENT_KO[dayMasterEl]}(${dp.stemHanja}${ELEMENT_HANJA[dayMasterEl]})`,
    dayMasterKo: dp.stem + ELEMENT_KO[dayMasterEl],
  };
}

type SajuLottoBase = ReturnType<typeof sajuLottoBase>;

/** 필요한 오행 4개(2가지면 2·2, 3가지면 첫째 기운 2개) + 추첨일 천간·지지 오행 1개씩. choose 가 오행 안에서 번호를 고른다 */
function pickSix(base: SajuLottoBase, choose: (pool: number[]) => number, describe: (n: number, reason: string) => string) {
  const used = new Set<number>();
  const picks: SajuLottoPick[] = [];
  const pickFrom = (el: SajuElement, source: SajuLottoPick["source"], reason: string) => {
    const pool: number[] = [];
    for (let n = 1; n <= 45; n += 1) if (elementOfNumber(n) === el && !used.has(n)) pool.push(n);
    if (!pool.length) return;
    const n = choose(pool);
    used.add(n);
    picks.push({ number: n, element: el, elementLabel: elementLabel(el), source, reason: describe(n, reason) });
  };
  const needCounts = base.favorable.length === 2 ? [2, 2] : [2, 1, 1];
  base.favorable.forEach((el, i) => {
    for (let k = 0; k < (needCounts[i] ?? 0); k += 1) pickFrom(el, "need", `내 사주에 필요한 ${elementLabel(el)} 기운`);
  });
  pickFrom(base.drawStemEl, "draw", `추첨일 일진 ${base.drawGanji}의 천간 ${elementLabel(base.drawStemEl)}`);
  pickFrom(base.drawBranchEl, "draw", `추첨일 일진 ${base.drawGanji}의 지지 ${elementLabel(base.drawBranchEl)}`);
  return [...picks].sort((a, b) => a.number - b.number);
}

function sajuLines(base: SajuLottoBase): string[] {
  const favorableLabels = base.favorable.map(elementLabel);
  return [
    `타고난 나의 기운(일간)은 ${base.dayMaster}${josa(base.dayMasterKo, "이에요", "예요")}.`,
    base.isStrong
      ? `사주에 내 편 기운이 많은 편(신강)이라, 힘을 알맞게 덜어 주는 ${favorableLabels.join("·")} 기운이 행운이에요.`
      : `사주에 내 편 기운이 적은 편(신약)이라, 힘을 보태 주는 ${favorableLabels.join("·")} 기운이 행운이에요.`,
    `${HADO_TEXT} — 끝자리가 이 숫자인 번호가 그 기운의 번호예요.`,
    `이번 주 추첨일 ${base.month}월 ${base.day}일(토)의 일진은 ${base.drawGanji}${josa(base.drawGanjiKo, "이라", "라")} ${elementLabel(base.drawStemEl)}·${elementLabel(base.drawBranchEl)} 번호도 하나씩 넣었어요.`,
  ];
}

export function calculateSajuLotto(input: FortuneEngineInput, now = new Date()): SajuLottoResult {
  const base = sajuLottoBase(input, now);
  // 같은 사람·같은 회차면 같은 번호
  const rand = seeded(hashString(`${base.profile.seedKey}|${base.round}`));
  const picks = pickSix(base, (pool) => pool[Math.floor(rand() * pool.length)], (_n, reason) => reason);

  return {
    numbers: picks.map((p) => p.number),
    picks,
    round: base.round,
    drawDate: base.drawDate,
    drawDayGanji: base.drawGanji,
    dayMaster: base.dayMaster,
    isStrong: base.isStrong,
    favorable: base.favorable.map(elementLabel),
    lines: sajuLines(base),
    hado: HADO_TEXT,
    notice: "사주 오행으로 고른 행운 번호예요. 로또는 모든 번호의 당첨 확률이 같아서, 당첨 확률을 높여 주지는 않아요.",
  };
}

export type SajuLottoPremiumResult = Omit<SajuLottoResult, "hado"> & {
  /** 통계에 쓴 실제 당첨 회차 범위 — 자료를 못 받았으면 null */
  basis: { fromRound: number; toRound: number; size: number } | null;
};

/**
 * 고급 번호 — 사주(필요한 오행 + 추첨일 일진)로 오행을 정하고, 그 오행 번호 중에서
 * 실제 최근 30회 당첨번호에 많이 나온 번호일수록 더 자주 뽑는다(가중치 = 1 + 나온 횟수). 볼 때마다 새 조합.
 * recent 가 null(당첨 자료를 못 받음)이면 사주 기운만으로 고르고 화면에도 그렇게 적는다.
 */
export function calculateSajuLottoPremium(
  input: FortuneEngineInput,
  recent: { counts: number[]; fromRound: number; toRound: number; size: number } | null,
  now = new Date(),
  rand: () => number = Math.random,
): SajuLottoPremiumResult {
  const base = sajuLottoBase(input, now);
  const weight = (n: number) => 1 + (recent ? recent.counts[n] : 0);
  const choose = (pool: number[]) => {
    const total = pool.reduce((sum, n) => sum + weight(n), 0);
    let r = rand() * total;
    for (const n of pool) {
      r -= weight(n);
      if (r < 0) return n;
    }
    return pool[pool.length - 1];
  };
  const describe = (n: number, reason: string) =>
    recent ? `${reason} · 최근 ${recent.size}회 중 ${recent.counts[n]}번 당첨` : reason;
  const picks = pickSix(base, choose, describe);

  const lines = sajuLines(base);
  lines.push(
    recent
      ? `같은 기운의 번호 중에서는 실제 최근 ${recent.size}회(${recent.fromRound}~${recent.toRound}회) 당첨번호에 자주 나온 번호를 더 많이 골랐어요.`
      : "실제 당첨 자료를 지금 불러오지 못해, 이번엔 사주 기운만으로 골랐어요.",
  );

  return {
    numbers: picks.map((p) => p.number),
    picks,
    round: base.round,
    drawDate: base.drawDate,
    drawDayGanji: base.drawGanji,
    dayMaster: base.dayMaster,
    isStrong: base.isStrong,
    favorable: base.favorable.map(elementLabel),
    lines,
    basis: recent ? { fromRound: recent.fromRound, toRound: recent.toRound, size: recent.size } : null,
    notice: "사주와 실제 당첨 기록으로 고른 번호예요. 지난 당첨 기록은 다음 추첨에 영향을 주지 않아서, 당첨 확률을 높여 주지는 않아요.",
  };
}
