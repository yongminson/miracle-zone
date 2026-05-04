import type { CsDashboardRow, CsDashboardTabId } from "@/lib/admin/cs-dashboard-types";
import { fetchAltarWishesPaginated } from "@/lib/admin/fetch-wishes-cs";
import { fetchSajuCsPaginated } from "@/lib/admin/fetch-saju-cs-tab";
import { fetchVipCsOrdersPaginated } from "@/lib/admin/fetch-vip-cs-orders";
import type { VipCsOrderRow } from "@/lib/admin/vip-cs-types";

function vipRowToDashboard(r: VipCsOrderRow): CsDashboardRow {
  return {
    id: r.id,
    user_name: r.user_name,
    phone_number: r.phone_number,
    created_at: r.created_at,
    amountWon: Number.isFinite(r.amount) ? r.amount : null,
    paymentRef: r.imp_uid.trim() ? r.imp_uid.trim() : null,
    report_url: r.report_url,
    status: r.status,
    notes: null,
  };
}

export type CsDashboardPagePayload = {
  tab: CsDashboardTabId;
  page: number;
  perPage: number;
  rows: CsDashboardRow[];
  totalCount: number;
  sourceNote: string | null;
};

export async function fetchCsDashboardPage(params: {
  tab: CsDashboardTabId;
  page: number;
  perPage: number;
}): Promise<CsDashboardPagePayload> {
  const tab = params.tab;
  const page = Math.max(1, Math.floor(params.page));
  const perPage = Math.min(100, Math.max(1, Math.floor(params.perPage)));

  if (tab === "vip") {
    const r = await fetchVipCsOrdersPaginated({ page, perPage });
    return {
      tab,
      page,
      perPage,
      rows: r.rows.map(vipRowToDashboard),
      totalCount: r.totalCount,
      sourceNote: r.sourceNote,
    };
  }

  if (tab === "altar") {
    const r = await fetchAltarWishesPaginated({ page, perPage });
    return {
      tab,
      page,
      perPage,
      rows: r.rows,
      totalCount: r.totalCount,
      sourceNote: r.sourceNote,
    };
  }

  const r = await fetchSajuCsPaginated({ page, perPage });
  return {
    tab,
    page,
    perPage,
    rows: r.rows,
    totalCount: r.totalCount,
    sourceNote: r.sourceNote,
  };
}
