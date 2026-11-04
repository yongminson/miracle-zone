import { NextResponse } from "next/server";
import { buildSondayData } from "@/lib/calendar/son-day";

// 손없는날 달력 데이터 (2026-11-04 새 경로) — 토스 미니앱은 정적 빌드라 오늘 날짜로 다시 계산할 서버가 필요하다. 한 시간마다 갱신.
export const revalidate = 3600;

export async function GET() {
  return NextResponse.json(buildSondayData(14));
}
