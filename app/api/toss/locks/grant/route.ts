import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { verifyTossIapOrder, type TossIapProductKey } from "@/lib/payments/toss-iap";
import { LOCK_COLORS, LOCK_TIERS, SILVER, type LockTier } from "@/lib/locks/wall-locks";

/**
 * 앱인토스에서 산 소원 자물쇠를 등록한다.
 *
 * 기존 `/api/toss/iap/grant` 는 VIP 리포트와 제단 10일권 전용이라 건드리지 않고,
 * 자물쇠는 이 경로에서 따로 처리한다. 토스 주문 확인 로직은 같은 것을 쓴다.
 */

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOSS_USER_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,200}$/;
const ALLOWED_COLORS = new Set(LOCK_COLORS.map((c) => c.value));
const WISH_MAX = 300;
const NAME_MAX = 12;

/** 등급 ↔ 토스 상품 키 */
const TIER_TO_TOSS_PRODUCT: Record<LockTier, TossIapProductKey> = {
  basic: "lock_basic",
  color: "lock_color",
  shine: "lock_shine",
};

function isLockTier(value: unknown): value is LockTier {
  return value === "basic" || value === "color" || value === "shine";
}

function failure(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
    const tossUserKey = typeof body.tossUserKey === "string" ? body.tossUserKey.trim() : "";
    const tier = body.tier;

    if (!UUID_PATTERN.test(orderId)) {
      return failure("주문번호 형식이 올바르지 않습니다.", 400);
    }
    if (!TOSS_USER_KEY_PATTERN.test(tossUserKey)) {
      return failure("토스 사용자 인증 정보가 올바르지 않습니다.", 400);
    }
    if (!isLockTier(tier)) {
      return failure("자물쇠 종류가 올바르지 않습니다.", 400);
    }

    const wish = typeof body.wish === "string" ? body.wish.trim() : "";
    if (!wish) return failure("소원 내용을 입력해 주세요.", 400);
    if (wish.length > WISH_MAX) return failure(`소원은 ${WISH_MAX}자까지 쓸 수 있습니다.`, 400);

    const displayNameRaw = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const displayName = displayNameRaw ? displayNameRaw.slice(0, NAME_MAX) : null;

    const requestedColor = typeof body.color === "string" ? body.color.trim() : "";
    const color = !LOCK_TIERS[tier].canPickColor
      ? SILVER
      : ALLOWED_COLORS.has(requestedColor)
        ? requestedColor
        : SILVER;

    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return failure("서버 설정 문제로 자물쇠를 걸지 못했습니다.", 503);
    }

    const paymentRef = `toss:${orderId}`;

    // 같은 주문으로 이미 걸린 자물쇠가 있으면 그것을 돌려준다(중복 지급 방지)
    const existing = await supabase
      .from("locks")
      .select("id,tier,color,display_name,wish,created_at")
      .eq("payment_ref", paymentRef)
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json({ success: true, lock: existing.data, alreadyIssued: true });
    }

    const verified = await verifyTossIapOrder({
      orderId,
      productKey: TIER_TO_TOSS_PRODUCT[tier],
      tossUserKey,
    });
    if (!verified.ok) {
      const status =
        verified.code === "CONFIGURATION_ERROR" || verified.code === "TOSS_API_ERROR" ? 503 : 400;
      console.error("[toss-locks] order verification failed", {
        code: verified.code,
        orderSuffix: orderId.slice(-8),
      });
      return failure(verified.message, status);
    }

    const inserted = await supabase
      .from("locks")
      .insert({
        tier,
        color,
        display_name: displayName,
        wish,
        owner_key: tossUserKey,
        user_id: null,
        payment_ref: paymentRef,
        amount: LOCK_TIERS[tier].priceWon,
        platform: "toss",
      })
      .select("id,tier,color,display_name,wish,created_at")
      .single();

    if (inserted.error || !inserted.data) {
      console.error("[toss-locks] insert failed", inserted.error);
      return failure("결제는 확인했지만 자물쇠를 저장하지 못했습니다. 고객센터에 문의해 주세요.", 503);
    }

    return NextResponse.json({ success: true, lock: inserted.data });
  } catch (error) {
    console.error("[toss-locks] unexpected error", error);
    return failure("자물쇠를 거는 중 오류가 발생했습니다.", 500);
  }
}
