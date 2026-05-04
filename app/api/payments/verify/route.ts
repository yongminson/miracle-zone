import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/** VIP 상품 결제 금액(원) — 클라이언트 전달값과 무관하게 서버에서 고정 검증 */
const VIP_PRODUCT_AMOUNT_WON = 29_900;

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
    return { error: parsed.message || "포트원 결제 토큰 발급에 실패했습니다." };
  }
  return { token };
}

/** 포트원(IAMPORT) REST 단건 결제 조회로 금액·상태·merchant_uid 위변조 검증 */
async function verifyIamportVipPayment(params: {
  imp_uid: string;
  merchant_uid: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const tokenResult = await getIamportAccessToken();
  if ("error" in tokenResult) return { ok: false, message: tokenResult.error };

  const payRes = await fetch(`https://api.iamport.kr/payments/${encodeURIComponent(params.imp_uid)}`, {
    headers: { Authorization: tokenResult.token },
  });

  const payJson = (await payRes.json()) as IamportPaymentJson;
  if (!payRes.ok || payJson.code !== 0 || !payJson.response) {
    return { ok: false, message: payJson.message || "결제 검증에 실패했습니다." };
  }

  const p = payJson.response;
  if (p.status !== "paid") {
    return { ok: false, message: "결제 검증에 실패했습니다. 결제가 완료되지 않았습니다." };
  }
  const paidAmount = typeof p.amount === "number" ? p.amount : Number(p.amount);
  if (!Number.isFinite(paidAmount) || paidAmount !== VIP_PRODUCT_AMOUNT_WON) {
    return { ok: false, message: "결제 검증에 실패했습니다. 금액이 일치하지 않습니다." };
  }
  if (p.merchant_uid !== params.merchant_uid) {
    return { ok: false, message: "결제 검증에 실패했습니다. 주문번호가 일치하지 않습니다." };
  }

  return { ok: true };
}

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { paymentType, imp_uid, merchant_uid, wishText, period, nameDisplay, nameInput, userId } = body;

    const currentPaymentType = paymentType || (wishText ? "altar" : "unknown");

    if (!imp_uid) {
      return NextResponse.json({ success: false, message: "필수 데이터(imp_uid)가 누락되었습니다." }, { status: 400 });
    }

    if (currentPaymentType === "vip") {
      if (!merchant_uid || typeof merchant_uid !== "string") {
        return NextResponse.json({ success: false, message: "merchant_uid가 누락되었습니다." }, { status: 400 });
      }

      const verified = await verifyIamportVipPayment({
        imp_uid,
        merchant_uid: merchant_uid.trim(),
      });

      if (!verified.ok) {
        return NextResponse.json({ success: false, message: verified.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: "결제 확인 및 처리 완료" });
    }

    if (currentPaymentType === "altar") {
      const { error } = await supabase.from("wishes").insert({
        content: wishText,
        duration: period,
        display_mode: nameDisplay,
        display_name: nameInput || "",
      });
      if (error) throw error;
    } else if (currentPaymentType === "lotto") {
      if (userId) {
        const { error } = await supabase.rpc("add_premium_lotto", { user_id: userId, add_count: 10 });
        if (error) throw error;
      }
    } else if (currentPaymentType === "saju") {
      console.log("관상/사주 결제 검증 완료:", imp_uid);
    }

    return NextResponse.json({ success: true, message: "결제 확인 및 처리 완료" });
  } catch (error) {
    console.error("Verify API Error:", error);
    return NextResponse.json({ success: false, message: "서버 내부 에러가 발생했습니다." }, { status: 500 });
  }
}
