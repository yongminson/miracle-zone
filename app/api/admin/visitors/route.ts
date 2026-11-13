import { NextResponse, type NextRequest } from "next/server";
import { hasValidAdminSession } from "@/lib/auth/admin-session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

/**
 * 운영자 통계 — 최근 7일(한국 날짜) 방문 기기·실사용 기기 (2026-11-14, 새 라우트).
 *
 * 예전 visitors 표는 날짜가 UTC 이고 /tools·/vip 에서만 세서 아침엔 "오늘 0명", 메인·신년운세 방문은 빠졌다.
 * 본사 리포트(ymstudio-reports)와 같은 기준으로 user_events 에서 센다:
 *  - 방문 기기: 그날 page_view 가 있는 session_id 수
 *  - 실사용 기기: page_view·app_cta_view 말고 다른 이벤트가 하나라도 있는 session_id 수
 *  - event_data.tester=true 가 한 번이라도 있는 기기는 통째로 뺀다
 * 운영자 로그인(저작권 문구 두 번 누르기) 쿠키가 있어야 한다.
 */

const PASSIVE = new Set(["page_view", "app_cta_view"]);
const DAYS = 7;

const kstDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date(iso));

export async function GET(req: NextRequest) {
  if (!hasValidAdminSession(req)) return NextResponse.json({ success: false, message: "운영자 로그인이 필요합니다." }, { status: 403 });
  const supabase = createSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ success: false, message: "서버 설정 문제" }, { status: 503 });

  // 한국 날짜로 오늘 포함 7일 전 0시부터
  const todayKst = kstDate(new Date().toISOString());
  const start = new Date(`${todayKst}T00:00:00+09:00`);
  start.setUTCDate(start.getUTCDate() - (DAYS - 1));

  const rows: { session_id: string; event_name: string; event_data: Record<string, unknown> | null; created_at: string }[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await supabase
      .from("user_events")
      .select("session_id,event_name,event_data,created_at")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) {
      console.error("[admin/visitors]", error);
      return NextResponse.json({ success: false, message: "통계를 불러오지 못했습니다." }, { status: 503 });
    }
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const testers = new Set(rows.filter((r) => r.event_data && (r.event_data as { tester?: unknown }).tester === true).map((r) => r.session_id));
  const visits = new Map<string, Set<string>>();
  const active = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.session_id || testers.has(r.session_id)) continue;
    const d = kstDate(r.created_at);
    if (r.event_name === "page_view") (visits.get(d) ?? visits.set(d, new Set()).get(d)!).add(r.session_id);
    else if (!PASSIVE.has(r.event_name)) (active.get(d) ?? active.set(d, new Set()).get(d)!).add(r.session_id);
  }

  const days = [];
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const dt = new Date(`${todayKst}T12:00:00+09:00`);
    dt.setUTCDate(dt.getUTCDate() - i);
    const d = kstDate(dt.toISOString());
    days.push({ date: d, visits: visits.get(d)?.size ?? 0, active: active.get(d)?.size ?? 0 });
  }
  return NextResponse.json({ success: true, today: days[days.length - 1], days });
}
