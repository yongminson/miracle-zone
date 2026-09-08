"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { logEvent } from "@/lib/analytics";
import {
  MOOD_OPTIONS,
  getKstDateKey,
  getMoodMeta,
  getRecord,
  getWeekdayLabel,
  readRecords,
  saveRecord,
  shiftDateKey,
  summarizeRecords,
  type DailyMood,
  type DailyRecord,
} from "@/lib/records/daily-records";

const MOOD_DOT: Record<DailyMood, string> = {
  good: "border-emerald-400/60 bg-emerald-500/25 text-emerald-200",
  normal: "border-slate-400/50 bg-slate-500/25 text-slate-200",
  bad: "border-rose-400/50 bg-rose-500/25 text-rose-200",
};

/**
 * 운세를 본 뒤 "오늘 실제로 어땠나요?"를 한 번만 묻는다.
 * 답이 쌓이면 최근 7일 흐름을 바로 돌려줘서, 첫날부터 볼 것이 있게 만든다.
 */
export function DailyMoodTracker({ className }: { className?: string }) {
  const [records, setRecords] = useState<DailyRecord[] | null>(null);
  const today = getKstDateKey();

  // localStorage는 클라이언트에서만 읽는다(서버 렌더 결과와 어긋나지 않게)
  useEffect(() => {
    setRecords(readRecords());
  }, []);

  const summary = useMemo(
    () => (records ? summarizeRecords(records) : null),
    [records],
  );
  const todayRecord = records ? getRecord(today, records) : null;
  const yesterdayRecord = records ? getRecord(shiftDateKey(today, -1), records) : null;

  const handleSave = useCallback(
    (mood: DailyMood) => {
      const next = saveRecord(mood, today);
      setRecords(next);
      void logEvent("record_save", { mood, total: next.length });
    },
    [today],
  );

  // 첫 렌더(기록을 읽기 전)에는 아무것도 그리지 않는다
  if (!records || !summary) return null;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/30 p-4 ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-yellow-400/90">
          {todayRecord ? "오늘 기록 완료" : "오늘 실제로 어땠나요?"}
        </h3>
        <span className="text-[11px] text-white/40">최근 7일 {summary.filled7}/7</span>
      </div>

      {!todayRecord ? (
        <p className="mt-1 text-[11px] leading-relaxed text-white/45">
          한 번만 누르면 됩니다. 기록이 쌓이면 나의 흐름을 볼 수 있어요.
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {MOOD_OPTIONS.map((option) => {
          const isSelected = todayRecord?.mood === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSave(option.value)}
              aria-pressed={isSelected}
              className={`rounded-xl border px-2 py-3 text-sm font-medium transition-all active:scale-95 ${
                isSelected
                  ? "border-yellow-500/60 bg-yellow-500/15 text-yellow-200"
                  : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <span className="mr-1" aria-hidden>
                {option.emoji}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>

      {/* 최근 7일 — 연속 출석이 아니라 채운 칸을 보여준다 */}
      <div className="mt-4 flex items-end justify-between gap-1">
        {summary.last7.map((day) => {
          const isToday = day.date === today;
          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`flex h-8 w-full items-center justify-center rounded-lg border text-xs ${
                  day.mood
                    ? MOOD_DOT[day.mood]
                    : "border-dashed border-white/12 bg-transparent text-white/20"
                }`}
                title={`${day.date}${day.mood ? ` · ${getMoodMeta(day.mood).label}` : " · 기록 없음"}`}
              >
                {day.mood ? getMoodMeta(day.mood).emoji : "·"}
              </div>
              <span
                className={`text-[10px] ${isToday ? "font-bold text-yellow-400/90" : "text-white/35"}`}
              >
                {getWeekdayLabel(day.date)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 첫날부터 돌려줄 것이 있어야 다시 온다 */}
      <div className="mt-3 space-y-1 text-[11px] leading-relaxed text-white/60">
        {todayRecord && yesterdayRecord ? (
          <p>
            어제는 {getMoodMeta(yesterdayRecord.mood).emoji}{" "}
            {getMoodMeta(yesterdayRecord.mood).label}, 오늘은{" "}
            {getMoodMeta(todayRecord.mood).emoji} {getMoodMeta(todayRecord.mood).label}이에요.
          </p>
        ) : null}

        {todayRecord && summary.total === 1 ? (
          <p>첫 기록이에요. 내일 한 번 더 누르면 흐름이 보이기 시작합니다.</p>
        ) : null}

        {summary.filled7 === 7 ? (
          <p className="text-yellow-400/80">
            이번 주 7일을 모두 채웠어요 — 좋았음 {summary.counts.good} · 보통{" "}
            {summary.counts.normal} · 아쉬움 {summary.counts.bad}
          </p>
        ) : null}

        {summary.weekdayInsight ? (
          <p>
            지금까지는 {summary.weekdayInsight.weekday}요일 기록이 가장 좋았어요 (표본{" "}
            {summary.weekdayInsight.samples}일).
          </p>
        ) : null}

        {summary.total >= 2 ? <p className="text-white/35">지금까지 {summary.total}일 기록</p> : null}
      </div>
    </div>
  );
}
