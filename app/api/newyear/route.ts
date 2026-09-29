import { NextResponse } from "next/server";
import {
  calculateNewYear,
  type NewYearCalendarType,
  type NewYearGender,
} from "@/lib/newyear/newyear-engine";

/**
 * 2027 신년운세(무료) — 계산만 하고 AI 는 부르지 않는다. 비용 없음.
 * 앱인토스 미니앱도 이 경로를 부른다(CORS 는 proxy.ts 가 처리).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    const calendarType: NewYearCalendarType =
      body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar";
    const gender: NewYearGender = body.gender === "female" ? "female" : "male";

    const year = Number(birthDate.slice(0, 4));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || year < 1920 || year > 2026) {
      return NextResponse.json(
        { success: false, message: "생년월일을 확인해 주세요. (1920~2026년)" },
        { status: 400 },
      );
    }

    const result = calculateNewYear({ birthDate, calendarType, gender });
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "신년운세를 계산하지 못했습니다.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
