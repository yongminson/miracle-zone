"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PaymentMethodCheckoutModal } from "@/components/payments/PaymentMethodCheckoutModal";
import {
  LOCK_COLORS,
  LOCK_PRODUCT_IDS,
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
  onPaid: (payload: {
    paymentId: string;
    merchantUid: string | null;
    purchaseToken?: string;
    platform?: "web" | "app";
    draft: LockDraft;
  }) => Promise<void>;
}) {
  const [tier, setTier] = useState<LockTier>("basic");
  const [color, setColor] = useState<string>(LOCK_COLORS[0].value);
  const [displayName, setDisplayName] = useState("");
  const [wish, setWish] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [waitingApp, setWaitingApp] = useState(false);
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

  // 앱이 결제 결과를 알려줄 때 쓰려고 최신 입력값을 담아 둔다
  const draftRef = useRef(draft);
  draftRef.current = draft;

  /** 앱(WebView)에서는 구글 인앱결제를 앱에 요청하고, 결과 메시지를 기다린다 */
  const requestAppPurchase = () => {
    const bridge = (window as unknown as { ReactNativeWebView?: { postMessage: (m: string) => void } })
      .ReactNativeWebView;
    if (!bridge) {
      setError("앱에서 결제를 시작하지 못했습니다. 앱을 최신 버전으로 업데이트해 주세요.");
      return;
    }
    setWaitingApp(true);
    bridge.postMessage(JSON.stringify({ type: "REQUEST_IAP", productId: LOCK_PRODUCT_IDS[tier], tier }));
  };

  // 앱이 결제 결과를 알려주면 자물쇠를 건다
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      let msg: { type?: string; purchaseToken?: string; message?: string } | null = null;
      try {
        msg = typeof event.data === "string" ? JSON.parse(event.data) : null;
      } catch {
        return;
      }
      if (!msg?.type) return;

      if (msg.type === "IAP_SUCCESS" && msg.purchaseToken) {
        setWaitingApp(false);
        void onPaid({
          paymentId: msg.purchaseToken,
          merchantUid: null,
          purchaseToken: msg.purchaseToken,
          platform: "app",
          draft: draftRef.current,
        });
        return;
      }
      if (msg.type === "IAP_FAILED" || msg.type === "IAP_CANCELED") {
        setWaitingApp(false);
        if (msg.type === "IAP_FAILED") setError(msg.message || "결제를 완료하지 못했습니다.");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onPaid]);

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
    if (isApp) {
      requestAppPurchase();
      return;
    }
    setShowPayment(true);
  };


  const selectedColorObj = LOCK_COLORS.find((c) => c.value === color) ?? LOCK_COLORS[0];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#0d1322]/90 to-[#060810]/95 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.65)] backdrop-blur-xl sm:p-5">
      {/* 배경 은은한 앰버 빛무리 */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-amber-200">소원 자물쇠 봉인</h2>
            <p className="text-[11px] text-slate-400">한 번 걸린 소원은 영원히 이곳에 남습니다</p>
          </div>
        </div>
        <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-300/90">
          영구 보존
        </span>
      </div>

      {/* 소원 입력 */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="wish-input" className="text-xs font-medium text-slate-300">
            소원 <span className="text-amber-400/80">*</span>
          </label>
          <span className="text-[10px] tabular-nums text-slate-500">
            {wish.length} / {WISH_MAX}
          </span>
        </div>
        <textarea
          id="wish-input"
          value={wish}
          onChange={(e) => setWish(e.target.value.slice(0, WISH_MAX))}
          rows={3}
          placeholder="이 자물쇠에 남길 간절한 소원을 적어 주세요."
          className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm leading-relaxed text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:bg-black/60 focus:ring-1 focus:ring-amber-400/30"
        />
      </div>

      {/* 이름 남기기 / 익명 선택 */}
      <div className="mt-3.5">
        <span className="mb-1.5 block text-xs font-medium text-slate-300">자물쇠에 새길 이름</span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setIsAnonymous(true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isAnonymous
                  ? "border border-amber-400/40 bg-amber-500/20 text-amber-200 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              익명으로 걸기
            </button>
            <button
              type="button"
              onClick={() => setIsAnonymous(false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                !isAnonymous
                  ? "border border-amber-400/40 bg-amber-500/20 text-amber-200 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              이름 새기기
            </button>
          </div>
          {!isAnonymous ? (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value.slice(0, 12))}
              placeholder="새길 이름 (최대 12자)"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/60 focus:bg-black/60 focus:ring-1 focus:ring-amber-400/30"
            />
          ) : null}
        </div>
      </div>

      {/* 등급 선택 */}
      <div className="mt-4">
        <span className="mb-2 block text-xs font-medium text-slate-300">자물쇠 등급</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(LOCK_TIERS) as LockTier[]).map((key) => {
            const t = LOCK_TIERS[key];
            const active = tier === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTier(key)}
                className={`relative rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-amber-400/70 bg-gradient-to-b from-amber-500/15 to-amber-900/10 shadow-[0_0_16px_rgba(245,158,11,0.12)] ring-1 ring-amber-400/40"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                }`}
              >
                {/* 상단 뱃지 및 아이콘 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {key === "basic" && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-400/20 text-slate-300">
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <rect x="4" y="11" width="16" height="10" rx="2" />
                          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                      </span>
                    )}
                    {key === "color" && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="6" />
                        </svg>
                      </span>
                    )}
                    {key === "shine" && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400/20 text-amber-300">
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2l2.4 6.6L21 11l-5.6 4.4L17 22l-5-4-5 4 1.6-6.6L3 11l6.6-2.4L12 2z" />
                        </svg>
                      </span>
                    )}
                    <span className="text-xs font-bold text-slate-100">{t.label}</span>
                  </div>
                  {active && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-stone-950">
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </div>

                <p className="mt-1.5 text-xs font-bold text-amber-300">
                  {t.priceWon.toLocaleString()}원
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 색상 선택 */}
      {canPickColor ? (
        <div className="mt-4 rounded-xl border border-white/[0.08] bg-black/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">자물쇠 색상</span>
            <span className="text-xs font-medium text-amber-300/90">{selectedColorObj.label}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {LOCK_COLORS.map((c) => {
              const isSelected = color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  aria-label={c.label}
                  className={`relative h-9 w-9 rounded-full transition-all duration-150 ${
                    isSelected
                      ? "scale-110 shadow-[0_0_12px_rgba(245,158,11,0.5)] ring-2 ring-amber-300 ring-offset-2 ring-offset-[#0d1322]"
                      : "border border-white/25 opacity-80 hover:scale-105 hover:opacity-100"
                  }`}
                  style={{
                    background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${c.value} 55%, #111111 100%)`,
                  }}
                >
                  {isSelected && (
                    <span className="absolute inset-0 flex items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-400">
          <span className="h-2 w-2 rounded-full bg-slate-400/80" />
          <span>기본 자물쇠는 단단한 백은빛(은색)으로 영구히 걸립니다.</span>
        </div>
      )}

      {/* 오류 메시지 */}
      {error ? (
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-200">
          <svg className="h-4 w-4 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      ) : null}

      {/* 결제 버튼 */}
      <button
        type="button"
        disabled={busy || waitingApp}
        onClick={openPayment}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 px-6 py-3.5 text-sm font-bold text-stone-950 shadow-[0_4px_20px_rgba(245,158,11,0.3)] transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
      >
        {waitingApp ? "앱에서 결제 진행 중…" : busy ? (
          <>
            <svg className="h-4 w-4 animate-spin text-stone-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>자물쇠를 거는 중…</span>
          </>
        ) : (
          <span>{price.toLocaleString()}원 결제하고 자물쇠 걸기</span>
        )}
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
