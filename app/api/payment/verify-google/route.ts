import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const PACKAGE_NAME = "kr.co.ymstudio.myeongun";

// 서버에서 고정하는 상품 정보 (클라이언트 값 신뢰 안 함)
const PRODUCTS: Record<string, { amount: number; label: string }> = {
  vip_report: { amount: 29900, label: "VIP 리포트" },
  altar_10days: { amount: 6900, label: "기적의제단 10일" },
};

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function verifyWithGoogle(productId: string, purchaseToken: string) {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    return { ok: false as const, message: "GOOGLE_SERVICE_ACCOUNT_JSON 환경변수가 없습니다." };
  }

  let credentials;
  try {
    credentials = JSON.parse(raw);
  } catch {
    return { ok: false as const, message: "서비스 계정 JSON 파싱 실패" };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });

  const androidpublisher = google.androidpublisher({ version: "v3", auth });

  try {
    const res = await androidpublisher.purchases.products.get({
      packageName: PACKAGE_NAME,
      productId,
      token: purchaseToken,
    });

    const p = res.data;
    // purchaseState: 0 = 구매완료, 1 = 취소, 2 = 보류
    if (p.purchaseState !== 0) {
      return { ok: false as const, message: "결제가 완료 상태가 아닙니다." };
    }
    return { ok: true as const, orderId: p.orderId ?? "", purchaseTimeMillis: p.purchaseTimeMillis ?? "" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Google 검증 실패";
    return { ok: false as const, message: msg };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId = String(body.productId ?? "").trim();
    const purchaseToken = String(body.purchaseToken ?? "").trim();
    const userId = typeof body.userId === "string" ? body.userId : null;
    const customerName =
      typeof body.customerName === "string" && body.customerName.trim() !== ""
        ? body.customerName.trim().slice(0, 80)
        : "앱 인앱결제";
    const phone =
      typeof body.phone === "string" && body.phone.trim() !== "" ? body.phone.trim().slice(0, 32) : null;

    if (!productId || !purchaseToken) {
      return NextResponse.json(
        { success: false, message: "productId 또는 purchaseToken이 누락되었습니다." },
        { status: 400 }
      );
    }

    const product = PRODUCTS[productId];
    if (!product) {
      return NextResponse.json({ success: false, message: "지원하지 않는 상품입니다." }, { status: 400 });
    }

    // 1. Google Play 영수증 검증
    const verified = await verifyWithGoogle(productId, purchaseToken);
    if (!verified.ok) {
      return NextResponse.json({ success: false, message: verified.message }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error("[verify-google] Supabase Admin 클라이언트 생성 실패");
      return NextResponse.json({
        success: true,
        message: "결제 검증 완료 (DB 기록 생략: Service Role 미설정)",
      });
    }

    // 2. 중복 처리 방지 (같은 purchaseToken 재사용 차단)
    const { data: existing } = await supabaseAdmin
      .from("vip_orders")
      .select("id")
      .eq("imp_uid", `google_${verified.orderId}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: "이미 처리된 결제입니다.", duplicated: true });
    }

    // 3. DB 기록 (vip_orders 재사용, imp_uid에 google_ 접두사)
    const { error } = await supabaseAdmin.from("vip_orders").insert({
      user_name: `[앱] ${customerName} - ${product.label}`,
      phone_number: phone,
      imp_uid: `google_${verified.orderId}`,
      amount: product.amount,
      report_url: null,
      status: "paid",
    });

    if (error) {
      console.error("[verify-google] DB 저장 실패 (결제는 유효):", error.message);
      return NextResponse.json({
        success: true,
        message: "결제 검증 완료 (DB 기록 실패 — Vercel 로그 참고)",
      });
    }

    return NextResponse.json({ success: true, message: "결제 검증 및 기록 완료" });
  } catch (error) {
    console.error("[verify-google] 서버 에러:", error);
    return NextResponse.json({ success: false, message: "서버 내부 에러" }, { status: 500 });
  }
}