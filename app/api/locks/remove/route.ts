import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 본인이 건 자물쇠를 내린다.
 *
 * 지우지 않고 deleted_at 만 남긴다. 화면에서는 완전히 사라지지만
 * 결제 기록은 남아 있어야 환불·문의에 대응할 수 있다.
 *
 * 소유 확인은 서버에서 한다. 자물쇠의 owner_key 가 요청자와 같아야 하고,
 * 로그인한 사람이면 user_id 로도 확인한다.
 */

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const lockId = typeof body.lockId === "string" ? body.lockId.trim() : "";
    const ownerKey = typeof body.ownerKey === "string" ? body.ownerKey.trim() : "";
    if (!lockId) return bad("자물쇠를 찾을 수 없습니다.");

    const supabaseAdmin = createSupabaseAdminClient();
    if (!supabaseAdmin) return bad("서버 설정 문제로 처리하지 못했습니다.", 503);

    // 로그인했다면 계정으로도 소유를 인정한다(기기를 바꿔도 내릴 수 있게)
    let userId: string | null = null;
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    if (!ownerKey && !userId) return bad("본인 확인 정보가 없습니다.", 401);

    const { data: lock, error } = await supabaseAdmin
      .from("locks")
      .select("id,owner_key,user_id,deleted_at")
      .eq("id", lockId)
      .maybeSingle();

    if (error) {
      console.error("[locks/remove] lookup failed", error);
      return bad("자물쇠를 확인하지 못했습니다.", 503);
    }
    if (!lock) return bad("이미 내려갔거나 없는 자물쇠입니다.", 404);
    if (lock.deleted_at) {
      return NextResponse.json({ success: true, alreadyRemoved: true });
    }

    const isOwner =
      (ownerKey && lock.owner_key === ownerKey) || (userId && lock.user_id === userId);
    if (!isOwner) return bad("본인이 건 자물쇠만 내릴 수 있습니다.", 403);

    const { error: updateError } = await supabaseAdmin
      .from("locks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", lockId)
      .is("deleted_at", null);

    if (updateError) {
      console.error("[locks/remove] update failed", updateError);
      return bad("자물쇠를 내리지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[locks/remove] unexpected error", error);
    return bad("처리 중 오류가 발생했습니다.", 500);
  }
}
