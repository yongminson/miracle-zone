import { NextRequest, NextResponse } from "next/server";
import { calculateManse } from "@/lib/saju/manse";

// 무료 만세력 (2026-11-04 새 경로). 요청: { birthDate: "YYYY-MM-DD", calendarType?, birthTime?: "HH:MM", gender? }. AI 없음.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return NextResponse.json({ error: "생년월일을 8자리로 넣어 주세요. (예: 19950503)" }, { status: 400 });
  }
  const birthTime = typeof body.birthTime === "string" && /^\d{2}:\d{2}$/.test(body.birthTime.trim()) ? body.birthTime.trim() : null;
  try {
    return NextResponse.json(
      calculateManse({
        birthDate,
        calendarType: body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar",
        birthTime,
        gender: body.gender === "female" ? "female" : "male",
      }),
    );
  } catch (error) {
    console.error("[manse] 계산 실패", error);
    return NextResponse.json({ error: "생년월일과 양력·음력을 확인해 주세요." }, { status: 400 });
  }
}
