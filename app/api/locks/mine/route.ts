import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 로그인한 사람이 건 자물쇠 id 목록.
 *
 * locks 테이블은 서버만 읽을 수 있으므로, 로그인 토큰을 확인한 뒤
 * 그 사람 것만 골라 돌려준다. 기기를 바꿔도 내 자물쇠를 찾기 위한 용도다.
 */
export async function GET(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: "서버 설정 오류입니다." }, { status: 503 });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userError || !userId) {
      return NextResponse.json({ success: false, message: "로그인 정보를 확인하지 못했습니다." }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from("locks")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[locks/mine] select failed", error);
      return NextResponse.json({ success: false, message: "자물쇠를 불러오지 못했습니다." }, { status: 503 });
    }

    return NextResponse.json({ success: true, ids: (data ?? []).map((row) => row.id as string) });
  } catch (error) {
    console.error("[locks/mine] unexpected error", error);
    return NextResponse.json({ success: false, message: "오류가 발생했습니다." }, { status: 500 });
  }
}
