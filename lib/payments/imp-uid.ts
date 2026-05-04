/**
 * 아임포트/포트원 REST 결제 조회용 imp_uid — `imp_` 또는 `imps_` 접두사만 허용
 * (merchant_uid·임의 paymentId와 혼동 방지)
 */
export function isValidIamportImpUid(raw: string | null | undefined): boolean {
  if (raw == null || typeof raw !== "string") return false;
  const s = raw.trim();
  return s.startsWith("imp_") || s.startsWith("imps_");
}

/** PG 리다이렉트 URL에서 IAMPORT 형식 imp_uid만 추출 (우선순위: imp_uid → 기타) */
export function extractImpUidFromReturnParams(params: URLSearchParams): string | null {
  const keys = ["imp_uid", "impUid", "transactionId", "txId", "paymentId"] as const;
  for (const key of keys) {
    const v = params.get(key);
    if (v && isValidIamportImpUid(v)) return v.trim();
  }
  return null;
}

/** 포트원 V2 `requestPayment` 응답에서 IAMPORT 조회 가능한 식별자만 선택 */
export function pickIamportImpUidFromPortOneResponse(
  response: Record<string, unknown> | void | null | undefined,
  merchantUidForDisplay: string,
): string | null {
  if (response && typeof response === "object") {
    const keys = ["imp_uid", "impUid", "transactionId", "txId", "paymentId"] as const;
    for (const k of keys) {
      const v = response[k];
      if (typeof v === "string" && isValidIamportImpUid(v)) return v.trim();
    }
  }
  if (isValidIamportImpUid(merchantUidForDisplay)) return merchantUidForDisplay.trim();
  return null;
}

export function isLikelyPortOneReturnSuccess(params: URLSearchParams, impUid: string | null): boolean {
  if (params.get("imp_success") === "true") return true;
  if (params.get("success") === "true") return true;
  const err = params.get("code") || params.get("error_code") || params.get("message") || params.get("error_msg");
  if (err) return false;
  return !!impUid;
}
