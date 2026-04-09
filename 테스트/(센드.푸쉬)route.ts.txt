import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// 🚀 로컬 환경에서 구글 서버 통신 시 발생하는 인증서 에러(fetch failed) 강제 무시 치트키
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  try {
    console.log("1. 알림 전송 API 시작됨");
    
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      throw new Error("VAPID 암호키가 설정되지 않았습니다.");
    }

    webpush.setVapidDetails(
      "mailto:admin@ymstudio.co.kr", 
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const body = await req.json();
    const payload = JSON.stringify({
      title: body.title || "명운(命運) - 당신의 운명을 밝히다",
      body: body.body || "오늘의 소름돋는 맞춤 운세가 도착했습니다. 지금 확인해보세요! ✨",
      url: body.url || "/",
    });

    console.log("2. Supabase에서 구독자 정보 가져오기 시작");
    const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('*');
    if (error) {
      console.error("Supabase 조회 에러:", error);
      throw error;
    }
    
    console.log(`3. 총 ${subscriptions?.length || 0}명의 구독자 발견`);
    
    if (!subscriptions || subscriptions.length === 0) {
       return NextResponse.json({ success: true, message: "아직 알림을 허용한 유저가 없습니다." });
    }

    console.log("4. 구글 FCM 서버로 알림 전송 시작 (webpush)");
    const sendPromises = subscriptions.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      
      return webpush.sendNotification(pushSubscription, payload).catch((err) => {
        console.error(`[발송 실패] ID: ${sub.id}, 사유:`, err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          return supabase.from('push_subscriptions').delete().match({ id: sub.id });
        }
      });
    });

    await Promise.all(sendPromises);
    console.log("5. 모든 알림 전송 완료!");
    
    return NextResponse.json({ success: true, message: `${subscriptions.length}명에게 알림 발송 완료!` });
  } catch (error: any) {
    console.error("🔥 최종 Push Send Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}