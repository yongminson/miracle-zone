import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

// 단톡방 궁합 방 정리 (2026-11-04) — 만든 지 30일 지난 방을 지운다(참가자는 함께 지워짐). Vercel 크론, Bearer CRON_SECRET.
// 개인정보처리방침 제4조에 적은 보관 기간이다. 이 기간을 바꾸면 방침과 supabase-group-rooms-schema.sql 도 같이 바꿀 것.

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization")?.trim() ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header;
  return token === secret;
}

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ success: false, message: "서버 설정 문제" }, { status: 503 });
  const { data, error } = await supabase
    .from("group_rooms")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("code");
  if (error) {
    console.error("[group-cleanup] 실패", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, deleted: data?.length ?? 0 });
}
