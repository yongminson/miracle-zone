/**
 * 구글 플레이 인앱결제 확인 — 소원 자물쇠용.
 *
 * 기존 `app/api/payment/verify-google/route.ts` 에도 비슷한 코드가 있지만,
 * 그 라우트는 명운 앱이 직접 호출하고 있는 결제 정본이라 건드리지 않았다.
 */

import { google } from "googleapis";
import { LOCK_PRODUCT_IDS, type LockTier } from "@/lib/locks/wall-locks";

const PACKAGE_NAME = "kr.co.ymstudio.myeongun";

export type GoogleVerifyResult =
  | { ok: true; orderId: string }
  | { ok: false; message: string };

export async function verifyGoogleLockPurchase(params: {
  tier: LockTier;
  purchaseToken: string;
}): Promise<GoogleVerifyResult> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return { ok: false, message: "서버에 구글 결제 확인 설정이 없습니다." };
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(raw);
  } catch {
    return { ok: false, message: "구글 서비스 계정 설정을 읽지 못했습니다." };
  }

  const productId = LOCK_PRODUCT_IDS[params.tier];

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
    const androidpublisher = google.androidpublisher({ version: "v3", auth });

    const res = await androidpublisher.purchases.products.get({
      packageName: PACKAGE_NAME,
      productId,
      token: params.purchaseToken,
    });

    // purchaseState: 0 = 구매완료, 1 = 취소, 2 = 보류
    if (res.data.purchaseState !== 0) {
      return { ok: false, message: "결제가 완료 상태가 아닙니다." };
    }
    return { ok: true, orderId: res.data.orderId ?? "" };
  } catch (error) {
    console.error("[locks] google verify failed", error);
    return { ok: false, message: "구글 결제 확인에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
