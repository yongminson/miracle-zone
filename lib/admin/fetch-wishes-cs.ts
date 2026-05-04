import type { CsDashboardRow, CsDashboardTabPayload } from "@/lib/admin/cs-dashboard-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function mapWishRow(row: Record<string, unknown>): CsDashboardRow {
  const id = row.id != null ? String(row.id) : "unknown";
  const displayName =
    typeof row.display_name === "string" && row.display_name.trim() !== ""
      ? row.display_name.trim()
      : "소원 고객";
  const content = typeof row.content === "string" ? row.content : "";
  const duration = typeof row.duration === "string" ? row.duration.trim() : "";
  const displayMode = typeof row.display_mode === "string" ? row.display_mode.trim() : "";
  const createdRaw = row.created_at;
  const created_at =
    typeof createdRaw === "string"
      ? createdRaw
      : createdRaw instanceof Date
        ? createdRaw.toISOString()
        : new Date().toISOString();

  const statusParts = [duration, displayMode].filter(Boolean);
  const status = statusParts.length > 0 ? statusParts.join(" · ") : "제단 소원";

  return {
    id,
    user_name: displayName,
    phone_number: null,
    created_at,
    amountWon: null,
    paymentRef: null,
    report_url: null,
    status,
    notes: content ? truncate(content, 160) : null,
  };
}

/** `wishes` — 기적의 제단(소원) 결제/등록 내역 */
export async function fetchAltarWishesForCs(): Promise<CsDashboardTabPayload> {
  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      rows: [],
      sourceNote: "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.",
    };
  }

  const { data, error } = await supabaseAdmin
    .from("wishes")
    .select("*")
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[wishes] CS 대시보드 조회 실패:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      rows: [],
      sourceNote: `wishes 조회 실패 (${error.code}): ${error.message}`,
    };
  }

  const rows = (data ?? []).map((r) => mapWishRow(r as Record<string, unknown>));
  return {
    rows,
    sourceNote: rows.length === 0 ? "저장된 제단 소원이 없습니다." : null,
  };
}
