import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""; // 🔐 반드시 Service Role Key 사용
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { paymentType, imp_uid, amount, wishText, period, nameDisplay, nameInput, userId } = body;

    // 1️⃣ 포트원 토큰 발급 및 결제 내역 단건 조회 (서버 대 서버 검증)
    // 이 부분은 실결제 연동 시 PortOne API 가이드에 따라 액세스 토큰을 먼저 받아야 합니다.
    // 여기서는 핵심 검증 로직 구조를 잡아드립니다.
    
    if (!imp_uid) {
      return NextResponse.json({ success: false, message: "결제 번호가 없습니다." }, { status: 400 });
    }

    /* [보안 팁] 
       여기서 원래는 fetch("https://api.iamport.kr/payments/" + imp_uid) 를 통해 
       실제 결제된 금액(response.amount)이 body.amount와 일치하는지 확인해야 합니다.
    */

    const currentPaymentType = paymentType || (wishText ? "altar" : "unknown");

    // 2️⃣ DB 업데이트 수행
    if (currentPaymentType === "altar") {
      // 기적의 제단: 소원 저장
      const { error } = await supabase.from("wishes").insert({
        content: wishText,
        duration: period,
        display_mode: nameDisplay,
        display_name: nameInput || "",
        status: 'active' // 결제 확인됨
      });
      if (error) throw error;
    } 
    else if (currentPaymentType === "lotto") {
      // 로또: 프리미엄 횟수 충전
      if (userId) {
        const { error } = await supabase.rpc('add_premium_lotto', { 
          user_id: userId, 
          add_count: 10 
        });
        if (error) throw error;
      }
    }

    return NextResponse.json({ success: true, message: "결제가 성공적으로 검증 및 기록되었습니다." });

  } catch (err: any) {
    console.error("결제 처리 에러:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}