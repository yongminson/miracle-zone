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
/** 출석 식별값 — 자물쇠와 같은 기기 토큰을 쓴다 */
const OWNER_KEY = "myeongun_lock_owner_v1";
/** 앱인토스에서는 명운 웹 주소로 보낸다 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

function getOwnerKey(): string {
  try {
    let key = localStorage.getItem(OWNER_KEY);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(OWNER_KEY, key);
    }
    return key;
  } catch {
    return "";
  }
}

type CheckinState = {
  total: number;
  nextRewardIn: number;
  pendingReward: number | null;
};

export function DailyMoodTracker({ className }: { className?: string }) {
  const [checkin, setCheckin] = useState<CheckinState | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimWish, setClaimWish] = useState("");
  const [claimName, setClaimName] = useState("");
  const [claimAnonymous, setClaimAnonymous] = useState(true);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimNotice, setClaimNotice] = useState<string | null>(null);
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

  /** 오늘 기록을 남기면 출석으로 친다. 날짜는 서버가 한국 기준으로 정한다 */
  const sendCheckin = useCallback(async (peek = false) => {
    const ownerKey = getOwnerKey();
    if (!ownerKey) return;
    try {
      const res = await fetch(`${API_BASE}/api/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerKey, peek }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        total?: number;
        nextRewardIn?: number;
        pendingReward?: number | null;
      };
      if (!json.success) return;
      setCheckin({
        total: json.total ?? 0,
        nextRewardIn: json.nextRewardIn ?? 10,
        pendingReward: json.pendingReward ?? null,
      });
    } catch {
      // 출석 기록에 실패해도 오늘 기록 자체는 남는다
    }
  }, []);

  const handleSave = useCallback(
    (mood: DailyMood) => {
      const next = saveRecord(mood, today);
      setRecords(next);
      void logEvent("record_save", { mood, total: next.length });
      void sendCheckin();
    },
    [today, sendCheckin],
  );

  /** 화면을 열면 출석 상태를 먼저 보여준다(이때는 기록하지 않는다) */
  useEffect(() => {
    if (!records) return;
    void sendCheckin(true);
  }, [records, sendCheckin]);

  const claimReward = useCallback(async () => {
    const wish = claimWish.trim();
    if (!wish) {
      setClaimNotice("소원 내용을 입력해 주세요.");
      return;
    }
    setClaimBusy(true);
    setClaimNotice(null);
    try {
      const res = await fetch(`${API_BASE}/api/checkin/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerKey: getOwnerKey(),
          wishText: wish,
          nameDisplay: claimAnonymous ? "anonymous" : "real",
          nameInput: claimAnonymous ? "" : claimName.trim(),
        }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json.success) {
        setClaimNotice(json.message || "보상을 받지 못했습니다.");
        return;
      }
      void logEvent("checkin_reward_claim", { milestone: checkin?.pendingReward ?? null });
      setClaimOpen(false);
      setClaimWish("");
      setClaimName("");
      setClaimNotice("기적의 제단에 소원을 올렸습니다. 24시간 동안 머뭅니다.");
      void sendCheckin();
    } catch {
      setClaimNotice("보상을 받는 중 오류가 발생했습니다.");
    } finally {
      setClaimBusy(false);
    }
  }, [claimAnonymous, claimName, claimWish, checkin, sendCheckin]);

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

      {/* 출석과 보상 — 날짜는 서버가 세므로 기기 설정을 바꿔도 늘지 않는다 */}
      {checkin ? (
        <div className="mt-3 border-t border-white/10 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-white/60">
              출석 <strong className="text-amber-300">{checkin.total}일</strong>
              {checkin.pendingReward ? null : (
                <span className="text-white/40"> · 10일 모으면 제단 1일권</span>
              )}
            </span>
            {checkin.pendingReward && !claimOpen ? (
              <button
                type="button"
                onClick={() => setClaimOpen(true)}
                className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-[11px] font-bold text-amber-200 transition hover:bg-amber-500/25"
              >
                🕯️ 제단 1일권 받기
              </button>
            ) : null}
          </div>

          {claimOpen ? (
            <div className="mt-3 rounded-xl border border-amber-500/25 bg-black/40 p-3">
              <p className="text-[11px] leading-relaxed text-white/60">
                출석 {checkin.pendingReward}일 보상입니다. 기적의 제단에 소원을 24시간 올려 드립니다.
              </p>
              <textarea
                value={claimWish}
                onChange={(e) => setClaimWish(e.target.value.slice(0, 200))}
                rows={2}
                placeholder="제단에 올릴 소원을 적어 주세요."
                className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-white/25 focus:border-amber-400/50"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setClaimAnonymous(true)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    claimAnonymous
                      ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                      : "border-white/15 text-white/50"
                  }`}
                >
                  익명
                </button>
                <button
                  type="button"
                  onClick={() => setClaimAnonymous(false)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                    !claimAnonymous
                      ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                      : "border-white/15 text-white/50"
                  }`}
                >
                  이름 남기기
                </button>
                {!claimAnonymous ? (
                  <input
                    type="text"
                    value={claimName}
                    onChange={(e) => setClaimName(e.target.value.slice(0, 12))}
                    placeholder="이름"
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] text-slate-100 outline-none placeholder:text-white/25"
                  />
                ) : null}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={claimBusy}
                  onClick={() => void claimReward()}
                  className="flex-1 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 px-3 py-2 text-[11px] font-bold text-stone-950 disabled:opacity-50"
                >
                  {claimBusy ? "올리는 중…" : "제단에 올리기"}
                </button>
                <button
                  type="button"
                  onClick={() => setClaimOpen(false)}
                  className="rounded-lg px-3 py-2 text-[11px] text-white/40 hover:text-white/70"
                >
                  나중에
                </button>
              </div>
            </div>
          ) : null}

          {!todayRecord ? (
            <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
              위에서 오늘 하루를 한 번 누르면 출석으로 기록됩니다.
            </p>
          ) : null}

          {claimNotice ? (
            <p className="mt-2 text-[11px] leading-relaxed text-amber-200/90">{claimNotice}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
