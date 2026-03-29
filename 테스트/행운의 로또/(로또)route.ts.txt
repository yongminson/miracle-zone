import { NextRequest, NextResponse } from "next/server";

/** 홀짝 비율이 허용 구간(3:3, 4:2, 2:4)인지 검증 */
function isValidOddEvenRatio(nums: number[]): boolean {
  const odd = nums.filter((n) => n % 2 === 1).length;
  const even = 6 - odd;
  return (
    (odd === 3 && even === 3) || (odd === 4 && even === 2) || (odd === 2 && even === 4)
  );
}

/** 총합이 100~170 구간인지 검증 */
function isValidSum(nums: number[]): boolean {
  const sum = nums.reduce((a, b) => a + b, 0);
  return sum >= 100 && sum <= 170;
}

/** 가상의 최근 N회차 당첨 번호 시뮬레이션 (가중치 계산용) */
function simulateRecentDraws(count: number): number[][] {
  const draws: number[][] = [];
  for (let i = 0; i < count; i++) {
    const set: number[] = [];
    while (set.length < 6) {
      const n = Math.floor(Math.random() * 45) + 1;
      if (!set.includes(n)) set.push(n);
    }
    draws.push(set.sort((a, b) => a - b));
  }
  return draws;
}

/** 번호별 출현 빈도 계산 → 미출현(콜드) / 핫 번호 가중치 */
function getNumberWeights(): number[] {
  const draws = simulateRecentDraws(30);
  const freq: number[] = Array(46).fill(0);
  for (const draw of draws) {
    for (const n of draw) freq[n]++;
  }
  const weights: number[] = [];
  for (let i = 1; i <= 45; i++) {
    const f = freq[i];
    if (f <= 2) weights[i] = 1.4;
    else if (f >= 8) weights[i] = 1.25;
    else weights[i] = 1.0;
  }
  return weights;
}

/** 가중치 기반 6개 번호 추출 (중복 없음) */
function pickWeightedNumbers(): number[] {
  const weights = getNumberWeights();
  const pool: number[] = [];
  for (let i = 1; i <= 45; i++) {
    const w = weights[i] ?? 1;
    const count = Math.ceil(w * 10);
    for (let j = 0; j < count; j++) pool.push(i);
  }
  const chosen: number[] = [];
  while (chosen.length < 6) {
    const idx = Math.floor(Math.random() * pool.length);
    const n = pool[idx];
    if (!chosen.includes(n)) chosen.push(n);
  }
  return chosen.sort((a, b) => a - b);
}

/** 총합을 100~170 구간으로 조정 (한 개 숫자 교체) */
function adjustSumToRange(nums: number[]): number[] {
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum >= 100 && sum <= 170) return nums;
  const sorted = [...nums].sort((a, b) => a - b);
  const diff = sum < 100 ? 100 - sum : sum - 170;
  const idx = sum < 100 ? 0 : 5;
  const current = sorted[idx];
  let replacement: number;
  if (sum < 100) {
    replacement = Math.min(45, current + Math.ceil(diff / 2));
  } else {
    replacement = Math.max(1, current - Math.ceil(diff / 2));
  }
  replacement = Math.max(1, Math.min(45, replacement));
  if (nums.includes(replacement)) return nums;
  const out = [...nums];
  out[out.indexOf(current)] = replacement;
  return out.sort((a, b) => a - b);
}

/** 홀짝 비율 조정 (한 개 숫자 교체하여 3:3, 4:2, 2:4 달성) */
function adjustOddEvenRatio(nums: number[]): number[] {
  if (isValidOddEvenRatio(nums)) return nums;
  const odd = nums.filter((n) => n % 2 === 1).length;
  const needOdd = odd < 2;
  const needEven = odd > 4;
  for (let i = 0; i < nums.length; i++) {
    const current = nums[i];
    const currentOdd = current % 2 === 1;
    let candidate: number;
    if (needOdd && !currentOdd) {
      candidate = current <= 1 ? 3 : current - 1;
    } else if (needEven && currentOdd) {
      candidate = current >= 45 ? 44 : current + 1;
    } else continue;
    candidate = Math.max(1, Math.min(45, candidate));
    if (!nums.includes(candidate)) {
      const out = [...nums];
      out[i] = candidate;
      if (isValidOddEvenRatio(out)) return out.sort((a, b) => a - b);
    }
  }
  return nums;
}

/** 통계적 필터링을 거친 로또 번호 생성 (필수 3단계: 홀짝, 총합, 가중치) */
function generateStatisticallyFilteredNumbers(): number[] {
  const MAX_ATTEMPTS = 1000;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let numbers = pickWeightedNumbers();
    if (isValidOddEvenRatio(numbers) && isValidSum(numbers)) return numbers;
    numbers = adjustOddEvenRatio(numbers);
    numbers = adjustSumToRange(numbers);
    if (isValidOddEvenRatio(numbers) && isValidSum(numbers)) return numbers;
  }
  let fallback = pickWeightedNumbers();
  fallback = adjustOddEvenRatio(fallback);
  fallback = adjustSumToRange(fallback);
  return fallback;
}

export async function POST(_request: NextRequest) {
  try {
    const numbers = generateStatisticallyFilteredNumbers();
    return NextResponse.json({ numbers });
  } catch (error) {
    console.error("Lotto API Error:", error);
    return NextResponse.json(
      { error: "로또 번호 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
