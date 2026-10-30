import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { verifyTossIapOrder } from "@/lib/payments/toss-iap";
import { fulfillMonthlyOrder, prepareMonthlyOrder } from "@/lib/monthly/monthly-order";
import { MONTHLY_PRICE_WON, type MonthlyInput } from "@/lib/monthly/monthly-types";

/**
 * 앱인토스 이달의 운세 상세 풀이(1,100원). 새로 추가한 경로다 — 신년운세 /api/toss/newyear/grant 와 같은 방식.
 *
 * 두 번 불린다.
 *  1) 토스 결제의 지급 단계에서 prepareOnly=true 로 — 결제 확인·주문 저장만 하고 바로 끝낸다.
 *  2) 결제가 끝난 뒤 화면에서 — 저장된 주문으로 풀이를 쓰거나, 이미 있으면 돌려준다.
 * 요청: { orderId, tossUserKey, prepareOnly, monthKey, name, birthDate, calendarType, gender } — 웹 /api/monthly/detail 과 같은 모양.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOSS_USER_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function readInput(body: Record<string, unknown>): MonthlyInput | null {
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
    const monthKey = typeof body.monthKey === "string" ? body.monthKey.trim() : "";
    if (!UUID_PATTERN.test(orderId)) return failure("주문번호 형식이 올바르지 않습니다.", 400);

    const supabase = createSupabaseAdminClient();
    if (!supabase) return failure("서버 설정 문제로 처리하지 못했습니다.", 503);

    const params = {
      supabase,
      paymentRef: `toss:${orderId}`,
      platform: "toss" as const,
      amountWon: MONTHLY_PRICE_WON,
      monthKey,
      input: readInput(body),
      verify: async () => {
        // 처음 결제를 확인할 때만 토스 사용자 키가 필요하다(다시 보기는 저장된 주문으로 연다)
        if (!TOSS_USER_KEY_PATTERN.test(tossUserKey)) {
          return { ok: false as const, status: 400, message: "토스 사용자 인증 정보가 올바르지 않습니다." };
        }
        const verified = await verifyTossIapOrder({ orderId, productKey: "monthly_luck", tossUserKey });
        if (verified.ok) return { ok: true as const };
        console.error("[toss-monthly] order verification failed", {
          code: verified.code,
          orderSuffix: orderId.slice(-8),
        });
        const status = verified.code === "CONFIGURATION_ERROR" || verified.code === "TOSS_API_ERROR" ? 503 : 400;
        return { ok: false as const, status, message: verified.message };
      },
    };

    if (prepareOnly) {
      const prepared = await prepareMonthlyOrder(params);
      if (!prepared.ok) return failure(prepared.message, prepared.status);
      return NextResponse.json({ success: true, prepared: true });
    }

    const outcome = await fulfillMonthlyOrder(params);
    if (!outcome.ok) return failure(outcome.message, outcome.status);
    const { ok: _ok, ...paid } = outcome;
    return NextResponse.json({ success: true, ...paid });
  } catch (error) {
    console.error("[toss-monthly] unexpected error", error);
    return failure("상세 풀이를 처리하는 중 오류가 발생했습니다.", 500);
  }
}
