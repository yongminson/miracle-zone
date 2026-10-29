import { NextRequest, NextResponse } from "next/server";
import { hasValidAdminSession } from "@/lib/auth/admin-session";
import { verifyPaidAmount } from "@/lib/payments/verify-paid-amount";
import { verifyGoogleProductPurchase } from "@/lib/payments/verify-google-purchase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { fulfillMonthlyOrder } from "@/lib/monthly/monthly-order";
import { MONTHLY_PRICE_WON, MONTHLY_PRODUCT_ID, type MonthlyInput } from "@/lib/monthly/monthly-types";

/**
 * 이달의 운세 상세 풀이(웹·구글 앱). 새로 추가한 경로다.
 * 웹은 포트원 결제 식별자, 앱은 구글 인앱결제 영수증(purchaseToken)을 보낸다.
 * 결제 확인 → 주문 저장 → AI 풀이 순서는 lib/monthly/monthly-order.ts 가 지킨다.
 */

export const runtime = "nodejs";
// AI 가 주별·영역별 풀이를 쓰는 데 시간이 걸린다
export const maxDuration = 60;

function bad(message: string, status = 400) {
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const purchaseToken = typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : "";
    const lookupId = purchaseToken || String(body.paymentId ?? "").trim().replace(/\s+/g, "");
    if (!lookupId || lookupId.length > 500) return bad("결제 식별자가 없습니다.");

    // 운영자 모드 — 결제 없이 풀이를 만든다(블로그 홍보용). 새로 만들 때만 운영자 로그인을 확인한다
    const adminFree = body.admin === true;
    // 결제 종류는 보내온 값이 아니라 서버가 정한다(영수증이 있으면 앱, 없으면 웹)
    const platform = adminFree ? "admin" : purchaseToken ? "app" : "web";
    const merchantUid = typeof body.merchant_uid === "string" ? body.merchant_uid : null;
    const monthKey = typeof body.monthKey === "string" ? body.monthKey.trim() : "";

    const supabase = createSupabaseAdminClient();
    if (!supabase) return bad("서버 설정 문제로 처리하지 못했습니다. 고객센터에 문의해 주세요.", 503);

    const outcome = await fulfillMonthlyOrder({
      supabase,
      paymentRef: `${platform}:${lookupId}`,
      platform,
      amountWon: adminFree ? 0 : MONTHLY_PRICE_WON,
      monthKey,
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
          return verifyGoogleProductPurchase({ productId: MONTHLY_PRODUCT_ID, purchaseToken });
        }
        return verifyPaidAmount({
          lookupId,
          expectedAmountWon: MONTHLY_PRICE_WON,
          merchantUidToMatch: merchantUid,
        });
      },
    });

    if (!outcome.ok) return bad(outcome.message, outcome.status);
    const { ok: _ok, ...paid } = outcome;
    return NextResponse.json({ success: true, ...paid });
  } catch (error) {
    console.error("[monthly/detail] unexpected error", error);
    return bad("상세 풀이를 불러오는 중 오류가 발생했습니다.", 500);
  }
}
