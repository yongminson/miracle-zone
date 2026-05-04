import { NextResponse } from "next/server";
import { fetchCsDashboardBootstrap } from "@/lib/admin/fetch-cs-dashboard-bootstrap";

/** 클라이언트 번들에 넣지 않고 서버에서만 검증. 운영 시 `YONGMINCUCU_PASSWORD`로 교체 가능 */
function expectedPassword(): string {
  return process.env.YONGMINCUCU_PASSWORD?.trim() || "s1223534";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { password?: string };
    const input = typeof body.password === "string" ? body.password : "";
    if (input !== expectedPassword()) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const payload = await fetchCsDashboardBootstrap();
    return NextResponse.json({ ok: true, ...payload });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
