import type { CsDashboardRow } from "@/lib/admin/cs-dashboard-types";
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

export type FetchAltarWishesPagedResult = {
  rows: CsDashboardRow[];
  totalCount: number;
  sourceNote: string | null;
};

/** `wishes` — 기적의 제단(소원), 서버사이드 페이지네이션 */
export async function fetchAltarWishesPaginated(params: {
  page: number;
  perPage: number;
}): Promise<FetchAltarWishesPagedResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      rows: [],
      totalCount: 0,
      sourceNote: "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.",
    };
  }

  const page = Math.max(1, Math.floor(params.page));
  const perPage = Math.min(100, Math.max(1, Math.floor(params.perPage)));
  const from = (page - 1) * perPage;
  const to = page * perPage - 1;

  const { data, error, count } = await supabaseAdmin
    .from("wishes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[wishes] CS 대시보드 조회 실패:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      rows: [],
      totalCount: 0,
      sourceNote: `wishes 조회 실패 (${error.code}): ${error.message}`,
    };
  }

  const totalCount = typeof count === "number" ? count : 0;
  const rows = (data ?? []).map((r) => mapWishRow(r as Record<string, unknown>));

  return {
    rows,
    totalCount,
    sourceNote: totalCount === 0 ? "저장된 제단 소원이 없습니다." : null,
  };
}
