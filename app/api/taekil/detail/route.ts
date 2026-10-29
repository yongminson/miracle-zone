import { productDetailHandler } from "@/lib/paid/product-route";
import { calculateTaekil, readTaekilInput } from "@/lib/taekil/taekil-engine";
import { buildTaekil, generateTaekilDetail } from "@/lib/taekil/taekil-detail";
import { TAEKIL_ORDER_NAME, TAEKIL_PRICE_WON, TAEKIL_PRODUCT_ID, type TaekilInput } from "@/lib/taekil/taekil-types";

/**
 * 택일 상세(웹·구글 앱, 2,200원). 새로 추가한 경로다.
 * 결제 확인 → 주문 저장(product_orders) → AI 조언 순서는 lib/paid/product-order.ts 가 지킨다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = productDetailHandler({
  product: "taekil",
  googleProductId: TAEKIL_PRODUCT_ID,
  priceWon: TAEKIL_PRICE_WON,
  orderName: TAEKIL_ORDER_NAME,
  readInput: readTaekilInput,
  // 결제할 때 넣은 목적·생년월일과 같아야 다시 연다
  ownerKey: (input: TaekilInput) => `${input.purpose}|${input.a.birthDate}|${input.b?.birthDate ?? ""}`,
  validate: (input: TaekilInput) => {
    calculateTaekil(input);
  },
  generate: generateTaekilDetail,
  build: buildTaekil,
});
