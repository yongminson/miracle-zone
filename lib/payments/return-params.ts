/**
 * 모바일 PG 리다이렉트 복귀 URL — 포트원 V2(`paymentId`)·V1(`imp_uid`) 모두 수용
 * 우선순위: paymentId → imp_uid 계열
 */
export function extractPaymentReturnId(params: URLSearchParams): string | null {
  const orderedKeys = ["paymentId", "imp_uid", "impUid", "transactionId", "txId"] as const;
  for (const key of orderedKeys) {
    const v = params.get(key)?.trim();
    if (v) return v;
  }
  return null;
}
