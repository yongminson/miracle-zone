import { NextResponse } from "next/server";
import { verifyPaidAmount } from "@/lib/payments/verify-paid-amount";
import { verifyGoogleLockPurchase } from "@/lib/payments/verify-google-purchase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { LOCK_COLORS, LOCK_TIERS, SILVER, type LockTier } from "@/lib/locks/wall-locks";

/**
 * 소원 자물쇠 등록 — 결제를 서버에서 확인한 뒤에만 자물쇠를 건다.
 *
 * 새로 추가한 경로다. 기존 결제 라우트(`/api/payments/verify` 등)는 토스 미니앱과
 * 명운 앱이 호출하고 있어 손대지 않았다.
 */

const ALLOWED_COLORS = new Set(LOCK_COLORS.map((c) => c.value));
const WISH_MAX = 300;
const NAME_MAX = 12;

function isLockTier(value: unknown): value is LockTier {
  return value === "basic" || value === "color" || value === "shine";
}

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    // 앱은 구글 인앱결제 영수증(purchaseToken), 웹은 포트원 결제 식별자를 보낸다
    const purchaseToken = typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : "";
    const lookupId = purchaseToken || String(body.paymentId ?? body.imp_uid ?? "").trim().replace(/\s+/g, "");
    if (!lookupId) return bad("결제 식별자가 없습니다.");

    const tier = body.tier;
    if (!isLockTier(tier)) return bad("자물쇠 종류가 올바르지 않습니다.");

    const wish = typeof body.wish === "string" ? body.wish.trim() : "";
    if (!wish) return bad("소원 내용을 입력해 주세요.");
    if (wish.length > WISH_MAX) return bad(`소원은 ${WISH_MAX}자까지 쓸 수 있습니다.`);

    const ownerKey = typeof body.ownerKey === "string" ? body.ownerKey.trim() : "";
    if (!ownerKey || ownerKey.length > 64) return bad("소유자 식별값이 올바르지 않습니다.");

    const displayNameRaw = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const displayName = displayNameRaw ? displayNameRaw.slice(0, NAME_MAX) : null;

    // 기본 자물쇠는 색을 고를 수 없다. 나머지는 준비된 색 중에서만 받는다
    const requestedColor = typeof body.color === "string" ? body.color.trim() : "";
    const color = !LOCK_TIERS[tier].canPickColor
      ? SILVER
      : ALLOWED_COLORS.has(requestedColor)
        ? requestedColor
        : SILVER;

    const platformRaw = typeof body.platform === "string" ? body.platform.trim() : "web";
    const platform = platformRaw === "app" || platformRaw === "toss" ? platformRaw : "web";

    const userId = typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : null;

    const supabaseAdmin = createSupabaseAdminClient();
    if (!supabaseAdmin) {
      return bad("서버 설정 문제로 자물쇠를 걸지 못했습니다. 고객센터에 문의해 주세요.", 503);
    }

    const paymentRef = `${platform}:${lookupId}`;

    // 같은 결제로 이미 걸린 자물쇠가 있으면 그걸 그대로 돌려준다(중복 지급 방지)
    const existing = await supabaseAdmin
      .from("locks")
      .select("id,tier,color,display_name,wish,created_at")
      .eq("payment_ref", paymentRef)
      .maybeSingle();

    if (existing.data) {
      return NextResponse.json({ success: true, lock: existing.data, alreadyIssued: true });
    }

    const expectedAmountWon = LOCK_TIERS[tier].priceWon;

    if (purchaseToken) {
      const googleVerified = await verifyGoogleLockPurchase({ tier, purchaseToken });
      if (!googleVerified.ok) return bad(googleVerified.message);
    } else {
      const merchantUid = typeof body.merchant_uid === "string" ? body.merchant_uid : null;
      const verified = await verifyPaidAmount({
        lookupId,
        expectedAmountWon,
        merchantUidToMatch: merchantUid,
      });
      if (!verified.ok) return bad(verified.message);
    }

    const inserted = await supabaseAdmin
      .from("locks")
      .insert({
        tier,
        color,
        display_name: displayName,
        wish,
        owner_key: ownerKey,
        user_id: userId,
        payment_ref: paymentRef,
        amount: expectedAmountWon,
        platform,
      })
      .select("id,tier,color,display_name,wish,created_at")
      .single();

    if (inserted.error || !inserted.data) {
      console.error("[locks] insert failed", inserted.error);
      return bad("결제는 확인했지만 자물쇠를 저장하지 못했습니다. 고객센터에 문의해 주세요.", 503);
    }

    return NextResponse.json({ success: true, lock: inserted.data });
  } catch (error) {
    console.error("[locks] unexpected error", error);
    return bad("자물쇠를 거는 중 오류가 발생했습니다.", 500);
  }
}
