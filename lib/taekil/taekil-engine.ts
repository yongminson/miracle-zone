import { calculateDayLuck, kstToday } from "@/lib/calendar/day-luck";
import type { DayLuck } from "@/lib/calendar/day-luck-types";
import {
  TAEKIL_PURPOSES,
  TAEKIL_RANGE_DAYS,
  type TaekilDay,
  type TaekilInput,
  type TaekilPerson,
  type TaekilPreview,
  type TaekilPurpose,
} from "./taekil-types";

/**
 * 택일 — 앞으로 90일 중 목적에 맞는 좋은 날을 고른다. AI 없이, 무작위 없이.
 *
 * 날마다의 흐름은 운세 캘린더(lib/calendar/day-luck.ts)와 같은 계산을 쓰고,
 * 그날 기운(십성)이 목적에 맞으면 점수를 더한다. 함께하는 사람이 있으면 두 사람 모두
 * 조심할 날이 아닌 날만 고르고 두 사람 점수를 더해 순위를 매긴다.
 * 이달의 운세의 "목적별 좋은 날"은 이번 달·혼자·두 날짜, 택일은 3개월·두 사람·순위 다섯 날이다.
 */

/** 목적마다 힘이 실리는 기운(십성)과 이유 */
const PURPOSE_FIT: Record<TaekilPurpose, { gods: string[]; why: string }> = {
  contract: { gods: ["정인", "정재", "정관"], why: "문서·약속이 단단하게 지켜지는 기운이 드는 날이에요." },
  move: { gods: ["정인", "정재", "비견"], why: "집·터전과 관련된 일이 안정적으로 자리 잡는 기운이에요." },
  confess: { gods: ["편재", "식신", "정재"], why: "마음을 표현하고 상대에게 다가가기 좋은 기운이에요." },
  interview: { gods: ["정관", "정인", "식신"], why: "실력과 성실함이 잘 드러나 인정받기 쉬운 기운이에요." },
  opening: { gods: ["식신", "편재", "정관"], why: "새로 시작한 일이 사람과 돈을 부르는 기운이에요." },
  wedding: { gods: ["정재", "정관", "정인"], why: "약속과 인연이 오래 가는 안정적인 기운이에요." },
  travel: { gods: ["식신", "편재", "비견"], why: "움직임이 즐겁고 뜻밖의 좋은 만남이 생기기 쉬운 기운이에요." },
  purchase: { gods: ["정재", "정인", "정관"], why: "큰돈이 오가는 일이 차분하고 꼼꼼하게 풀리는 기운이에요." },
};

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 90일을 31일씩 나눠 계산한다(운세 캘린더는 한 번에 31일까지) */
function rangeDays(person: TaekilPerson, start: string): DayLuck[] {
  const out: DayLuck[] = [];
  for (let offset = 0; offset < TAEKIL_RANGE_DAYS; offset += 31) {
    out.push(
      ...calculateDayLuck({
        birthDate: person.birthDate,
        calendarType: person.calendarType,
        start: addDays(start, offset),
        days: Math.min(31, TAEKIL_RANGE_DAYS - offset),
      }).days,
    );
  }
  return out;
}

type Scored = { a: DayLuck; b: DayLuck | null; total: number; fit: boolean };

function score(input: TaekilInput, start: string): Scored[] {
  const fit = PURPOSE_FIT[input.purpose];
  const a = rangeDays(input.a, start);
  const b = input.b ? rangeDays(input.b, start) : null;
  return a.map((day, i) => {
    const other = b ? b[i] : null;
    const bonus = (d: DayLuck) => (fit.gods.includes(d.tenGod) ? 12 : 0) + (d.note?.includes("사람 운") ? 4 : 0);
    const total = day.score + bonus(day) + (other ? other.score + bonus(other) : 0);
    return { a: day, b: other, total, fit: fit.gods.includes(day.tenGod) || (!!other && fit.gods.includes(other.tenGod)) };
  });
}

function toDay(s: Scored, purpose: TaekilPurpose, together: boolean): TaekilDay {
  const n = together ? 2 : 1;
  return {
    date: s.a.date,
    weekday: s.a.weekday,
    // 목적에 맞는 날은 점수를 더해 고르므로 100을 넘을 수 있다 — 화면에는 99점까지만
    score: Math.min(99, Math.round(s.total / n)),
    title: s.a.title,
    why: s.fit ? PURPOSE_FIT[purpose].why : s.a.note ?? "큰 흔들림 없이 무난하게 흘러가는 날이에요.",
  };
}

export function taekilLabel(purpose: TaekilPurpose): string {
  return TAEKIL_PURPOSES.find((p) => p.key === purpose)?.label ?? "좋은 날";
}

/** 계산 전부 — 무료는 preview 만, 유료는 순위·피할 날까지 */
export function calculateTaekil(input: TaekilInput, start = kstToday()) {
  const together = !!input.b;
  const scored = score(input, start);
  const safe = scored.filter((s) => s.a.tone !== "caution" && (!s.b || s.b.tone !== "caution"));
  const candidates = safe.filter((s) => s.fit && (s.a.tone === "good" || s.b?.tone === "good"));
  const pool = candidates.length >= 5 ? candidates : safe;
  // 오늘·내일은 준비할 시간이 없어 빼고, 같은 주에 몰리지 않게 사흘 이상 떨어뜨려 고른다
  const ranked: Scored[] = [];
  for (const s of [...pool].sort((x, y) => y.total - x.total || x.a.date.localeCompare(y.a.date))) {
    if (s.a.date <= addDays(start, 1)) continue;
    if (ranked.some((r) => Math.abs(Date.parse(r.a.date) - Date.parse(s.a.date)) < 3 * 864e5)) continue;
    ranked.push(s);
    if (ranked.length === 5) break;
  }
  const avoidAll = scored.filter((s) => s.a.tone === "caution" || s.b?.tone === "caution");
  const avoid = [...avoidAll]
    .sort((x, y) => x.total - y.total || x.a.date.localeCompare(y.a.date))
    .slice(0, 3)
    .sort((x, y) => x.a.date.localeCompare(y.a.date));

  const preview: TaekilPreview = {
    purpose: input.purpose,
    label: taekilLabel(input.purpose),
    start,
    end: addDays(start, TAEKIL_RANGE_DAYS - 1),
    candidateCount: candidates.length,
    avoidCount: avoidAll.length,
    together,
  };
  return {
    preview,
    ranked: ranked.map((s) => toDay(s, input.purpose, together)),
    avoid: avoid.map((s) => ({
      ...toDay(s, input.purpose, together),
      why: s.a.tone === "caution" ? s.a.note ?? "흐름이 흔들리기 쉬운 날이에요." : "함께하는 사람에게 흐름이 흔들리기 쉬운 날이에요.",
    })),
  };
}

export function readTaekilInput(body: Record<string, unknown>): TaekilInput | null {
  const raw = (body.input && typeof body.input === "object" ? body.input : body) as Record<string, unknown>;
  const person = (v: unknown): TaekilPerson | null => {
    const p = (v && typeof v === "object" ? v : null) as Record<string, unknown> | null;
    if (!p) return null;
    const birthDate = typeof p.birthDate === "string" ? p.birthDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
    const year = Number(birthDate.slice(0, 4));
    if (year < 1920 || year > 2026) return null;
    return {
      name: typeof p.name === "string" ? p.name.trim().slice(0, 20) : "",
      birthDate,
      calendarType: p.calendarType === "lunar" || p.calendarType === "lunar-leap" ? p.calendarType : "solar",
      gender: p.gender === "female" ? "female" : "male",
    };
  };
  const purpose = TAEKIL_PURPOSES.some((p) => p.key === raw.purpose) ? (raw.purpose as TaekilPurpose) : null;
  const a = person(raw.a);
  if (!purpose || !a) return null;
  const month = typeof raw.month === "string" && /^d{4}-d{2}$/.test(raw.month) ? raw.month : kstToday().slice(0, 7);
  return { purpose, a, b: raw.b ? person(raw.b) : null, month };
}
