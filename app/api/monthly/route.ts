import { NextResponse } from "next/server";
import { calculateMonthly, isSellableMonthKey, monthlySaleKey } from "@/lib/monthly/monthly-engine";
import type { MonthlyInput } from "@/lib/monthly/monthly-types";

/**
 * 이달의 운세(무료) — 계산만 하고 AI 는 부르지 않는다. 비용 없음. 새로 추가한 경로다.
 * 좋은 날·조심할 날은 개수만 준다(날짜는 유료).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    const year = Number(birthDate.slice(0, 4));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || year < 1920 || year > 2026) {
      return NextResponse.json(
        { success: false, message: "생년월일을 확인해 주세요. (1920~2026년)" },
        { status: 400 },
      );
    }
    const input: MonthlyInput = {
      name: "",
      birthDate,
      calendarType:
        body.calendarType === "lunar" || body.calendarType === "lunar-leap" ? body.calendarType : "solar",
      gender: body.gender === "female" ? "female" : "male",
    };
    // 결제 직전에 날짜가 넘어가도 같은 달로 이어 가도록, 보내온 달이 살 수 있는 달이면 그대로 쓴다
    const requested = typeof body.monthKey === "string" ? body.monthKey : "";
    const monthKey = isSellableMonthKey(requested) ? requested : monthlySaleKey();

    const result = calculateMonthly(input, monthKey);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "이달의 운세를 계산하지 못했습니다.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
