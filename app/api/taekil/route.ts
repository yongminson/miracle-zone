import { NextResponse } from "next/server";
import { calculateTaekil, readTaekilInput } from "@/lib/taekil/taekil-engine";

/**
 * 택일(무료) — 계산만 하고 AI 는 부르지 않는다. 비용 없음. 새로 추가한 경로다.
 * 좋은 날 후보·피할 날은 개수만 준다(날짜는 유료).
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const input = readTaekilInput(body);
    if (!input) {
      return NextResponse.json({ success: false, message: "목적과 생년월일을 확인해 주세요. (1920~2026년)" }, { status: 400 });
    }
    const { preview } = calculateTaekil(input);
    return NextResponse.json({ success: true, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "좋은 날을 계산하지 못했습니다.";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
