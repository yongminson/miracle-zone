import {
  calculateMatch,
  describeElementRelation,
  describeMatchDays,
  type MatchCalc,
} from "@/lib/match/match-engine";
import type { NewYearCalendarType, NewYearGender } from "@/lib/newyear/newyear-types";

// 단톡방 궁합 순위·둘이 완성하는 카드 (2026-11-04) — 무료 궁합과 같은 계산(lib/match/match-engine.ts)으로 모든 짝을 맞춰 본다.
// AI 없음. 상·이름은 계산 점수(총점·연애·돈)와 일간·일지 관계에서 나온다. 화면엔 생일을 내보내지 않는다.

export type GroupMemberRow = {
  id: string;
  nickname: string;
  birthDate: string;
  calendarType: NewYearCalendarType;
  gender: NewYearGender;
};

export type GroupPair = {
  a: string;
  b: string;
  aName: string;
  bName: string;
  score: number;
  grade: MatchCalc["grade"];
  love: number;
  money: number;
  line: string;
};

export type GroupAward = { key: "best" | "love" | "money" | "spark"; emoji: string; title: string; pair: GroupPair; reason: string };

export type GroupRanking = {
  pairs: GroupPair[];
  awards: GroupAward[];
  /** 사람마다 제일 잘 맞는 사람 */
  bestFor: Record<string, { partnerId: string; partnerName: string; score: number }>;
};

export type PairCard = {
  aName: string;
  bName: string;
  score: number;
  grade: MatchCalc["grade"];
  categoryScores: MatchCalc["categoryScores"];
  relation: string;
  luckyDay: string;
  carefulDay: string;
  line: string;
};

const STEM_LINE: Record<MatchCalc["stemRelation"], string> = {
  합: "타고난 기운(일간)이 서로 끌어당기는 합",
  상생: "서로의 기운을 살려 주는 상생",
  "같은 기운": "같은 기운이라 말이 잘 통하는 사이",
  상극: "기운이 부딪혀 서로 자극을 주는 사이",
};

function pairLine(calc: MatchCalc): string {
  const parts = [STEM_LINE[calc.stemRelation]];
  if (calc.dayBranchRelation === "합") parts.push("가까이 있을수록 편안함");
  if (calc.dayBranchRelation === "충") parts.push("가까울수록 부딪힘 조심");
  if (calc.zodiacRelation === "합") parts.push("띠도 잘 맞음");
  if (calc.zodiacRelation === "충") parts.push("띠는 부딪힘");
  return parts.join(" · ");
}

function toPerson(m: GroupMemberRow) {
  return { name: m.nickname, birthDate: m.birthDate, calendarType: m.calendarType, gender: m.gender };
}

export function rankGroup(members: GroupMemberRow[]): GroupRanking {
  const pairs: GroupPair[] = [];
  for (let i = 0; i < members.length; i += 1) {
    for (let j = i + 1; j < members.length; j += 1) {
      const a = members[i];
      const b = members[j];
      try {
        const calc = calculateMatch(toPerson(a), toPerson(b));
        pairs.push({
          a: a.id,
          b: b.id,
          aName: a.nickname,
          bName: b.nickname,
          score: calc.score,
          grade: calc.grade,
          love: calc.categoryScores.love,
          money: calc.categoryScores.money,
          line: pairLine(calc),
        });
      } catch {
        // 날짜가 잘못된 참가자는 건너뛴다(넣을 때 이미 확인하지만 혹시 몰라)
      }
    }
  }
  // 같은 점수면 먼저 들어온 순서 — 볼 때마다 순위가 흔들리지 않게
  pairs.sort((x, y) => y.score - x.score);

  const awards: GroupAward[] = [];
  if (pairs.length > 0) {
    const best = pairs[0];
    awards.push({ key: "best", emoji: "💞", title: "찰떡 1위", pair: best, reason: `${best.score}점 · ${best.line}` });
    const love = [...pairs].sort((x, y) => y.love - x.love)[0];
    awards.push({ key: "love", emoji: "💘", title: "연애 궁합 1위", pair: love, reason: `연애 점수 ${love.love}점` });
    const money = [...pairs].sort((x, y) => y.money - x.money)[0];
    awards.push({ key: "money", emoji: "💰", title: "돈 궁합 1위", pair: money, reason: `돈 점수 ${money.money}점 — 같이 일하거나 돈 관리하기 좋은 짝` });
    if (pairs.length >= 3) {
      const spark = pairs[pairs.length - 1];
      awards.push({ key: "spark", emoji: "🔥", title: "티격태격 짝", pair: spark, reason: `${spark.score}점 · ${spark.line}` });
    }
  }

  const bestFor: GroupRanking["bestFor"] = {};
  for (const p of pairs) {
    for (const [me, other, otherName] of [
      [p.a, p.b, p.bName],
      [p.b, p.a, p.aName],
    ] as const) {
      if (!bestFor[me] || bestFor[me].score < p.score) bestFor[me] = { partnerId: other, partnerName: otherName, score: p.score };
    }
  }
  return { pairs, awards, bestFor };
}

/** 둘이 완성하는 카드 — 두 사람 궁합을 자세히 */
export function pairCard(a: GroupMemberRow, b: GroupMemberRow): PairCard {
  const calc = calculateMatch(toPerson(a), toPerson(b));
  const days = describeMatchDays(calc, a.nickname, b.nickname);
  return {
    aName: a.nickname,
    bName: b.nickname,
    score: calc.score,
    grade: calc.grade,
    categoryScores: calc.categoryScores,
    relation: describeElementRelation(calc, a.nickname, b.nickname),
    luckyDay: days.luckyDay,
    carefulDay: days.carefulDay,
    line: pairLine(calc),
  };
}

/** 참가자 생일이 계산 가능한지(넣기 전에 확인) */
export function isValidMember(m: Omit<GroupMemberRow, "id">): boolean {
  try {
    calculateMatch(toPerson({ ...m, id: "x" }), toPerson({ ...m, id: "y" }));
    return true;
  } catch {
    return false;
  }
}
