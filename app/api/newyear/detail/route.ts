import { NextRequest, NextResponse } from "next/server";
import { hasValidAdminSession } from "@/lib/auth/admin-session";
import { verifyPaidAmount } from "@/lib/payments/verify-paid-amount";
import { verifyGoogleProductPurchase } from "@/lib/payments/verify-google-purchase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { fulfillNewYearOrder } from "@/lib/newyear/newyear-order";
import {
  NEWYEAR_DETAIL_PRICE_WON,
  NEWYEAR_DETAIL_PRODUCT_ID,
  type NewYearDetailInput,
} from "@/lib/newyear/newyear-types";

/**
 * 2027 신년운세 상세 풀이(웹·구글 앱). 새로 추가한 경로다.
 * 웹은 포트원 결제 식별자, 앱은 구글 인앱결제 영수증(purchaseToken)을 보낸다.
 * 앱인토스는 /api/toss/newyear/grant 를 쓴다.
 */

export const runtime = "nodejs";
// AI 가 12달 풀이를 쓰는 데 시간이 걸린다
export const maxDuration = 60;

function bad(message: string, status = 400) {
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const purchaseToken = typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : "";
    const lookupId = purchaseToken || String(body.paymentId ?? "").trim().replace(/\s+/g, "");
    if (!lookupId || lookupId.length > 500) return bad("결제 식별자가 없습니다.");

    // 운영자 모드 — 결제 없이 풀이를 만든다(블로그 홍보용). 새로 만들 때만 운영자 로그인을 확인한다
    const adminFree = body.admin === true;
    const platform = adminFree ? "admin" : purchaseToken ? "app" : "web";
    const merchantUid = typeof body.merchant_uid === "string" ? body.merchant_uid : null;

    const supabase = createSupabaseAdminClient();
    if (!supabase) return bad("서버 설정 문제로 처리하지 못했습니다. 고객센터에 문의해 주세요.", 503);

    const outcome = await fulfillNewYearOrder({
      supabase,
      paymentRef: `${platform}:${lookupId}`,
      platform,
      amountWon: adminFree ? 0 : NEWYEAR_DETAIL_PRICE_WON,
      input: readInput(body),
      verify: async () => {
        if (adminFree) {
          return hasValidAdminSession(req)
            ? { ok: true as const }
            : {
                ok: false as const,
                status: 403,
                message: "운영자 로그인이 필요합니다. 하단 저작권 문구를 두 번 눌러 다시 로그인해 주세요.",
              };
        }
        if (purchaseToken) {
          return verifyGoogleProductPurchase({ productId: NEWYEAR_DETAIL_PRODUCT_ID, purchaseToken });
        }
        return verifyPaidAmount({
          lookupId,
          expectedAmountWon: NEWYEAR_DETAIL_PRICE_WON,
          merchantUidToMatch: merchantUid,
        });
      },
    });

    if (!outcome.ok) return bad(outcome.message, outcome.status);
    if (!outcome.detail) return bad("상세 풀이를 만들지 못했습니다. 잠시 후 다시 열어 주세요.", 503);
    return NextResponse.json({
      success: true,
      input: outcome.input,
      result: outcome.result,
      detail: outcome.detail,
      reopened: outcome.reopened,
    });
  } catch (error) {
    console.error("[newyear/detail] unexpected error", error);
    return bad("상세 풀이를 불러오는 중 오류가 발생했습니다.", 500);
  }
}
