import { NextRequest, NextResponse } from "next/server";
import { calculateSajuLotto } from "@/lib/lotto/saju-lotto";

// 내 사주 행운 번호 (2026-11-03 새 경로) — 기존 /api/lotto(무작위·통계 번호)는 토스·앱이 그대로 부르므로 건드리지 않는다.
// 요청: { birthDate: "YYYY-MM-DD", calendarType?: "solar"|"lunar"|"lunar-leap", birthTime?: "unknown"|"ja"…, gender? }
// 계산만 한다(AI 비용 없음). 같은 생일·같은 주면 같은 번호.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return NextResponse.json({ error: "생년월일을 8자리로 입력해 주세요. (예: 19700221)" }, { status: 400 });
    }
    const calendarType = body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar";
    const result = calculateSajuLotto({
      birthDate,
      calendarType,
      birthTime: typeof body.birthTime === "string" ? body.birthTime : "unknown",
      gender: body.gender === "female" ? "female" : "male",
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[lotto/saju] 사주 행운 번호 실패", error);
    return NextResponse.json({ error: "생년월일과 양력·음력을 확인해 주세요." }, { status: 400 });
  }
}
