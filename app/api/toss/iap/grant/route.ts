import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import {
  isTossIapProductKey,
  TOSS_IAP_PRODUCTS,
  verifyTossIapOrder,
} from "@/lib/payments/toss-iap";
import {
  createVipReportEntitlement,
  tossVipPaymentRef,
} from "@/lib/payments/vip-report-entitlement";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOSS_USER_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : "";
    const productKey =
      typeof body.productKey === "string" ? body.productKey.trim() : "";
    const tossUserKey =
      typeof body.tossUserKey === "string" ? body.tossUserKey.trim() : "";
    const grantPayload =
      body.grantPayload && typeof body.grantPayload === "object"
        ? (body.grantPayload as Record<string, unknown>)
        : null;

    if (!UUID_PATTERN.test(orderId)) {
      return failure("주문번호 형식이 올바르지 않습니다.", 400);
    }
    if (!isTossIapProductKey(productKey)) {
      return failure("지원하지 않는 상품입니다.", 400);
    }
    if (!TOSS_USER_KEY_PATTERN.test(tossUserKey)) {
      return failure("토스 사용자 인증 정보가 올바르지 않습니다.", 400);
    }
    if (productKey === "altar_10days") {
      const wishText =
        typeof grantPayload?.wishText === "string"
          ? grantPayload.wishText.trim()
          : "";
      const nameDisplay = grantPayload?.nameDisplay;
      if (
        !wishText ||
        wishText.length > 500 ||
        (nameDisplay !== "anonymous" &&
          nameDisplay !== "real" &&
          nameDisplay !== "partial")
      ) {
        return failure("제단 10일 상품 지급 정보가 올바르지 않습니다.", 400);
      }
    }

    const verified = await verifyTossIapOrder({
      orderId,
      productKey,
      tossUserKey,
    });
    if (!verified.ok) {
      const status =
        verified.code === "CONFIGURATION_ERROR" ||
        verified.code === "TOSS_API_ERROR"
          ? 503
          : 400;
      console.error("[toss-iap] order verification failed", {
        code: verified.code,
        orderSuffix: orderId.slice(-8),
      });
      return failure(verified.message, status);
    }

    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return failure("결제 지급 저장소가 준비되지 않았습니다.", 503);
    }

    const product = TOSS_IAP_PRODUCTS[productKey];
    const paymentRef = tossVipPaymentRef(orderId);
    if (productKey === "vip_report") {
      const entitlement = await createVipReportEntitlement(supabase, {
        payment_ref: paymentRef,
        platform: "apps_in_toss",
        provider_reference: orderId,
        subject_key: tossUserKey,
        amount: product.amountWon,
      });
      if (!entitlement.ok) {
        return failure(entitlement.message, 503);
      }
    }

    const { data: existing, error: existingError } = await supabase
      .from("toss_iap_orders")
      .select("product_key,toss_user_key,grant_status")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existingError) {
      console.error("[toss-iap] existing order lookup failed", {
        code: existingError.code,
        orderSuffix: orderId.slice(-8),
      });
      return failure("결제 지급 상태를 확인하지 못했습니다.", 503);
    }

    if (existing) {
      if (
        existing.product_key !== productKey ||
        existing.toss_user_key !== tossUserKey
      ) {
        return failure("이미 다른 사용자 또는 상품에 지급된 주문입니다.", 409);
      }
      if (existing.grant_status === "granted") {
        return NextResponse.json({
          success: true,
          duplicated: true,
          paymentRef,
          message: "이미 지급이 완료된 주문입니다.",
        });
      }
    }

    const grantRow = {
      order_id: verified.order.orderId,
      product_key: productKey,
      sku: verified.order.sku,
      expected_amount: product.amountWon,
      currency: "KRW",
      payment_status: verified.order.status,
      grant_status: "granted",
      toss_user_key: tossUserKey,
      status_determined_at: verified.order.statusDeterminedAt,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error: saveError } = await supabase
      .from("toss_iap_orders")
      .insert(grantRow);

    if (saveError) {
      if (saveError.code === "23505") {
        const { data: racedOrder, error: racedOrderError } = await supabase
          .from("toss_iap_orders")
          .select("product_key,toss_user_key,grant_status")
          .eq("order_id", orderId)
          .maybeSingle();

        if (
          !racedOrderError &&
          racedOrder?.product_key === productKey &&
          racedOrder.toss_user_key === tossUserKey &&
          racedOrder.grant_status === "granted"
        ) {
          return NextResponse.json({
            success: true,
            duplicated: true,
            paymentRef,
            message: "이미 지급이 완료된 주문입니다.",
          });
        }
        if (!racedOrderError && racedOrder) {
          return failure(
            "이미 다른 사용자 또는 상품에 지급된 주문입니다.",
            409,
          );
        }
      }
      console.error("[toss-iap] grant persistence failed", {
        code: saveError.code,
        orderSuffix: orderId.slice(-8),
      });
      return failure(
        "결제는 확인됐지만 상품 지급을 저장하지 못했습니다. 다시 시도해 주세요.",
        503,
      );
    }

    if (productKey === "altar_10days") {
      const wishText = String(grantPayload?.wishText ?? "").trim();
      const nameDisplay = String(grantPayload?.nameDisplay ?? "anonymous");
      const nameInput =
        typeof grantPayload?.nameInput === "string"
          ? grantPayload.nameInput.trim().slice(0, 80)
          : "";
      const { error: wishError } = await supabase.from("wishes").insert({
        content: wishText,
        duration: "10d",
        display_mode: nameDisplay,
        display_name: nameInput,
      });
      if (wishError) {
        console.error("[toss-iap] altar wish grant failed", {
          code: wishError.code,
          orderSuffix: orderId.slice(-8),
        });
        const { error: rollbackError } = await supabase
          .from("toss_iap_orders")
          .delete()
          .eq("order_id", orderId)
          .eq("toss_user_key", tossUserKey);
        if (rollbackError) {
          console.error("[toss-iap] altar grant rollback failed", {
            code: rollbackError.code,
            orderSuffix: orderId.slice(-8),
          });
        }
        return failure(
          "결제는 확인했지만 제단 소원을 등록하지 못했습니다. 다시 시도해 주세요.",
          503,
        );
      }
    }

    return NextResponse.json({
      success: true,
      duplicated: false,
      paymentRef,
      message: "결제 확인 및 상품 지급이 완료되었습니다.",
    });
  } catch (error) {
    console.error("[toss-iap] unexpected grant error", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return failure("결제 처리 중 서버 오류가 발생했습니다.", 500);
  }
}
