// 📁 app/api/altar-cron/route.ts
// Vercel Cron이 이 엔드포인트를 주기적으로 호출합니다.
// vercel.json 스케줄에 따라 3가지 크론이 각각 다른 파라미터로 호출됩니다.

import { NextResponse } from "next/server";

// ─── 크론 타입별 설정 ─────────────────────────────────────────────────
// type 파라미터 → "free" | "paid_1d" | "paid_10d"
const CONFIG = {
    free: {
        // 하루 30번 → 48분마다 1개
        // vercel.json: "*/48 * * * *"
        count: 1,
        duration: "1h",
      },
  paid_1d: {
    // 하루 3번 → 08:00 / 13:00 / 20:00 KST
    // vercel.json: "0 23,4,11 * * *" (UTC 기준: KST-9)
    count: 1,
    duration: "24h",
  },
  paid_10d: {
    // 일주일에 1번 → 매주 월요일 09:00 KST
    // vercel.json: "0 0 * * 1"
    count: 1,
    duration: "10d",
  },
};

export async function GET(req: Request) {
  // Vercel Cron 보안 헤더 검증
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") ?? "free") as keyof typeof CONFIG;

  const cfg = CONFIG[type];
  if (!cfg) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  // ─── 랜덤 지연: 0~30분 사이 랜덤하게 딜레이 (더 자연스럽게) ──────
  const delayMinutes = Math.floor(Math.random() * 30);
  await new Promise((r) => setTimeout(r, delayMinutes * 60 * 1000));

  // ─── 내부 API 호출 ───────────────────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saju.ymstudio.co.kr";

  const response = await fetch(`${baseUrl}/api/altar-auto-wish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": process.env.CRON_SECRET!,
    },
    body: JSON.stringify({
      count: cfg.count,
      duration: cfg.duration,
    }),
  });

  const data = await response.json();
  console.log(`[altar-cron] type=${type}`, data);

  return NextResponse.json(data);
}