import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const VIP_REPORT_PRODUCT_KEY = "vip_report";

export type VipReportPaymentPlatform = "web" | "google_play" | "apps_in_toss";

type EntitlementRow = {
  payment_ref: string;
  platform: VipReportPaymentPlatform;
  provider_reference: string;
  subject_key: string | null;
  product_key: string;
  amount: number;
  currency: "KRW";
  status: "available" | "processing" | "completed";
};

type EntitlementResult =
  | { ok: true; duplicated?: boolean }
  | { ok: false; message: string };

function normalizeReference(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

export function webVipPaymentRef(paymentId: string): string {
  return `web:${normalizeReference(paymentId)}`;
}

export function tossVipPaymentRef(orderId: string): string {
  return `toss:${normalizeReference(orderId)}`;
}

export function googleVipPaymentRef(purchaseToken: string): string {
  const digest = createHash("sha256").update(normalizeReference(purchaseToken)).digest("hex");
  return `google:${digest}`;
}

export async function createVipReportEntitlement(
  supabase: SupabaseClient,
  row: Omit<EntitlementRow, "product_key" | "currency" | "status">,
): Promise<EntitlementResult> {
  const payload: EntitlementRow = {
    ...row,
    product_key: VIP_REPORT_PRODUCT_KEY,
    currency: "KRW",
    status: "available",
  };
  const { error } = await supabase.from("vip_report_entitlements").insert(payload);
  if (!error) return { ok: true };
  if (error.code !== "23505") {
    console.error("[vip-entitlement] insert failed", { code: error.code });
    return { ok: false, message: "사주 인사이트 리포트 지급권을 저장하지 못했습니다." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("vip_report_entitlements")
    .select("platform,provider_reference,subject_key,product_key,amount,currency,status")
    .eq("payment_ref", payload.payment_ref)
    .maybeSingle();
  if (existingError || !existing) {
    console.error("[vip-entitlement] duplicate lookup failed", { code: existingError?.code });
    return { ok: false, message: "기존 사주 인사이트 리포트 지급권을 확인하지 못했습니다." };
  }
  const samePayment =
    existing.platform === payload.platform &&
    existing.provider_reference === payload.provider_reference &&
    existing.subject_key === payload.subject_key &&
    existing.product_key === payload.product_key &&
    existing.amount === payload.amount &&
    existing.currency === payload.currency;
  if (!samePayment) {
    return { ok: false, message: "결제 식별자가 다른 지급 기록과 충돌합니다." };
  }
  return { ok: true, duplicated: true };
}

export async function claimVipReportEntitlement(
  supabase: SupabaseClient,
  paymentRef: string,
  expectedAmount: number,
): Promise<EntitlementResult> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("vip_report_entitlements")
    .update({ status: "processing", processing_started_at: now, updated_at: now })
    .eq("payment_ref", paymentRef)
    .eq("product_key", VIP_REPORT_PRODUCT_KEY)
    .eq("amount", expectedAmount)
    .eq("currency", "KRW")
    .eq("status", "available")
    .select("payment_ref")
    .maybeSingle();
  if (error) {
    console.error("[vip-entitlement] claim failed", { code: error.code });
    return { ok: false, message: "사주 인사이트 리포트 지급권을 확인하지 못했습니다." };
  }
  if (!data) {
    return { ok: false, message: "사용 가능한 결제 내역이 없거나 이미 사용된 결제입니다." };
  }
  return { ok: true };
}

export async function completeVipReportEntitlement(
  supabase: SupabaseClient,
  paymentRef: string,
): Promise<EntitlementResult> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("vip_report_entitlements")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("payment_ref", paymentRef)
    .eq("status", "processing")
    .select("payment_ref")
    .maybeSingle();
  if (error || !data) {
    console.error("[vip-entitlement] completion failed", { code: error?.code });
    return { ok: false, message: "사주 인사이트 리포트 지급 완료 상태를 저장하지 못했습니다." };
  }
  return { ok: true };
}

export async function releaseVipReportEntitlement(
  supabase: SupabaseClient,
  paymentRef: string,
): Promise<void> {
  const { error } = await supabase
    .from("vip_report_entitlements")
    .update({ status: "available", processing_started_at: null, updated_at: new Date().toISOString() })
    .eq("payment_ref", paymentRef)
    .eq("status", "processing");
  if (error) console.error("[vip-entitlement] release failed", { code: error.code });
}
