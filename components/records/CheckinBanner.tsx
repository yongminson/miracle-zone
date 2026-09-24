"use client";

import { useCallback, useEffect, useState } from "react";
import { logEvent } from "@/lib/analytics";

/**
 * 출석 상태 띠 — 메뉴 바로 아래에 늘 보인다.
 *
 * 평소에는 조용한 한 줄이고, 받을 보상이 생겼을 때만 금색으로 눈에 띈다.
 * 팝업으로 막지 않는 이유는, 운세를 보러 들어온 사람의 첫 화면을 가로막으면
 * 그대로 나가버리기 때문이다.
 */

const OWNER_KEY = "myeongun_lock_owner_v1";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const WISH_MAX = 200;

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
  alreadyCheckedIn: boolean;
};

export function CheckinBanner() {
  const [state, setState] = useState<CheckinState | null>(null);
  const [open, setOpen] = useState(false);
  const [wish, setWish] = useState("");
  const [name, setName] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /** 상태만 읽어 온다. 화면을 열었다고 출석이 찍히면 안 된다 */
  const load = useCallback(async () => {
    const ownerKey = getOwnerKey();
    if (!ownerKey) return;
    try {
      const res = await fetch(`${API_BASE}/api/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerKey, peek: true }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        total?: number;
        nextRewardIn?: number;
        pendingReward?: number | null;
        alreadyCheckedIn?: boolean;
      };
      if (!json.success) return;
      setState({
        total: json.total ?? 0,
        nextRewardIn: json.nextRewardIn ?? 10,
        pendingReward: json.pendingReward ?? null,
        alreadyCheckedIn: !!json.alreadyCheckedIn,
      });
    } catch {
      // 상태를 못 읽으면 띠를 그리지 않는다
    }
  }, []);

  useEffect(() => {
    void load();
    // 오늘 기록을 남기면 출석이 올라가므로 그때 다시 읽는다
    const onRecorded = () => void load();
    window.addEventListener("myeongun:checkin-updated", onRecorded);
    return () => window.removeEventListener("myeongun:checkin-updated", onRecorded);
  }, [load]);

  const claim = useCallback(async () => {
    const text = wish.trim();
    if (!text) {
      setNotice("소원 내용을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/api/checkin/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerKey: getOwnerKey(),
          wishText: text,
          nameDisplay: anonymous ? "anonymous" : "real",
          nameInput: anonymous ? "" : name.trim(),
        }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !json.success) {
        setNotice(json.message || "보상을 받지 못했습니다.");
        return;
      }
      void logEvent("checkin_reward_claim", { milestone: state?.pendingReward ?? null });
      setOpen(false);
      setWish("");
      setName("");
      setNotice("기적의 제단에 소원을 올렸습니다. 24시간 동안 머뭅니다.");
      void load();
    } catch {
      setNotice("보상을 받는 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }, [anonymous, load, name, state, wish]);

  if (!state) return null;

  const ready = !!state.pendingReward;

  return (
    <div
      className={`w-full border-b ${
        ready
          ? "border-amber-400/40 bg-gradient-to-r from-amber-950/70 via-amber-900/50 to-amber-950/70"
          : "border-white/[0.06] bg-black/30"
      }`}
    >
      <div className="mx-auto flex max-w-screen-lg items-center gap-2 px-4 py-1.5 sm:px-6">
        <span className="text-[11px]" aria-hidden>
          {ready ? "🕯️" : "🗓️"}
        </span>

        {ready ? (
          <>
            <span className="min-w-0 flex-1 truncate text-[11px] text-amber-100">
              제단 <strong className="text-amber-300">1일권</strong>을 받을 수 있어요
            </span>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="shrink-0 animate-pulse rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 px-2.5 py-1 text-[11px] font-bold text-stone-950"
            >
              {open ? "닫기" : "받기"}
            </button>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[11px] text-white/50">
            {state.alreadyCheckedIn ? <span className="text-emerald-300/80">✓ </span> : null}
            출석 <strong className="text-amber-300/90">{state.total}일</strong>
            <span className="text-white/35"> · 1일권까지 {state.nextRewardIn}일</span>
          </span>
        )}
      </div>

      {open && ready ? (
        <div className="mx-auto max-w-screen-lg px-4 pb-3 sm:px-6">
          <div className="rounded-xl border border-amber-500/25 bg-black/50 p-3">
            <p className="text-[11px] leading-relaxed text-white/60">
              출석 {state.pendingReward}일 보상입니다. 기적의 제단에 소원을 24시간 올려 드립니다.
            </p>
            <textarea
              value={wish}
              onChange={(e) => setWish(e.target.value.slice(0, WISH_MAX))}
              rows={2}
              placeholder="제단에 올릴 소원을 적어 주세요."
              className="mt-2 w-full resize-none rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-white/25 focus:border-amber-400/50"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAnonymous(true)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  anonymous
                    ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                    : "border-white/15 text-white/50"
                }`}
              >
                익명
              </button>
              <button
                type="button"
                onClick={() => setAnonymous(false)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  !anonymous
                    ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                    : "border-white/15 text-white/50"
                }`}
              >
                이름 남기기
              </button>
              {!anonymous ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 12))}
                  placeholder="이름"
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 text-[11px] text-slate-100 outline-none placeholder:text-white/25"
                />
              ) : null}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void claim()}
              className="mt-2 w-full rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 px-3 py-2 text-[11px] font-bold text-stone-950 disabled:opacity-50"
            >
              {busy ? "올리는 중…" : "제단에 올리기"}
            </button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="mx-auto max-w-screen-lg px-4 pb-2 sm:px-6">
          <p className="text-[11px] text-amber-200/90">{notice}</p>
        </div>
      ) : null}
    </div>
  );
}
