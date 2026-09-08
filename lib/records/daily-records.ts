/**
 * 하루 1탭 기록 — "오늘 실제로 어땠나요?"의 답을 날짜별로 보관한다.
 *
 * 운세는 보고 끝나는 소비재라 다시 올 이유가 없다. 기록이 쌓이면 그때부터
 * "내 흐름"이라는 자산이 되므로, 매일 돌아올 이유를 만드는 것이 목적이다.
 * 1단계는 로그인 없이 localStorage만 쓴다. 계정이 생기면 v 필드로 서버 이전한다.
 */

const STORAGE_KEY = "myeongun_daily_records_v1";

/** 보관 기간 — 월간 리포트(30일)에 여유를 둔 길이 */
const MAX_RECORDS = 120;

/** 요일 패턴을 말하려면 이만큼은 쌓여야 한다 (표본이 적으면 그냥 우연이다) */
const WEEKDAY_MIN_TOTAL = 21;
const WEEKDAY_MIN_SAMPLES = 3;

export type DailyMood = "good" | "normal" | "bad";

export type DailyRecord = {
  /** YYYY-MM-DD (KST 기준) */
  date: string;
  mood: DailyMood;
  savedAt: string;
};

type RecordEnvelopeV1 = {
  v: 1;
  records: DailyRecord[];
};

export const MOOD_OPTIONS: { value: DailyMood; label: string; emoji: string }[] = [
  { value: "good", label: "좋았음", emoji: "😊" },
  { value: "normal", label: "보통", emoji: "😐" },
  { value: "bad", label: "아쉬움", emoji: "😔" },
];

export function getMoodMeta(mood: DailyMood) {
  return MOOD_OPTIONS.find((option) => option.value === mood) ?? MOOD_OPTIONS[1];
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/** KST 기준 날짜 키. 서버 시간대와 무관하게 한국 날짜로 맞춘다 */
export function getKstDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** 날짜 키에 일수를 더한다 (UTC 자정 기준이라 서머타임 영향이 없다) */
export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const base = new Date(`${dateKey}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

export function getWeekdayLabel(dateKey: string): string {
  return WEEKDAY_LABELS[new Date(`${dateKey}T00:00:00Z`).getUTCDay()] ?? "";
}

function sanitize(raw: unknown): DailyRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const date = typeof item.date === "string" ? item.date.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (item.mood !== "good" && item.mood !== "normal" && item.mood !== "bad") return null;
  return {
    date,
    mood: item.mood,
    savedAt: typeof item.savedAt === "string" ? item.savedAt : new Date().toISOString(),
  };
}

/** 저장된 기록. 최신 날짜가 앞으로 온다 */
export function readRecords(): DailyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecordEnvelopeV1 | null;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.records)) return [];
    return parsed.records
      .map(sanitize)
      .filter((record): record is DailyRecord => record !== null)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, MAX_RECORDS);
  } catch {
    return [];
  }
}

function writeRecords(records: DailyRecord[]): DailyRecord[] {
  const trimmed = records.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, MAX_RECORDS);
  if (typeof window === "undefined") return trimmed;
  try {
    const envelope: RecordEnvelopeV1 = { v: 1, records: trimmed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // 저장 공간이 없거나 차단된 경우 — 화면 동작은 그대로 두고 무시한다
  }
  return trimmed;
}

export function getRecord(dateKey: string, records?: DailyRecord[]): DailyRecord | null {
  return (records ?? readRecords()).find((record) => record.date === dateKey) ?? null;
}

/** 하루 한 개. 같은 날 다시 누르면 답을 바꾼다 */
export function saveRecord(mood: DailyMood, dateKey: string = getKstDateKey()): DailyRecord[] {
  const rest = readRecords().filter((record) => record.date !== dateKey);
  return writeRecords([{ date: dateKey, mood, savedAt: new Date().toISOString() }, ...rest]);
}

export type RecordSummary = {
  total: number;
  /** 최근 7일 — 오래된 날짜부터. 기록이 없는 날은 null */
  last7: { date: string; mood: DailyMood | null }[];
  /** 최근 7일 중 채운 칸 수 (연속 출석이 아니라 완성도) */
  filled7: number;
  counts: Record<DailyMood, number>;
  /**
   * 요일 패턴. 표본이 충분할 때만 값이 생기고, 아니면 null이다.
   * 하루 1탭 30일이면 요일당 4개뿐이라 단정하면 거짓말이 된다.
   */
  weekdayInsight: { weekday: string; goodRate: number; samples: number } | null;
};

export function summarizeRecords(records: DailyRecord[] = readRecords()): RecordSummary {
  const today = getKstDateKey();
  const byDate = new Map(records.map((record) => [record.date, record]));

  const last7 = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(today, index - 6);
    return { date, mood: byDate.get(date)?.mood ?? null };
  });

  const counts: Record<DailyMood, number> = { good: 0, normal: 0, bad: 0 };
  const weekdayStats = new Map<number, { good: number; total: number }>();

  for (const record of records) {
    counts[record.mood] += 1;
    const weekday = new Date(`${record.date}T00:00:00Z`).getUTCDay();
    const stat = weekdayStats.get(weekday) ?? { good: 0, total: 0 };
    stat.total += 1;
    if (record.mood === "good") stat.good += 1;
    weekdayStats.set(weekday, stat);
  }

  let weekdayInsight: RecordSummary["weekdayInsight"] = null;
  if (records.length >= WEEKDAY_MIN_TOTAL) {
    let best: { weekday: number; goodRate: number; samples: number } | null = null;
    for (const [weekday, stat] of weekdayStats) {
      if (stat.total < WEEKDAY_MIN_SAMPLES) continue;
      const goodRate = stat.good / stat.total;
      if (!best || goodRate > best.goodRate) {
        best = { weekday, goodRate, samples: stat.total };
      }
    }
    // 전부 비슷하면 말할 거리가 아니다 — 절반은 넘어야 패턴으로 본다
    if (best && best.goodRate > 0.5) {
      weekdayInsight = {
        weekday: WEEKDAY_LABELS[best.weekday],
        goodRate: best.goodRate,
        samples: best.samples,
      };
    }
  }

  return {
    total: records.length,
    last7,
    filled7: last7.filter((day) => day.mood !== null).length,
    counts,
    weekdayInsight,
  };
}
