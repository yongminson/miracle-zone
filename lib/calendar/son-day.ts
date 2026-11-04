import { Solar } from "lunar-javascript";

// 손 없는 날·손 방향 (2026-11-04) — 손없는날 달력 페이지(/sonday)가 쓴다. 택일(lib/taekil/taekil-engine.ts)과 같은 규칙:
// 음력 날짜 끝자리 9·0 은 손 없음, 1·2 동쪽, 3·4 남쪽, 5·6 서쪽, 7·8 북쪽. 날짜는 한국 시간 기준.

export type SonDirection = "없음" | "동쪽" | "남쪽" | "서쪽" | "북쪽";

export type SonDay = {
  date: string;
  day: number;
  weekday: string;
  isWeekend: boolean;
  lunarMonth: number;
  lunarLeap: boolean;
  lunarDay: number;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function lunarOf(ymd: string): { month: number; leap: boolean; day: number } {
  const [y, m, d] = ymd.split("-").map(Number);
  const lunar = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar();
  const month = lunar.getMonth();
  return { month: Math.abs(month), leap: month < 0, day: lunar.getDay() };
}

export function sonDirection(lunarDay: number): SonDirection {
  const last = lunarDay % 10;
  if (last === 9 || last === 0) return "없음";
  if (last <= 2) return "동쪽";
  if (last <= 4) return "남쪽";
  if (last <= 6) return "서쪽";
  return "북쪽";
}

export function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

/** 그 달(양력)의 손 없는 날 목록 */
export function monthSonDays(year: number, month: number): SonDay[] {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const out: SonDay[] = [];
  for (let d = 1; d <= days; d += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const lunar = lunarOf(date);
    if (sonDirection(lunar.day) !== "없음") continue;
    const wd = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    out.push({
      date,
      day: d,
      weekday: WEEKDAYS[wd],
      isWeekend: wd === 0 || wd === 6,
      lunarMonth: lunar.month,
      lunarLeap: lunar.leap,
      lunarDay: lunar.day,
    });
  }
  return out;
}

/** 이번 달부터 count 개월 */
export function upcomingMonths(count: number, from = kstToday()): { year: number; month: number }[] {
  const [y, m] = from.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const t = new Date(Date.UTC(y, m - 1 + i, 1));
    return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1 };
  });
}
