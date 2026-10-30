import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { verifyTossIapOrder } from "@/lib/payments/toss-iap";
import { fulfillProductOrder, prepareProductOrder } from "./product-order";

/**
 * 앱인토스 유료 상세 풀이 공통 — 궁합 심층·택일·시즌 운세. 신년운세(/api/toss/newyear/grant)와 같은 방식이다.
 *
 * 두 번 불린다.
 *  1) 토스 결제의 지급 단계에서 prepareOnly=true 로 — 결제 확인·주문 저장만 하고 바로 끝낸다.
 *     AI 풀이(15~25초)를 여기서 쓰면 토스가 지급 응답을 기다리다 실패할 수 있어서다.
 *  2) 결제가 끝난 뒤 화면에서 — 저장된 주문으로 풀이를 쓰거나, 이미 있으면 돌려준다.
 * 요청: { orderId, tossUserKey, prepareOnly, input } — input 모양은 웹 상세 경로와 같다.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOSS_USER_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export function tossProductGrantHandler<TInput, TDetail, TPaid extends object>(config: {
  product: "match_deep" | "taekil" | "season_luck";
  priceWon: number;
  readInput: (body: Record<string, unknown>) => TInput | null;
  ownerKey: (input: TInput) => string;
  validate: (input: TInput) => void;
  generate: (input: TInput) => Promise<TDetail>;
  build: (input: TInput, detail: TDetail) => TPaid;
}) {
  return async function POST(req: Request) {
    try {
      const body = (await req.json()) as Record<string, unknown>;
      const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
      const tossUserKey = typeof body.tossUserKey === "string" ? body.tossUserKey.trim() : "";
      const prepareOnly = body.prepareOnly === true;
      if (!UUID_PATTERN.test(orderId)) return failure("주문번호 형식이 올바르지 않습니다.", 400);

      const supabase = createSupabaseAdminClient();
      if (!supabase) return failure("서버 설정 문제로 처리하지 못했습니다.", 503);

      const params = {
        supabase,
        product: config.product,
        paymentRef: `toss:${orderId}`,
        platform: "toss" as const,
        amountWon: config.priceWon,
        input: config.readInput(body),
        ownerKey: config.ownerKey,
        validate: config.validate,
        verify: async () => {
          // 처음 결제를 확인할 때만 토스 사용자 키가 필요하다(다시 보기는 저장된 주문으로 연다)
          if (!TOSS_USER_KEY_PATTERN.test(tossUserKey)) {
            return { ok: false as const, status: 400, message: "토스 사용자 인증 정보가 올바르지 않습니다." };
          }
          const verified = await verifyTossIapOrder({ orderId, productKey: config.product, tossUserKey });
          if (verified.ok) return { ok: true as const };
          console.error(`[toss-${config.product}] order verification failed`, {
            code: verified.code,
            orderSuffix: orderId.slice(-8),
          });
          const status = verified.code === "CONFIGURATION_ERROR" || verified.code === "TOSS_API_ERROR" ? 503 : 400;
          return { ok: false as const, status, message: verified.message };
        },
      };

      if (prepareOnly) {
        const prepared = await prepareProductOrder<TInput>(params);
        if (!prepared.ok) return failure(prepared.message, prepared.status);
        return NextResponse.json({ success: true, prepared: true });
      }

      const outcome = await fulfillProductOrder<TInput, TDetail, TPaid>({
        ...params,
        generate: config.generate,
        build: config.build,
      });
      if (!outcome.ok) return failure(outcome.message, outcome.status);
      const { ok: _ok, ...paid } = outcome;
      return NextResponse.json({ success: true, ...paid });
    } catch (error) {
      console.error(`[toss-${config.product}] unexpected error`, error);
      return failure("상세 풀이를 처리하는 중 오류가 발생했습니다.", 500);
    }
  };
}
