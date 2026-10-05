import { NextResponse } from "next/server";
import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 모든 구독자에게 같은 알림을 보내는 수동 발송(운영자용).
 *
 * 2026-10-06 보안 수정: 예전에는 비밀번호 없이 누구나 이 주소로 제목·내용·링크를 정해
 * 전체 구독자에게 알림을 보낼 수 있었다(피싱에 악용 가능). 이제 Bearer CRON_SECRET 이 있어야 한다.
 * 서버 전체의 인증서 검사를 끄던 줄(NODE_TLS_REJECT_UNAUTHORIZED=0)도 지웠다.
 * 매일 아침 알림은 /api/cron/push 가 맡는다. 요청 형식(title·body·url)은 그대로 받는다.
 */

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization")?.trim() ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header;
  return !!token && token === secret;
}

/** 다른 사이트로 보내는 링크는 받지 않는다(우리 사이트 안의 경로만) */
function safeUrl(raw: unknown): string {
  return typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/tools?tab=fortune";
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  try {
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      throw new Error("VAPID 암호키가 설정되지 않았습니다.");
    }
    const supabase = createSupabaseAdminClient();
    if (!supabase) throw new Error("Supabase 관리자 설정이 없습니다.");

    webpush.setVapidDetails("mailto:admin@ymstudio.co.kr", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

    const body = (await req.json().catch(() => ({}))) as { title?: unknown; body?: unknown; url?: unknown };
    const payload = JSON.stringify({
      title: typeof body.title === "string" && body.title.trim() ? body.title.slice(0, 80) : "명운(命運) - 당신의 운명을 밝히다",
      body: typeof body.body === "string" && body.body.trim() ? body.body.slice(0, 200) : "오늘의 맞춤 운세가 도착했습니다. 지금 확인해보세요! ✨",
      url: safeUrl(body.url),
    });

    const { data: subscriptions, error } = await supabase.from("push_subscriptions").select("*");
    if (error) throw error;
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: "아직 알림을 허용한 유저가 없습니다." });
    }

    await Promise.all(
      subscriptions.map((sub) =>
        webpush
          .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .catch((err) => {
            if (err.statusCode === 410 || err.statusCode === 404) {
              return supabase.from("push_subscriptions").delete().match({ id: sub.id });
            }
            console.error(`[push/send] 발송 실패 ID ${sub.id}:`, err.message);
          })
      )
    );
    return NextResponse.json({ success: true, message: `${subscriptions.length}명에게 알림 발송 완료!` });
  } catch (error: unknown) {
    console.error("[push/send] error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "발송 실패" }, { status: 500 });
  }
}
