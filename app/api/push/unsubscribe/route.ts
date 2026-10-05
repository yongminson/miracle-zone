import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 웹 알림 끄기 — 그 기기의 구독(endpoint)만 지운다.
 * endpoint 는 브라우저가 기기마다 따로 만든 긴 주소라, 본인 기기에서만 알 수 있다.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { endpoint?: string };
    const endpoint = body.endpoint?.trim();
    if (!endpoint || !endpoint.startsWith("https://")) {
      return NextResponse.json({ success: false, message: "endpoint 가 필요합니다." }, { status: 400 });
    }
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, message: "서버 설정 문제로 처리하지 못했습니다." }, { status: 503 });
    }
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("push/unsubscribe:", error);
    return NextResponse.json({ success: false, message: "알림을 끄는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
