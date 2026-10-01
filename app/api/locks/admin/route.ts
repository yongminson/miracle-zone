import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { hasValidAdminSession } from "@/lib/auth/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { LOCK_COLORS, LOCK_TIERS, SILVER, type LockTier } from "@/lib/locks/wall-locks";

/**
 * 운영자 모드 — 결제 없이 자물쇠를 건다(블로그 홍보글 작성용).
 *
 * 다른 유료 기능의 운영자 프리패스와 같은 쓰임이다. 다만 자물쇠는 서버가 결제를
 * 확인해야 걸리므로, 서버가 운영자 로그인(쿠키)을 직접 확인한 뒤에만 건다.
 * 금액 0원, payment_ref 는 admin: 으로 남겨 매출 집계에서 빠진다.
 */

export const runtime = "nodejs";

const ALLOWED_COLORS = new Set(LOCK_COLORS.map((c) => c.value));
const WISH_MAX = 300;
const NAME_MAX = 12;

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function isLockTier(value: unknown): value is LockTier {
  return value === "basic" || value === "color" || value === "shine";
}

export async function POST(req: NextRequest) {
  try {
    if (!hasValidAdminSession(req)) {
      return bad("운영자 로그인이 필요합니다. 하단 저작권 문구를 두 번 눌러 다시 로그인해 주세요.", 403);
    }

    const body = (await req.json()) as Record<string, unknown>;
    const tier = body.tier;
    if (!isLockTier(tier)) return bad("자물쇠 종류가 올바르지 않습니다.");

    const wish = typeof body.wish === "string" ? body.wish.trim() : "";
    if (!wish) return bad("소원 내용을 입력해 주세요.");
    if (wish.length > WISH_MAX) return bad(`소원은 ${WISH_MAX}자까지 쓸 수 있습니다.`);

    const ownerKey = typeof body.ownerKey === "string" ? body.ownerKey.trim() : "";
    if (!ownerKey || ownerKey.length > 64) return bad("소유자 식별값이 올바르지 않습니다.");

    const displayNameRaw = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const displayName = displayNameRaw ? displayNameRaw.slice(0, NAME_MAX) : null;

    const requestedColor = typeof body.color === "string" ? body.color.trim() : "";
    const color = !LOCK_TIERS[tier].canPickColor
      ? SILVER
      : ALLOWED_COLORS.has(requestedColor)
        ? requestedColor
        : SILVER;

    const userId = typeof body.userId === "string" && body.userId.trim() ? body.userId.trim() : null;

    const supabase = createSupabaseAdminClient();
    if (!supabase) return bad("서버 설정 문제로 자물쇠를 걸지 못했습니다.", 503);

    const inserted = await supabase
      .from("locks")
      .insert({
        tier,
        color,
        display_name: displayName,
        wish,
        owner_key: ownerKey,
        user_id: userId,
        payment_ref: `admin:${randomUUID()}`,
        amount: 0,
        // 표의 경로 값은 web/app/toss 만 받는다. 운영자 건은 payment_ref 의 admin: 과 0원으로 구분한다
        platform: "web",
      })
      .select("id,tier,color,display_name,wish,created_at")
      .single();

    if (inserted.error || !inserted.data) {
      console.error("[locks/admin] insert failed", inserted.error);
      return bad("자물쇠를 저장하지 못했습니다.", 503);
    }
    return NextResponse.json({ success: true, lock: inserted.data });
  } catch (error) {
    console.error("[locks/admin] unexpected error", error);
    return bad("자물쇠를 거는 중 오류가 발생했습니다.", 500);
  }
}
