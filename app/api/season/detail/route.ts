import { productDetailHandler } from "@/lib/paid/product-route";
import { readSeasonInput, validateSeason } from "@/lib/season/season-engine";
import { buildSeason, generateSeasonDetail } from "@/lib/season/season-detail";
import { SEASON_ORDER_NAME, SEASON_PRICE_WON, SEASON_PRODUCT_ID, type SeasonInput } from "@/lib/season/season-types";

/**
 * 시즌 운세 상세(웹·구글 앱, 2,200원). 새로 추가한 경로다.
 * 결제 확인 → 주문 저장(product_orders) → AI 풀이 순서는 lib/paid/product-order.ts 가 지킨다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = productDetailHandler({
  product: "season_luck",
  googleProductId: SEASON_PRODUCT_ID,
  priceWon: SEASON_PRICE_WON,
  orderName: SEASON_ORDER_NAME,
  readInput: readSeasonInput,
  // 결제할 때 넣은 시즌·생년월일·시험 날짜와 같아야 다시 연다
  ownerKey: (input: SeasonInput) => `${input.season}|${input.person.birthDate}|${input.eventDate}`,
  validate: (input: SeasonInput) => validateSeason(input),
  generate: generateSeasonDetail,
  build: buildSeason,
});
