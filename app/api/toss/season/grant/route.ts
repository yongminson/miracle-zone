import { tossProductGrantHandler } from "@/lib/paid/toss-product-route";
import { readSeasonInput, validateSeason } from "@/lib/season/season-engine";
import { buildSeason, generateSeasonDetail } from "@/lib/season/season-detail";
import { SEASON_PRICE_WON, type SeasonInput } from "@/lib/season/season-types";

/**
 * 앱인토스 시즌 운세(시험 합격운, 2,200원). 새로 추가한 경로다 — 웹 /api/season/detail 과 같은 계산·풀이.
 * 지급 단계(prepareOnly)와 결제 뒤 풀이 받기는 lib/paid/toss-product-route.ts 가 처리한다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = tossProductGrantHandler({
  product: "season_luck",
  priceWon: SEASON_PRICE_WON,
  readInput: readSeasonInput,
  ownerKey: (input: SeasonInput) => `${input.season}|${input.person.birthDate}|${input.eventDate}`,
  validate: (input: SeasonInput) => validateSeason(input),
  generate: generateSeasonDetail,
  build: buildSeason,
});
