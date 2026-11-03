/**
 * 신강·신약과 필요한 기운 — 오늘의 운세·운세 캘린더(날마다 흐름)·이름풀이가 같은 판정을 쓴다.
 *
 * 원국 글자(시간을 모르면 년·월·일 여섯 글자)의 오행을 세되, 월지(태어난 달의 지지)는 계절의 힘이라 2.5 로 센다.
 * 나를 돕는 기운(나와 같은 오행 + 나를 낳는 오행)이 나머지보다 크면 신강.
 * 신강이면 힘을 빼 주는 기운(내가 낳는·내가 다스리는·나를 다스리는 오행)이, 신약이면 돕는 기운이 필요하다.
 */

export type FiveElement = "wood" | "fire" | "earth" | "metal" | "water";

const ORDER: FiveElement[] = ["wood", "fire", "earth", "metal", "water"];

export const STEM_ELEMENT: Record<string, FiveElement> = {
  甲: "wood", 乙: "wood", 丙: "fire", 丁: "fire", 戊: "earth", 己: "earth", 庚: "metal", 辛: "metal", 壬: "water", 癸: "water",
};
export const BRANCH_ELEMENT: Record<string, FiveElement> = {
  子: "water", 丑: "earth", 寅: "wood", 卯: "wood", 辰: "earth", 巳: "fire",
  午: "fire", 未: "earth", 申: "metal", 酉: "metal", 戌: "earth", 亥: "water",
};

/** 기둥(천간·지지 한자)들의 오행 세기 — monthIndex 번째 기둥의 지지는 2.5 */
export function countPillarElements(pillars: { stem: string; branch: string }[], monthIndex = 1): Record<FiveElement, number> {
  const counts: Record<FiveElement, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  pillars.forEach((p, i) => {
    const s = STEM_ELEMENT[p.stem];
    const b = BRANCH_ELEMENT[p.branch];
    if (s) counts[s] += 1;
    if (b) counts[b] += i === monthIndex ? 2.5 : 1;
  });
  return counts;
}

export function sajuStrength(dayMaster: FiveElement, counts: Record<FiveElement, number>) {
  const idx = ORDER.indexOf(dayMaster);
  const produces = ORDER[(idx + 1) % 5];
  const conquers = ORDER[(idx + 2) % 5];
  const conqueredBy = ORDER[(idx + 3) % 5];
  const producedBy = ORDER[(idx + 4) % 5];

  const support = counts[dayMaster] + counts[producedBy];
  const drain = counts[produces] + counts[conquers] + counts[conqueredBy];

  const isStrong = support > drain;
  const favorable: FiveElement[] = isStrong ? [produces, conquers, conqueredBy] : [dayMaster, producedBy];
  return { isStrong, favorable, support, drain };
}
