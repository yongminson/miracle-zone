import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { verifyTossIapOrder } from "@/lib/payments/toss-iap";
import { fulfillNewYearOrder } from "@/lib/newyear/newyear-order";
import { NEWYEAR_DETAIL_PRICE_WON, type NewYearDetailInput } from "@/lib/newyear/newyear-types";

/**
 * 앱인토스 신년운세 상세 풀이. 새로 추가한 경로다.
 *
 * 두 번 불린다.
 *  1) 토스 결제의 지급 단계에서 prepareOnly=true 로 — 주문만 확인·저장하고 바로 끝낸다.
 *     AI 풀이(약 20초)를 여기서 쓰면 토스가 지급 응답을 기다리다 실패할 수 있어서다.
 *  2) 결제가 끝난 뒤 화면에서 — 저장된 주문으로 풀이를 쓰거나, 이미 있으면 돌려준다.
 * 기존 /api/toss/iap/grant 는 이 상품을 받지 않는다.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOSS_USER_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function readInput(body: Record<string, unknown>): NewYearDetailInput | null {
  const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const year = Number(birthDate.slice(0, 4));
  if (year < 1920 || year > 2026) return null;
  return {
    name: typeof body.name === "string" ? body.name.trim().slice(0, 20) : "",
    birthDate,
    calendarType:
      body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar",
    gender: body.gender === "female" ? "female" : "male",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const tossUserKey = typeof body.tossUserKey === "string" ? body.tossUserKey.trim() : "";
    const prepareOnly = body.prepareOnly === true;

    if (!UUID_PATTERN.test(orderId)) return failure("주문번호 형식이 올바르지 않습니다.", 400);

    const supabase = createSupabaseAdminClient();
    if (!supabase) return failure("서버 설정 문제로 처리하지 못했습니다.", 503);

    const outcome = await fulfillNewYearOrder({
      supabase,
      paymentRef: `toss:${orderId}`,
      platform: "toss",
      amountWon: NEWYEAR_DETAIL_PRICE_WON,
      input: readInput(body),
      generate: !prepareOnly,
      verify: async () => {
        // 처음 결제를 확인할 때만 토스 사용자 키가 필요하다(다시 보기는 저장된 주문으로 연다)
        if (!TOSS_USER_KEY_PATTERN.test(tossUserKey)) {
          return { ok: false, status: 400, message: "토스 사용자 인증 정보가 올바르지 않습니다." };
        }
        const verified = await verifyTossIapOrder({ orderId, productKey: "newyear_detail", tossUserKey });
        if (verified.ok) return { ok: true };
        console.error("[toss-newyear] order verification failed", {
          code: verified.code,
          orderSuffix: orderId.slice(-8),
        });
        const status = verified.code === "CONFIGURATION_ERROR" || verified.code === "TOSS_API_ERROR" ? 503 : 400;
        return { ok: false, status, message: verified.message };
      },
    });

    if (!outcome.ok) return failure(outcome.message, outcome.status);
    return NextResponse.json({
      success: true,
      input: outcome.input,
      result: outcome.result,
      detail: outcome.detail,
      reopened: outcome.reopened,
    });
  } catch (error) {
    console.error("[toss-newyear] unexpected error", error);
    return failure("상세 풀이를 처리하는 중 오류가 발생했습니다.", 500);
  }
}
