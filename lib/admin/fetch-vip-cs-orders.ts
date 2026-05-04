import { createClient } from "@supabase/supabase-js";
import type { VipCsOrderRow } from "@/lib/admin/vip-cs-types";

function mapDbRow(row: Record<string, unknown>): VipCsOrderRow | null {
  if (typeof row.imp_uid !== "string" || !row.imp_uid.trim()) return null;

  const id = row.id != null ? String(row.id) : row.imp_uid;
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
    imp_uid: row.imp_uid.trim(),
    report_url,
    status,
  };
}

export type FetchVipCsResult = {
  rows: VipCsOrderRow[];
  sourceNote: string | null;
};

export async function fetchVipCsOrders(): Promise<FetchVipCsResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    return {
      rows: [],
      sourceNote: "NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.",
    };
  }

  const supabase = createClient(url, serviceKey);
  /** 상태 필터 없음 — `vip_orders` 전체(최신순). paid / completed 등 모두 표시 */
  const { data, error } = await supabase
    .from("vip_orders")
    .select("*")
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(500);

  if (error) {
    return {
      rows: [],
      sourceNote: `vip_orders 조회 실패 (${error.code}): ${error.message}`,
    };
  }

  const mapped = (data ?? [])
    .map((r) => mapDbRow(r as Record<string, unknown>))
    .filter((r): r is VipCsOrderRow => r != null);

  return {
    rows: mapped,
    sourceNote: mapped.length === 0 ? "저장된 VIP 주문이 없습니다." : null,
  };
}
