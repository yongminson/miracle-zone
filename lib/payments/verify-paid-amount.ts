/**
 * 결제 금액 검증 — 새로 추가되는 기능(소원 자물쇠)용.
 *
 * 기존 `app/api/payments/verify/route.ts` 안에도 같은 내용의 함수가 있지만,
 * 그 파일은 토스 미니앱·명운 앱이 실제로 호출하고 있는 결제 정본이라
 * 일부러 건드리지 않고 이쪽에 따로 두었다. 결제가 안정된 뒤에 하나로 합친다.
 *
 * 아임포트(V1, imp_ 로 시작하는 id)와 포트원(V2, paymentId) 양쪽을 모두 받는다.
 */

import {
  parsePortOnePaymentPayload,
  portoneFetchPaymentJson,
  portoneLoginWithApiSecret,
} from "@/lib/payments/portone-rest";

type IamportTokenJson = {
  code?: number;
  response?: { access_token?: string };
  message?: string | null;
};

type IamportPaymentJson = {
  code?: number;
  response?: {
    amount?: number;
    status?: string;
    merchant_uid?: string;
    imp_uid?: string;
  };
  message?: string | null;
};

export type VerifyResult = { ok: true } | { ok: false; message: string };

async function getIamportAccessToken(): Promise<{ token: string } | { error: string }> {
  const imp_key = process.env.IAMPORT_REST_API_KEY?.trim();
  const imp_secret = process.env.IAMPORT_REST_API_SECRET?.trim();
  if (!imp_key || !imp_secret) {
    return { error: "IAMPORT_REST_API_KEY 또는 IAMPORT_REST_API_SECRET 환경 변수가 설정되지 않았습니다." };
  }

  const res = await fetch("https://api.iamport.kr/users/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imp_key, imp_secret }),
  });

  const parsed = (await res.json()) as IamportTokenJson;
  const token = parsed.response?.access_token;
  if (!res.ok || parsed.code !== 0 || !token) {
    return { error: parsed.message || "포트원(IAMPORT) 결제 토큰 발급에 실패했습니다." };
  }
  return { token };
}

async function fetchIamportPaymentDetail(
  impUid: string,
): Promise<{ ok: true; amount: number; status: string; merchant_uid: string } | { ok: false; message: string }> {
  const tokenResult = await getIamportAccessToken();
  if ("error" in tokenResult) return { ok: false, message: tokenResult.error };

  const payRes = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(impUid)}`, {
    headers: { Authorization: tokenResult.token },
  });

  const payJson = (await payRes.json()) as IamportPaymentJson;
  if (!payRes.ok || payJson.code !== 0 || !payJson.response) {
    return { ok: false, message: payJson.message || "아임포트 결제 조회에 실패했습니다." };
  }

  const p = payJson.response;
  const paidAmount = typeof p.amount === "number" ? p.amount : Number(p.amount);
  const merchant_uid = typeof p.merchant_uid === "string" ? p.merchant_uid : "";
  const status = typeof p.status === "string" ? p.status : "";
  if (!Number.isFinite(paidAmount)) return { ok: false, message: "결제 금액을 확인할 수 없습니다." };
  return { ok: true, amount: paidAmount, status, merchant_uid };
}

function isIamportStyleId(id: string): boolean {
  return id.startsWith("imp_") || id.startsWith("imps_");
}

/** 실제로 그 금액이 결제 완료됐는지 확인한다. 클라이언트의 성공 신호만 믿지 않는다 */
export async function verifyPaidAmount(params: {
  lookupId: string;
  expectedAmountWon: number;
  merchantUidToMatch?: string | null;
}): Promise<VerifyResult> {
  const { lookupId, expectedAmountWon, merchantUidToMatch } = params;

  if (isIamportStyleId(lookupId)) {
    const detail = await fetchIamportPaymentDetail(lookupId);
    if (!detail.ok) return detail;
    if (detail.status !== "paid") {
      return { ok: false, message: "결제 검증에 실패했습니다. 결제가 완료되지 않았습니다." };
    }
    if (detail.amount !== expectedAmountWon) {
      return { ok: false, message: "결제 검증에 실패했습니다. 금액이 일치하지 않습니다." };
    }
    if (merchantUidToMatch && merchantUidToMatch.trim() !== "" && detail.merchant_uid !== merchantUidToMatch.trim()) {
      return { ok: false, message: "결제 검증에 실패했습니다. 주문번호가 일치하지 않습니다." };
    }
    return { ok: true };
  }

  const secret = process.env.PORTONE_API_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      message: "포트원 V2 결제 검증을 위해 PORTONE_API_SECRET 환경 변수가 필요합니다.",
    };
  }

  const login = await portoneLoginWithApiSecret(secret);
  if ("error" in login) return { ok: false, message: login.error };

  const raw = await portoneFetchPaymentJson(login.accessToken, lookupId);
  const parsed = parsePortOnePaymentPayload(raw);
  if (!parsed) {
    return { ok: false, message: "포트원 결제 조회에 실패했습니다. paymentId가 올바른지 확인해 주세요." };
  }
  if (parsed.status !== "PAID") {
    return { ok: false, message: "결제 검증에 실패했습니다. 결제가 완료되지 않았습니다." };
  }
  if (parsed.totalAmount !== expectedAmountWon) {
    return { ok: false, message: "결제 검증에 실패했습니다. 금액이 일치하지 않습니다." };
  }
  if (merchantUidToMatch && merchantUidToMatch.trim() !== "" && parsed.id !== merchantUidToMatch.trim()) {
    return { ok: false, message: "결제 검증에 실패했습니다. 주문번호(결제 ID)가 일치하지 않습니다." };
  }
  return { ok: true };
}
