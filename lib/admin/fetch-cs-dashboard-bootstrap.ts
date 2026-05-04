import type {
  CsDashboardBootstrapPayload,
  CsDashboardRow,
  CsDashboardTabPayload,
} from "@/lib/admin/cs-dashboard-types";
import { fetchAltarWishesForCs } from "@/lib/admin/fetch-wishes-cs";
import { fetchSajuNameFaceCsPlaceholder } from "@/lib/admin/fetch-saju-cs-tab";
import { fetchVipCsOrders } from "@/lib/admin/fetch-vip-cs-orders";
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

export async function fetchCsDashboardBootstrap(): Promise<CsDashboardBootstrapPayload> {
  const [vipRes, altarRes, sajuRes] = await Promise.all([
    fetchVipCsOrders(),
    fetchAltarWishesForCs(),
    fetchSajuNameFaceCsPlaceholder(),
  ]);

  const vip: CsDashboardTabPayload = {
    rows: vipRes.rows.map(vipRowToDashboard),
    sourceNote: vipRes.sourceNote,
  };

  return {
    vip,
    altar: altarRes,
    saju: sajuRes,
  };
}
