import { logEvent } from "@/lib/analytics";

/**
 * 구글 앱(명운-rn WebView) 안에서는 웹 결제창(포트원)을 열면 안 된다.
 * 카드·카카오페이·토스페이 앱으로 넘어가지 못해(net::ERR_UNKNOWN_URL_SCHEME) 결제가 반드시 실패한다.
 * 2026-10-10~12 사주 인사이트 결제 8번이 이렇게 실패해 실제 매출을 놓쳤다.
 *
 * 앱에서는 구글 플레이 결제(PURCHASE_ITEM) 또는 리워드 광고(SHOW_REWARDED_AD)로 가야 한다.
 * 웹 결제창을 여는 모든 곳은 열기 전에 이 함수를 부른다 — scripts/check-app-payment-guard.mjs 가 빌드 때 확인한다.
 *
 * @returns true 면 앱 안이라 막았다(호출한 쪽은 결제를 멈춘다)
 */
export function blockWebPaymentInApp(product: string): boolean {
  if (typeof navigator === "undefined" || !navigator.userAgent.includes("MyeongunApp")) return false;
  void logEvent("payment_blocked_app", { product });
  return true;
}

export const APP_WEB_PAYMENT_BLOCKED_MESSAGE =
  "앱에서는 이 결제를 진행할 수 없어요. Play 스토어에서 명운 앱을 최신 버전으로 업데이트한 뒤 다시 시도해 주세요.";
