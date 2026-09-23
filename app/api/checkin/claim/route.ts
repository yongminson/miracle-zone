import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 출석 보상 받기 — 기적의 제단 1일권 1장.
 *
 * 받지 않은 보상이 있을 때만 소원을 올려 주고, 그 즉시 받은 것으로 표시한다.
 * 결제로 올리는 24시간 소원과 같은 형태로 들어간다.
 */

const OWNER_KEY_PATTERN = /^[A-Za-z0-9._:-]{8,64}$/;
const WISH_MAX = 200;
const NAME_MAX = 12;

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

/** 결제 소원과 같은 방식으로 이름을 가린다 */
function buildDisplayName(mode: string, rawName: string): string {
  const name = rawName.trim().slice(0, NAME_MAX);
  if (mode === "real" && name) return `[${name} 님의 24시간 기원]`;
  if (mode === "partial" && name.length >= 2) {
    const masked = name[0] + "*".repeat(Math.max(1, name.length - 2)) + name[name.length - 1];
    return `[${masked} 님의 24시간 기원]`;
  }
  return "[익명 님의 24시간 기원]";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    const ownerKey = typeof body.ownerKey === "string" ? body.ownerKey.trim() : "";
    if (!OWNER_KEY_PATTERN.test(ownerKey)) return bad("출석 식별값이 올바르지 않습니다.");

    const wishText = typeof body.wishText === "string" ? body.wishText.trim() : "";
    if (!wishText) return bad("소원 내용을 입력해 주세요.");
    if (wishText.length > WISH_MAX) return bad(`소원은 ${WISH_MAX}자까지 쓸 수 있습니다.`);

    const nameDisplayRaw = typeof body.nameDisplay === "string" ? body.nameDisplay : "anonymous";
    const nameDisplay =
      nameDisplayRaw === "real" || nameDisplayRaw === "partial" ? nameDisplayRaw : "anonymous";
    const nameInput = typeof body.nameInput === "string" ? body.nameInput : "";

    const supabase = createSupabaseAdminClient();
    if (!supabase) return bad("서버 설정 문제로 처리하지 못했습니다.", 503);

    // 아직 받지 않은 보상이 있는지 확인
    const { data: reward, error: rewardError } = await supabase
      .from("checkin_rewards")
      .select("id,milestone")
      .eq("owner_key", ownerKey)
      .is("claimed_at", null)
      .order("milestone", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (rewardError) {
      console.error("[checkin/claim] reward lookup failed", rewardError);
      return bad("보상을 확인하지 못했습니다.", 503);
    }
    if (!reward) return bad("받을 수 있는 출석 보상이 없습니다.", 404);

    const { data: wish, error: wishError } = await supabase
      .from("wishes")
      .insert({
        content: wishText,
        duration: "24h",
        display_mode: nameDisplay,
        display_name: buildDisplayName(nameDisplay, nameInput),
        is_auto: false,
      })
      .select("id")
      .single();

    if (wishError || !wish) {
      console.error("[checkin/claim] wish insert failed", wishError);
      return bad("소원을 올리지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
    }

    // 먼저 받은 것으로 표시한다. 이미 받은 상태면 아무것도 바뀌지 않는다
    const { data: claimed, error: claimError } = await supabase
      .from("checkin_rewards")
      .update({ claimed_at: new Date().toISOString(), granted_wish_id: wish.id })
      .eq("id", reward.id)
      .is("claimed_at", null)
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("[checkin/claim] claim update failed", claimError);
    }
    if (!claimed) {
      // 동시에 두 번 눌린 경우 — 소원은 이미 올라갔으므로 그대로 성공 처리한다
      console.warn("[checkin/claim] reward already claimed", { milestone: reward.milestone });
    }

    return NextResponse.json({ success: true, milestone: reward.milestone, wishId: wish.id });
  } catch (error) {
    console.error("[checkin/claim] unexpected error", error);
    return bad("보상 처리 중 오류가 발생했습니다.", 500);
  }
}
