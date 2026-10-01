"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PaymentMethodCheckoutModal } from "@/components/payments/PaymentMethodCheckoutModal";
import { logEvent } from "@/lib/analytics";
import { extractPaymentReturnId } from "@/lib/payments/return-params";
import {
  NEWYEAR_DETAIL_PRICE_WON,
  NEWYEAR_DETAIL_PRODUCT_ID,
  type NewYearDetail,
  type NewYearDetailInput,
  type NewYearResult,
} from "@/lib/newyear/newyear-types";
import { purchaseNewYearOnToss } from "./toss-purchase";

/**
 * 신년운세 상세 풀이(유료) — 결제·다시 보기·화면.
 *
 * 결제가 끝났는데 풀이를 못 받는 일이 없도록, 결제 식별자를 받자마자 기기에 먼저
 * 남겨 두고(PENDING) 서버 응답을 받은 뒤에 지운다. 모바일 결제는 결제창으로
 * 이동했다가 돌아오므로, 돌아온 주소의 결제 식별자로 이어서 처리한다.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const IS_TOSS = process.env.NEXT_PUBLIC_PLATFORM === "toss";
const PENDING_KEY = "myeongun_newyear_pending_v1";
const PURCHASES_KEY = "myeongun_newyear_purchases_v1";
const PENDING_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=kr.co.ymstudio.myeongun";

type PaymentIds = {
  paymentId?: string;
  merchantUid?: string | null;
  purchaseToken?: string;
  tossOrderId?: string;
  /** 운영자 모드로 결제 없이 만든 풀이 */
  admin?: boolean;
};

function hasIds(ids: PaymentIds | undefined): boolean {
  return !!(ids?.paymentId || ids?.purchaseToken || ids?.tossOrderId);
}
type Pending = { input: NewYearDetailInput; ids?: PaymentIds; savedAt: string };
export type NewYearPurchase = { input: NewYearDetailInput; ids: PaymentIds; savedAt: string };

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 공간이 막힌 기기 — 이번 화면에서는 그대로 보인다
  }
}

function sameIds(a: PaymentIds, b: PaymentIds) {
  return (
    (a.tossOrderId ?? a.purchaseToken ?? a.paymentId) === (b.tossOrderId ?? b.purchaseToken ?? b.paymentId)
  );
}

export function readNewYearPurchases(): NewYearPurchase[] {
  const list = readJson<NewYearPurchase[]>(PURCHASES_KEY);
  return Array.isArray(list) ? list.filter((p) => p?.input?.birthDate && hasIds(p.ids)) : [];
}

/** 앱(WebView) 여부와, 이 상품을 살 수 있는 새 버전인지 */
function readAppState(): { isApp: boolean; canBuy: boolean } {
  if (typeof navigator === "undefined") return { isApp: false, canBuy: false };
  const ua = navigator.userAgent;
  return { isApp: ua.includes("MyeongunApp"), canBuy: ua.includes("MyeongunIAP/newyear") };
}

export function useNewYearDetail(onRestore: (input: NewYearDetailInput, result: NewYearResult) => void) {
  const [detail, setDetail] = useState<NewYearDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [purchases, setPurchases] = useState<NewYearPurchase[]>([]);
  const [app, setApp] = useState({ isApp: false, canBuy: false });
  const inputRef = useRef<NewYearDetailInput | null>(null);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  // 운영자 모드(하단 저작권 두 번 눌러 로그인) — 웹에서만. 토스는 운영자 로그인이 없다
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setPurchases(readNewYearPurchases());
    setApp(readAppState());
    try {
      setIsAdmin(!IS_TOSS && !readAppState().isApp && localStorage.getItem("MASTER_ADMIN") === "true");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const requestDetail = useCallback(async (ids: PaymentIds, input: NewYearDetailInput) => {
    // 결제 식별자를 먼저 남긴다. 응답을 못 받아도 다음에 열면 이어서 받는다
    writeJson(PENDING_KEY, { input, ids, savedAt: new Date().toISOString() } satisfies Pending);
    setBusy(true);
    setError(null);
    try {
      // 토스 결제는 토스 전용 경로로, 웹·앱 결제는 공용 경로로 받는다
      const res = ids.tossOrderId
        ? await fetch(`${API_BASE}/api/toss/newyear/grant`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: ids.tossOrderId, ...input }),
          })
        : await fetch(`${API_BASE}/api/newyear/detail`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentId: ids.paymentId,
              merchant_uid: ids.merchantUid ?? null,
              purchaseToken: ids.purchaseToken,
              admin: ids.admin === true,
              ...input,
            }),
          });
      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
        input?: NewYearDetailInput;
        result?: NewYearResult;
        detail?: NewYearDetail;
        reopened?: boolean;
      };
      if (!res.ok || !json.success || !json.detail || !json.result || !json.input) {
        setError(json.message || "상세 풀이를 불러오지 못했습니다.");
        // 결제 확인 자체가 거절된 건(금액·생년월일 불일치 등)은 다시 시도해도 같으므로 접는다
        if (res.status === 400 || res.status === 404 || res.status === 409) writeJson(PENDING_KEY, null);
        return;
      }

      writeJson(PENDING_KEY, null);
      const entry: NewYearPurchase = { input: json.input, ids, savedAt: new Date().toISOString() };
      const next = [entry, ...readNewYearPurchases().filter((p) => !sameIds(p.ids, ids))].slice(0, 10);
      writeJson(PURCHASES_KEY, next);
      setPurchases(next);

      onRestoreRef.current(json.input, json.result);
      setDetail(json.detail);
      if (!json.reopened) {
        // 유입 경로 분석용. 매출은 newyear_orders 표로 센다
        void logEvent("payment_complete", {
          product: "newyear",
          amount: NEWYEAR_DETAIL_PRICE_WON,
          recorded: "newyear_orders",
        });
      }
    } catch {
      setError("상세 풀이를 불러오는 중 오류가 발생했습니다. 결제했다면 잠시 후 다시 열어 주세요. 추가 결제는 되지 않습니다.");
    } finally {
      setBusy(false);
    }
  }, []);

  // 모바일 결제에서 돌아왔거나, 지난번에 결제까지 하고 못 받은 풀이가 있으면 이어서 받는다
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const pending = readJson<Pending>(PENDING_KEY);
    const params = new URLSearchParams(window.location.search);
    const returnId = extractPaymentReturnId(params);

    if (returnId) {
      window.history.replaceState({}, "", window.location.pathname);
      if (pending?.input) void requestDetail({ paymentId: returnId }, pending.input);
      return;
    }
    if (!pending?.input || !pending.ids || !hasIds(pending.ids)) return;
    const age = Date.now() - new Date(pending.savedAt).getTime();
    if (!Number.isFinite(age) || age > PENDING_MAX_AGE_MS) {
      writeJson(PENDING_KEY, null);
      return;
    }
    void requestDetail(pending.ids, pending.input);
  }, [requestDetail]);

  // 앱이 구글 결제 결과를 알려주면 풀이를 받는다
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      let msg: { type?: string; productId?: string; purchaseToken?: string; message?: string } | null = null;
      try {
        msg = typeof event.data === "string" ? JSON.parse(event.data) : null;
      } catch {
        return;
      }
      // 앱은 다른 상품에도 같은 메시지를 쓰므로 이 상품만 받는다
      if (!msg?.type || msg.productId !== NEWYEAR_DETAIL_PRODUCT_ID) return;
      if (msg.type === "PURCHASE_SUCCESS" && msg.purchaseToken && inputRef.current) {
        void requestDetail({ purchaseToken: msg.purchaseToken }, inputRef.current);
      } else if (msg.type === "PURCHASE_FAILED") {
        setBusy(false);
        setError(msg.message || "결제를 완료하지 못했습니다.");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [requestDetail]);

  const startPurchase = useCallback(
    (input: NewYearDetailInput) => {
      inputRef.current = input;
      setError(null);
      void logEvent("payment_start", { product: "newyear", amount: NEWYEAR_DETAIL_PRICE_WON });

      // 이미 이 사람 풀이를 산 적이 있으면 다시 결제하지 않고 연다
      const owned = readNewYearPurchases().find(
        (p) => p.input.birthDate === input.birthDate && p.input.calendarType === input.calendarType,
      );
      if (owned) {
        void requestDetail(owned.ids, owned.input);
        return;
      }

      if (isAdmin) {
        // 서버가 운영자 로그인을 다시 확인한다. 금액 0원으로 남아 매출에서 빠진다
        const adminId = `adm${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
        void requestDetail({ paymentId: adminId, admin: true }, input);
        return;
      }

      if (IS_TOSS) {
        // 토스 인앱결제 — 결제의 지급 단계에서 서버가 주문을 확인·저장하고, 끝나면 풀이를 받는다
        setBusy(true);
        void purchaseNewYearOnToss(input)
          .then(({ orderId }) => requestDetail({ tossOrderId: orderId }, input))
          .catch((e: unknown) => {
            setBusy(false);
            setError(e instanceof Error ? e.message : "결제를 완료하지 못했습니다.");
          });
        return;
      }

      if (app.isApp) {
        const bridge = (window as unknown as { ReactNativeWebView?: { postMessage: (m: string) => void } })
          .ReactNativeWebView;
        if (!app.canBuy || !bridge) {
          setError("앱을 최신 버전으로 업데이트하면 상세 풀이를 볼 수 있어요.");
          return;
        }
        setBusy(true);
        bridge.postMessage(JSON.stringify({ type: "PURCHASE_ITEM", productId: NEWYEAR_DETAIL_PRODUCT_ID }));
        return;
      }

      // 모바일은 결제창으로 이동했다 돌아오므로 입력값을 먼저 남겨 둔다
      writeJson(PENDING_KEY, { input, savedAt: new Date().toISOString() } satisfies Pending);
      setShowPayment(true);
    },
    [app, isAdmin, requestDetail],
  );

  const reopen = useCallback((purchase: NewYearPurchase) => {
    inputRef.current = purchase.input;
    void requestDetail(purchase.ids, purchase.input);
  }, [requestDetail]);

  const paymentModal = (
    <PaymentMethodCheckoutModal
      open={showPayment}
      onClose={() => setShowPayment(false)}
      amount={NEWYEAR_DETAIL_PRICE_WON}
      productName="2027 신년운세 상세 풀이"
      description="재물·연애·직장·건강과 12개월 상세 풀이를 바로 보여 드립니다."
      confirmLabel="결제하고 상세 풀이 보기"
      buyerName={inputRef.current?.name || undefined}
      onPaymentSuccess={async ({ imp_uid, merchant_uid }) => {
        setShowPayment(false);
        if (inputRef.current) await requestDetail({ paymentId: imp_uid, merchantUid: merchant_uid }, inputRef.current);
      }}
      onPaymentError={(message) => {
        setShowPayment(false);
        setError(message);
      }}
    />
  );

  return {
    detail,
    clearDetail: () => setDetail(null),
    busy,
    error,
    purchases,
    app,
    isAdmin,
    isToss: IS_TOSS,
    startPurchase,
    reopen,
    paymentModal,
  };
}

/** 결제 전 — 무엇을 받는지와 가격 */
export function DetailPaywall({
  onBuy,
  busy,
  error,
  appNeedsUpdate,
  isToss,
  adminFree = false,
}: {
  onBuy: () => void;
  busy: boolean;
  error: string | null;
  appNeedsUpdate: boolean;
  isToss: boolean;
  adminFree?: boolean;
}) {
  return (
    <section className="rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-950/40 to-rose-950/30 p-5 text-center">
      <p className="text-xs font-semibold tracking-widest text-amber-300/80">상세 풀이</p>
      <h3 className="mt-1 text-lg font-black text-amber-100">2027년을 달마다 미리 준비하세요</h3>
      <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-left text-[13px] text-white/70">
        <li>✦ 재물 · 연애 · 직장 · 건강 흐름</li>
        <li>✦ 12개월 각각 할 일과 피할 일</li>
        <li>✦ 올해의 한 마디</li>
        <li>✦ 한 번 결제하면 언제든 다시 보기</li>
      </ul>

      {appNeedsUpdate && !isToss ? (
        <a
          href={PLAY_STORE_URL}
          className="mt-4 block rounded-2xl border border-amber-400/40 py-3 text-sm font-bold text-amber-200"
        >
          앱 업데이트 후 볼 수 있어요 →
        </a>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onBuy}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-rose-400 py-3.5 text-sm font-black text-stone-950 shadow-lg shadow-amber-900/40 transition hover:brightness-105 disabled:opacity-60"
        >
          {busy
            ? "상세 풀이를 쓰는 중… (최대 30초)"
            : adminFree
              ? "⚡ [운영자] 무료로 상세 풀이 보기"
              : `상세 풀이 보기 · ${NEWYEAR_DETAIL_PRICE_WON.toLocaleString()}원`}
        </button>
      )}
      {error ? <p className="mt-3 text-xs leading-relaxed text-rose-300">{error}</p> : null}
    </section>
  );
}

/** 결제 후 — 상세 풀이 */
export function DetailView({ detail, result }: { detail: NewYearDetail; result: NewYearResult }) {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-amber-400/30 bg-gradient-to-b from-amber-950/40 to-black/40 p-5">
        <p className="text-center text-xs font-semibold tracking-widest text-amber-300/80">2027 상세 풀이</p>
        <p className="mt-2 text-center text-lg font-black text-amber-100">“{detail.motto}”</p>
        <p className="mt-4 text-sm leading-relaxed text-white/75">{detail.overview}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {detail.areas.map((area) => (
          <div key={area.key} className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-sm font-bold text-rose-200">{area.label}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{area.summary}</p>
            <p className="mt-2 text-xs leading-relaxed text-emerald-200/90">✅ {area.doThis}</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/90">⚠️ {area.avoid}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white/85">12개월 상세</h3>
        <div className="mt-3 space-y-2">
          {detail.months.map((month) => {
            const tag = result.bestMonths.includes(month.month)
              ? "good"
              : result.cautionMonths.includes(month.month)
                ? "caution"
                : null;
            return (
              <details key={month.month} className="group rounded-xl bg-white/[0.03] px-3 py-2.5" open={tag !== null}>
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-white/85">
                  <span>{month.month}월</span>
                  {tag ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                        tag === "good" ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"
                      }`}
                    >
                      {tag === "good" ? "좋은 달" : "조심할 달"}
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs text-white/35 group-open:hidden">펼치기</span>
                </summary>
                <p className="mt-2 text-[13px] leading-relaxed text-white/70">{month.focus}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-emerald-200/90">✅ {month.doThis}</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-200/90">⚠️ {month.avoid}</p>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
