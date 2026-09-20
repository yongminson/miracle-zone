/**
 * 소원 자물쇠 벽 — 자료 구조와 배치 규칙.
 *
 * 기적의 제단(흘러가는 소원)과 달리 자물쇠는 영구히 남는 것이 핵심이다.
 * 그래서 유효기간 개념이 없고, 결제 등급 차이는 색과 반짝임뿐이다.
 * 아직 DB가 없는 단계라 화면 확인용 예시 자물쇠를 이 파일에서 만든다.
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

/** 자물쇠가 걸리는 난간의 간격과 벽 크기 */
export const WALL = {
  width: 2400,
  height: 1500,
  railGapY: 250,
  railTopY: 190,
  slotGapX: 96,
  marginX: 80,
};

export const RAIL_COUNT = Math.floor((WALL.height - WALL.railTopY) / WALL.railGapY) + 1;
export const SLOTS_PER_RAIL = Math.floor((WALL.width - WALL.marginX * 2) / WALL.slotGapX) + 1;

/** 문자열을 32비트 정수로 — 같은 id면 항상 같은 자리에 걸리게 한다 */
export function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type LockPlacement = { x: number; y: number; rail: number; tilt: number };

/**
 * 자물쇠를 난간 위 자리에 배치한다. 한 자리에 여러 개가 겹치면 조금씩 밀어
 * 실제 자물쇠 벽처럼 덧걸린 모양이 되게 한다.
 */
export function layoutLocks(locks: WallLock[]): (WallLock & LockPlacement)[] {
  const used = new Map<string, number>();
  return locks.map((lock) => {
    const h = hashId(lock.id);
    const rail = h % RAIL_COUNT;
    const slot = Math.floor(h / RAIL_COUNT) % SLOTS_PER_RAIL;
    const key = `${rail}:${slot}`;
    const stack = used.get(key) ?? 0;
    used.set(key, stack + 1);

    return {
      ...lock,
      rail,
      x: WALL.marginX + slot * WALL.slotGapX + ((h >> 7) % 17) - 8 + stack * 11,
      y: WALL.railTopY + rail * WALL.railGapY + ((h >> 11) % 9) + stack * 6,
      tilt: (((h >> 13) % 17) - 8) / 2,
    };
  });
}

export function railYs(): number[] {
  return Array.from({ length: RAIL_COUNT }, (_, i) => WALL.railTopY + i * WALL.railGapY);
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

/** 화면 확인용 예시 자물쇠 — DB 연결 전까지만 쓴다 */
export function createDemoLocks(count = 260): WallLock[] {
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
      createdAt: new Date(Date.now() - (h % 120) * 86400000).toISOString(),
    });
  }
  return locks;
}
