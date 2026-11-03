// 로또 실제 당첨번호 (2026-11-03) — 고급 번호의 통계·당첨번호 조회가 쓴다.
// 동행복권 예전 조회 주소(common.do?method=getLottoNumber)는 사이트 개편 뒤 오류 화면으로 넘어가 쓸 수 없다.
// 대신 매주 동행복권 결과를 모아 올리는 공개 자료(github.com/smok95/lotto)를 쓴다. 1247·1234회를 뉴스 보도와 대조해 맞았다.
// 한 시간마다 새로 받는다. 못 받으면 null — 부르는 쪽은 "자료 없음"으로 정직하게 처리한다(가짜 통계로 채우지 않는다).

export type LottoDraw = { round: number; numbers: number[]; bonus: number; date: string };

const ALL_DRAWS_URL = "https://smok95.github.io/lotto/results/all.json";

type RawDraw = { draw_no?: number; numbers?: number[]; bonus_no?: number; date?: string };

function isValidDraw(d: RawDraw): boolean {
  return (
    typeof d.draw_no === "number" &&
    Array.isArray(d.numbers) &&
    d.numbers.length === 6 &&
    d.numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45) &&
    typeof d.bonus_no === "number" &&
    typeof d.date === "string"
  );
}

export async function getLottoDraws(): Promise<LottoDraw[] | null> {
  try {
    const res = await fetch(ALL_DRAWS_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const raw: unknown = await res.json();
    if (!Array.isArray(raw)) return null;
    const draws = (raw as RawDraw[])
      .filter(isValidDraw)
      .map((d) => ({
        round: d.draw_no as number,
        numbers: [...(d.numbers as number[])].sort((a, b) => a - b),
        bonus: d.bonus_no as number,
        date: (d.date as string).slice(0, 10),
      }))
      .sort((a, b) => a.round - b.round);
    return draws.length ? draws : null;
  } catch (error) {
    console.error("[lotto] 당첨번호 자료를 받지 못함", error);
    return null;
  }
}

/** 최근 count 회의 번호별 당첨 횟수(보너스 제외). counts[n] = n 번이 나온 횟수 */
export function recentFrequency(draws: LottoDraw[], count = 30) {
  const recent = draws.slice(-count);
  const counts = Array(46).fill(0) as number[];
  for (const d of recent) for (const n of d.numbers) counts[n] += 1;
  return { counts, fromRound: recent[0]?.round ?? 0, toRound: recent[recent.length - 1]?.round ?? 0, size: recent.length };
}
