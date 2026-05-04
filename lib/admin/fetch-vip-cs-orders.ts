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

export type FetchVipCsResult = {
  rows: VipCsOrderRow[];
  sourceNote: string | null;
};

export async function fetchVipCsOrders(): Promise<FetchVipCsResult> {
  const supabaseAdmin = createSupabaseAdminClient();
  if (!supabaseAdmin) {
    return {
      rows: [],
      sourceNote: "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.",
    };
  }

  /** `.eq("status", …)` 없음 — `vip_orders` 전 행(최신순) */
  const { data, error } = await supabaseAdmin
    .from("vip_orders")
    .select("*")
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[vip_orders] 관리자 목록 조회 실패:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return {
      rows: [],
      sourceNote: `vip_orders 조회 실패 (${error.code}): ${error.message}`,
    };
  }

  const mapped = (data ?? []).map((r) => mapDbRow(r as Record<string, unknown>));

  return {
    rows: mapped,
    sourceNote: mapped.length === 0 ? "저장된 VIP 주문이 없습니다." : null,
  };
}
