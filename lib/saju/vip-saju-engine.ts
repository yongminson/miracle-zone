import { Solar, type EightChar } from "lunar-javascript";
import type { VipGender, VipMingpaJson } from "./vip-types";

const STEM_KO: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
const BRANCH_KO: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};
const ELEMENT_KO: Record<string, string> = { 木: "목", 火: "화", 土: "토", 金: "금", 水: "수" };
const TEN_GOD_KO: Record<string, string> = {
  比肩: "비견", 劫财: "겁재", 食神: "식신", 伤官: "상관", 偏财: "편재",
  正财: "정재", 偏官: "편관", 七杀: "칠살", 正官: "정관", 偏印: "편인",
  正印: "정인", 日主: "일주",
};
const GROWTH_STAGE_KO: Record<string, string> = {
  长生: "장생", 沐浴: "목욕", 冠带: "관대", 临官: "건록", 帝旺: "제왕", 衰: "쇠",
  病: "병", 死: "사", 墓: "묘", 绝: "절", 胎: "태", 养: "양",
};

type PillarKey = "year" | "month" | "day" | "hour";

export type VipCalculatedPillar = {
  hanja: string;
  korean: string;
  stemHanja: string;
  branchHanja: string;
  visibleElements: string[];
  stemTenGod: string;
  branchTenGods: string[];
  hiddenStems: string[];
  growthStage: string;
  naYin: string;
};

export type VipDaeunPeriod = {
  order: number;
  ganjiHanja: string;
  ganjiKorean: string;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  stemTenGod: string;
};

export type VipAnnualFlow = {
  year: number;
  traditionalAge: number;
  ganjiHanja: string;
  ganjiKorean: string;
  stemTenGod: string;
};

export type VipCalculatedSaju = {
  calculationMethod: {
    library: "lunar-javascript";
    version: "1.7.7";
    monthBoundary: "solar-terms";
    timeBasis: "KST civil time without true-solar correction";
    lateZiRule: "sect-2 (23:00 day pillar does not roll forward)";
    birthTimePrecision: "minute" | "unknown-noon-estimate";
    limitations: string[];
  };
  pillars: {
    year: VipCalculatedPillar;
    month: VipCalculatedPillar;
    day: VipCalculatedPillar;
    hour: VipCalculatedPillar | null;
  };
  dayMaster: { stemHanja: string; stemKorean: string; element: string };
  visibleElementCount: Record<"목" | "화" | "토" | "금" | "수", number>;
  daeun: {
    direction: "순행" | "역행";
    startOffset: { years: number; months: number; days: number; hours: number };
    periods: VipDaeunPeriod[];
    current: VipDaeunPeriod | null;
    annualFlow: VipAnnualFlow[];
  };
  crossCheck: {
    existingCalendarYear: string;
    existingCalendarMonth: string;
    existingCalendarDay: string;
    yearMatches: boolean;
    monthMatches: boolean;
    dayMatches: boolean;
    note: string;
  };
};

function parseBirthTime(raw: string | null | undefined): { hour: number; minute: number; known: boolean } {
  if (!raw) return { hour: 12, minute: 0, known: false };
  const match = /^(\d{2}):(\d{2})$/.exec(raw.trim());
  if (!match) return { hour: 12, minute: 0, known: false };
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return { hour: 12, minute: 0, known: false };
  return { hour, minute, known: true };
}

function ganjiToKorean(value: string): string {
  if (value.length < 2) return value;
  return `${STEM_KO[value[0]] ?? value[0]}${BRANCH_KO[value[1]] ?? value[1]}`;
}

function translateList(values: string[]): string[] {
  return values.map((value) => TEN_GOD_KO[value] ?? value);
}

function buildPillar(eightChar: EightChar, key: PillarKey): VipCalculatedPillar {
  const source = {
    year: {
      ganji: () => eightChar.getYear(), gan: () => eightChar.getYearGan(), zhi: () => eightChar.getYearZhi(),
      wuXing: () => eightChar.getYearWuXing(), shiShenGan: () => eightChar.getYearShiShenGan(),
      shiShenZhi: () => eightChar.getYearShiShenZhi(), hideGan: () => eightChar.getYearHideGan(),
      diShi: () => eightChar.getYearDiShi(), naYin: () => eightChar.getYearNaYin(),
    },
    month: {
      ganji: () => eightChar.getMonth(), gan: () => eightChar.getMonthGan(), zhi: () => eightChar.getMonthZhi(),
      wuXing: () => eightChar.getMonthWuXing(), shiShenGan: () => eightChar.getMonthShiShenGan(),
      shiShenZhi: () => eightChar.getMonthShiShenZhi(), hideGan: () => eightChar.getMonthHideGan(),
      diShi: () => eightChar.getMonthDiShi(), naYin: () => eightChar.getMonthNaYin(),
    },
    day: {
      ganji: () => eightChar.getDay(), gan: () => eightChar.getDayGan(), zhi: () => eightChar.getDayZhi(),
      wuXing: () => eightChar.getDayWuXing(), shiShenGan: () => eightChar.getDayShiShenGan(),
      shiShenZhi: () => eightChar.getDayShiShenZhi(), hideGan: () => eightChar.getDayHideGan(),
      diShi: () => eightChar.getDayDiShi(), naYin: () => eightChar.getDayNaYin(),
    },
    hour: {
      ganji: () => eightChar.getTime(), gan: () => eightChar.getTimeGan(), zhi: () => eightChar.getTimeZhi(),
      wuXing: () => eightChar.getTimeWuXing(), shiShenGan: () => eightChar.getTimeShiShenGan(),
      shiShenZhi: () => eightChar.getTimeShiShenZhi(), hideGan: () => eightChar.getTimeHideGan(),
      diShi: () => eightChar.getTimeDiShi(), naYin: () => eightChar.getTimeNaYin(),
    },
  }[key];
  const hanja = source.ganji();
  const wuXing = source.wuXing();
  return {
    hanja,
    korean: ganjiToKorean(hanja),
    stemHanja: source.gan(),
    branchHanja: source.zhi(),
    visibleElements: Array.from(wuXing).map((value) => ELEMENT_KO[value] ?? value),
    stemTenGod: TEN_GOD_KO[source.shiShenGan()] ?? source.shiShenGan(),
    branchTenGods: translateList(source.shiShenZhi()),
    hiddenStems: source.hideGan().map((value) => STEM_KO[value] ?? value),
    growthStage: GROWTH_STAGE_KO[source.diShi()] ?? source.diShi(),
    naYin: source.naYin(),
  };
}

function tenGodForStem(dayStem: string, targetStem: string): string {
  const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const dayIndex = stems.indexOf(dayStem);
  const targetIndex = stems.indexOf(targetStem);
  if (dayIndex < 0 || targetIndex < 0) return "확인 필요";
  const dayElement = Math.floor(dayIndex / 2);
  const targetElement = Math.floor(targetIndex / 2);
  const samePolarity = dayIndex % 2 === targetIndex % 2;
  if (dayElement === targetElement) return samePolarity ? "비견" : "겁재";
  if ((dayElement + 1) % 5 === targetElement) return samePolarity ? "식신" : "상관";
  if ((dayElement + 2) % 5 === targetElement) return samePolarity ? "편재" : "정재";
  if ((targetElement + 1) % 5 === dayElement) return samePolarity ? "편인" : "정인";
  return samePolarity ? "편관" : "정관";
}

export function calculateVipSaju(params: {
  solarDate: { year: number; month: number; day: number };
  birthTime: string | null | undefined;
  gender: VipGender;
  currentYear: number;
  existing: VipMingpaJson;
}): VipCalculatedSaju {
  const time = parseBirthTime(params.birthTime);
  const solar = Solar.fromYmdHms(
    params.solarDate.year,
    params.solarDate.month,
    params.solarDate.day,
    time.hour,
    time.minute,
    0,
  );
  const eightChar = solar.getLunar().getEightChar();
  eightChar.setSect(2);

  const year = buildPillar(eightChar, "year");
  const month = buildPillar(eightChar, "month");
  const day = buildPillar(eightChar, "day");
  const hour = time.known ? buildPillar(eightChar, "hour") : null;
  const pillars = [year, month, day, ...(hour ? [hour] : [])];
  const visibleElementCount: VipCalculatedSaju["visibleElementCount"] = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const pillar of pillars) {
    for (const element of pillar.visibleElements) {
      if (element in visibleElementCount) visibleElementCount[element as keyof typeof visibleElementCount] += 1;
    }
  }

  const yun = eightChar.getYun(params.gender === "male" ? 1 : 0);
  const periods = yun
    .getDaYun(10)
    .filter((item) => item.getGanZhi())
    .map<VipDaeunPeriod>((item) => {
      const ganjiHanja = item.getGanZhi();
      return {
        order: item.getIndex(),
        ganjiHanja,
        ganjiKorean: ganjiToKorean(ganjiHanja),
        startAge: item.getStartAge(),
        endAge: item.getEndAge(),
        startYear: item.getStartYear(),
        endYear: item.getEndYear(),
        stemTenGod: tenGodForStem(day.stemHanja, ganjiHanja[0]),
      };
    });
  const current = periods.find((item) => params.currentYear >= item.startYear && params.currentYear <= item.endYear) ?? null;
  const currentRaw = yun.getDaYun(10).find((item) => params.currentYear >= item.getStartYear() && params.currentYear <= item.getEndYear());
  const annualFlow = (currentRaw?.getLiuNian() ?? [])
    .filter((item) => item.getYear() >= params.currentYear && item.getYear() <= params.currentYear + 4)
    .map<VipAnnualFlow>((item) => ({
      year: item.getYear(),
      traditionalAge: item.getAge(),
      ganjiHanja: item.getGanZhi(),
      ganjiKorean: ganjiToKorean(item.getGanZhi()),
      stemTenGod: tenGodForStem(day.stemHanja, item.getGanZhi()[0]),
    }));

  const existingYear = params.existing.fourPillars.year.pillarKo;
  const existingMonth = params.existing.fourPillars.month.pillarKo;
  const existingDay = params.existing.fourPillars.day.pillarKo;
  return {
    calculationMethod: {
      library: "lunar-javascript",
      version: "1.7.7",
      monthBoundary: "solar-terms",
      timeBasis: "KST civil time without true-solar correction",
      lateZiRule: "sect-2 (23:00 day pillar does not roll forward)",
      birthTimePrecision: time.known ? "minute" : "unknown-noon-estimate",
      limitations: [
        "출생지를 입력받지 않아 경도 기반 진태양시 보정은 적용하지 않았습니다.",
        "절기 교체 시각 또는 23시 전후 출생은 학파와 시간 보정 방식에 따라 결과가 달라질 수 있습니다.",
        ...(time.known ? [] : ["출생 시각이 없어 시주는 제외했고 대운 시작 시점은 정오 기준 추정값입니다."]),
        "용신은 신강약·조후·격국을 함께 판단해야 하므로 자동 확정하지 않습니다.",
      ],
    },
    pillars: { year, month, day, hour },
    dayMaster: {
      stemHanja: day.stemHanja,
      stemKorean: STEM_KO[day.stemHanja] ?? day.stemHanja,
      element: day.visibleElements[0] ?? "확인 필요",
    },
    visibleElementCount,
    daeun: {
      direction: yun.isForward() ? "순행" : "역행",
      startOffset: {
        years: yun.getStartYear(),
        months: yun.getStartMonth(),
        days: yun.getStartDay(),
        hours: yun.getStartHour(),
      },
      periods,
      current,
      annualFlow,
    },
    crossCheck: {
      existingCalendarYear: existingYear,
      existingCalendarMonth: existingMonth,
      existingCalendarDay: existingDay,
      yearMatches: year.korean === existingYear,
      monthMatches: month.korean === existingMonth,
      dayMatches: day.korean === existingDay,
      note: "기존 값은 음력 달력 월 기준, 신규 월주는 사주 해석용 절기 기준이므로 월 경계에서 다를 수 있습니다.",
    },
  };
}
