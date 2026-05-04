import type { VipCsOrderRow } from "@/lib/admin/vip-cs-types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/** `status`·`imp_uid` 유무로 행을 버리지 않음 — 디버깅용으로 DB 행을 최대한 표시 */
function mapDbRow(row: Record<string, unknown>): VipCsOrderRow {
  const impRaw = typeof row.imp_uid === "string" ? row.imp_uid.trim() : "";
  const id = row.id != null ? String(row.id) : impRaw || "unknown";
  const imp_uid = impRaw || `(imp_uid 없음·id:${id})`;
  const user_name =
    typeof row.user_name === "string" && row.user_name.trim() !== ""
      ? row.user_name.trim()
      : "이름 미상";

  const phone_number =
    typeof row.phone_number === "string" && row.phone_number.trim() !== ""
      ? row.phone_number.trim()
      : null;

  const createdRaw = row.created_at;
  const created_at =
    typeof createdRaw === "string"
      ? createdRaw
      : createdRaw instanceof Date
        ? createdRaw.toISOString()
        : new Date().toISOString();

  const amountRaw = row.amount;
  const amount =
    typeof amountRaw === "number" && Number.isFinite(amountRaw)
      ? amountRaw
      : typeof amountRaw === "string"
        ? Number.parseInt(amountRaw, 10) || 0
        : 0;

  const report_url =
    typeof row.report_url === "string" && row.report_url.trim() !== "" ? row.report_url.trim() : null;

  const status = typeof row.status === "string" ? row.status : null;

  return {
    id,
    user_name,
    phone_number,
    created_at,
    amount,
    imp_uid,
    report_url,
    status,
  };
}

export type FetchVipCsPagedResult = {
  rows: VipCsOrderRow[];
  totalCount: number;
  sourceNote: string | null;
};

/** `vip_orders` — 서버사이드 페이지네이션 + `count: exact` */
export async function fetchVipCsOrdersPaginated(params: {
  page: number;
  perPage: number;
}): Promise<FetchVipCsPagedResult> {
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
    .from("vip_orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[vip_orders] 관리자 목록 조회 실패:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      rows: [],
      totalCount: 0,
      sourceNote: `vip_orders 조회 실패 (${error.code}): ${error.message}`,
    };
  }

  const totalCount = typeof count === "number" ? count : 0;
  const mapped = (data ?? []).map((r) => mapDbRow(r as Record<string, unknown>));

  return {
    rows: mapped,
    totalCount,
    sourceNote: totalCount === 0 ? "저장된 VIP 주문이 없습니다." : null,
  };
}
