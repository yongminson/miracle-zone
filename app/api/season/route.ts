import { NextResponse } from "next/server";
import { calculateSeason, readSeasonInput, validateSeason } from "@/lib/season/season-engine";

/**
 * 시즌 운세(무료) — 계산만 하고 AI 는 부르지 않는다. 비용 없음. 새로 추가한 경로다.
 * 시험 날 흐름 한 줄과 D-day, 집중하기 좋은 날 '개수'만 준다(날짜는 유료).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const input = readSeasonInput(body);
    if (!input) {
      return NextResponse.json({ success: false, message: "생년월일과 시험 날짜를 확인해 주세요." }, { status: 400 });
    }
    validateSeason(input);
    const { preview } = calculateSeason(input);
    return NextResponse.json({ success: true, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "시즌 운세를 계산하지 못했습니다.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
