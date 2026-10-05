import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 웹 알림 구독 저장.
 *
 * 생년월일(선택)을 함께 받으면 아침 알림을 "오늘은 ‘기회에 먼저 손 내미는 날’"처럼
 * 그 사람의 흐름으로 보낸다. 생년월일 없이 온 구독(예전 종 버튼)은 기본 문구를 받는다.
 * 요청 형식은 예전 그대로도 받는다(추가 칸만 선택).
 */

type PushSubscribeBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  birthDate?: string;
  calendarType?: string;
};

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ success: false, message: "서버 설정 문제로 저장하지 못했습니다." }, { status: 503 });
    }

    const body = (await req.json()) as PushSubscribeBody;
    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth || !endpoint.startsWith("https://") || endpoint.length > 1000) {
      return NextResponse.json(
        { success: false, message: "endpoint, keys.p256dh, keys.auth는 필수입니다." },
        { status: 400 }
      );
    }

    const birthDate =
      typeof body.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.birthDate.trim())
        ? body.birthDate.trim()
        : null;
    const calendarType =
      body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar";

    const base = { endpoint, p256dh, auth };
    const withProfile = birthDate
      ? { ...base, birth_date: birthDate, calendar_type: calendarType, updated_at: new Date().toISOString() }
      : base;

    let { error } = await supabase.from("push_subscriptions").upsert(withProfile, { onConflict: "endpoint" });
    // 생년월일 칸을 아직 만들지 않은 DB 라도 구독 자체는 저장한다
    if (error && withProfile !== base) {
      ({ error } = await supabase.from("push_subscriptions").upsert(base, { onConflict: "endpoint" }));
    }
    if (error) throw error;

    return NextResponse.json({ success: true, personalized: !!birthDate });
  } catch (error: unknown) {
    console.error("push/subscribe:", error);
    return NextResponse.json({ success: false, message: "구독 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
