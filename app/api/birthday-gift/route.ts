import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { birthdayWindow, type BirthCalendar } from "@/lib/birthday/birthday";

/**
 * 생일 선물권 — 기적의 제단 10일 고정 소원 1회 무료.
 *
 * GET  ?sid=&birthDate=&calendar=  → 지금 받을 수 있는지
 * POST { sid, birthDate, calendar, wish, nameDisplay, nameInput } → 소원을 10일로 올린다
 *
 * 악용 막기(서버에서 확인):
 * - 오늘이 생일 당일~6일 뒤(한국 날짜)일 때만
 * - 이 기기(분석용 기기 id)가 명운을 처음 쓴 지 30일이 지났을 때만 — 생일을 오늘로 바꿔 바로 받는 것을 막는다
 * - 기기당 300일에 1번
 * 본인 프로필만 대상인 것은 화면(BirthdayGiftBanner)에서 고른다.
 * 매출이 아니므로 vip_orders 에는 기록하지 않는다(본사 매출 집계와 무관).
 */

const DEVICE_MIN_AGE_DAYS = 30;
const CLAIM_COOLDOWN_DAYS = 300;
const DAY_MS = 86_400_000;

type Status = { inWindow: boolean; eligible: boolean; claimed: boolean; reason: string | null; birthday: string | null };

function parseInput(sid: unknown, birthDate: unknown, calendar: unknown) {
  const s = typeof sid === "string" ? sid.trim() : "";
  const b = typeof birthDate === "string" ? birthDate.trim() : "";
  const c: BirthCalendar = calendar === "lunar" || calendar === "lunar-leap" ? calendar : "solar";
  if (!/^[0-9a-f-]{20,64}$/i.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return null;
  return { sid: s, birthDate: b, calendar: c };
}

async function getStatus(sid: string, birthDate: string, calendar: BirthCalendar): Promise<Status> {
  const win = birthdayWindow(birthDate, calendar);
  const base = { inWindow: win.inWindow, birthday: win.birthday };
  if (!win.inWindow) return { ...base, eligible: false, claimed: false, reason: "not_birthday" };

  const db = createSupabaseAdminClient();
  if (!db) return { ...base, eligible: false, claimed: false, reason: "server" };

  const since = new Date(Date.now() - CLAIM_COOLDOWN_DAYS * DAY_MS).toISOString();
  const { data: claims } = await db
    .from("user_events")
    .select("id")
    .eq("event_name", "birthday_gift_claim")
    .eq("event_data->>device", sid)
    .gte("created_at", since)
    .limit(1);
  if (claims && claims.length > 0) return { ...base, eligible: false, claimed: true, reason: "claimed" };

  const { data: first } = await db
    .from("user_events")
    .select("created_at")
    .eq("session_id", sid)
    .order("created_at", { ascending: true })
    .limit(1);
  const firstAt = first?.[0]?.created_at ? new Date(first[0].created_at).getTime() : null;
  if (!firstAt || Date.now() - firstAt < DEVICE_MIN_AGE_DAYS * DAY_MS) {
    return { ...base, eligible: false, claimed: false, reason: "new_device" };
  }
  return { ...base, eligible: true, claimed: false, reason: null };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const input = parseInput(url.searchParams.get("sid"), url.searchParams.get("birthDate"), url.searchParams.get("calendar"));
  if (!input) return NextResponse.json({ success: false, error: "입력값을 확인해 주세요." }, { status: 400 });
  const status = await getStatus(input.sid, input.birthDate, input.calendar);
  return NextResponse.json({ success: true, ...status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = parseInput(body.sid, body.birthDate, body.calendar);
    const wish = typeof body.wish === "string" ? body.wish.trim().slice(0, 200) : "";
    if (!input || !wish) return NextResponse.json({ success: false, error: "소원을 입력해 주세요." }, { status: 400 });

    const status = await getStatus(input.sid, input.birthDate, input.calendar);
    if (!status.eligible) {
      const message =
        status.reason === "claimed"
          ? "생일 선물권은 이미 받으셨어요."
          : status.reason === "new_device"
            ? "생일 선물권은 명운을 30일 넘게 이용한 분께 드려요."
            : status.reason === "not_birthday"
              ? "생일 선물권은 생일부터 7일 동안 쓸 수 있어요."
              : "잠시 후 다시 시도해 주세요.";
      return NextResponse.json({ success: false, error: message, reason: status.reason }, { status: 409 });
    }

    const db = createSupabaseAdminClient();
    if (!db) return NextResponse.json({ success: false, error: "잠시 후 다시 시도해 주세요." }, { status: 503 });

    const nameDisplay = body.nameDisplay === "real" || body.nameDisplay === "partial" ? body.nameDisplay : "anonymous";
    const nameInput = typeof body.nameInput === "string" ? body.nameInput.trim().slice(0, 20) : "";

    // 받은 기록을 먼저 남긴다 — 소원 등록이 실패하면 지운다(같은 기기로 두 번 받는 것을 막는다)
    const { data: claim, error: claimErr } = await db
      .from("user_events")
      .insert({
        session_id: input.sid,
        event_name: "birthday_gift_claim",
        event_data: { device: input.sid, gift: "altar_10d", birthday: status.birthday },
        page_path: "/api/birthday-gift",
      })
      .select("id")
      .single();
    if (claimErr || !claim) return NextResponse.json({ success: false, error: "잠시 후 다시 시도해 주세요." }, { status: 503 });

    const { error: wishErr } = await db.from("wishes").insert({
      content: wish,
      duration: "10d",
      display_mode: nameDisplay,
      display_name: nameDisplay === "anonymous" ? "" : nameInput,
    });
    if (wishErr) {
      await db.from("user_events").delete().eq("id", claim.id);
      return NextResponse.json({ success: false, error: "소원 등록에 실패했어요. 잠시 후 다시 시도해 주세요." }, { status: 503 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
