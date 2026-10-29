import type { NewYearCalendarType, NewYearGender } from "@/lib/newyear/newyear-types";

/** 택일(좋은 날 고르기) — 화면(웹·앱)과 서버가 같이 쓰는 값. 계산은 taekil-engine.ts, AI 는 taekil-detail.ts(서버 전용) */

export const TAEKIL_PRICE_WON = 2_200;
/** 구글 플레이 상품 키 */
export const TAEKIL_PRODUCT_ID = "taekil";
/** 포트원 결제 상품명 — 서버가 결제 확인 때 이 이름까지 맞춰 본다 */
export const TAEKIL_ORDER_NAME = "좋은 날 고르기(택일)";
/** 앞으로 며칠 안에서 고르는지 */
export const TAEKIL_RANGE_DAYS = 90;

export type TaekilPurpose = "contract" | "move" | "confess" | "interview" | "opening" | "wedding" | "travel" | "purchase";

export const TAEKIL_PURPOSES: { key: TaekilPurpose; label: string; emoji: string }[] = [
  { key: "contract", label: "계약·서류", emoji: "📝" },
  { key: "move", label: "이사·입주", emoji: "🏠" },
  { key: "confess", label: "고백·프러포즈", emoji: "💌" },
  { key: "interview", label: "면접·시험·발표", emoji: "🎤" },
  { key: "opening", label: "개업·새 일 시작", emoji: "🚀" },
  { key: "wedding", label: "결혼식·상견례", emoji: "💍" },
  { key: "travel", label: "여행·출장", emoji: "✈️" },
  // 시술·치료 날짜는 넣지 않는다 — 건강 결정을 운세로 정하게 만들면 안 된다
  { key: "purchase", label: "큰 구매(차·집)", emoji: "🔑" },
];

export type TaekilPerson = {
  name: string;
  birthDate: string;
  calendarType: NewYearCalendarType;
  gender: NewYearGender;
};

export type TaekilInput = {
  purpose: TaekilPurpose;
  a: TaekilPerson;
  /** 함께하는 사람(결혼·이사·여행 등) — 없으면 혼자 기준 */
  b: TaekilPerson | null;
  /** 산 달(한국 시간 YYYY-MM) — 같은 달 안에서는 다시 보기, 다음 달엔 새 90일로 다시 살 수 있다. 계산에는 쓰지 않는다 */
  month: string;
};

/** 무료 — 몇 날을 찾았는지만(날짜는 유료) */
export type TaekilPreview = {
  purpose: TaekilPurpose;
  label: string;
  start: string;
  end: string;
  /** 목적에 맞는 좋은 날 후보 수 */
  candidateCount: number;
  /** 피하면 좋은 날 수 */
  avoidCount: number;
  together: boolean;
};

export type TaekilDay = {
  date: string;
  weekday: string;
  score: number;
  /** 그날 성격(운세 캘린더와 같은 말) */
  title: string;
  /** 왜 이 목적에 좋은지 한 줄(계산) */
  why: string;
};

export type TaekilDetail = {
  /** 결제한 날(한국 시간) — 다시 볼 때도 이날 기준 90일로 계산해야 조언과 날짜가 맞는다 */
  start: string;
  overview: string;
  /** 순위 날짜마다 한 줄 조언 */
  tips: { date: string; tip: string }[];
  prepare: string[];
  motto: string;
};

export type TaekilPaid = {
  input: TaekilInput;
  preview: TaekilPreview;
  ranked: TaekilDay[];
  avoid: TaekilDay[];
  detail: TaekilDetail;
  reopened: boolean;
};
