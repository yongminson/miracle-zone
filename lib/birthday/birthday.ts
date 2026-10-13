/**
 * 생일 계산 — 생일 축하·선물권(웹 배너, 앱 생일 아침 알림)에서 같이 쓴다.
 *
 * 음력 생일은 한국 음력(korean-lunar-calendar)으로 그해 양력 날짜를 구한다.
 * - 그해에 없는 윤달 생일은 평달로 본다(만세력 정책과 같다).
 * - 그달에 30일이 없으면 29일로 본다.
 * - 양력 2월 29일생은 평년엔 2월 28일.
 * 날짜는 모두 한국 날짜(KST) 기준 'YYYY-MM-DD'.
 */
import KoreanLunarCalendar from "korean-lunar-calendar";

export type BirthCalendar = "solar" | "lunar" | "lunar-leap";

/** 생일 선물권을 쓸 수 있는 기간(생일 당일 포함 7일) */
export const BIRTHDAY_GIFT_DAYS = 7;

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const dayNumber = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** 오늘 한국 날짜 'YYYY-MM-DD' */
export function todayKst(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** 생일(birthDate 의 월·일)이 year 해(음력이면 음력 year 해)에 해당하는 양력 날짜. 계산 불가면 null */
export function birthdayInYear(birthDate: string, calendar: BirthCalendar, year: number): string | null {
  const [, m, d] = birthDate.split("-").map(Number);
  if (!m || !d) return null;
  if (calendar === "solar") {
    if (m === 2 && d === 29) {
      const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
      return toIso(year, 2, leap ? 29 : 28);
    }
    return toIso(year, m, d);
  }
  const cal = new KoreanLunarCalendar();
  const isLeap = calendar === "lunar-leap";
  // 윤달 생일: 그해 윤달이 없으면 평달, 30일이 없으면 29일
  const tries: [number, boolean][] = [[d, isLeap], [d, false], [29, isLeap], [29, false]];
  for (const [day, leap] of tries) {
    if (day > 30) continue;
    if (cal.setLunarDate(year, m, day, leap)) {
      const s = cal.getSolarCalendar();
      return toIso(s.year, s.month, s.day);
    }
  }
  return null;
}

/**
 * 오늘이 생일 선물 기간(생일 당일~6일 뒤)인지.
 * 음력 12월 생일은 양력으로 다음 해 1~2월이 되므로 앞뒤 해를 모두 본다.
 */
export function birthdayWindow(
  birthDate: string,
  calendar: BirthCalendar,
  today: string = todayKst(),
): { inWindow: boolean; birthday: string | null; daysSince: number | null } {
  const year = Number(today.slice(0, 4));
  const t = dayNumber(today);
  for (const y of [year - 1, year]) {
    const b = birthdayInYear(birthDate, calendar, y);
    if (!b) continue;
    const diff = t - dayNumber(b);
    if (diff >= 0 && diff < BIRTHDAY_GIFT_DAYS) return { inWindow: true, birthday: b, daysSince: diff };
  }
  return { inWindow: false, birthday: null, daysSince: null };
}

/** 오늘 이후(오늘 포함) 다가오는 생일 양력 날짜들 — 앱 생일 아침 알림 예약용 */
export function upcomingBirthdays(
  birthDate: string,
  calendar: BirthCalendar,
  count = 2,
  today: string = todayKst(),
): string[] {
  const year = Number(today.slice(0, 4));
  const t = dayNumber(today);
  const out: string[] = [];
  for (let y = year - 1; y <= year + count + 1 && out.length < count; y++) {
    const b = birthdayInYear(birthDate, calendar, y);
    if (b && dayNumber(b) >= t && !out.includes(b)) out.push(b);
  }
  return out;
}
