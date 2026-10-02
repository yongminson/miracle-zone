import { NextResponse } from "next/server";
import { calculateDayLuck } from "@/lib/calendar/day-luck";

/**
 * 운세 캘린더(무료) — 계산만 하고 AI 는 부르지 않는다. 비용 없음.
 * 앱인토스 미니앱도 이 경로를 부른다(CORS 는 proxy.ts 가 처리).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    const year = Number(birthDate.slice(0, 4));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || year < 1920 || year > 2026) {
      return NextResponse.json({ success: false, message: "생년월일을 확인해 주세요." }, { status: 400 });
    }
    const calendarType =
      body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar";
    const days = typeof body.days === "number" ? body.days : 7;
    const start = typeof body.start === "string" ? body.start : undefined;

    const range = calculateDayLuck({ birthDate, calendarType, start, days });
    return NextResponse.json({ success: true, ...range });
  } catch (error) {
    const message = error instanceof Error ? error.message : "흐름을 계산하지 못했습니다.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
