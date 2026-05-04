import { NextResponse } from "next/server";
import type { CsDashboardTabId } from "@/lib/admin/cs-dashboard-types";
import { fetchCsDashboardPage } from "@/lib/admin/fetch-cs-dashboard-page";

/** 클라이언트 번들에 넣지 않고 서버에서만 검증. 운영 시 `YONGMINCUCU_PASSWORD`로 교체 가능 */
function expectedPassword(): string {
  return process.env.YONGMINCUCU_PASSWORD?.trim() || "s1223534";
}

function isTabId(v: unknown): v is CsDashboardTabId {
  return v === "vip" || v === "altar" || v === "saju";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      password?: string;
      tab?: unknown;
      page?: unknown;
      perPage?: unknown;
    };
    const input = typeof body.password === "string" ? body.password : "";
    if (input !== expectedPassword()) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const tab: CsDashboardTabId = isTabId(body.tab) ? body.tab : "vip";
    const pageRaw = typeof body.page === "number" ? body.page : Number(body.page);
    const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1;
    const perRaw = typeof body.perPage === "number" ? body.perPage : Number(body.perPage);
    const perPage = Number.isFinite(perRaw) && perRaw >= 1 && perRaw <= 100 ? Math.floor(perRaw) : 20;

    const payload = await fetchCsDashboardPage({ tab, page, perPage });
    return NextResponse.json({ ok: true, ...payload });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
