import type { DayLuck } from "@/lib/calendar/day-luck-types";
import type { NewYearCalendarType, NewYearGender } from "@/lib/newyear/newyear-types";

/**
 * 이달의 운세 — 결과 형태. 화면(웹·앱)은 이 파일만 가져다 쓴다.
 * 계산은 명운 서버(/api/monthly, /api/monthly/detail)에서만 한다.
 */

/** 상세 풀이(유료) — 웹·앱 가격 */
export const MONTHLY_PRICE_WON = 1_100;
/** 구글 플레이 상품 키 */
export const MONTHLY_PRODUCT_ID = "monthly_luck";

/** 결제한 사람의 입력값. 결제 1건 = 한 사람의 한 달 */
export type MonthlyInput = {
  name: string;
  birthDate: string;
  calendarType: NewYearCalendarType;
  gender: NewYearGender;
};

/** 무료 — 이달의 기운 한 줄과 좋은 날·조심할 날 '개수'(날짜는 유료) */
export type MonthlyResult = {
  /** "2026-12" (한국 시간 기준 양력 달) */
  monthKey: string;
  year: number;
  month: number;
  /** 그달 한가운데(15일)의 월 간지 */
  ganjiKorean: string;
  tenGod: string;
  dayMaster: { korean: string; hanja: string; element: string };
  title: string;
  keywords: string[];
  summary: string;
  score: number;
  goodCount: number;
  cautionCount: number;
  /** 일지와 충·합이 걸린 달이면 한 줄 */
  note: string | null;
};

export type MonthlyPurposeKey = "contract" | "meet" | "move" | "exam" | "money";

/** 목적별 좋은 날(계산) — 계약·만남·이동·시험은 좋은 날, money 는 지갑을 지킬 날 */
export type MonthlyPurpose = {
  key: MonthlyPurposeKey;
  label: string;
  dates: string[];
  tip: string;
};

export type MonthlyWeek = {
  index: number;
  start: string;
  end: string;
  focus: string;
  doThis: string;
};

export type MonthlyArea = {
  key: "money" | "love" | "work" | "health";
  label: string;
  summary: string;
  doThis: string;
  avoid: string;
};

/** AI 가 쓰는 부분 — 주문 표에 저장해 다시 볼 때는 AI 를 부르지 않는다 */
export type MonthlyDetail = {
  overview: string;
  weeks: MonthlyWeek[];
  areas: MonthlyArea[];
  motto: string;
};

/** 결제 후 화면에 주는 전부 — 달력·목적별 날짜는 계산으로 매번 다시 만든다 */
export type MonthlyPaid = {
  input: MonthlyInput;
  result: MonthlyResult;
  days: DayLuck[];
  purposes: MonthlyPurpose[];
  detail: MonthlyDetail;
  reopened: boolean;
};
