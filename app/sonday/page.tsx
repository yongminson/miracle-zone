import type { Metadata } from "next";
import Link from "next/link";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MenuTabs } from "@/components/layout/MenuTabs";
import { kstToday, lunarOf, monthSonDays, sonDirection, upcomingMonths } from "@/lib/calendar/son-day";

// 손없는날 달력 (2026-11-04) — 무료·검색 유입용. 이번 달부터 14개월, 오늘 손 방향. 날짜는 한국 시간, 한 시간마다 다시 만든다.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "손없는날 달력 2026·2027 — 이사·입주·개업 날 잡기 | 명운",
  description:
    "이번 달과 다음 달 손없는날, 주말 손없는날, 오늘 손 방향까지. 2027년 12월까지 달마다 손없는날을 음력과 함께 정리했어요. 내 생일로 이사 좋은 날 고르기도 있어요.",
  keywords: ["손없는날", "손 없는 날", "이사 날짜", "이사 좋은 날", "2027 손없는날", "손없는날 달력", "손 방향"],
  alternates: { canonical: "https://saju.ymstudio.co.kr/sonday" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://saju.ymstudio.co.kr/sonday",
    siteName: "명운(命運)",
    title: "손없는날 달력 — 명운",
    description: "이번 달 손없는날, 주말 손없는날, 오늘 손 방향",
    images: [{ url: "https://saju.ymstudio.co.kr/og-image.png", width: 1200, height: 630 }],
  },
};

const FAQ = [
  {
    q: "손없는날이 뭔가요?",
    a: "‘손’은 날마다 동서남북을 옮겨 다니며 사람 일을 방해한다고 여긴 옛 민속의 귀신이에요. 음력 날짜 끝자리가 9나 0인 날(9일, 10일, 19일, 20일, 29일, 30일)은 손이 하늘로 올라가 어느 방향에도 없다고 해서 손없는날이라고 불러요.",
  },
  {
    q: "손없는날은 한 달에 며칠인가요?",
    a: "음력 한 달에 여섯 날이에요(음력 달이 29일로 끝나면 다섯 날). 양력 달력으로 보면 달마다 다섯에서 일곱 날쯤 돼요.",
  },
  {
    q: "손없는날이 아니면 이사하면 안 되나요?",
    a: "손은 그날 한 방향에만 있다고 봐서, 손이 있는 방향만 피해서 옮기면 된다고 해요. 음력 끝자리 1·2는 동쪽, 3·4는 남쪽, 5·6은 서쪽, 7·8은 북쪽이에요.",
  },
  {
    q: "손없는날은 이사비가 비싸요. 다른 방법은요?",
    a: "손없는날·주말은 예약이 몰려 비용이 오르기 쉬워요. 손이 없는 방향으로 옮기는 날을 고르거나, 내 사주에 맞는 날을 함께 보면 선택지가 넓어져요.",
  },
];

function lunarLabel(month: number, leap: boolean, day: number) {
  return `음 ${leap ? "윤" : ""}${month}.${day}`;
}

export default function SondayPage() {
  const today = kstToday();
  const todayLunar = lunarOf(today);
  const todayDir = sonDirection(todayLunar.day);
  const [, tm, td] = today.split("-").map(Number);
  const months = upcomingMonths(14).map((m) => ({ ...m, days: monthSonDays(m.year, m.month) }));
  const upcoming = months.flatMap((m) => m.days).filter((d) => d.date >= today);
  const nextDay = upcoming[0];
  const nextWeekend = upcoming.find((d) => d.isWeekend);

  return (
    <div className="min-h-screen bg-[#05090a] text-slate-100">
      <PageViewTracker page="sonday" />
      <SiteHeader variant="marketing" />
      <MenuTabs active="taekil" />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <header className="text-center">
          <p className="text-xs font-semibold tracking-[0.3em] text-emerald-300/80">무료 · 2026–2027</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-300 bg-clip-text text-transparent">손없는날 달력</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">이사·입주·개업 날 잡을 때. 음력 끝자리가 9나 0인 날이에요.</p>
        </header>

        <section className="mt-8 rounded-3xl border border-emerald-400/30 bg-emerald-950/30 p-5 text-center">
          <p className="text-xs text-emerald-200/70">
            오늘 {tm}월 {td}일 ({lunarLabel(todayLunar.month, todayLunar.leap, todayLunar.day)})
          </p>
          <p className="mt-2 text-xl font-black text-emerald-100 break-keep">
            {todayDir === "없음" ? "오늘은 손 없는 날이에요 🎉" : `오늘 손은 ${todayDir}에 있어요`}
          </p>
          {todayDir !== "없음" ? (
            <p className="mt-1 text-sm text-white/60">오늘 옮긴다면 {todayDir}으로 가는 이사만 피하면 돼요.</p>
          ) : null}
          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            {nextDay ? (
              <div className="rounded-xl bg-black/30 px-3 py-2.5">
                <p className="text-[11px] text-white/50">다음 손없는날</p>
                <p className="mt-0.5 text-sm font-bold text-white">
                  {Number(nextDay.date.slice(5, 7))}/{nextDay.day}({nextDay.weekday})
                </p>
              </div>
            ) : null}
            {nextWeekend ? (
              <div className="rounded-xl bg-black/30 px-3 py-2.5">
                <p className="text-[11px] text-white/50">다음 주말 손없는날</p>
                <p className="mt-0.5 text-sm font-bold text-amber-200">
                  {Number(nextWeekend.date.slice(5, 7))}/{nextWeekend.day}({nextWeekend.weekday})
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <Link
          href="/taekil"
          className="mt-4 block rounded-2xl border border-amber-400/40 bg-amber-500/10 px-5 py-4 text-center text-sm font-bold text-amber-100"
        >
          🏠 손없는날 중에서 내 사주에 맞는 이삿날 고르기 →
        </Link>

        <section className="mt-8 space-y-4">
          <h2 className="text-lg font-bold text-white">달마다 손없는날</h2>
          {months.map((m) => (
            <div key={`${m.year}-${m.month}`} className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm font-bold text-emerald-100">
                {m.year}년 {m.month}월 <span className="text-xs font-normal text-white/50">· {m.days.length}일</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.days.map((d) => (
                  <span
                    key={d.date}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                      d.date < today
                        ? "border-white/5 text-white/30"
                        : d.isWeekend
                          ? "border-amber-400/50 bg-amber-500/10 text-amber-100"
                          : "border-white/15 text-white/85"
                    }`}
                  >
                    <b>{d.day}일({d.weekday})</b> <span className="text-[10px] opacity-70">{lunarLabel(d.lunarMonth, d.lunarLeap, d.lunarDay)}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-white/40">노란 칸은 주말 손없는날이에요.</p>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-base font-bold text-white">손 방향 보는 법</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-white/50">
                <th className="py-1.5 font-normal">음력 날짜 끝자리</th>
                <th className="py-1.5 font-normal">손이 있는 방향</th>
              </tr>
            </thead>
            <tbody className="text-white/85">
              {[
                ["1, 2", "동쪽"],
                ["3, 4", "남쪽"],
                ["5, 6", "서쪽"],
                ["7, 8", "북쪽"],
                ["9, 0", "손 없음"],
              ].map(([k, v]) => (
                <tr key={k} className="border-t border-white/10">
                  <td className="py-1.5">{k}</td>
                  <td className="py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-base font-bold text-white">자주 묻는 것</h2>
          {FAQ.map((f) => (
            <details key={f.q} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
              <summary className="cursor-pointer text-sm font-bold text-white/90">{f.q}</summary>
              <p className="mt-2 text-[13px] leading-relaxed text-white/70 break-keep">{f.a}</p>
            </details>
          ))}
        </section>

        <p className="mt-8 text-center">
          <Link href="/manse" className="text-xs text-emerald-200/70 underline">
            무료 만세력으로 내 사주 여덟 글자 보기
          </Link>
        </p>
      </main>
    </div>
  );
}
