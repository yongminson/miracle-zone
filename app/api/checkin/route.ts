import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 출석 체크.
 *
 * 날짜는 서버가 한국 기준으로 정한다. 그래서 브라우저 저장값을 고쳐도
 * 출석 일수를 늘릴 수 없다 — 10일을 채우려면 실제로 10일이 지나야 한다.
 *
 * 10회마다 기적의 제단 1일권 1장을 받을 수 있게 표시해 둔다.
 */

const REWARD_EVERY = 10;
const OWNER_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,64}$/;

function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const ownerKey = typeof body.ownerKey === "string" ? body.ownerKey.trim() : "";
    if (!OWNER_KEY_PATTERN.test(ownerKey)) return bad("출석 식별값이 올바르지 않습니다.");

    const supabase = createSupabaseAdminClient();
    if (!supabase) return bad("서버 설정 문제로 출석을 기록하지 못했습니다.", 503);

    // 로그인했다면 계정도 같이 남긴다(나중에 기기를 옮길 때 쓰려고)
    let userId: string | null = null;
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data?.user?.id ?? null;
    }

    const today = kstToday();

    // peek 이면 기록하지 않고 상태만 돌려준다.
    // 화면을 열었다는 이유로 출석이 찍히면 안 되기 때문이다.
    const peek = body.peek === true;
    let alreadyCheckedIn = false;

    if (peek) {
      const { data: todayRow } = await supabase
        .from("checkins")
        .select("id")
        .eq("owner_key", ownerKey)
        .eq("checkin_date", today)
        .maybeSingle();
      alreadyCheckedIn = !!todayRow;
    } else {
      // 같은 날 두 번 눌러도 한 번만 남는다(테이블의 고유 제약)
      const inserted = await supabase
        .from("checkins")
        .insert({ owner_key: ownerKey, user_id: userId, checkin_date: today })
        .select("id")
        .maybeSingle();

      alreadyCheckedIn = !!inserted.error && inserted.error.code === "23505";
      if (inserted.error && !alreadyCheckedIn) {
        console.error("[checkin] insert failed", inserted.error);
        return bad("출석을 기록하지 못했습니다.", 503);
      }
    }

    const { count, error: countError } = await supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("owner_key", ownerKey);

    if (countError) {
      console.error("[checkin] count failed", countError);
      return bad("출석 일수를 확인하지 못했습니다.", 503);
    }

    const total = count ?? 0;
    const milestone = Math.floor(total / REWARD_EVERY) * REWARD_EVERY;

    // 10회를 넘겼으면 받을 수 있는 보상을 만들어 둔다(이미 있으면 그대로)
    if (milestone > 0 && !peek) {
      await supabase
        .from("checkin_rewards")
        .upsert(
          { owner_key: ownerKey, milestone },
          { onConflict: "owner_key,milestone", ignoreDuplicates: true },
        );
    }

    const { data: pending } = await supabase
      .from("checkin_rewards")
      .select("milestone")
      .eq("owner_key", ownerKey)
      .is("claimed_at", null)
      .order("milestone", { ascending: true })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      total,
      today,
      alreadyCheckedIn,
      nextRewardIn: REWARD_EVERY - (total % REWARD_EVERY),
      pendingReward: pending?.milestone ?? null,
    });
  } catch (error) {
    console.error("[checkin] unexpected error", error);
    return bad("출석 처리 중 오류가 발생했습니다.", 500);
  }
}
