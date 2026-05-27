import { NextResponse } from "next/server";

const CONFIG = {
  free:     { count: 1, duration: "1h" },
  paid_1d:  { count: 1, duration: "24h" },
  paid_10d: { count: 1, duration: "10d" },
};

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") ?? "free") as keyof typeof CONFIG;
  const cfg = CONFIG[type];
  if (!cfg) return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  // 0~20분 랜덤 딜레이
  const delayMs = Math.floor(Math.random() * 20) * 60 * 1000;
  await new Promise((r) => setTimeout(r, delayMs));

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saju.ymstudio.co.kr";

  const response = await fetch(`${baseUrl}/api/altar-auto-wish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": process.env.CRON_SECRET!,
    },
    body: JSON.stringify({ count: cfg.count, duration: cfg.duration }),
  });

  const data = await response.json();
  console.log(`[altar-cron] type=${type}`, data);
  return NextResponse.json(data);
}