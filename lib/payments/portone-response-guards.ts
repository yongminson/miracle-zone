/**
 * 포트원 V2 `PortOne.requestPayment` 직후 응답 검사 — 취소/실패 시 서버 검증·성공 UI로 진행하지 않도록 함.
 * 모바일 리다이렉트 시 `undefined` 또는 빈 객체로 resolve되는 경우는 실패로 처리하지 않음(복귀 URL에서 검증).
 */

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * @returns 실패·취소 시 사용자에게 보여줄 메시지, 정상이면 `null`
 */
export function getPortOnePaymentFailureReason(
  response: unknown,
  opts: { isMobile: boolean },
): string | null {
  const { isMobile } = opts;

  if (response == null) {
    return isMobile ? null : "결제가 취소되었습니다.";
  }
  if (typeof response !== "object") {
    return isMobile ? null : "결제가 취소되었습니다.";
  }

  const r = response as Record<string, unknown>;

  const code = r.code;
  if (code !== undefined && code !== null && code !== "") {
    const msg = str(r.message) || str(r.error_msg) || str(r.errorMsg);
    return msg || "결제가 취소되었습니다.";
  }

  const errLine = str(r.error_msg) || str(r.errorMsg);
  if (errLine) return errLine;

  const status = str(r.status).toUpperCase();
  if (status === "FAILED" || status === "CANCELLED" || status === "CANCELED") {
    return str(r.message) || "결제에 실패했습니다.";
  }

  if (!isMobile) {
    const pid = r.paymentId;
    if (typeof pid !== "string" || !pid.trim()) {
      return "결제가 취소되었습니다.";
    }
  }

  return null;
}
