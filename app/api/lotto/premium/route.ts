import { NextRequest, NextResponse } from "next/server";
import { calculateSajuLottoPremium } from "@/lib/lotto/saju-lotto";
import { getLottoDraws, recentFrequency } from "@/lib/lotto/winning-data";

// 사주 × 실제 당첨 통계 고급 번호 (2026-11-03 새 경로) — 앱·토스는 광고 1회에 1세트, 볼 때마다 새 조합.
// 요청: { birthDate: "YYYY-MM-DD", calendarType?, birthTime?, gender? } (/api/lotto/saju 와 같다). AI 비용 없음.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return NextResponse.json({ error: "생년월일을 8자리로 입력해 주세요. (예: 19700221)" }, { status: 400 });
    }
    const calendarType = body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar";
    const draws = await getLottoDraws();
    const result = calculateSajuLottoPremium(
      {
        birthDate,
        calendarType,
        birthTime: typeof body.birthTime === "string" ? body.birthTime : "unknown",
        gender: body.gender === "female" ? "female" : "male",
      },
      draws ? recentFrequency(draws, 30) : null,
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("[lotto/premium] 고급 번호 실패", error);
    return NextResponse.json({ error: "생년월일과 양력·음력을 확인해 주세요." }, { status: 400 });
  }
}
