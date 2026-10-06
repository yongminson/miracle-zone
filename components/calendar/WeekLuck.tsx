"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { logEvent, requestTossReview } from "@/lib/analytics";
import { hasWebPushSubscription, isWebPushAvailable, subscribeDailyPush, unsubscribeDailyPush } from "@/lib/push/web-push";
import { disableAppDailyPush, enableAppDailyPush, hasAppDailyPush, isAppDailyPushAvailable } from "@/lib/push/app-push";
import type { DayLuck, DayLuckRange } from "@/lib/calendar/day-luck-types";

/**
 * 이번 주 나의 흐름(운세 캘린더) + "어제 맞았나요?" 기록.
 *
 * 매일 다시 올 이유를 만드는 자리다. 날마다 색(좋음·보통·조심)과 해 볼 행동 하나를 보여주고,
 * 다음 날 들어오면 어제가 어땠는지 한 번 누르게 한다. 쌓인 기록은 그대로 보여준다
 * ("N일 중 맞았어요 M일"). 운세가 학습한다고 말하지 않는다 — 계산식이기 때문이다.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const STORE_KEY = "myeongun_dayluck_v1";
const KEEP_DAYS = 90;

type Feedback = "hit" | "meh" | "miss";
type Store = {
  seen: Record<string, { title: string; tone: DayLuck["tone"] }>;
  feedback: Record<string, Feedback>;
};

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Store>) : {};
    return { seen: parsed.seen ?? {}, feedback: parsed.feedback ?? {} };
  } catch {
    return { seen: {}, feedback: {} };
  }
}

function writeStore(store: Store) {
  try {
    // 오래된 날은 지운다(기기 저장 공간을 계속 쓰지 않게)
    const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
    const prune = <T,>(rec: Record<string, T>) =>
      Object.fromEntries(Object.entries(rec).filter(([d]) => d >= cutoff));
    localStorage.setItem(STORE_KEY, JSON.stringify({ seen: prune(store.seen), feedback: prune(store.feedback) }));
  } catch {
    // 저장이 막힌 기기 — 이번 화면에서는 그대로 보인다
  }
}

function shiftDay(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function label(ymd: string, weekday?: string) {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}월 ${Number(d)}일${weekday ? `(${weekday})` : ""}`;
}

const TONE_STYLE: Record<DayLuck["tone"], { dot: string; ring: string; text: string; name: string }> = {
  good: { dot: "bg-emerald-400", ring: "border-emerald-400/60", text: "text-emerald-200", name: "힘이 실리는 날" },
  normal: { dot: "bg-amber-300/80", ring: "border-amber-300/40", text: "text-amber-100", name: "무난한 날" },
  caution: { dot: "bg-rose-400", ring: "border-rose-400/60", text: "text-rose-200", name: "조심할 날" },
};

export function WeekLuck({
  birthDate,
  calendarType,
  source,
  className,
}: {
  birthDate: string;
  calendarType: "solar" | "lunar" | "lunar-leap";
  /** 어느 화면에서 보였는지 — 계측에 담긴다 */
  source: string;
  className?: string;
}) {
  const [range, setRange] = useState<DayLuckRange | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [store, setStore] = useState<Store>({ seen: {}, feedback: {} });
  const [thanks, setThanks] = useState(false);

  // 매일 아침 알림 — 웹은 브라우저 알림, 구글 앱(1.1.5~)은 앱이 휴대폰에 예약한다.
  // 토스·옛 앱처럼 둘 다 안 되면 unavailable 로 두고 버튼 자체를 숨긴다
  const [push, setPush] = useState<"unavailable" | "off" | "on" | "busy">("unavailable");
  const [pushNote, setPushNote] = useState<string | null>(null);
  useEffect(() => {
    if (isAppDailyPushAvailable()) {
      void hasAppDailyPush().then((on) => setPush(on ? "on" : "off"));
      return;
    }
    if (!isWebPushAvailable()) return;
    void hasWebPushSubscription().then((on) => setPush(on ? "on" : "off"));
  }, []);

  const turnOnPush = useCallback(async () => {
    setPush("busy");
    setPushNote(null);
    const inApp = isAppDailyPushAvailable();
    const result = inApp
      ? await enableAppDailyPush({ birthDate, calendarType })
      : await subscribeDailyPush({ birthDate, calendarType });
    if (result.ok) {
      setPush("on");
      setPushNote("내일 아침 8시부터 알려 드릴게요.");
      void logEvent("push_subscribe", { source, channel: inApp ? "app" : "web" });
    } else {
      setPush("off");
      setPushNote(result.message);
    }
  }, [birthDate, calendarType, source]);

  const turnOffPush = useCallback(async () => {
    setPush("busy");
    const inApp = isAppDailyPushAvailable();
    if (inApp) await disableAppDailyPush();
    else await unsubscribeDailyPush();
    setPush("off");
    setPushNote("알림을 껐어요.");
    void logEvent("push_unsubscribe", { source, channel: inApp ? "app" : "web" });
  }, [source]);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/calendar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ birthDate, calendarType, days: 7 }),
        });
        const json = (await res.json()) as DayLuckRange & { success?: boolean };
        if (cancelled || !json.success || !json.days?.length) return;
        setRange(json);
        setPicked(json.days[0].date);

        // 오늘 본 흐름을 남겨 둔다. 내일 "어제 맞았나요?"를 물을 때 쓴다
        const current = readStore();
        const today = json.days[0];
        current.seen[today.date] = { title: today.title, tone: today.tone };
        writeStore(current);
        setStore(current);
        void logEvent("week_luck_view", { source, best: json.best, todayTone: today.tone });
      } catch {
        // 캘린더를 못 불러와도 운세 결과는 그대로 보인다
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [birthDate, calendarType, source]);

  const today = range?.days[0]?.date ?? null;
  const yesterday = today ? shiftDay(today, -1) : null;
  const askYesterday = yesterday && store.seen[yesterday] && !store.feedback[yesterday] ? yesterday : null;

  const tally = useMemo(() => {
    const values = Object.values(store.feedback);
    return {
      total: values.length,
      hit: values.filter((v) => v === "hit").length,
      meh: values.filter((v) => v === "meh").length,
    };
  }, [store]);

  const answer = useCallback(
    (value: Feedback) => {
      if (!askYesterday) return;
      const current = readStore();
      current.feedback[askYesterday] = value;
      writeStore(current);
      setStore(current);
      setThanks(true);
      void logEvent("fortune_feedback", { value, tone: current.seen[askYesterday]?.tone ?? null, source });
      if (value === "hit") void requestTossReview("feedback_hit");
    },
    [askYesterday, source],
  );

  if (!range) return null;

  const pickedDay = range.days.find((d) => d.date === picked) ?? range.days[0];
  const best = range.days.find((d) => d.date === range.best) ?? null;
  const caution = range.days.find((d) => d.date === range.caution) ?? null;

  return (
    <section className={`rounded-2xl border border-white/10 bg-black/30 p-4 ${className ?? ""}`}>
      {/* 어제 맞았나요 — 다시 들어온 사람에게만 */}
      {askYesterday ? (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
          <p className="text-xs text-amber-100">
            어제({label(askYesterday)})는 <strong>‘{store.seen[askYesterday].title}’</strong>이었어요. 어땠나요?
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ["hit", "👍 맞았어요"],
                ["meh", "😐 비슷했어요"],
                ["miss", "👎 아니었어요"],
              ] as const
            ).map(([value, text]) => (
              <button
                key={value}
                type="button"
                onClick={() => answer(value)}
                className="rounded-lg border border-white/15 bg-black/30 py-2 text-[11px] text-white/80 transition hover:border-amber-300/50 hover:bg-amber-500/10"
              >
                {text}
              </button>
            ))}
          </div>
        </div>
      ) : thanks ? (
        <p className="mb-4 rounded-xl bg-white/[0.04] px-3 py-2 text-[11px] text-white/60">기록했어요. 내일도 알려 주세요.</p>
      ) : null}

      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-white/85">이번 주 나의 흐름</h3>
        {tally.total > 0 ? (
          <span className="text-[11px] text-white/45">
            기록 {tally.total}일 중 맞았어요 {tally.hit}일{tally.meh ? ` · 비슷 ${tally.meh}일` : ""}
          </span>
        ) : null}
      </div>

      {/* 7일 */}
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {range.days.map((day, i) => {
          const style = TONE_STYLE[day.tone];
          const active = day.date === pickedDay.date;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => setPicked(day.date)}
              className={`flex flex-col items-center rounded-xl border py-2 transition ${
                active ? `${style.ring} bg-white/[0.06]` : "border-white/10 hover:border-white/25"
              }`}
            >
              <span className="text-[10px] text-white/45">{i === 0 ? "오늘" : day.weekday}</span>
              <span className="mt-0.5 text-sm font-bold text-white/85">{Number(day.date.slice(8))}</span>
              <span className={`mt-1 h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {day.date === range.best ? <span className="mt-0.5 text-[9px] text-emerald-300">★</span> : null}
            </button>
          );
        })}
      </div>

      {/* 고른 날 */}
      <div className="mt-3 rounded-xl bg-white/[0.04] p-3">
        <p className="text-[11px] text-white/45">
          {label(pickedDay.date, pickedDay.weekday)} · <span className={TONE_STYLE[pickedDay.tone].text}>{TONE_STYLE[pickedDay.tone].name}</span>
        </p>
        <p className="mt-1 text-sm font-bold text-white/90">{pickedDay.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-white/70">👉 {pickedDay.action}</p>
        {pickedDay.note ? <p className="mt-1 text-xs leading-relaxed text-white/55">{pickedDay.note}</p> : null}
      </div>

      {/* 이번 주 핵심 */}
      <div className="mt-3 space-y-1 text-[11px] leading-relaxed">
        {best ? (
          <p className="text-emerald-200/90">
            ★ 이번 주 힘이 실리는 날: <strong>{label(best.date, best.weekday)}</strong> — {best.title}
          </p>
        ) : null}
        {caution ? (
          <p className="text-rose-200/90">
            ⚠ 조심할 날: <strong>{label(caution.date, caution.weekday)}</strong> — {caution.title}
          </p>
        ) : null}
      </div>

      {/* 매일 아침 알림 — 원하는 사람만 켠다(토스 UX 기준: 알림 동의는 필요할 때) */}
      {push === "off" || push === "busy" ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <button
            type="button"
            disabled={push === "busy"}
            onClick={() => void turnOnPush()}
            className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 py-2.5 text-xs font-bold text-stone-950 disabled:opacity-60"
          >
            {push === "busy" ? "설정하는 중…" : "🔔 매일 아침 8시, 오늘의 흐름 알림 받기"}
          </button>
          <p className="mt-1.5 text-[10px] leading-relaxed text-white/40">
            생년월일로 계산한 그날의 흐름을 알림으로 보내 드려요. 언제든 끌 수 있어요.
          </p>
        </div>
      ) : push === "on" ? (
        <p className="mt-3 text-[11px] text-emerald-200/80">
          🔔 매일 아침 8시에 알려 드려요 ·{" "}
          <button type="button" onClick={() => void turnOffPush()} className="underline underline-offset-2 text-white/45">
            끄기
          </button>
        </p>
      ) : null}
      {pushNote ? <p className="mt-1.5 text-[11px] text-amber-200/90">{pushNote}</p> : null}

      <p className="mt-3 text-[10px] leading-relaxed text-white/35">
        사주의 날 기운을 계산한 참고용 흐름이에요. 일이 ‘생긴다’는 뜻이 아니라, 이런 일에 힘을 쓰면 좋다는 뜻이에요.
        내일 다시 와서 오늘이 어땠는지 알려 주세요.
      </p>
    </section>
  );
}
