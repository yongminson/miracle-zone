import { lunarOf, monthSonDays, sonDirection, upcomingMonths } from "@/lib/calendar/son-day";
import { ZODIAC_SIX, dailyZodiacFortune, iljinOf } from "@/lib/zodiac/daily";

// 매일 자동 블로그 글 (2026-11-05) — 예전엔 AI 가 400자쯤 날짜만 바꾼 일반 운세 글을 썼다(내용이 없어 검색·AI 가 인용할 것도 없었다).
// 이제 그날 일진으로 12띠 운세·손 방향을 계산해 글을 만든다. 띠별 운세 화면과 같은 계산이고 AI 비용이 없다.

const LABELS = ["쥐띠", "소띠", "호랑이띠", "토끼띠", "용띠", "뱀띠", "말띠", "양띠", "원숭이띠", "닭띠", "개띠", "돼지띠"];

/** 그 띠의 출생연도 중 요즘 많이 찾는 나이대 4개 (띠는 입춘 기준) */
function birthYears(zi: number): string {
  const years: number[] = [];
  for (let y = 1950; y <= 2010; y += 1) if (((y - 4) % 12 + 12) % 12 === zi) years.push(y);
  return years
    .sort((a, b) => Math.abs(a - 1982) - Math.abs(b - 1982))
    .slice(0, 4)
    .sort((a, b) => a - b)
    .map((y) => `${String(y).slice(2)}년생`)
    .join("·");
}

export function buildDailyPost(ymd: string) {
  const iljin = iljinOf(ymd);
  const { m, d } = iljin;
  const lunar = lunarOf(ymd);
  const rows = LABELS.map((label, zi) => ({ label, zi, f: dailyZodiacFortune(zi, label, iljin) }));
  const ranked = [...rows].sort((a, b) => b.f.total - a.f.total);
  const top = ranked.slice(0, 3);
  const clash = rows.find((r) => r.f.relation === "clash");
  const six = rows.find((r) => r.f.relation === "six");
  const dir = sonDirection(lunar.day);
  const nextSon = upcomingMonths(2, ymd)
    .flatMap((x) => monthSonDays(x.year, x.month))
    .find((x) => x.date > ymd);

  const title = `${m}월 ${d}일 띠별 운세 — 오늘 일진 ${iljin.korean}(${iljin.hanja}), 흐름 좋은 띠는 ${top[0].label}`;
  const summary = `${m}월 ${d}일 일진 ${iljin.korean}. ${top.map((t) => t.label).join("·")} 흐름이 좋은 날`;

  const lines: string[] = [
    `${iljin.y}년 ${m}월 ${d}일의 일진은 ${iljin.korean}(${iljin.hanja})이고, 음력으로는 ${lunar.leap ? "윤" : ""}${lunar.month}월 ${lunar.day}일입니다. 일진은 그날의 천간과 지지를 말하며, 내 띠와 합이 드는지 부딪히는지에 따라 하루의 흐름을 살펴봅니다.`,
    "",
    "■ 오늘 흐름이 좋은 띠",
    ...top.map((t, i) => `${i + 1}. ${t.label} ${t.f.total}점 (${birthYears(t.zi)} 등)`),
    "",
    "■ 오늘 조심할 띠",
    clash
      ? `${clash.label}: 오늘 일진의 지지와 충(沖)이 듭니다. 이동·계약·큰 결정은 한 번 더 확인하세요.`
      : "오늘은 충이 드는 띠가 없습니다.",
    six ? `가장 잘 맞는 기운을 받는 띠는 일진과 육합(六合)을 이루는 ${six.label}입니다.` : "",
    "",
    "■ 12띠 오늘의 운세",
    ...rows.flatMap((r) => [
      "",
      `[${r.label} · ${birthYears(r.zi)} 등] 총운 ${r.f.total}점 · 애정 ${r.f.love}점 · 재물 ${r.f.wealth}점 · 직장 ${r.f.work}점`,
      r.f.message,
      `행운의 색 ${r.f.color} / 방향 ${r.f.direction} / 시간 ${r.f.time} / 잘 맞는 띠 ${LABELS[ZODIAC_SIX[r.zi]]}`,
    ]),
    "",
    "■ 오늘의 손 방향",
    dir === "없음"
      ? `오늘은 음력 ${lunar.day}일로 손이 없는 날입니다. 이사·입주 날로 많이 찾는 날이에요.`
      : `오늘은 음력 ${lunar.day}일로 손이 ${dir}에 있습니다. 오늘 옮긴다면 ${dir}으로 가는 이사를 피하면 된다고 봅니다.`,
    nextSon ? `다음 손 없는 날은 ${Number(nextSon.date.slice(5, 7))}월 ${nextSon.day}일(${nextSon.weekday})입니다.` : "",
    "",
    "■ 어떻게 계산했나요",
    "오늘 일진의 천간 오행이 내 띠의 오행을 살려 주는지 누르는지, 일진의 지지가 내 띠와 육합·삼합인지 충인지로 점수와 풀이를 정했습니다. 띠는 양력 1월 1일이 아니라 입춘을 기준으로 바뀌어요.",
    "띠만으로 본 흐름이라 같은 띠라도 사람마다 다릅니다. 내 생년월일로 자세히 보려면 명운의 오늘의 운세를 확인해 보세요. 모든 풀이는 참고용이며 미래를 보장하지 않습니다.",
  ];

  return {
    slug: `daily-${ymd}`,
    title,
    category: "운세",
    summary,
    content: lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n"),
  };
}

/** 검색에 내보낼 글인지 — 예전 짧은 글(600자 미만)과 날짜가 지난 글(60일 초과)은 페이지는 두되 검색에서 뺀다 */
export function isIndexablePost(post: { content?: string | null; created_at?: string | null }, now = Date.now()): boolean {
  if (String(post.content ?? "").length < 600) return false;
  if (!post.created_at) return true;
  return now - new Date(post.created_at).getTime() <= 60 * 86400000;
}
