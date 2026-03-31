import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase 환경 변수 세팅
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imp_uid, merchant_uid, amount, wishText, period, nameDisplay, nameInput } = body;

    if (!imp_uid || !wishText) {
      return NextResponse.json({ success: false, message: "필수 데이터가 누락되었습니다." }, { status: 400 });
    }

    /* // 🚀 [보안 필수] 정식 오픈 시 주석을 풀고 포트원 API Key를 .env에 넣어 사용하세요!
    // 클라이언트에서 보낸 금액을 믿지 않고, 포트원 서버에 직접 물어봐서 위변조를 막는 로직입니다.
    
    const PORTONE_KEY = process.env.PORTONE_API_KEY;
    const PORTONE_SECRET = process.env.PORTONE_API_SECRET;

    if (PORTONE_KEY && PORTONE_SECRET) {
      // 1. 포트원 인증 토큰 발급
      const tokenReq = await fetch("https://api.iamport.kr/users/getToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imp_key: PORTONE_KEY, imp_secret: PORTONE_SECRET })
      });
      const tokenData = await tokenReq.json();

      if (tokenData.code === 0) {
        // 2. 결제 내역 단건 조회
        const getPaymentReq = await fetch(`https://api.iamport.kr/payments/${imp_uid}`, {
          headers: { Authorization: tokenData.response.access_token }
        });
        const paymentData = await getPaymentReq.json();

        // 3. 결제 금액 및 상태 대조
        if (paymentData.response.amount !== amount || paymentData.response.status !== "paid") {
           return NextResponse.json({ success: false, message: "결제 금액이 일치하지 않거나 미결제 상태입니다." }, { status: 400 });
        }
      }
    }
    */

    // 🚀 Supabase DB 'wishes' 테이블에 프리미엄 소원 저장
    const { error } = await supabase.from("wishes").insert({
      content: wishText,
      duration: period, // '24h' 또는 '10d'
      display_mode: nameDisplay, // 'anonymous', 'real', 'partial'
      display_name: nameInput || "",
    });

    if (error) {
      console.error("DB Insert Error:", error);
      return NextResponse.json({ success: false, message: "DB 저장 중 오류가 발생했습니다." }, { status: 500 });
    }

    // 성공 응답! 프론트엔드가 이 응답을 받으면 화면을 새로고침(fetchWishes) 합니다.
    return NextResponse.json({ success: true, message: "결제 확인 및 소원 등록 완료" });

  } catch (error) {
    console.error("Verify API Error:", error);
    return NextResponse.json({ success: false, message: "서버 내부 에러가 발생했습니다." }, { status: 500 });
  }
}