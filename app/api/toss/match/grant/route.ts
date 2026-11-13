import { tossProductGrantHandler } from "@/lib/paid/toss-product-route";
import { calculateMatch } from "@/lib/match/match-engine";
import { buildMatchDeep, generateMatchDeep, readMatchDeepInput } from "@/lib/match/match-deep";
import { MATCH_DEEP_PRICE_WON, type MatchDeepInput } from "@/lib/match/match-deep-types";

/**
 * 앱인토스 궁합 심층 풀이(2,200원). 새로 추가한 경로다 — 웹 /api/match/deep 과 같은 계산·풀이.
 * 지급 단계(prepareOnly)와 결제 뒤 풀이 받기는 lib/paid/toss-product-route.ts 가 처리한다.
 */

export const runtime = "nodejs";
// 유료 풀이 새 모델(생각하는 모델)이라 60초를 넘을 수 있다(2026-11-14)
export const maxDuration = 120;

export const POST = tossProductGrantHandler({
  product: "match_deep",
  priceWon: MATCH_DEEP_PRICE_WON,
  readInput: readMatchDeepInput,
  ownerKey: (input: MatchDeepInput) => `${input.a.birthDate}|${input.b.birthDate}`,
  validate: (input: MatchDeepInput) => {
    calculateMatch(input.a, input.b);
  },
  generate: (input: MatchDeepInput) => generateMatchDeep(input, calculateMatch(input.a, input.b)),
  build: buildMatchDeep,
});
