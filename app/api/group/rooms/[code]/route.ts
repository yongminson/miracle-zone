import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { isRoomCode, loadRoom } from "@/lib/group/group-room";
import { pairCard, rankGroup } from "@/lib/group/group-ranking";

export const dynamic = "force-dynamic";

// 방 보기 (2026-11-04) — 참가자 별명과 궁합 결과만 보낸다. 생일은 내보내지 않는다.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isRoomCode(code)) return NextResponse.json({ error: "없는 방이에요." }, { status: 404 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 503 });

  try {
    const loaded = await loadRoom(supabase, code);
    if (!loaded) return NextResponse.json({ error: "없거나 기간(30일)이 지난 방이에요." }, { status: 404 });
    const { room, members } = loaded;
    const base = {
      room: { code: room.code, kind: room.kind, title: room.title, expiresAt: room.expiresAt },
      members: members.map((m) => ({ id: m.id, nickname: m.nickname })),
    };
    if (room.kind === "pair") {
      const card = members.length >= 2 ? pairCard(members[0], members[1]) : null;
      return NextResponse.json({ ...base, card });
    }
    return NextResponse.json({ ...base, ranking: rankGroup(members) });
  } catch (error) {
    console.error("[group] 방 읽기 실패", error);
    return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
