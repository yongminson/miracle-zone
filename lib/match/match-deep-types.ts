import type { MatchCalc, MatchPerson } from "./match-engine";

/** 궁합 심층 풀이 — 화면(웹·앱)과 서버가 같이 쓰는 값. 계산·AI 는 match-deep.ts(서버 전용) */

export const MATCH_DEEP_PRICE_WON = 2_200;
/** 구글 플레이 상품 키 */
export const MATCH_DEEP_PRODUCT_ID = "match_deep";
/** 포트원 결제 상품명 — 서버가 결제 확인 때 이 이름까지 맞춰 본다(같은 2,200원 다른 상품 결제를 막는다) */
export const MATCH_DEEP_ORDER_NAME = "궁합 심층 풀이";

export const MATCH_RELATIONS: Record<string, string> = {
  lover: "연인",
  couple: "부부",
  friend: "친구",
  family: "가족",
  business: "비즈니스 파트너",
};

export type MatchDeepInput = { a: MatchPerson; b: MatchPerson; relationship: string };

export type MatchDeepDetail = {
  overview: string;
  areas: { key: "talk" | "money" | "love" | "future"; label: string; summary: string; tip: string }[];
  goodPoints: string[];
  clashPoints: { point: string; fix: string }[];
  habits: string[];
  motto: string;
};

export type MatchTogetherDay = { date: string; title: string };

export type MatchDeepPaid = {
  input: MatchDeepInput;
  calc: MatchCalc;
  togetherDays: MatchTogetherDay[];
  detail: MatchDeepDetail;
  reopened: boolean;
};
