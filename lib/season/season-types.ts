import type { DayLuck } from "@/lib/calendar/day-luck-types";
import type { NewYearCalendarType, NewYearGender } from "@/lib/newyear/newyear-types";

/**
 * 시즌 운세 — 화면(웹·앱)과 서버가 같이 쓰는 값. 계산은 season-engine.ts, AI 는 season-detail.ts(서버 전용).
 * 구글 플레이 상품 하나(season_luck)를 시즌마다 다시 쓴다. 첫 시즌은 "시험 합격운"(수능·공무원·자격증).
 * 새 시즌(예: 설날 가족 운세)은 SEASONS 에 더하고 엔진·화면에 그 시즌 계산을 붙인다.
 */

export const SEASON_PRICE_WON = 2_200;
export const SEASON_PRODUCT_ID = "season_luck";
/** 포트원 결제 상품명 — 서버가 결제 확인 때 이 이름까지 맞춰 본다 */
export const SEASON_ORDER_NAME = "시즌 운세";

export type SeasonKey = "exam";

export const SEASONS: Record<SeasonKey, { title: string; emoji: string; defaultDate: string; dateLabel: string }> = {
  // 2027학년도 수능 — 2026-11-19(목). 지나면 다음 시험 날짜를 넣어 쓴다
  exam: { title: "시험 합격운", emoji: "📝", defaultDate: "2026-11-19", dateLabel: "시험 날짜" },
};

export type SeasonPerson = {
  name: string;
  birthDate: string;
  calendarType: NewYearCalendarType;
  gender: NewYearGender;
};

export type SeasonInput = {
  season: SeasonKey;
  person: SeasonPerson;
  /** 시험 날짜(YYYY-MM-DD) */
  eventDate: string;
};

/** 무료 — 시험 날 흐름 한 줄과 D-day */
export type SeasonPreview = {
  season: SeasonKey;
  title: string;
  eventDate: string;
  dDay: number;
  eventTone: DayLuck["tone"];
  eventTitle: string;
  /** 시험 전까지 집중하기 좋은 날 수(날짜는 유료) */
  focusCount: number;
};

export type SeasonDetail = {
  /** 결제한 날(한국 시간) — 다시 볼 때도 이날부터 시험 전날까지로 계산한다 */
  start: string;
  overview: string;
  eventDayTips: string[];
  /** D-day 구간별 준비(예: D-30~D-8, D-7~D-1) */
  plan: { label: string; text: string }[];
  cheer: string;
};

export type SeasonPaid = {
  input: SeasonInput;
  preview: SeasonPreview;
  eventDay: DayLuck;
  /** 집중 공부·실전 연습에 힘이 실리는 날(최대 5) */
  focusDays: DayLuck[];
  /** 무리하지 말고 컨디션을 지킬 날(최대 3) */
  restDays: DayLuck[];
  detail: SeasonDetail;
  reopened: boolean;
};
