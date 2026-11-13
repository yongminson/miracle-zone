import { tossProductGrantHandler } from "@/lib/paid/toss-product-route";
import { calculateTaekil, readTaekilInput } from "@/lib/taekil/taekil-engine";
import { buildTaekil, generateTaekilDetail } from "@/lib/taekil/taekil-detail";
import { TAEKIL_PRICE_WON, type TaekilInput } from "@/lib/taekil/taekil-types";

/**
 * 앱인토스 택일(좋은 날 고르기, 2,200원). 새로 추가한 경로다 — 웹 /api/taekil/detail 과 같은 계산·조언.
 * 지급 단계(prepareOnly)와 결제 뒤 결과 받기는 lib/paid/toss-product-route.ts 가 처리한다.
 */

export const runtime = "nodejs";
// 유료 풀이 새 모델(생각하는 모델)이라 60초를 넘을 수 있다(2026-11-14)
export const maxDuration = 120;

export const POST = tossProductGrantHandler({
  product: "taekil",
  priceWon: TAEKIL_PRICE_WON,
  readInput: readTaekilInput,
  ownerKey: (input: TaekilInput) => `${input.purpose}|${input.a.birthDate}|${input.b?.birthDate ?? ""}`,
  validate: (input: TaekilInput) => {
    calculateTaekil(input);
  },
  generate: generateTaekilDetail,
  build: buildTaekil,
});
