export const PENDING_PAYMENT_STATE_KEY = "pending_payment_state";

export type PendingPaymentStateV1 = {
  v: 1;
  /** `/tools` 탭 등 — `TabId` 또는 vip 표식 */
  tab: string;
  flow: "altar" | "lotto" | "physiognomy" | "name" | "vip";
  savedAt?: number;
  wish?: {
    wishText: string;
    period: string;
    nameDisplay: string;
    nameInput: string;
    amount: number;
  };
  lotto?: { amount: number; userId: string };
  face?: { faceImage?: string; faceResultData?: unknown };
  name?: {
    nameInput: string;
    nameHanja: string;
    nameBirthDate: string;
    nameBirthTime: string;
    nameGender: "male" | "female";
    hanjaSelections: string[];
    nameResultData?: unknown;
  };
};

export function savePendingPaymentState(data: Omit<PendingPaymentStateV1, "v" | "savedAt"> & Partial<Pick<PendingPaymentStateV1, "v">>): void {
  if (typeof window === "undefined") return;
  try {
    const payload: PendingPaymentStateV1 = {
      v: data.v ?? 1,
      tab: data.tab,
      flow: data.flow,
      savedAt: Date.now(),
      ...(data.wish ? { wish: data.wish } : {}),
      ...(data.lotto ? { lotto: data.lotto } : {}),
      ...(data.face ? { face: data.face } : {}),
      ...(data.name ? { name: data.name } : {}),
    };
    localStorage.setItem(PENDING_PAYMENT_STATE_KEY, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export function readPendingPaymentState(): PendingPaymentStateV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_PAYMENT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPaymentStateV1;
    if (parsed?.v !== 1 || !parsed.tab || !parsed.flow) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPaymentState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PENDING_PAYMENT_STATE_KEY);
  } catch {
    /* ignore */
  }
}
