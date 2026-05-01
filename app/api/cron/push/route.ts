import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const VAPID_SUBJECT = "mailto:support@ymstudio.co.kr";

const DAILY_PAYLOAD = JSON.stringify({
  title: "오늘의 운세가 도착했습니다! ✨",
  body: "우주의 기운이 담긴 오늘의 맞춤 운세를 확인해보세요.",
  url: "/?tab=fortune",
});

function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization")?.trim();
  if (!header) return false;
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header;
  return token === secret;
}

type PushSubscriptionRow = {
  id?: string | number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function runDailyPush(req: Request): Promise<Response> {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return NextResponse.json(
      { success: false, message: "VAPID 키(NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
  const supabase = createClient(supabaseUrl, supabaseKey);

  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);

  const { data: subscriptions, error: fetchError } = await supabase.from("push_subscriptions").select("*");
  if (fetchError) {
    console.error("cron/push fetch subscriptions:", fetchError);
    return NextResponse.json({ success: false, message: fetchError.message }, { status: 500 });
  }

  const rows = (subscriptions ?? []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return NextResponse.json({
      success: true,
      message: "발송 대상 구독이 없습니다.",
      sent: 0,
      failed: 0,
      cleaned: 0,
    });
  }

  const results = await Promise.allSettled(
    rows.map((sub) =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          DAILY_PAYLOAD,
          { TTL: 86400 }
        )
        .then(() => ({ outcome: "sent" as const, sub }))
        .catch(async (err: { statusCode?: number }) => {
          const code = err?.statusCode;
          if (code === 410 || code === 404) {
            const { error: delErr } = await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            if (delErr) console.error("cron/push delete stale subscription:", delErr);
            return { outcome: "cleaned" as const, sub };
          }
          throw err;
        })
    )
  );

  let sent = 0;
  let cleaned = 0;
  const failures: { endpoint: string; reason: string }[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const sub = rows[i];
    if (r.status === "fulfilled") {
      if (r.value.outcome === "sent") sent++;
      else if (r.value.outcome === "cleaned") cleaned++;
      continue;
    }
    const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
    failures.push({ endpoint: sub.endpoint, reason });
  }

  return NextResponse.json({
    success: true,
    message: `처리 완료: 성공 ${sent}건, 만료 구독 정리 ${cleaned}건, 실패 ${failures.length}건`,
    sent,
    cleaned,
    failed: failures.length,
    failures: failures.slice(0, 20),
  });
}

export async function GET(req: Request) {
  return runDailyPush(req);
}

export async function POST(req: Request) {
  return runDailyPush(req);
}
