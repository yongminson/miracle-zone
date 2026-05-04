/**
 * 포트원 REST API V2 — 서버 전용 (Route Handler 등)
 * @see https://developers.portone.io/api/rest-v2
 */

const PORTONE_ORIGIN = "https://api.portone.io";

export async function portoneLoginWithApiSecret(
  apiSecret: string,
): Promise<{ accessToken: string } | { error: string }> {
  const res = await fetch(`${PORTONE_ORIGIN}/login/api-secret`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiSecret }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  const accessToken = (json.accessToken ?? json.access_token) as string | undefined;
  if (!res.ok || typeof accessToken !== "string" || !accessToken.trim()) {
    const msg =
      (typeof json.message === "string" && json.message) ||
      (typeof json.error === "string" && json.error) ||
      "PortOne API 로그인에 실패했습니다.";
    return { error: msg };
  }
  return { accessToken: accessToken.trim() };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

/** 결제 단건 조회 응답에서 금액(원)·상태·id 추출 (스키마 변형 대비) */
export function parsePortOnePaymentPayload(json: Record<string, unknown> | null): {
  id: string;
  status: string;
  totalAmount: number;
} | null {
  if (!json) return null;
  const payment = asRecord(json.payment) ?? asRecord(json) ?? null;
  if (!payment) return null;
  const id = typeof payment.id === "string" ? payment.id.trim() : "";
  const status = typeof payment.status === "string" ? payment.status.trim().toUpperCase() : "";
  const amountBlock = asRecord(payment.amount);
  const rawTotal =
    amountBlock?.total ??
    payment.totalAmount ??
    payment.paidAmount ??
    payment.amountTotal ??
    payment.amount;
  const totalAmount = typeof rawTotal === "number" ? rawTotal : Number(rawTotal);
  if (!id || !Number.isFinite(totalAmount)) return null;
  return { id, status, totalAmount };
}

export async function portoneFetchPaymentJson(
  accessToken: string,
  paymentId: string,
): Promise<Record<string, unknown> | null> {
  const paths = [`/payments/${encodeURIComponent(paymentId)}`, `/v2/payments/${encodeURIComponent(paymentId)}`];
  for (const path of paths) {
    const res = await fetch(`${PORTONE_ORIGIN}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const json = (await res.json()) as Record<string, unknown>;
    if (res.ok) return json;
  }
  return null;
}
