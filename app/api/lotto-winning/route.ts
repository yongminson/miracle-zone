import { NextResponse } from "next/server";
import { getLottoDraws } from "@/lib/lotto/winning-data";

export const dynamic = "force-dynamic";

// 최신 로또 당첨번호 — 응답 형식은 그대로(화면·토스가 부른다).
// 2026-11-03: 동행복권 예전 조회 주소가 사이트 개편으로 막혀 계속 500 이었다. 공개 당첨 자료(lib/lotto/winning-data.ts)로 바꿨다.
export async function GET() {
  try {
    const draws = await getLottoDraws();
    const latest = draws?.[draws.length - 1];
    if (!latest) {
      return NextResponse.json({ error: "최신 당첨번호를 가져오지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      drawNumber: latest.round,
      drawDate: latest.date,
      numbers: latest.numbers,
      bonus: latest.bonus,
      officialHomeUrl: "https://www.dhlottery.co.kr/",
      officialResultLabel: "동행복권 공식 홈페이지 바로가기",
      regionText: "당첨지역은 공식 사이트에서 확인",
    });
  } catch (error) {
    console.error("lotto-winning api error:", error);

    return NextResponse.json(
      { error: "서버 오류로 최신 당첨번호 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
