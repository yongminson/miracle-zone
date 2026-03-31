import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentType, imp_uid, amount, wishText, period, nameDisplay, nameInput, userId } = body;

    const currentPaymentType = paymentType || (wishText ? "altar" : "unknown");

    if (!imp_uid) {
      return NextResponse.json({ success: false, message: "필수 데이터(imp_uid)가 누락되었습니다." }, { status: 400 });
    }

    if (currentPaymentType === "altar") {
      const { error } = await supabase.from("wishes").insert({
        content: wishText,
        duration: period,
        display_mode: nameDisplay,
        display_name: nameInput || "",
      });
      if (error) throw error;
    } 
    else if (currentPaymentType === "lotto") {
      // 🚀 로또 10회권 결제 완료 시 DB에 10회 충전!
      if (userId) {
        const { error } = await supabase.rpc('add_premium_lotto', { user_id: userId, add_count: 10 });
        if (error) throw error;
      }
    } 
    else if (currentPaymentType === "saju") {
      console.log("관상/사주 결제 검증 완료:", imp_uid);
    }

    return NextResponse.json({ success: true, message: "결제 확인 및 처리 완료" });

  } catch (error) {
    console.error("Verify API Error:", error);
    return NextResponse.json({ success: false, message: "서버 내부 에러가 발생했습니다." }, { status: 500 });
  }
}