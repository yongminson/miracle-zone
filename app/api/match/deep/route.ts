import { productDetailHandler } from "@/lib/paid/product-route";
import { calculateMatch } from "@/lib/match/match-engine";
import { buildMatchDeep, generateMatchDeep, readMatchDeepInput } from "@/lib/match/match-deep";
import {
  MATCH_DEEP_ORDER_NAME,
  MATCH_DEEP_PRICE_WON,
  MATCH_DEEP_PRODUCT_ID,
  type MatchDeepInput,
} from "@/lib/match/match-deep-types";

/**
 * 궁합 심층 풀이(웹·구글 앱, 2,200원). 새로 추가한 경로다 — 무료 /api/match 는 그대로.
 * 결제 확인 → 주문 저장(product_orders) → AI 풀이 순서는 lib/paid/product-order.ts 가 지킨다.
 */

export const runtime = "nodejs";
// AI 가 영역별 풀이를 쓰는 데 시간이 걸린다
export const maxDuration = 60;

export const POST = productDetailHandler({
  product: "match_deep",
  googleProductId: MATCH_DEEP_PRODUCT_ID,
  priceWon: MATCH_DEEP_PRICE_WON,
  orderName: MATCH_DEEP_ORDER_NAME,
  readInput: readMatchDeepInput,
  // 결제할 때 넣은 두 사람 생년월일과 같아야 다시 연다
  ownerKey: (input: MatchDeepInput) => `${input.a.birthDate}|${input.b.birthDate}`,
  validate: (input: MatchDeepInput) => {
    calculateMatch(input.a, input.b);
  },
  generate: (input: MatchDeepInput) => generateMatchDeep(input, calculateMatch(input.a, input.b)),
  build: buildMatchDeep,
});
