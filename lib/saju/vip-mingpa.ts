import KoreanLunarCalendar from "korean-lunar-calendar";
import type {
  VipCalendarType,
  VipGender,
  VipMingpaJson,
  VipMingpaCalendarSlice,
} from "./vip-types";

const PKG_VERSION = "0.3.6";

export type BuildVipMingpaInput = {
  year: number;
  month: number;
  day: number;
  calendarType: VipCalendarType;
  gender: VipGender;
  birthTimeRaw?: string | null;
};

function sliceFromCalendar(c: {
  year: number;
  month: number;
  day: number;
  intercalation?: boolean;
}): VipMingpaCalendarSlice {
  return {
    year: c.year,
    month: c.month,
    day: c.day,
    ...(c.intercalation !== undefined ? { intercalation: c.intercalation } : {}),
  };
}

/** 출생 입력으로 명식 JSON 뼈대 생성 (만세력 라이브러리 기반 연·월·일 간지) */
export function buildVipMingpaJson(input: BuildVipMingpaInput): VipMingpaJson {
  const cal = new KoreanLunarCalendar();
  const todoNotes: string[] = [];

  if (input.calendarType === "solar") {
    const ok = cal.setSolarDate(input.year, input.month, input.day);
    if (!ok) {
      throw new Error("유효하지 않은 양력 생년월일입니다.");
    }
  } else {
    const isLeap = input.calendarType === "lunar-leap";
    const ok = cal.setLunarDate(input.year, input.month, input.day, isLeap);
    if (!ok) {
      throw new Error("유효하지 않은 음력 생년월일입니다.");
    }
  }

  const gapja = cal.getKoreanGapja();
  const idx = cal.getGapJaIndex();
  const solar = cal.getSolarCalendar();
  const lunar = cal.getLunarCalendar();

  const pillar = (ko: string, stemIdx: number, branchIdx: number) => ({
    pillarKo: ko,
    cheonganIndex: stemIdx,
    ganjiIndex: branchIdx,
  });

  // 시주: 출생 시각·태양시 보정·야자시 규칙 등 별도 엔진 필요
  todoNotes.push(
    "TODO: 시주(時柱) — 출생 시각을 분 단위로 받아 진태양시/야자시 규칙 적용 후 시 간지 산출",
  );
  todoNotes.push(
    "TODO: 십성(十星) — 일간 대비 년·월·일·시 천간 및 지장간 포함 전체 매트릭스",
  );
  todoNotes.push(
    "TODO: 대운(大運) — 성별·월령 기준 대운 방향, 시작 연령, 10년 단위 간지 배열",
  );
  todoNotes.push(
    "TODO: 신살·공망·형충파해·합화 등 원국 세부 판단 로직과 용신 추정",
  );

  const dayStemKo = gapja.day?.[0] ?? null;

  return {
    gender: input.gender,
    calendarType: input.calendarType,
    birthTimeRaw: input.birthTimeRaw ?? null,
    solarDate: sliceFromCalendar(solar),
    lunarDate: sliceFromCalendar(lunar),
    fourPillars: {
      year: pillar(gapja.year, idx.cheongan.year, idx.ganji.year),
      month: pillar(gapja.month, idx.cheongan.month, idx.ganji.month),
      day: pillar(gapja.day, idx.cheongan.day, idx.ganji.day),
      hour: null,
    },
    dayMasterStemKo: dayStemKo,
    sipSeongByPillar: null,
    daeunOutline: null,
    libraryMeta: { source: "korean-lunar-calendar", version: PKG_VERSION },
    todoNotes,
  };
}
