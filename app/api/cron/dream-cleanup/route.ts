import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

// 꿈해몽 공유 기록 정리 (2026-11-05 오너 승인) — 만든 지 90일 지난 꿈 내용·풀이를 지운다. Vercel 크론, Bearer CRON_SECRET.
// 개인정보처리방침 제2조(lib/legal/privacy.ts)에 적은 보관 기간이다. 기간을 바꾸면 방침과 /haemong 안내도 같이 바꿀 것.
const KEEP_DAYS = 90;

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
  const before = new Date(Date.now() - KEEP_DAYS * 86400000).toISOString();
  const { data, error } = await supabase.from("dreams").delete().lt("created_at", before).select("id");
  if (error) {
    console.error("[dream-cleanup] 실패", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true, deleted: data?.length ?? 0 });
}
