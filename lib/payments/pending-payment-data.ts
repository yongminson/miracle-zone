export const PENDING_PAYMENT_DATA_KEY = "pending_payment_data";

export type PendingPaymentDataV1 = {
  v: 1;
  /** 복귀 후 `setActiveTab` — VIP는 `/vip` 단일 페이지라 `"vip"` 등 표식용 */
  tab: string;
  flow: "altar" | "lotto" | "physiognomy" | "name" | "vip";
};

export function savePendingPaymentData(data: PendingPaymentDataV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PENDING_PAYMENT_DATA_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch {
    /* ignore quota */
  }
}

export function readPendingPaymentData(): PendingPaymentDataV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_PAYMENT_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPaymentDataV1 & { savedAt?: number };
    if (parsed?.v !== 1 || !parsed.tab || !parsed.flow) return null;
    return { v: 1, tab: parsed.tab, flow: parsed.flow };
  } catch {
    return null;
  }
}

export function clearPendingPaymentData(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_PAYMENT_DATA_KEY);
  } catch {
    /* ignore */
  }
}
