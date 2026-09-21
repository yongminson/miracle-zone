"use client";

import { useCallback, useEffect, useState } from "react";
import { PaymentMethodCheckoutModal } from "@/components/payments/PaymentMethodCheckoutModal";
import {
  LOCK_COLORS,
  LOCK_TIERS,
  SILVER,
  type LockTier,
  type WallLock,
} from "@/lib/locks/wall-locks";

const DRAFT_KEY = "myeongun_lock_draft_v1";
const WISH_MAX = 300;

export type LockDraft = {
  tier: LockTier;
  color: string;
  displayName: string;
  wish: string;
};

export function readLockDraft(): LockDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as LockDraft) : null;
  } catch {
    return null;
  }
}

export function saveLockDraft(draft: LockDraft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // 저장에 실패해도 PC 결제는 그대로 진행된다(모바일 복귀 시에만 필요한 값)
  }
}

export function clearLockDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // 지우지 못해도 다음 결제 때 덮어써진다
  }
}

/** 자물쇠를 거는 화면 — 소원을 쓰고 등급·색을 고른 뒤 결제로 넘어간다 */
export function LockComposer({
  isApp,
  busy,
  onPaid,
}: {
  isApp: boolean;
  busy: boolean;
  onPaid: (payload: { paymentId: string; merchantUid: string; draft: LockDraft }) => Promise<void>;
}) {
  const [tier, setTier] = useState<LockTier>("basic");
  const [color, setColor] = useState<string>(LOCK_COLORS[0].value);
  const [displayName, setDisplayName] = useState("");
  const [wish, setWish] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPickColor = LOCK_TIERS[tier].canPickColor;
  const price = LOCK_TIERS[tier].priceWon;
  const trimmedWish = wish.trim();

  const draft: LockDraft = {
    tier,
    color: canPickColor ? color : SILVER,
    displayName: isAnonymous ? "" : displayName.trim().slice(0, 12),
    wish: trimmedWish,
  };

  const openPayment = () => {
    if (!trimmedWish) {
      setError("소원을 입력해 주세요.");
      return;
    }
    if (!isAnonymous && !displayName.trim()) {
      setError("자물쇠에 새길 이름을 입력하거나 익명을 선택해 주세요.");
      return;
    }
    setError(null);
    // 모바일은 결제창으로 이동했다 돌아오므로 입력한 내용을 먼저 저장해 둔다
    saveLockDraft(draft);
    setShowPayment(true);
  };

  if (isApp) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="text-xs font-bold text-amber-300/90">자물쇠 걸기</p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/50">
          앱에서는 아직 자물쇠를 걸 수 없습니다. 브라우저에서 saju.ymstudio.co.kr/lock 으로 접속해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <p className="text-xs font-bold text-amber-300/90">자물쇠 걸기</p>
      <p className="mt-1 text-[11px] text-white/40">한 번 걸면 지워지지 않습니다.</p>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-[11px] text-white/60">소원</span>
        <textarea
          value={wish}
          onChange={(e) => setWish(e.target.value.slice(0, WISH_MAX))}
          rows={3}
          placeholder="이 자물쇠에 남길 소원을 적어 주세요."
          className="w-full resize-none rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-white/25 focus:border-amber-400/50"
        />
        <span className="mt-1 block text-right text-[10px] text-white/30">
          {wish.length} / {WISH_MAX}
        </span>
      </label>

      <div className="mt-1">
        <span className="mb-1.5 block text-[11px] text-white/60">자물쇠에 새길 이름</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAnonymous(true)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              isAnonymous
                ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                : "border-white/15 bg-white/5 text-white/60"
            }`}
          >
            익명
          </button>
          <button
            type="button"
            onClick={() => setIsAnonymous(false)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              !isAnonymous
                ? "border-amber-400/60 bg-amber-500/15 text-amber-200"
                : "border-white/15 bg-white/5 text-white/60"
            }`}
          >
            이름 남기기
          </button>
          {!isAnonymous ? (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 12))}
              placeholder="이름 (최대 12자)"
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-xs text-slate-100 outline-none placeholder:text-white/25 focus:border-amber-400/50"
            />
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(Object.keys(LOCK_TIERS) as LockTier[]).map((key) => {
          const t = LOCK_TIERS[key];
          const active = tier === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTier(key)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                active
                  ? "border-amber-400/60 bg-amber-500/10"
                  : "border-white/15 bg-white/5 hover:border-amber-400/40"
              }`}
            >
              <p className="text-sm font-bold text-slate-100">{t.label}</p>
              <p className="text-[11px] text-amber-300/90">{t.priceWon.toLocaleString()}원</p>
              <p className="mt-1 text-[10px] leading-relaxed text-white/45">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {canPickColor ? (
        <div className="mt-3">
          <span className="mb-1.5 block text-[11px] text-white/60">색상</span>
          <div className="flex flex-wrap gap-2">
            {LOCK_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                aria-label={c.label}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  color === c.value ? "border-amber-300 scale-110" : "border-white/20"
                }`}
                style={{ background: c.value }}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[10px] text-white/35">기본 자물쇠는 은색으로 걸립니다.</p>
      )}

      {error ? (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={openPayment}
        className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-400 px-6 py-3.5 text-sm font-bold text-stone-950 transition hover:brightness-105 disabled:opacity-50"
      >
        {busy ? "자물쇠를 거는 중…" : `${price.toLocaleString()}원 결제하고 자물쇠 걸기`}
      </button>

      <PaymentMethodCheckoutModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        amount={price}
        productName={`소원 자물쇠 (${LOCK_TIERS[tier].label})`}
        confirmLabel="결제하고 자물쇠 걸기"
        buyerName={draft.displayName || "명운 이용자"}
        buyerTel="010-0000-0000"
        buyerEmail="lock@ymstudio.co.kr"
        onPaymentSuccess={async ({ imp_uid, merchant_uid }) => {
          setShowPayment(false);
          await onPaid({ paymentId: imp_uid, merchantUid: merchant_uid, draft });
        }}
        onPaymentError={(message) => {
          setShowPayment(false);
          clearLockDraft();
          setError(message);
        }}
      />
    </div>
  );
}

/** 서버가 돌려준 자물쇠를 화면에서 쓰는 형태로 바꾼다 */
export function toWallLock(row: {
  id: string;
  tier: string;
  color: string;
  display_name: string | null;
  wish: string;
  created_at: string;
}): WallLock {
  const tier: LockTier =
    row.tier === "color" || row.tier === "shine" ? row.tier : "basic";
  return {
    id: row.id,
    tier,
    color: row.color || SILVER,
    name: row.display_name ?? "",
    wish: row.wish,
    createdAt: row.created_at,
  };
}
