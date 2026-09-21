/**
 * 소원 자물쇠 벽 — 자료 구조와 배치 규칙.
 *
 * 기적의 제단(흘러가는 소원)과 달리 자물쇠는 영구히 남는 것이 핵심이다.
 * 그래서 유효기간 개념이 없고, 결제 등급 차이는 색과 반짝임뿐이다.
 *
 * 자리는 걸린 순서대로 왼쪽부터 채운다. 순서는 나중에 바뀌지 않으므로
 * 한 번 걸린 자물쇠는 언제 다시 와도 같은 자리에 있고, 벽은 빈 곳 없이 찬다.
 */

export type LockTier = "basic" | "color" | "shine";

export type WallLock = {
  id: string;
  tier: LockTier;
  /** 등급이 basic이면 무시하고 은색으로 그린다 */
  color: string;
  /** 자물쇠에 새겨지는 이름. 익명이면 빈 문자열 */
  name: string;
  wish: string;
  createdAt: string;
  /** 지금 보고 있는 사람이 건 자물쇠인지 */
  mine?: boolean;
};

export const LOCK_TIERS: Record<
  LockTier,
  { label: string; priceWon: number; desc: string; canPickColor: boolean; shine: boolean }
> = {
  basic: { label: "기본 자물쇠", priceWon: 1000, desc: "은색 자물쇠를 영구히 겁니다", canPickColor: false, shine: false },
  color: { label: "색깔 자물쇠", priceWon: 2000, desc: "원하는 색을 골라 겁니다", canPickColor: true, shine: false },
  shine: { label: "반짝이는 자물쇠", priceWon: 3000, desc: "색을 고르고 반짝임이 더해집니다", canPickColor: true, shine: true },
};

export const LOCK_COLORS = [
  { value: "#f4b942", label: "금색" },
  { value: "#e2574c", label: "붉은색" },
  { value: "#e2749a", label: "분홍색" },
  { value: "#7aa5e8", label: "하늘색" },
  { value: "#5ec4a8", label: "청록색" },
  { value: "#9b7ae0", label: "보라색" },
  { value: "#8fbf5a", label: "연두색" },
  { value: "#d9d9de", label: "은색" },
];

export const SILVER = "#c3c7cf";

/** 난간 한 줄에 걸리는 자물쇠 수와 간격 */
export const WALL = {
  cols: 12,
  slotGapX: 96,
  railGapY: 230,
  railTopY: 170,
  marginX: 80,
  marginBottom: 90,
};

/** 걸린 자물쇠 수에 맞춰 벽 크기를 정한다. 적게 걸렸을 때 휑해 보이지 않게 한다 */
export function wallSize(count: number): { width: number; height: number; rows: number } {
  const rows = Math.max(1, Math.ceil(Math.max(count, 1) / WALL.cols));
  return {
    // 걸린 수보다 벽을 넓게 만들지 않는다. 한 개만 걸렸을 때 허허벌판이 되지 않게.
    width: WALL.marginX * 2 + Math.min(Math.max(count, 1), WALL.cols) * WALL.slotGapX,
    height: WALL.railTopY + rows * WALL.railGapY + WALL.marginBottom,
    rows,
  };
}

/** 문자열을 32비트 정수로 — 같은 자물쇠는 늘 같은 기울기·흔들림을 갖는다 */
export function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type LockPlacement = { x: number; y: number; rail: number; tilt: number };

/** 걸린 순서대로 왼쪽부터 채운다. 격자처럼 보이지 않게 조금씩 흔들어 놓는다 */
export function layoutLocks(locks: WallLock[]): (WallLock & LockPlacement)[] {
  const ordered = [...locks].sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));

  return ordered.map((lock, index) => {
    const h = hashId(lock.id);
    const rail = Math.floor(index / WALL.cols);
    const slot = index % WALL.cols;

    return {
      ...lock,
      rail,
      x: WALL.marginX + slot * WALL.slotGapX + (h % 15) - 7,
      y: WALL.railTopY + rail * WALL.railGapY + ((h >> 5) % 11),
      tilt: (((h >> 13) % 17) - 8) / 2,
    };
  });
}

export function railYs(count: number): number[] {
  const { rows } = wallSize(count);
  return Array.from({ length: rows }, (_, i) => WALL.railTopY + i * WALL.railGapY);
}

const DEMO_WISHES = [
  "우리 가족 모두 올해 아프지 말고 건강하기를",
  "내년에는 꼭 합격해서 부모님께 웃으며 말씀드리고 싶다",
  "지금 하는 일이 잘 풀려서 한숨 돌릴 수 있기를",
  "다시 예전처럼 편하게 웃을 수 있는 날이 오기를",
  "엄마 수술 무사히 끝나게 해주세요",
  "우리 둘이 오래오래 함께하기를",
  "빚 다 갚고 마음 편히 자는 날이 왔으면",
  "아이가 건강하게만 자라준다면 더 바랄 게 없습니다",
  "올해는 꼭 좋은 사람을 만나고 싶어요",
  "가게가 자리를 잡아서 한 해만 더 버틸 수 있기를",
  "아버지 기억이 조금이라도 더 남아 있기를",
  "이번엔 정말 마지막이라는 마음으로 빕니다",
  "누구에게도 못 한 말인데 여기에 남깁니다",
  "그동안 고생한 나에게, 이제는 좋은 일만",
  "시험관 세 번째, 이번엔 꼭 만나고 싶어",
  "이사 갈 집에서는 편안했으면 좋겠다",
];

const DEMO_NAMES = ["", "", "민수", "지영", "혜원", "", "준호", "소라", "", "우리가족", "은영", ""];

/**
 * 화면 확인용 예시 자물쇠.
 * 실제 자물쇠가 하나라도 걸리면 쓰지 않는다 — 돈을 내고 거는 벽에
 * 가짜를 섞으면 확대해서 읽는 순간 신뢰가 무너지기 때문이다.
 */
export function createDemoLocks(count = 48): WallLock[] {
  const locks: WallLock[] = [];
  for (let i = 0; i < count; i += 1) {
    const h = hashId(`demo-${i}`);
    const tier: LockTier = h % 9 === 0 ? "shine" : h % 3 === 0 ? "color" : "basic";
    locks.push({
      id: `demo-${i}`,
      tier,
      color: LOCK_COLORS[h % LOCK_COLORS.length].value,
      name: DEMO_NAMES[h % DEMO_NAMES.length],
      wish: DEMO_WISHES[h % DEMO_WISHES.length],
      createdAt: new Date(Date.now() - (count - i) * 3600000).toISOString(),
    });
  }
  return locks;
}
