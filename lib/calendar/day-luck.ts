import { Solar } from "lunar-javascript";
import {
  CLASH,
  ganjiKorean,
  isHarmony,
  tenGodForStem,
  toSolar,
  type NewYearCalendarType,
} from "@/lib/newyear/newyear-engine";
import type { DayLuck, DayLuckRange, DayLuckTone } from "./day-luck-types";

/**
 * 운세 캘린더 — 날마다의 흐름을 AI 없이 계산한다.
 *
 * 그날의 일진(日辰) 천간이 내 일간에게 어떤 십성인지로 그날의 성격을 정하고,
 * 그날 지지가 내 일지와 충이면 조심할 날, 합이면 사람 운이 따르는 날로 본다.
 *
 * 사건을 예언하지 않는다. "이런 일이 생긴다"가 아니라 "이런 일에 힘을 쓰면 좋다"로
 * 쓴다. 아무 일도 없었을 때 믿음이 깨지지 않게, 그날 해 볼 행동을 권하는 방식이다.
 */

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const DAY_TEXT: Record<string, { title: string; action: string; base: number }> = {
  비견: { title: "내 편이 생기는 날", action: "혼자 붙잡고 있던 일, 믿을 만한 사람에게 같이 하자고 말해 보세요.", base: 68 },
  겁재: { title: "지갑을 지키는 날", action: "충동 구매나 돈 빌려주기는 하루만 미뤄 보세요.", base: 58 },
  식신: { title: "하고 싶던 일을 시작하는 날", action: "미뤄 둔 취미나 작은 도전을 오늘 시작해 보세요.", base: 82 },
  상관: { title: "말 한마디가 커지는 날", action: "아이디어는 메모로 남기고, 반박은 한 박자 쉬고 하세요.", base: 64 },
  편재: { title: "기회에 먼저 손 내미는 날", action: "연락이 뜸했던 사람이나 새 제안에 먼저 연락해 보세요.", base: 78 },
  정재: { title: "차곡차곡 정리하는 날", action: "가계부·서류·밀린 정산처럼 정리하는 일을 해 보세요.", base: 80 },
  편관: { title: "버티는 힘이 필요한 날", action: "일정을 하나 줄이고, 몸 컨디션부터 챙기세요.", base: 60 },
  정관: { title: "공식적인 일에 힘이 실리는 날", action: "보고·면접·약속처럼 격식 있는 일을 이날 잡아 보세요.", base: 76 },
  편인: { title: "생각을 정리하는 날", action: "혼자 공부하거나 앞으로의 계획을 적어 보세요.", base: 62 },
  정인: { title: "도움을 받기 좋은 날", action: "필요한 도움을 부탁하거나, 서류·계약을 마무리해 보세요.", base: 75 },
};

/** 한국 시간 오늘 날짜 */
export function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function calculateDayLuck(input: {
  birthDate: string;
  calendarType: NewYearCalendarType;
  start?: string;
  days?: number;
}): DayLuckRange {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.birthDate.trim());
  if (!match) throw new Error("생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.");
  const solar = toSolar(Number(match[1]), Number(match[2]), Number(match[3]), input.calendarType);
  if (!solar) throw new Error("존재하지 않는 날짜입니다. 생년월일과 양력·음력을 확인해 주세요.");

  const birth = Solar.fromYmdHms(solar.year, solar.month, solar.day, 12, 0, 0).getLunar().getEightChar();
  birth.setSect(2);
  const dayStem = birth.getDayGan();
  const dayBranch = birth.getDayZhi();

  const start = input.start && /^\d{4}-\d{2}-\d{2}$/.test(input.start) ? input.start : kstToday();
  const count = Math.min(Math.max(input.days ?? 7, 1), 31);

  const days: DayLuck[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = addDays(start, i);
    const [y, m, d] = date.split("-").map(Number);
    const ec = Solar.fromYmdHms(y, m, d, 12, 0, 0).getLunar().getEightChar();
    ec.setSect(2);
    const ganji = ec.getDay();
    const tenGod = tenGodForStem(dayStem, ganji[0]);
    const text = DAY_TEXT[tenGod];

    let score = text.base;
    let note: string | null = null;
    let clash = false;
    if (CLASH[dayBranch] === ganji[1]) {
      score -= 14;
      clash = true;
      note = "일정이 틀어지기 쉬운 날이에요. 중요한 약속은 시간 여유를 두세요.";
    } else if (isHarmony(dayBranch, ganji[1])) {
      score += 8;
      note = "사람 운이 따라요. 만남·협력이 잘 풀리기 쉬워요.";
    }
    score = Math.max(40, Math.min(95, score));

    const tone: DayLuckTone = clash || score <= 60 ? "caution" : score >= 78 ? "good" : "normal";
    days.push({
      date,
      weekday: WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
      ganjiKorean: ganjiKorean(ganji),
      tenGod,
      score,
      tone,
      title: text.title,
      action: text.action,
      note,
    });
  }

  // 같은 점수면 앞선 날을 고른다
  const best = [...days].sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))[0];
  const cautionDays = days.filter((x) => x.tone === "caution");
  const worst = [...cautionDays].sort((a, b) => a.score - b.score || a.date.localeCompare(b.date))[0];

  return { days, best: best?.date ?? null, caution: worst?.date ?? null };
}
