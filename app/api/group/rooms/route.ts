import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { newRoomCode, type GroupKind } from "@/lib/group/group-room";

// 단톡방 궁합 방 만들기 (2026-11-04 새 경로). 요청: { kind: "group" | "pair", title? } → { code }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const kind: GroupKind = body.kind === "pair" ? "pair" : "group";
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 30) : null;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "잠시 후 다시 시도해 주세요." }, { status: 503 });

  // 코드가 겹치면(아주 드묾) 다시 뽑는다
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = newRoomCode();
    const { error } = await supabase.from("group_rooms").insert({ code, kind, title });
    if (!error) return NextResponse.json({ code, kind });
    if (error.code !== "23505") {
      console.error("[group] 방 만들기 실패", error);
      break;
    }
  }
  return NextResponse.json({ error: "방을 만들지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
}
