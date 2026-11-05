import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 로그인한 본인 계정 삭제 (Google Play 계정 삭제 정책 대응, 2026-11-05).
 *
 * 누구 계정인지는 로그인 토큰으로만 정한다. 요청 본문의 id 는 믿지 않는다.
 * 계정을 맨 마지막에 지운다 — 중간에 실패해도 다시 로그인해 재시도할 수 있게.
 *
 * 자물쇠는 벽에서 내리고 소원·이름을 비운다. 금액·결제번호는 환불·법정 보관을 위해 남는다.
 * 주문·결제 기록(vip_orders 등)은 전자상거래법 5년 보관 대상이라 여기서 지우지 않는다.
 * 삭제 범위를 바꾸면 /account-delete 안내와 개인정보처리방침도 같이 고칠 것.
 */

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return fail("로그인이 필요합니다.", 401);

    const body = (await req.json().catch(() => null)) as { confirm?: unknown } | null;
    if (body?.confirm !== true) return fail("삭제 확인이 필요합니다.", 400);

    const supabase = createSupabaseAdminClient();
    if (!supabase) return fail("서버 설정 문제로 처리하지 못했습니다.", 503);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userError || !userId) return fail("로그인 정보를 확인하지 못했습니다.", 401);

    const { error: lockError } = await supabase
      .from("locks")
      .update({ deleted_at: new Date().toISOString(), wish: "(삭제됨)", display_name: null, user_id: null })
      .or(`user_id.eq.${userId},owner_key.eq.${userId}`);
    if (lockError) {
      console.error("[account/delete] locks", lockError);
      return fail("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
    }

    const { error: checkinError } = await supabase.from("checkins").update({ user_id: null }).eq("user_id", userId);
    if (checkinError) {
      console.error("[account/delete] checkins", checkinError);
      return fail("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
    }

    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
    if (profileError) {
      console.error("[account/delete] profiles", profileError);
      return fail("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
    }

    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("[account/delete] auth", authError);
      return fail("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[account/delete] unexpected", error);
    return fail("오류가 발생했습니다.", 500);
  }
}
