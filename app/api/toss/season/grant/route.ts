import { tossProductGrantHandler } from "@/lib/paid/toss-product-route";
import { readSeasonInput, validateSeason } from "@/lib/season/season-engine";
import { buildSeason, generateSeasonDetail } from "@/lib/season/season-detail";
import { SEASON_PRICE_WON, type SeasonInput } from "@/lib/season/season-types";

/**
 * 앱인토스 시즌 운세(시험 합격운, 2,200원). 새로 추가한 경로다 — 웹 /api/season/detail 과 같은 계산·풀이.
 * 지급 단계(prepareOnly)와 결제 뒤 풀이 받기는 lib/paid/toss-product-route.ts 가 처리한다.
 */

export const runtime = "nodejs";
// 유료 풀이 새 모델(생각하는 모델)이라 60초를 넘을 수 있다(2026-11-14)
export const maxDuration = 120;

export const POST = tossProductGrantHandler({
  product: "season_luck",
  priceWon: SEASON_PRICE_WON,
  readInput: readSeasonInput,
  ownerKey: (input: SeasonInput) => `${input.season}|${input.person.birthDate}|${input.eventDate}`,
  validate: (input: SeasonInput) => validateSeason(input),
  generate: generateSeasonDetail,
  build: buildSeason,
});
