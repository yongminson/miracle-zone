import { NextResponse } from "next/server";
import webpush from "web-push";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { calculateDayLuck } from "@/lib/calendar/day-luck";

/**
 * 매일 아침 8시(한국) 웹 알림 — Vercel 크론이 부른다(Bearer CRON_SECRET).
 *
 * 생년월일을 함께 구독한 사람에게는 그날의 흐름(운세 캘린더와 같은 계산)을 담아 보낸다.
 * 예) "오늘은 ‘기회에 먼저 손 내미는 날’ 🟢" / "연락이 뜸했던 사람에게 먼저 연락해 보세요."
 * 누르면 오늘의 운세로 바로 간다(utm_source=push 로 알림에서 온 방문을 센다).
 */

const VAPID_SUBJECT = "mailto:support@ymstudio.co.kr";
const OPEN_URL = "/tools?tab=fortune&utm_source=push&utm_medium=daily";
const TONE_EMOJI: Record<string, string> = { good: "🟢", normal: "🟡", caution: "🔴" };

const DEFAULT_PAYLOAD = JSON.stringify({
  title: "오늘의 운세가 도착했어요 ✨",
  body: "오늘 힘을 쓰면 좋은 일과 조심할 일을 확인해 보세요.",
  url: OPEN_URL,
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
  birth_date?: string | null;
  calendar_type?: string | null;
};

/** 그 사람의 오늘 흐름으로 알림 문구를 만든다. 계산이 안 되면 기본 문구 */
function payloadFor(sub: PushSubscriptionRow): string {
  if (!sub.birth_date) return DEFAULT_PAYLOAD;
  try {
    const calendarType =
      sub.calendar_type === "lunar" || sub.calendar_type === "lunar-leap" ? sub.calendar_type : "solar";
    const today = calculateDayLuck({ birthDate: sub.birth_date, calendarType, days: 1 }).days[0];
    if (!today) return DEFAULT_PAYLOAD;
    return JSON.stringify({
      title: `오늘은 ‘${today.title}’ ${TONE_EMOJI[today.tone] ?? ""}`.trim(),
      body: today.action,
      url: OPEN_URL,
    });
  } catch {
    return DEFAULT_PAYLOAD;
  }
}

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

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ success: false, message: "서버 설정 문제로 보내지 못했습니다." }, { status: 503 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);

  const { data: subscriptions, error: fetchError } = await supabase.from("push_subscriptions").select("*");
  if (fetchError) {
    console.error("cron/push fetch subscriptions:", fetchError);
    return NextResponse.json({ success: false, message: fetchError.message }, { status: 500 });
  }

  const rows = (subscriptions ?? []) as PushSubscriptionRow[];
  if (rows.length === 0) {
    return NextResponse.json({ success: true, message: "발송 대상 구독이 없습니다.", sent: 0, failed: 0, cleaned: 0 });
  }

  const results = await Promise.allSettled(
    rows.map((sub) =>
      webpush
        .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payloadFor(sub), {
          TTL: 4 * 60 * 60,
          // 아침 알림은 그 시각에 보여야 의미가 있다 — 휴대폰 절전 중에도 미루지 않게
          urgency: "high",
        })
        .then(() => ({ outcome: "sent" as const }))
        .catch(async (err: { statusCode?: number }) => {
          const code = err?.statusCode;
          if (code === 410 || code === 404) {
            const { error: delErr } = await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            if (delErr) console.error("cron/push delete stale subscription:", delErr);
            return { outcome: "cleaned" as const };
          }
          throw err;
        })
    )
  );

  let sent = 0;
  let cleaned = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      if (r.value.outcome === "sent") sent++;
      else cleaned++;
    } else {
      failed++;
    }
  }
  const personalized = rows.filter((r) => !!r.birth_date).length;

  return NextResponse.json({
    success: true,
    message: `처리 완료: 성공 ${sent}건(맞춤 ${personalized}명), 만료 정리 ${cleaned}건, 실패 ${failed}건`,
    sent,
    cleaned,
    failed,
    personalized,
  });
}

export async function GET(req: Request) {
  return runDailyPush(req);
}

export async function POST(req: Request) {
  return runDailyPush(req);
}
