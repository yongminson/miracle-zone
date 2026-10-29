import { calculateDayLuck, kstToday } from "@/lib/calendar/day-luck";
import type { DayLuck } from "@/lib/calendar/day-luck-types";
import { SEASONS, type SeasonInput, type SeasonPerson, type SeasonPreview } from "./season-types";

/**
 * 시즌 운세 계산 — 시험 합격운. AI 없이, 무작위 없이.
 *
 * 시험 날의 흐름은 운세 캘린더(lib/calendar/day-luck.ts)와 같은 계산이다.
 * 시험 전까지는 공부·실력 발휘에 힘이 실리는 기운(정관·정인·편인·식신)이 든 날을 "집중하기 좋은 날",
 * 조심할 날을 "컨디션을 지킬 날"로 고른다. 결과를 예언하지 않고, 그날 힘을 어디에 쓰면 좋은지만 말한다.
 */

const FOCUS_GODS = ["정관", "정인", "편인", "식신"];
/** 결제일부터 시험 전날까지 이만큼만 본다 */
const MAX_DAYS = 120;

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
}

function luckRange(person: SeasonPerson, start: string, count: number): DayLuck[] {
  const out: DayLuck[] = [];
  for (let offset = 0; offset < count; offset += 31) {
    out.push(
      ...calculateDayLuck({
        birthDate: person.birthDate,
        calendarType: person.calendarType,
        start: addDays(start, offset),
        days: Math.min(31, count - offset),
      }).days,
    );
  }
  return out;
}

export function calculateSeason(input: SeasonInput, start = kstToday()) {
  const dDay = daysBetween(start, input.eventDate);
  const eventDay = calculateDayLuck({
    birthDate: input.person.birthDate,
    calendarType: input.person.calendarType,
    start: input.eventDate,
    days: 1,
  }).days[0];

  // 오늘부터 시험 전날까지
  const span = Math.max(0, Math.min(MAX_DAYS, dDay));
  const before = span > 0 ? luckRange(input.person, start, span) : [];
  const focusAll = before.filter((d) => d.tone !== "caution" && FOCUS_GODS.includes(d.tenGod));
  const focusDays = [...focusAll]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, 5)
    .sort((a, b) => a.date.localeCompare(b.date));
  const restDays = before
    .filter((d) => d.tone === "caution")
    .sort((a, b) => a.score - b.score || a.date.localeCompare(b.date))
    .slice(0, 3)
    .sort((a, b) => a.date.localeCompare(b.date));

  const preview: SeasonPreview = {
    season: input.season,
    title: SEASONS[input.season].title,
    eventDate: input.eventDate,
    dDay,
    eventTone: eventDay.tone,
    eventTitle: eventDay.title,
    focusCount: focusAll.length,
  };
  return { preview, eventDay, focusDays, restDays };
}

/** 시험 날짜는 내일부터 1년 안 */
export function validateSeason(input: SeasonInput, today = kstToday()) {
  const d = daysBetween(today, input.eventDate);
  if (!Number.isFinite(d) || d < 1 || d > 365) throw new Error("시험 날짜는 내일부터 1년 안으로 넣어 주세요.");
  calculateSeason(input, today);
}

export function readSeasonInput(body: Record<string, unknown>): SeasonInput | null {
  const raw = (body.input && typeof body.input === "object" ? body.input : body) as Record<string, unknown>;
  const season = raw.season === "exam" ? "exam" : null;
  const p = (raw.person && typeof raw.person === "object" ? raw.person : null) as Record<string, unknown> | null;
  const eventDate = typeof raw.eventDate === "string" ? raw.eventDate.trim() : "";
  if (!season || !p || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return null;
  const birthDate = typeof p.birthDate === "string" ? p.birthDate.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const year = Number(birthDate.slice(0, 4));
  if (year < 1920 || year > 2026) return null;
  return {
    season,
    eventDate,
    person: {
      name: typeof p.name === "string" ? p.name.trim().slice(0, 20) : "",
      birthDate,
      calendarType: p.calendarType === "lunar" || p.calendarType === "lunar-leap" ? p.calendarType : "solar",
      gender: p.gender === "female" ? "female" : "male",
    },
  };
}
