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

export function calculateSajuLotto(input: FortuneEngineInput, now = new Date()): SajuLottoResult {
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
  const drawGanji = `${ganjiKorean(drawStem + drawBranch)}(${drawStem}${drawBranch})`;
  const drawStemEl = STEM_ELEMENT[drawStem];
  const drawBranchEl = BRANCH_ELEMENT[drawBranch];

  const rand = seeded(hashString(`${profile.seedKey}|${round}`));
  const used = new Set<number>();
  const picks: SajuLottoPick[] = [];
  const pickFrom = (el: SajuElement, source: SajuLottoPick["source"], reason: string) => {
    const pool: number[] = [];
    for (let n = 1; n <= 45; n += 1) if (elementOfNumber(n) === el && !used.has(n)) pool.push(n);
    if (!pool.length) return;
    const n = pool[Math.floor(rand() * pool.length)];
    used.add(n);
    picks.push({ number: n, element: el, elementLabel: elementLabel(el), source, reason });
  };

  // 필요한 오행 4개 — 2가지면 2·2, 3가지면 앞의 것(가장 먼저 필요한 기운)을 2개
  const needCounts = favorable.length === 2 ? [2, 2] : [2, 1, 1];
  favorable.forEach((el, i) => {
    for (let k = 0; k < (needCounts[i] ?? 0); k += 1) pickFrom(el, "need", `내 사주에 필요한 ${elementLabel(el)} 기운`);
  });
  pickFrom(drawStemEl, "draw", `추첨일 일진 ${drawGanji}의 천간 ${elementLabel(drawStemEl)}`);
  pickFrom(drawBranchEl, "draw", `추첨일 일진 ${drawGanji}의 지지 ${elementLabel(drawBranchEl)}`);

  const dp = profile.dayPillar;
  const dayMaster = `${dp.stem}${ELEMENT_KO[dayMasterEl]}(${dp.stemHanja}${ELEMENT_HANJA[dayMasterEl]})`;
  const favorableLabels = favorable.map(elementLabel);
  const lines = [
    `타고난 나의 기운(일간)은 ${dayMaster}${josa(dp.stem + ELEMENT_KO[dayMasterEl], "이에요", "예요")}.`,
    isStrong
      ? `사주에 내 편 기운이 많은 편(신강)이라, 힘을 알맞게 덜어 주는 ${favorableLabels.join("·")} 기운이 행운이에요.`
      : `사주에 내 편 기운이 적은 편(신약)이라, 힘을 보태 주는 ${favorableLabels.join("·")} 기운이 행운이에요.`,
    `${HADO_TEXT} — 끝자리가 이 숫자인 번호가 그 기운의 번호예요.`,
    `이번 주 추첨일 ${m}월 ${d}일(토)의 일진은 ${drawGanji}${josa(ganjiKorean(drawStem + drawBranch), "이라", "라")} ${elementLabel(drawStemEl)}·${elementLabel(drawBranchEl)} 번호도 하나씩 넣었어요.`,
  ];

  return {
    numbers: picks.map((p) => p.number).sort((a, b) => a - b),
    picks: [...picks].sort((a, b) => a.number - b.number),
    round,
    drawDate,
    drawDayGanji: drawGanji,
    dayMaster,
    isStrong,
    favorable: favorableLabels,
    lines,
    hado: HADO_TEXT,
    notice: "사주 오행으로 고른 행운 번호예요. 로또는 모든 번호의 당첨 확률이 같아서, 당첨 확률을 높여 주지는 않아요.",
  };
}
