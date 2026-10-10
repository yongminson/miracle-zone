/**
 * 만세력 자동 검사 — 명운의 사주 계산이 정확한지 배포 전에 확인한다.
 *
 *   npm run check:manseryeok          빠른 검사(빌드할 때마다 자동으로 돈다, 1분 안쪽)
 *   npm run check:manseryeok -- --full 1900~2100년 전부(수동, 몇 분)
 *
 * 하나라도 틀리면 빌드(=배포)가 멈춘다. 2026-10-11 에 오늘의 운세 일주가 모든 사람에게
 * 이틀씩 밀려 있던 일이 있어(기준일을 잘못 잡음), 다시는 그런 일이 없도록 만든 장치다.
 *
 * 명운의 계산끼리만 비교하면 같이 틀려도 모른다. 그래서 명운 코드와 상관없는 기준으로 잰다.
 *  1) 일주   — 율리우스 일수(JDN) 공식. 명운 밖에서 확인된 날짜 3개로 기준을 고정한다.
 *  2) 년·월주 — 태양 황경(천문 계산)으로 입춘·절입을 직접 구한다. 년간·월간은 오호둔 규칙.
 *  3) 음력   — 명운이 쓰는 korean-lunar-calendar 와 다른 라이브러리(lunar-javascript)로 대조.
 *  4) 시주   — 오서둔(일간으로 자시의 천간을 정하는) 규칙.
 *
 * 검사 대상: 오늘의 운세(/api/fortune), 사주 인사이트(VIP), 2027 신년운세, 운세 캘린더.
 * 절입 시각이 정오 앞뒤 3시간 안에 있는 날은 학파·시각에 따라 갈릴 수 있어 엄격 검사에서 뺀다
 * (대신 명운 계산기 4개가 서로 같은지만 본다).
 */
import { createRequire } from "node:module";
import KoreanLunarCalendar from "korean-lunar-calendar";
import { Solar } from "lunar-javascript";
import { buildFortuneProfile, type FortuneBirthTime } from "../app/api/fortune/fortune-engine";
import { extractVipSajuData } from "../lib/saju/vip-saju-data";
import { calculateNewYear } from "../lib/newyear/newyear-engine";
import { calculateDayLuck } from "../lib/calendar/day-luck";

// lunar-javascript 의 음력 객체는 타입 선언이 없어 직접 불러온다(검사 전용)
const lunarLib = createRequire(import.meta.url)("lunar-javascript") as {
  Lunar: { fromYmd(y: number, m: number, d: number): { getSolar(): { getYear(): number; getMonth(): number; getDay(): number } } };
  LunarMonth: { fromYm(y: number, m: number): { getDayCount(): number } | null };
};

const FULL = process.argv.includes("--full");
const STEMS = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
const STEM_KO = "갑을병정무기경신임계";
const BRANCH_KO = "자축인묘진사오미신유술해";
const ZODIAC = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
const TIME_KEYS: FortuneBirthTime[] = ["ja", "chuk", "in", "myo", "jin", "sa", "o", "mi", "sin", "yu", "sul", "hae"];

const ganji = (i: number) => STEMS[((i % 10) + 10) % 10] + BRANCHES[((i % 12) + 12) % 12];
const ganjiKo = (g: string) => STEM_KO[STEMS.indexOf(g[0])] + BRANCH_KO[BRANCHES.indexOf(g[1])];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

// ───────────── 기준 1: 일주 = (JDN + 49) mod 60 ─────────────
function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
const refDay = (y: number, m: number, d: number) => ganji(jdn(y, m, d) + 49);

// ───────────── 기준 2: 태양 황경으로 년·월주 (Meeus 저정밀식, 오차 약 0.01°) ─────────────
function sunLongitude(jd: number): number {
  const T = (jd - 2451545) / 36525;
  const rad = Math.PI / 180;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * rad;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) + (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
  const omega = (125.04 - 1934.136 * T) * rad;
  return ((L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) % 360 + 360) % 360;
}

/**
 * 한국 시각(UTC+9) hour:minute 의 년주·월주. 기본은 정오.
 * 절입이 그 시각 앞뒤 marginDeg 안이면 boundary(태양은 하루 약 1° → 0.13° ≈ 3시간, 0.025° ≈ 36분).
 */
function refYearMonth(
  y: number, m: number, d: number, hour = 12, minute = 0, marginDeg = 0.13,
): { year: string; month: string; boundary: boolean } {
  const jdKst = jdn(y, m, d) - 0.5 + (hour - 9) / 24 + minute / 1440; // KST → UT
  const fromIpchun = ((sunLongitude(jdKst) - 315) % 360 + 360) % 360; // 입춘(315°)부터 잰 각도
  const k = Math.floor(fromIpchun / 30); // 0=寅月 … 11=丑月
  const intoMonth = fromIpchun - k * 30;
  const boundary = intoMonth < marginDeg || intoMonth > 30 - marginDeg;
  const pillarYear = m <= 2 && k >= 10 ? y - 1 : y; // 1~2월인데 아직 子·丑월이면 입춘 전 = 전년
  const yearIndex = pillarYear - 4; // 1984년 = 甲子
  const yearStem = ((yearIndex % 10) + 10) % 10;
  const monthStem = ((yearStem % 5) * 2 + 2 + k) % 10; // 오호둔: 甲己년 → 丙寅월
  return { year: ganji(yearIndex), month: STEMS[monthStem] + BRANCHES[(2 + k) % 12], boundary };
}

/** 오서둔: 甲己일 → 甲子시 */
const refHour = (dayStem: string, branchIndex: number) =>
  STEMS[((STEMS.indexOf(dayStem) % 5) * 2 + branchIndex) % 10] + BRANCHES[branchIndex];

// ───────────── 결과 모으기 ─────────────
const failures: string[] = [];
const counts: Record<string, number> = {};
let boundarySkipped = 0;
function check(group: string, label: string, got: string | undefined | null, want: string) {
  counts[group] = (counts[group] ?? 0) + 1;
  if (got !== want && failures.length < 400) failures.push(`[${group}] ${label}: 명운=${got ?? "(없음)"} 기준=${want}`);
}
const p = (x: { stemHanja: string; branchHanja: string } | null | undefined) => (x ? x.stemHanja + x.branchHanja : null);

// ───────────── 0) 기준 자체 검증: 명운 밖 만세력에서 확인한 날짜 ─────────────
// 사주아이·신한라이프 만세력 대조(2026-10-11): 1984-10-13 = 甲子년 甲戌월 庚辰일
const GOLDEN: { date: [number, number, number]; year: string; month: string; day: string }[] = [
  { date: [1984, 10, 13], year: "甲子", month: "甲戌", day: "庚辰" },
  { date: [2000, 1, 1], year: "己卯", month: "丙子", day: "戊午" },
  { date: [1949, 10, 1], year: "己丑", month: "癸酉", day: "甲子" }, // 한로(10/8) 전이라 酉월,
];
for (const g of GOLDEN) {
  const [y, m, d] = g.date;
  const ref = refYearMonth(y, m, d);
  check("기준값", `${ymd(y, m, d)} 일주`, refDay(y, m, d), g.day);
  check("기준값", `${ymd(y, m, d)} 년주`, ref.year, g.year);
  check("기준값", `${ymd(y, m, d)} 월주`, ref.month, g.month);
}

// ───────────── 1) 날짜별 검사 ─────────────
const startYear = FULL ? 1900 : 1920;
const endYear = FULL ? 2100 : 2035;
const fortuneStep = FULL ? 1 : 9;
const vipStep = FULL ? 7 : 41;
const newyearStep = FULL ? 3 : 17;
let dayIndex = 0;
let termCount = 0;
const t0 = Date.now();

for (let t = Date.UTC(startYear, 0, 1); t <= Date.UTC(endYear, 11, 31); t += 86400000, dayIndex++) {
  const dt = new Date(t);
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth() + 1;
  const d = dt.getUTCDate();
  const date = ymd(y, m, d);
  // 그날 안에 절입이 있는지(한국 시각 0시~24시)
  const jdStart = jdn(y, m, d) - 0.5 - 9 / 24;
  const termDay =
    Math.floor((((sunLongitude(jdStart) - 315) % 360) + 360) % 360 / 30) !==
    Math.floor((((sunLongitude(jdStart + 1) - 315) % 360) + 360) % 360 / 30);
  const ref = refYearMonth(y, m, d);
  // 빠른 검사는 사흘에 하루 + 절입일만 본다(전체 검사는 매일)
  if (!FULL && dayIndex % 3 !== 0 && !termDay && !ref.boundary) continue;
  const wantDay = refDay(y, m, d);
  if (ref.boundary) boundarySkipped++;

  // 라이브러리 자체(모든 계산기의 바탕)
  const lib = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
  check("라이브러리 일주", date, lib.getDay(), wantDay);
  if (!ref.boundary) {
    check("라이브러리 년주", date, lib.getYear(), ref.year);
    check("라이브러리 월주", date, lib.getMonth(), ref.month);
  }

  // 오늘의 운세(/api/fortune) — 시진도 하나씩 돌려 본다
  if (dayIndex % fortuneStep === 0 || ref.boundary) {
    const timeKey = TIME_KEYS[dayIndex % 12];
    const f = buildFortuneProfile({ gender: dayIndex % 2 ? "female" : "male", birthDate: date, calendarType: "solar", birthTime: timeKey }).fourPillars;
    check("오늘의 운세 일주", date, p(f.day), wantDay);
    check("오늘의 운세 시주", `${date} ${timeKey}`, p(f.time), refHour(wantDay[0], dayIndex % 12));
    if (!ref.boundary) {
      check("오늘의 운세 년주", date, p(f.year), ref.year);
      check("오늘의 운세 월주", date, p(f.month), ref.month);
    } else {
      check("절입일 계산기 일치", `${date} 년주`, p(f.year), lib.getYear());
      check("절입일 계산기 일치", `${date} 월주`, p(f.month), lib.getMonth());
    }
  }

  // 사주 인사이트(VIP) — 분 단위 시각이라 그 시각의 한국 시간으로 절입을 잰다. 23시대는 학파 차이라 뺀다.
  // 절입이 있는 날은 하루에 여러 시각을 넣어, 절입 직전·직후 출생이 맞는지 본다.
  if (termDay) termCount++;
  const termSample = termDay && (FULL || termCount % 3 === 0);
  // VIP·신년운세는 한국 음력 라이브러리(2050년까지)를 거치므로 그 범위만 본다. 명운 입력은 1920~2026년생
  const inKrRange = y <= 2050;
  if (inKrRange && (dayIndex % vipStep === 0 || termSample)) {
    const hours = termSample ? (FULL ? [1, 4, 7, 10, 13, 16, 19, 22] : [2 + (termCount % 3), 9, 15, 21]) : [1 + (dayIndex % 22)];
    for (const hour of hours) {
      const minute = (dayIndex * 7 + hour * 13) % 60;
      const v = extractVipSajuData({
        year: y, month: m, day: d, calendarType: "solar", gender: "male",
        birthTimeRaw: `${pad(hour)}:${pad(minute)}`, birthDateIso: date, mbti: null,
      }).calculated.pillars;
      const at = `${date} ${pad(hour)}:${pad(minute)}`;
      check("VIP 일주", at, v.day.hanja, wantDay);
      check("VIP 시주", at, v.hour?.hanja, refHour(wantDay[0], Math.floor((hour + 1) / 2) % 12));
      const refAt = refYearMonth(y, m, d, hour, minute, 0.025);
      if (!refAt.boundary) {
        check(termSample ? "VIP 절입일 년·월주" : "VIP 년주", at, v.year.hanja, refAt.year);
        check(termSample ? "VIP 절입일 년·월주" : "VIP 월주", at, v.month.hanja, refAt.month);
      }
    }
  }

  // 2027 신년운세 — 일간과 띠
  if (inKrRange && dayIndex % newyearStep === 0 && !ref.boundary) {
    const n = calculateNewYear({ birthDate: date, calendarType: "solar", gender: "male" });
    check("신년운세 일간", date, n.dayMaster.hanja, wantDay[0]);
    check("신년운세 띠", date, n.zodiac, ZODIAC[BRANCHES.indexOf(ref.year[1])]);
  }
}

// ───────────── 2) 운세 캘린더(날마다의 일진) ─────────────
for (let y = 1990; y <= 2035; y += FULL ? 1 : 3) {
  for (const m of [1, 4, 7, 10]) {
    const range = calculateDayLuck({ birthDate: "1984-10-13", calendarType: "solar", start: ymd(y, m, 1), days: 31 });
    for (const day of range.days) {
      const [yy, mm, dd] = day.date.split("-").map(Number);
      check("운세 캘린더 일진", day.date, day.ganjiKorean, ganjiKo(refDay(yy, mm, dd)));
    }
  }
}

// 오늘의 운세가 쓰는 "오늘" 일진
{
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const [y, m, d] = today.split("-").map(Number);
  const prof = buildFortuneProfile({ gender: "male", birthDate: "1990-05-05", calendarType: "solar", birthTime: "unknown" });
  check("오늘 일진", today, p(prof.todayPillar), refDay(y, m, d));
}

// ───────────── 3) 음력·윤달 입력 ─────────────
// 한국 음력은 한국 시간(KASI) 기준이라, 중국 시간 기준인 lunar-javascript 와 초하루가 하루씩 다른 달이 있다.
// 명운은 모든 계산기가 한국 음력(korean-lunar-calendar)을 쓴다 — 한국 사용자에게 맞는 쪽.
// 두 달력이 다른 달은 아래 목록으로 못 박아 둔다. 목록에 없는 차이가 생기거나, 있던 차이가 사라지면
// 라이브러리가 바뀐 것이니 실패로 멈추고 사람이 확인한다.
// 1901~2049년, 그달 1~30일을 날마다 비교해 다른 달(작은달·큰달 차이 포함) 125개 — 2026-10-11 고정
const KNOWN_KR_CN_DIFF = new Set(
  [
    "1914-5,1914-5윤,1914-9,1914-10,1915-12,1916-1,1918-10,1918-11,1919-7,1919-7윤,1919-9,1919-10",
    "1920-9,1920-10,1923-9,1923-10,1924-1,1924-2,1925-4,1925-4윤,1927-9,1927-10,1928-8,1928-9",
    "1931-3,1931-4,1934-8,1934-9,1936-5,1936-6,1942-7,1942-8,1942-9,1942-10,1943-10,1943-11",
    "1943-12,1944-1,1949-2,1949-3,1950-1,1950-2,1950-4,1950-5,1952-6,1952-7,1953-12,1954-1",
    "1955-1,1955-2,1957-12,1958-1,1965-12,1966-1,1968-3,1968-4,1970-5,1970-6,1972-11,1972-12",
    "1973-11,1973-12,1976-9,1976-10,1978-2,1978-3,1982-9,1982-10,1987-4,1987-5,1987-12,1988-1",
    "1989-9,1989-10,1990-8,1990-9,1995-6,1995-7,1995-9,1995-10,1996-12,1997-1,1998-11,1998-12",
    "2001-3,2001-4,2005-10,2005-11,2012-3윤,2012-4,2012-5,2012-6,2012-7,2013-4,2013-5,2017-5윤",
    "2017-6,2019-10,2019-11,2020-1,2020-2,2023-3,2023-4,2026-8,2026-9,2026-12,2027-1,2027-12",
    "2028-1,2029-5,2029-6,2031-1,2031-2,2034-11,2034-12,2036-10,2036-11,2040-7,2040-8,2041-1",
    "2041-2,2046-4,2046-5,2048-10,2048-11",
  ].join(",").split(","),
);

/** 한국 음력 → 양력. 없는 날짜(작은달 30일 등)는 null */
function krLunarToSolar(y: number, m: number, d: number, isLeap: boolean): [number, number, number] | null {
  const cal = new KoreanLunarCalendar();
  if (!cal.setLunarDate(y, m, d, isLeap)) return null;
  const s = cal.getSolarCalendar();
  return [s.year, s.month, s.day];
}

/** 한국 음력의 윤달(없으면 0) */
function krLeapMonth(y: number): number {
  for (let m = 1; m <= 12; m++) {
    const cal = new KoreanLunarCalendar();
    if (cal.setLunarDate(y, m, 1, true) && cal.getLunarCalendar().intercalation) return m;
  }
  return 0;
}

// 명운 밖 만세력 대조: 음력 1984-09-19 = 양력 1984-10-13
check("기준값", "음력 1984-09-19 → 양력", (krLunarToSolar(1984, 9, 19, false) ?? []).join("-"), "1984-10-13");

const seenDiff = new Set<string>();
const lunarFrom = FULL ? 1901 : 1931;
const lunarTo = FULL ? 2049 : 2035;
for (let y = lunarFrom; y <= lunarTo; y++) {
  const leap = krLeapMonth(y); // 한국 음력의 윤달(중국과 다른 해가 있다: 예 2012년 한국 윤3월, 중국 윤4월)
  const months: { m: number; leap: boolean }[] = [];
  for (let m = 1; m <= 12; m++) {
    months.push({ m, leap: false });
    if (m === leap) months.push({ m, leap: true });
  }
  for (const { m, leap: isLeap } of months) {
    const key = `${y}-${m}${isLeap ? "윤" : ""}`;
    const label = (d: number) => `음력 ${y}-${pad(m)}-${pad(d)}${isLeap ? "(윤)" : ""}`;
    const lastDay = krLunarToSolar(y, m, 30, isLeap) ? 30 : 29;

    // 두 달력 비교(그달 전체)
    // 초하루가 다르면 1일이, 큰달·작은달이 다르면 30일이 달라진다 — 빠른 검사는 두 날만 본다
    for (const d of FULL ? Array.from({ length: 30 }, (_, i) => i + 1) : [1, 30]) {
      const kr = krLunarToSolar(y, m, d, isLeap);
      const cnLunar = lunarLib.LunarMonth.fromYm(y, isLeap ? -m : m);
      const cnSolar = cnLunar && d <= cnLunar.getDayCount() ? lunarLib.Lunar.fromYmd(y, isLeap ? -m : m, d).getSolar() : null;
      const cn = cnSolar ? `${cnSolar.getYear()}-${cnSolar.getMonth()}-${cnSolar.getDay()}` : "없음";
      if ((kr ? kr.join("-") : "없음") !== cn) seenDiff.add(key);
    }

    // 명운 계산기 3개가 한국 음력으로 바꾼 날의 일주와 같은지
    for (const d of FULL ? Array.from({ length: lastDay }, (_, i) => i + 1) : [1, 15, lastDay]) {
      const solar = krLunarToSolar(y, m, d, isLeap);
      if (!solar) continue;
      const want = refDay(...solar);
      const calendarType = isLeap ? "lunar-leap" : "lunar";
      const f = buildFortuneProfile({ gender: "male", birthDate: ymd(y, m, d), calendarType, birthTime: "unknown" }).fourPillars;
      check("오늘의 운세 음력 일주", label(d), p(f.day), want);
      if (d === 15) {
        const v = extractVipSajuData({
          year: y, month: m, day: d, calendarType, gender: "female",
          birthTimeRaw: null, birthDateIso: ymd(y, m, d), mbti: null,
        }).calculated.pillars;
        check("VIP 음력 일주", label(d), v.day.hanja, want);
        const n = calculateNewYear({ birthDate: ymd(y, m, d), calendarType, gender: "male" });
        check("신년운세 음력 일간", label(d), n.dayMaster.hanja, want[0]);
      }
    }
  }

  // 윤달이 없는 달을 윤달로 고르면 세 계산기 모두 평달로 계산해야 한다(정책 고정)
  const plainMonth = leap === 3 ? 4 : 3;
  const plain = krLunarToSolar(y, plainMonth, 10, false);
  if (plain) {
    const want = refDay(...plain);
    const f = buildFortuneProfile({ gender: "male", birthDate: ymd(y, plainMonth, 10), calendarType: "lunar-leap", birthTime: "unknown" }).fourPillars;
    check("없는 윤달 → 평달", `${y}-${plainMonth} 오늘의 운세`, p(f.day), want);
    const v = extractVipSajuData({
      year: y, month: plainMonth, day: 10, calendarType: "lunar-leap", gender: "male",
      birthTimeRaw: null, birthDateIso: ymd(y, plainMonth, 10), mbti: null,
    }).calculated.pillars;
    check("없는 윤달 → 평달", `${y}-${plainMonth} VIP`, v.day.hanja, want);
    const n = calculateNewYear({ birthDate: ymd(y, plainMonth, 10), calendarType: "lunar-leap", gender: "male" });
    check("없는 윤달 → 평달", `${y}-${plainMonth} 신년운세`, n.dayMaster.hanja, want[0]);
  }
}
for (const key of seenDiff) {
  check("한국·중국 음력 차이 목록", key, KNOWN_KR_CN_DIFF.has(key) ? "목록에 있음" : "새 차이", "목록에 있음");
}
for (const key of KNOWN_KR_CN_DIFF) {
  const [yy] = key.split("-").map(Number);
  if (yy >= lunarFrom && yy <= lunarTo) check("한국·중국 음력 차이 목록", key, seenDiff.has(key) ? "여전히 다름" : "차이 사라짐", "여전히 다름");
}

// ───────────── 결과 ─────────────
const total = Object.values(counts).reduce((a, b) => a + b, 0);
const sec = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n[만세력 검사] ${FULL ? "전체" : "빠른"} 검사 · ${startYear}~${endYear}년 · ${total.toLocaleString()}건 · ${sec}초`);
for (const [group, n] of Object.entries(counts)) console.log(`  · ${group}: ${n.toLocaleString()}건`);
console.log(`  · 절입이 정오 ±3시간인 날 ${boundarySkipped}일은 기준 대조 대신 계산기끼리 일치만 확인`);

if (failures.length > 0) {
  console.error(`\n❌ 틀린 계산 ${failures.length}건 — 배포를 멈춥니다. 고친 뒤 다시 빌드하세요.`);
  for (const line of failures.slice(0, 40)) console.error("   " + line);
  process.exit(1);
}
console.log("\n✅ 모두 정확합니다.");
