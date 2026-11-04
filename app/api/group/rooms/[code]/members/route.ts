import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { GROUP_MAX_MEMBERS, hashToken, isRoomCode, loadRoom } from "@/lib/group/group-room";
import { isValidMember } from "@/lib/group/group-ranking";

// 방에 들어가기·내 정보 빼기 (2026-11-04).
// 들어갈 때 기기가 만든 무작위 token 을 함께 보내고(해시만 저장), 뺄 때 같은 token 이 있어야 지운다.

function readToken(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9_-]{20,80}$/.test(value) ? value : null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isRoomCode(code)) return NextResponse.json({ error: "없는 방이에요." }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const token = readToken(body.token);
  const nickname = typeof body.nickname === "string" ? body.nickname.trim().slice(0, 20) : "";
  const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
  const calendarType = body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar";
  const gender = body.gender === "female" ? "female" : "male";
  if (!token) return NextResponse.json({ error: "다시 시도해 주세요." }, { status: 400 });
  if (!nickname) return NextResponse.json({ error: "이름(별명)을 넣어 주세요." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !isValidMember({ nickname, birthDate, calendarType, gender })) {
    return NextResponse.json({ error: "생년월일과 양력·음력을 확인해 주세요." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 503 });
  try {
    const loaded = await loadRoom(supabase, code);
    if (!loaded) return NextResponse.json({ error: "없거나 기간(30일)이 지난 방이에요." }, { status: 404 });
    if (loaded.members.length >= GROUP_MAX_MEMBERS[loaded.room.kind]) {
      return NextResponse.json(
        { error: loaded.room.kind === "pair" ? "이미 두 사람이 다 들어왔어요." : `한 방에는 ${GROUP_MAX_MEMBERS.group}명까지 들어올 수 있어요.` },
        { status: 409 },
      );
    }
    const { data, error } = await supabase
      .from("group_members")
      .insert({
        room_code: code,
        nickname,
        birth_date: birthDate,
        calendar_type: calendarType,
        gender,
        member_token: hashToken(token),
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ memberId: data.id });
  } catch (error) {
    console.error("[group] 들어가기 실패", error);
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isRoomCode(code)) return NextResponse.json({ error: "없는 방이에요." }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const token = readToken(body.token);
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!token || !memberId) return NextResponse.json({ error: "다시 시도해 주세요." }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 503 });
  // 본인 기기 token 이 맞는 항목만 지운다
  const { data, error } = await supabase
    .from("group_members")
    .delete()
    .eq("room_code", code)
    .eq("id", memberId)
    .eq("member_token", hashToken(token))
    .select("id");
  if (error) {
    console.error("[group] 빼기 실패", error);
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
  if (!data?.length) return NextResponse.json({ error: "이 기기에서 넣은 정보만 뺄 수 있어요." }, { status: 403 });
  return NextResponse.json({ ok: true });
}
