/**
 * 구매 인증 후기 — 화면과 서버가 같이 쓰는 값 (2026-11-12).
 * 결제한 사람만, 결제 1건에 후기 1개. 표는 supabase reviews (서버만 읽고 쓴다).
 * 가짜 후기를 넣지 않는다. 후기가 없으면 화면에 아무것도 보이지 않게 한다.
 */

export const REVIEW_PRODUCTS = ["newyear"] as const;
export type ReviewProduct = (typeof REVIEW_PRODUCTS)[number];

export const REVIEW_BODY_MIN = 5;
export const REVIEW_BODY_MAX = 300;

export type PublicReview = {
  id: string;
  rating: number;
  body: string;
  displayName: string;
  zodiac: string | null;
  createdAt: string;
};

export type ReviewSummary = { count: number; average: number | null; reviews: PublicReview[] };

/** 이름 가리기 — "홍길동" → "홍*동", "김철" → "김*", 비었으면 "구매자" */
export function maskName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n) return "구매자";
  const chars = [...n];
  if (chars.length === 1) return `${chars[0]}*`;
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}${"*".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

export function isReviewProduct(value: unknown): value is ReviewProduct {
  return typeof value === "string" && (REVIEW_PRODUCTS as readonly string[]).includes(value);
}
