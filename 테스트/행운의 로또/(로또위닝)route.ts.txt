import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type LottoApiRaw = {
  returnValue?: string;
  drwNo?: number;
  drwNoDate?: string;
  bnusNo?: number;
  drwtNo1?: number;
  drwtNo2?: number;
  drwtNo3?: number;
  drwtNo4?: number;
  drwtNo5?: number;
  drwtNo6?: number;
};

function getExpectedLatestRound(): number {
  const firstDrawDate = new Date("2002-12-07T20:45:00+09:00");
  const now = new Date();
  const diffMs = now.getTime() - firstDrawDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  return weeks + 1;
}

async function fetchRound(round: number): Promise<LottoApiRaw | null> {
  const url = `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${round}`;

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    return null;
  }

  const text = await res.text();

  if (!text) {
    return null;
  }

  let data: LottoApiRaw;

  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  if (data.returnValue !== "success") {
    return null;
  }

  return data;
}

export async function GET() {
  try {
    const expectedRound = getExpectedLatestRound();
    let latest: LottoApiRaw | null = null;

    for (let round = expectedRound; round >= expectedRound - 5; round--) {
      latest = await fetchRound(round);
      if (latest) break;
    }

    if (
      !latest ||
      !latest.drwNo ||
      !latest.drwNoDate ||
      !latest.bnusNo ||
      !latest.drwtNo1 ||
      !latest.drwtNo2 ||
      !latest.drwtNo3 ||
      !latest.drwtNo4 ||
      !latest.drwtNo5 ||
      !latest.drwtNo6
    ) {
      return NextResponse.json(
        { error: "최신 당첨번호를 가져오지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      drawNumber: latest.drwNo,
      drawDate: latest.drwNoDate,
      numbers: [
        latest.drwtNo1,
        latest.drwtNo2,
        latest.drwtNo3,
        latest.drwtNo4,
        latest.drwtNo5,
        latest.drwtNo6,
      ],
      bonus: latest.bnusNo,
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