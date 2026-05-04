import type { SupabaseClient } from "@supabase/supabase-js";

/** VIP 단품 결제 금액(원) — 검증·DB 기록 공통 */
export const VIP_ORDER_AMOUNT_WON = 29_900;

/** `vip_orders` insert/update 공통 스키마(기존 persistVipOrderRow와 동일 키) */
export type VipOrderRowInsert = {
  user_name: string;
  phone_number: string | null;
  imp_uid: string;
  amount: number;
  report_url: string;
  status: string;
};

export function resolveVipReportPublicUrlFromRequest(req: Pick<Request, "headers">): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return `${fromEnv}/vip`;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}/vip`;
  return "/vip";
}

/**
 * `vip_orders`에 insert 후 unique(imp_uid) 충돌 시 update.
 * 검증 직후·리포트 완료 후 동일 로직으로 호출.
 */
export async function upsertVipOrderRow(
  supabase: SupabaseClient,
  row: VipOrderRowInsert,
): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const imp = typeof row.imp_uid === "string" ? row.imp_uid.trim() : "";
  if (!imp) return { ok: false, message: "imp_uid가 비어 있습니다." };

  const payload = { ...row, imp_uid: imp };
  const { error: insertErr } = await supabase.from("vip_orders").insert(payload);
  if (insertErr?.code === "23505") {
    const { error: updateErr } = await supabase.from("vip_orders").update(payload).eq("imp_uid", imp);
    if (updateErr) return { ok: false, message: updateErr.message, code: updateErr.code };
    return { ok: true };
  }
  if (insertErr) return { ok: false, message: insertErr.message, code: insertErr.code };
  return { ok: true };
}
