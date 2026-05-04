import { buildVipMingpaJson, type BuildVipMingpaInput } from "./vip-mingpa";
import type { VipMingpaJson } from "./vip-types";

/** VIP 리포트용 통합 사주 뼈대 (만세력 + 미구현 명리 엔진 자리) */
export type VipSajuData = {
  profile: {
    gender: "male" | "female";
    birthDate: string;
    birthTime: string | null;
    mbti: string | null;
    calendarType: BuildVipMingpaInput["calendarType"];
  };
  /** `korean-lunar-calendar` 기반 연·월·일 간지 및 양·음력 */
  mingpaCore: VipMingpaJson;
  /** 일간(日干) — 일주 천간 한 글자 및 일주 간지 */
  dayMaster: {
    stemKo: string | null;
    dayPillarKo: string;
  };
  /**
   * 십성(十星): 일간 대비 각 천간·지장간 관계
   * TODO: fortune-engine 또는 전용 모듈과 통합해 천간·지지 전체 매트릭스 채우기
   */
  sipSeongByPosition: null;
  /**
   * 대운(大運): 10년 단위 간지 흐름
   * TODO: 성별·절기 기준 순역행 결정, 대운수·대운 간지 배열 산출
   */
  daeunOutline: null;
  /**
   * 용신(用神): 원국에서 필요한 보완 오행
   * TODO: 월령 득령·통근·신강약 판별 후 용신·희신 후보 도출
   */
  yongsinNeededElement: null;
};

export type ExtractVipSajuInput = BuildVipMingpaInput & {
  birthDateIso: string;
  mbti: string | null;
};

/** 클라이언트 입력 → OpenAI에 넘길 `sajuData` JSON 뼈대 */
export function extractVipSajuData(input: ExtractVipSajuInput): VipSajuData {
  const mingpaCore = buildVipMingpaJson(input);

  return {
    profile: {
      gender: input.gender,
      birthDate: input.birthDateIso,
      birthTime: input.birthTimeRaw ?? null,
      mbti: input.mbti,
      calendarType: input.calendarType,
    },
    mingpaCore,
    dayMaster: {
      stemKo: mingpaCore.dayMasterStemKo,
      dayPillarKo: mingpaCore.fourPillars.day.pillarKo,
    },
    sipSeongByPosition: null,
    daeunOutline: null,
    yongsinNeededElement: null,
  };
}
