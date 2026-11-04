import { extractVipSajuData } from "@/lib/saju/vip-saju-data";
import { STEM_ELEMENT, countPillarElements, sajuStrength, type FiveElement } from "@/lib/saju/strength";
import type { VipCalendarType, VipGender } from "@/lib/saju/vip-types";

// 무료 만세력 (2026-11-04) — 사주 인사이트 리포트와 같은 계산(lib/saju/vip-saju-engine.ts, 빌드 전 만세력 자동 검사 대상)으로
// 여덟 글자·십성·지장간·12운성·납음·오행·대운을 보여 준다. 신강·신약은 오늘의 운세와 같은 판정(lib/saju/strength.ts). AI 없음.

export type ManseInput = {
  birthDate: string;
  calendarType: VipCalendarType;
  birthTime: string | null;
  gender: VipGender;
};

const ELEMENT_KO: Record<FiveElement, string> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };

export function calculateManse(input: ManseInput) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.birthDate.trim());
  if (!m) throw new Error("생년월일을 8자리로 넣어 주세요.");
  const data = extractVipSajuData({
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    calendarType: input.calendarType,
    gender: input.gender,
    birthTimeRaw: input.birthTime,
    birthDateIso: input.birthDate.trim(),
    mbti: null,
  });
  const c = data.calculated;
  const order = [
    { key: "hour", label: "시주", pillar: c.pillars.hour },
    { key: "day", label: "일주", pillar: c.pillars.day },
    { key: "month", label: "월주", pillar: c.pillars.month },
    { key: "year", label: "년주", pillar: c.pillars.year },
  ] as const;

  // 신강·신약 — 년·월·일(·시) 기둥, 월지는 2.5
  const pillarsForStrength = [c.pillars.year, c.pillars.month, c.pillars.day, ...(c.pillars.hour ? [c.pillars.hour] : [])].map(
    (p) => ({ stem: p.stemHanja, branch: p.branchHanja }),
  );
  const strength = sajuStrength(STEM_ELEMENT[c.dayMaster.stemHanja], countPillarElements(pillarsForStrength, 1));

  return {
    solarDate: data.mingpaCore.solarDate,
    timeKnown: !!c.pillars.hour,
    pillars: order.map(({ key, label, pillar }) =>
      pillar
        ? {
            key,
            label,
            hanja: pillar.hanja,
            korean: pillar.korean,
            stemTenGod: key === "day" ? "일간(나)" : pillar.stemTenGod,
            branchTenGods: pillar.branchTenGods,
            hiddenStems: pillar.hiddenStems,
            growthStage: pillar.growthStage,
            naYin: pillar.naYin,
            elements: pillar.visibleElements,
          }
        : { key, label, hanja: null, korean: null },
    ),
    dayMaster: c.dayMaster,
    elementCount: c.visibleElementCount,
    strength: {
      isStrong: strength.isStrong,
      favorable: strength.favorable.map((e) => ELEMENT_KO[e]),
    },
    daeun: {
      direction: c.daeun.direction,
      startOffset: c.daeun.startOffset,
      periods: c.daeun.periods.map((p) => ({
        ganjiHanja: p.ganjiHanja,
        ganjiKorean: p.ganjiKorean,
        startAge: p.startAge,
        endAge: p.endAge,
        startYear: p.startYear,
        endYear: p.endYear,
        stemTenGod: p.stemTenGod,
      })),
      currentStartYear: c.daeun.current?.startYear ?? null,
    },
    annualFlow: c.daeun.annualFlow,
    // 용신 안내는 화면에서 "신강·신약 기준 간이 판정"으로 따로 밝힌다
    notes: c.calculationMethod.limitations.filter((n) => !n.includes("용신")),
  };
}

export type ManseResult = ReturnType<typeof calculateManse>;
