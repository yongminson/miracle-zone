import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupMemberRow } from "@/lib/group/group-ranking";

// 단톡방 궁합 방 저장 (2026-11-04) — 표: group_rooms·group_members (supabase-group-rooms-schema.sql).
// 서버(service role)만 읽고 쓴다. 손님 화면에는 별명·결과만 보내고 생일은 내보내지 않는다. 방은 30일 뒤 /api/cron/group-cleanup 이 지운다.

export type GroupKind = "group" | "pair";
export const GROUP_MAX_MEMBERS: Record<GroupKind, number> = { group: 30, pair: 2 };

// 헷갈리는 글자(0·O·1·l·I)를 뺀 방 코드
const CODE_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";

export function newRoomCode(): string {
  const bytes = randomBytes(10);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
}

export function isRoomCode(code: string): boolean {
  return /^[a-z2-9]{10}$/.test(code);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type GroupRoom = { code: string; kind: GroupKind; title: string | null; createdAt: string; expiresAt: string };

export async function loadRoom(
  supabase: SupabaseClient,
  code: string,
): Promise<{ room: GroupRoom; members: GroupMemberRow[] } | null> {
  const { data: room, error } = await supabase
    .from("group_rooms")
    .select("code, kind, title, created_at, expires_at")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  if (!room || new Date(room.expires_at).getTime() < Date.now()) return null;
  const { data: rows, error: memberError } = await supabase
    .from("group_members")
    .select("id, nickname, birth_date, calendar_type, gender")
    .eq("room_code", code)
    .order("created_at", { ascending: true });
  if (memberError) throw memberError;
  return {
    room: { code: room.code, kind: room.kind, title: room.title, createdAt: room.created_at, expiresAt: room.expires_at },
    members: (rows ?? []).map((r) => ({
      id: r.id,
      nickname: r.nickname,
      birthDate: r.birth_date,
      calendarType: r.calendar_type,
      gender: r.gender,
    })),
  };
}
