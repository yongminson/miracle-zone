import { NextResponse } from "next/server";
import {
  parsePortOnePaymentPayload,
  portoneFetchPaymentJson,
  portoneLoginWithApiSecret,
} from "@/lib/payments/portone-rest";
import {
  resolveVipReportPublicUrlFromRequest,
  upsertVipOrderRow,
  VIP_ORDER_AMOUNT_WON,
} from "@/lib/payments/vip-order-supabase";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

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
): Promise<
  { ok: true; amount: number; status: string; merchant_uid: string } | { ok: false; message: string }
> {
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

async function verifyPaidAmountUniversal(params: {
  lookupId: string;
  expectedAmountWon: number;
  /** VIP·일부 플로우: 아임포트 merchant_uid 또는 포트원 V2 paymentId(=클라이언트 paymentId) 대조 */
  merchantUidToMatch?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
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
      message:
        "포트원 V2 결제 식별자(paymentId) 검증을 위해 PORTONE_API_SECRET(포트원 콘솔 → 연동 정보 → API Secret)을 설정해 주세요.",
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

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createSupabaseAdminClient();

    const body = await req.json();
    const {
      paymentType,
      imp_uid,
      paymentId,
      merchant_uid,
      wishText,
      period,
      nameDisplay,
      nameInput,
      userId,
      amount: rawAmount,
    } = body;

    const lookupId = String(imp_uid ?? paymentId ?? "")
      .trim()
      .replace(/\s+/g, "");
    if (!lookupId) {
      return NextResponse.json(
        { success: false, message: "필수 데이터(imp_uid 또는 paymentId)가 누락되었습니다." },
        { status: 400 },
      );
    }

    const currentPaymentType = paymentType || (wishText ? "altar" : "unknown");

    if (currentPaymentType === "vip") {
      if (!merchant_uid || typeof merchant_uid !== "string") {
        return NextResponse.json({ success: false, message: "merchant_uid가 누락되었습니다." }, { status: 400 });
      }

      const verified = await verifyPaidAmountUniversal({
        lookupId,
        expectedAmountWon: VIP_ORDER_AMOUNT_WON,
        merchantUidToMatch: merchant_uid,
      });

      if (!verified.ok) {
        return NextResponse.json({ success: false, message: verified.message }, { status: 400 });
      }

      const vipCustomerNameRaw = body.vip_customer_name;
      const vipCustomerName =
        typeof vipCustomerNameRaw === "string" && vipCustomerNameRaw.trim() !== ""
          ? vipCustomerNameRaw.trim().slice(0, 80)
          : "VIP 실결제(리포트 대기)";
      const vipPhoneRaw = body.vip_phone;
      const vipPhone =
        typeof vipPhoneRaw === "string" && vipPhoneRaw.trim() !== "" ? vipPhoneRaw.trim().slice(0, 32) : null;

      const reportUrl = resolveVipReportPublicUrlFromRequest(req);

      if (!supabaseAdmin) {
        console.error(
          "[vip_orders] 결제 검증은 성공했으나 Supabase Admin 클라이언트를 만들 수 없습니다. " +
            "SUPABASE_SERVICE_ROLE_KEY·NEXT_PUBLIC_SUPABASE_URL을 Vercel에 설정했는지 확인하세요.",
        );
        return NextResponse.json({
          success: true,
          message: "결제 확인 완료(vip_orders DB 기록 생략: Service Role 미설정)",
          vipOrderDbSkipped: true,
        });
      }

      const dbResult = await upsertVipOrderRow(supabaseAdmin, {
        user_name: vipCustomerName,
        phone_number: vipPhone,
        imp_uid: lookupId,
        amount: VIP_ORDER_AMOUNT_WON,
        report_url: reportUrl,
        status: "paid",
      });
      if (!dbResult.ok) {
        console.error("[vip_orders] DB 저장 실패(포트원 결제는 유효함):", {
          message: dbResult.message,
          code: dbResult.code,
          imp_uid: lookupId,
        });
        return NextResponse.json({
          success: true,
          message: "결제 확인 완료(vip_orders 기록 실패 — Vercel 로그 참고)",
          vipOrderDbError: dbResult.message,
        });
      }

      return NextResponse.json({ success: true, message: "결제 확인 및 처리 완료" });
    }

    if (currentPaymentType === "altar") {
      const expected = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
      if (!Number.isFinite(expected) || expected <= 0) {
        return NextResponse.json({ success: false, message: "결제 금액(amount)이 올바르지 않습니다." }, { status: 400 });
      }
      const v = await verifyPaidAmountUniversal({ lookupId, expectedAmountWon: expected });
      if (!v.ok) return NextResponse.json({ success: false, message: v.message }, { status: 400 });

      if (!supabaseAdmin) {
        console.error("[wishes] altar insert 불가: Supabase Admin(SUPABASE_SERVICE_ROLE_KEY) 없음");
        return NextResponse.json(
          { success: false, message: "서버 DB 설정 오류(SUPABASE_SERVICE_ROLE_KEY 필요)" },
          { status: 503 },
        );
      }
      const { error } = await supabaseAdmin.from("wishes").insert({
        content: wishText,
        duration: period,
        display_mode: nameDisplay,
        display_name: nameInput || "",
      });
      if (error) {
        console.error("[wishes] insert 실패:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        throw error;
      }
    } else if (currentPaymentType === "lotto") {
      const expected = 4500;
      const v = await verifyPaidAmountUniversal({ lookupId, expectedAmountWon: expected });
      if (!v.ok) return NextResponse.json({ success: false, message: v.message }, { status: 400 });

      if (userId) {
        if (!supabaseAdmin) {
          console.error("[lotto] add_premium_lotto 불가: Supabase Admin(SUPABASE_SERVICE_ROLE_KEY) 없음");
          return NextResponse.json(
            { success: false, message: "서버 DB 설정 오류(SUPABASE_SERVICE_ROLE_KEY 필요)" },
            { status: 503 },
          );
        }
        const { error } = await supabaseAdmin.rpc("add_premium_lotto", { user_id: userId, add_count: 10 });
        if (error) {
          console.error("[lotto] add_premium_lotto 실패:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          throw error;
        }
      }
    } else if (currentPaymentType === "saju") {
      const expectedFromBody = typeof rawAmount === "number" ? rawAmount : Number(rawAmount);
      const expected = Number.isFinite(expectedFromBody) && expectedFromBody > 0 ? expectedFromBody : 4900;
      const v = await verifyPaidAmountUniversal({ lookupId, expectedAmountWon: expected });
      if (!v.ok) return NextResponse.json({ success: false, message: v.message }, { status: 400 });
      console.log("관상/사주 결제 검증 완료:", lookupId);
    } else {
      return NextResponse.json({ success: false, message: "지원하지 않는 결제 유형입니다." }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "결제 확인 및 처리 완료" });
  } catch (error) {
    console.error("Verify API Error:", error);
    return NextResponse.json({ success: false, message: "서버 내부 에러가 발생했습니다." }, { status: 500 });
  }
}
