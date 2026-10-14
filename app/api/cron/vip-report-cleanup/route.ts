import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { VIP_REPORT_BUCKET, VIP_REPORT_KEEP_DAYS } from "@/lib/payments/vip-report-store";

/** 보관한 사주 인사이트 리포트를 30일 뒤 지운다(매일 1번, Vercel 크론) */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  const db = createSupabaseAdminClient();
  if (!db) return NextResponse.json({ success: false, error: "no admin client" }, { status: 503 });

  const cutoff = Date.now() - VIP_REPORT_KEEP_DAYS * 86_400_000;
  let removed = 0;
  for (let round = 0; round < 10; round++) {
    const { data, error } = await db.storage
      .from(VIP_REPORT_BUCKET)
      .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    const old = (data ?? []).filter((f) => f.created_at && new Date(f.created_at).getTime() < cutoff).map((f) => f.name);
    if (old.length === 0) break;
    const { error: rmError } = await db.storage.from(VIP_REPORT_BUCKET).remove(old);
    if (rmError) return NextResponse.json({ success: false, error: rmError.message }, { status: 500 });
    removed += old.length;
    if (old.length < 1000) break;
  }
  return NextResponse.json({ success: true, removed });
}
