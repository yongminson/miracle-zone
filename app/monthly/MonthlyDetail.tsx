"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PaymentMethodCheckoutModal } from "@/components/payments/PaymentMethodCheckoutModal";
import { logEvent, logTesterOrder } from "@/lib/analytics";
import { extractPaymentReturnId } from "@/lib/payments/return-params";
import type { DayLuck } from "@/lib/calendar/day-luck-types";
import {
  MONTHLY_PRICE_WON,
  MONTHLY_PRODUCT_ID,
  type MonthlyInput,
  type MonthlyPaid,
  type MonthlyResult,
} from "@/lib/monthly/monthly-types";

/**
 * 이달의 운세 상세 풀이(유료) — 결제·다시 보기·화면. 신년운세(app/newyear/NewYearDetail.tsx)와 같은 방식.
 *
 * 결제가 끝났는데 풀이를 못 받는 일이 없도록, 결제 식별자를 받자마자 기기에 먼저
 * 남겨 두고(PENDING) 서버 응답을 받은 뒤에 지운다. 모바일 결제는 결제창으로
 * 이동했다가 돌아오므로, 돌아온 주소의 결제 식별자로 이어서 처리한다.
 * 한 사람의 한 달에 한 번 결제하고, 그달 풀이는 언제든 다시 열 수 있다.
 */

const PENDING_KEY = "myeongun_monthly_pending_v1";
const PURCHASES_KEY = "myeongun_monthly_purchases_v1";
const PENDING_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=kr.co.ymstudio.myeongun";

type PaymentIds = {
  paymentId?: string;
  merchantUid?: string | null;
  purchaseToken?: string;
  /** 운영자 모드로 결제 없이 만든 풀이 */
  admin?: boolean;
};

function hasIds(ids: PaymentIds | undefined): boolean {
  return !!(ids?.paymentId || ids?.purchaseToken);
}
type Pending = { input: MonthlyInput; monthKey: string; ids?: PaymentIds; savedAt: string };
export type MonthlyPurchase = { input: MonthlyInput; monthKey: string; ids: PaymentIds; savedAt: string };

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
  return (a.purchaseToken ?? a.paymentId) === (b.purchaseToken ?? b.paymentId);
}

export function readMonthlyPurchases(): MonthlyPurchase[] {
  const list = readJson<MonthlyPurchase[]>(PURCHASES_KEY);
  return Array.isArray(list) ? list.filter((p) => p?.input?.birthDate && p.monthKey && hasIds(p.ids)) : [];
}

export function ownsMonthly(purchases: MonthlyPurchase[], input: Pick<MonthlyInput, "birthDate" | "calendarType">, monthKey: string) {
  return purchases.find(
    (p) => p.monthKey === monthKey && p.input.birthDate === input.birthDate && p.input.calendarType === input.calendarType,
  );
}

/** 앱(WebView) 여부와, 이 상품을 살 수 있는 새 버전인지(명운-rn 1.1.9~ 가 MyeongunIAP/monthly 를 붙인다) */
function readAppState(): { isApp: boolean; canBuy: boolean } {
  if (typeof navigator === "undefined") return { isApp: false, canBuy: false };
  const ua = navigator.userAgent;
  return { isApp: ua.includes("MyeongunApp"), canBuy: ua.includes("MyeongunIAP/monthly") };
}

export function useMonthlyDetail(onRestore: (input: MonthlyInput, result: MonthlyResult) => void) {
  const [paid, setPaid] = useState<MonthlyPaid | null>(null);
  const [busy, setBusy] = useState(false);
  // busy 는 결제창이 열려 있을 때도 켜진다. generating 은 실제로 풀이를 쓰는 동안만
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [purchases, setPurchases] = useState<MonthlyPurchase[]>([]);
  const [app, setApp] = useState({ isApp: false, canBuy: false });
  const inputRef = useRef<{ input: MonthlyInput; monthKey: string } | null>(null);
  const onRestoreRef = useRef(onRestore);
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  // 운영자 모드(하단 저작권 두 번 눌러 로그인) — 웹에서만
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setPurchases(readMonthlyPurchases());
    setApp(readAppState());
    try {
      setIsAdmin(!readAppState().isApp && localStorage.getItem("MASTER_ADMIN") === "true");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const requestDetail = useCallback(async (ids: PaymentIds, input: MonthlyInput, monthKey: string) => {
    // 결제 식별자를 먼저 남긴다. 응답을 못 받아도 다음에 열면 이어서 받는다
    writeJson(PENDING_KEY, { input, monthKey, ids, savedAt: new Date().toISOString() } satisfies Pending);
    setBusy(true);
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/monthly/detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: ids.paymentId,
          merchant_uid: ids.merchantUid ?? null,
          purchaseToken: ids.purchaseToken,
          admin: ids.admin === true,
          monthKey,
          ...input,
        }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string } & Partial<MonthlyPaid>;
      if (!res.ok || !json.success || !json.detail || !json.result || !json.input || !json.days || !json.purposes) {
        setError(json.message || "상세 풀이를 불러오지 못했습니다.");
        // 결제 확인 자체가 거절된 건(금액·생년월일 불일치 등)은 다시 시도해도 같으므로 접는다
        if (res.status === 400 || res.status === 404 || res.status === 409) writeJson(PENDING_KEY, null);
        return;
      }

      writeJson(PENDING_KEY, null);
      const entry: MonthlyPurchase = { input: json.input, monthKey: json.result.monthKey, ids, savedAt: new Date().toISOString() };
      const next = [entry, ...readMonthlyPurchases().filter((p) => !sameIds(p.ids, ids))].slice(0, 24);
      writeJson(PURCHASES_KEY, next);
      setPurchases(next);

      onRestoreRef.current(json.input, json.result);
      setPaid(json as MonthlyPaid);
      if (!json.reopened) {
        // 유입 경로 분석용. 매출은 monthly_orders 표로 센다
        void logEvent("payment_complete", {
          product: "monthly",
          amount: MONTHLY_PRICE_WON,
          recorded: "monthly_orders",
        });
        // 앱 결제는 영수증 앞 12자만 남긴다(monthly_orders.payment_ref 가 'app:영수증' 으로 시작)
        logTesterOrder("monthly", ids.paymentId ?? (ids.purchaseToken ? `app:${ids.purchaseToken.slice(0, 12)}` : null));
      }
    } catch {
      setError("상세 풀이를 불러오는 중 오류가 발생했습니다. 결제했다면 잠시 후 다시 열어 주세요. 추가 결제는 되지 않습니다.");
    } finally {
      setBusy(false);
      setGenerating(false);
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
      if (pending?.input && pending.monthKey) void requestDetail({ paymentId: returnId }, pending.input, pending.monthKey);
      return;
    }
    if (!pending?.input || !pending.monthKey || !pending.ids || !hasIds(pending.ids)) return;
    const age = Date.now() - new Date(pending.savedAt).getTime();
    if (!Number.isFinite(age) || age > PENDING_MAX_AGE_MS) {
      writeJson(PENDING_KEY, null);
      return;
    }
    void requestDetail(pending.ids, pending.input, pending.monthKey);
  }, [requestDetail]);

  // 앱이 구글 결제 결과를 알려주면 풀이를 받는다
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      let msg: { type?: string; productId?: string; purchaseToken?: string; message?: string; code?: string; detail?: string } | null = null;
      try {
        msg = typeof event.data === "string" ? JSON.parse(event.data) : null;
      } catch {
        return;
      }
      // 앱은 다른 상품에도 같은 메시지를 쓰므로 이 상품만 받는다
      if (!msg?.type || msg.productId !== MONTHLY_PRODUCT_ID) return;
      if (msg.type === "PURCHASE_SUCCESS" && msg.purchaseToken && inputRef.current) {
        void requestDetail({ purchaseToken: msg.purchaseToken }, inputRef.current.input, inputRef.current.monthKey);
      } else if (msg.type === "PURCHASE_FAILED") {
        setBusy(false);
        setError(msg.message || "결제를 완료하지 못했습니다.");
        void logEvent("payment_fail", { product: "monthly", amount: MONTHLY_PRICE_WON, method: "google_play", reason: String(msg.message || "").slice(0, 80), code: msg.code ?? null, detail: msg.detail ?? null });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [requestDetail]);

  const startPurchase = useCallback(
    (input: MonthlyInput, monthKey: string) => {
      inputRef.current = { input, monthKey };
      setError(null);

      // 이 사람의 이 달 풀이를 이미 샀으면 다시 결제하지 않고 연다(버튼에도 '다시 보기'로 보인다)
      const owned = ownsMonthly(readMonthlyPurchases(), input, monthKey);
      if (owned) {
        void logEvent("monthly_reopen", { from: "buy_button" });
        void requestDetail(owned.ids, owned.input, owned.monthKey);
        return;
      }
      void logEvent("payment_start", { product: "monthly", amount: MONTHLY_PRICE_WON });

      if (isAdmin) {
        // 서버가 운영자 로그인을 다시 확인한다. 금액 0원으로 남아 매출에서 빠진다
        const adminId = `adm${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
        void requestDetail({ paymentId: adminId, admin: true }, input, monthKey);
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
        void logEvent("payment_open", { product: "monthly", amount: MONTHLY_PRICE_WON, method: "google_play" });
        bridge.postMessage(JSON.stringify({ type: "PURCHASE_ITEM", productId: MONTHLY_PRODUCT_ID }));
        return;
      }

      // 모바일은 결제창으로 이동했다 돌아오므로 입력값을 먼저 남겨 둔다
      writeJson(PENDING_KEY, { input, monthKey, savedAt: new Date().toISOString() } satisfies Pending);
      setShowPayment(true);
    },
    [app, isAdmin, requestDetail],
  );

  const reopen = useCallback(
    (purchase: MonthlyPurchase) => {
      inputRef.current = { input: purchase.input, monthKey: purchase.monthKey };
      void requestDetail(purchase.ids, purchase.input, purchase.monthKey);
    },
    [requestDetail],
  );

  const paymentModal = (
    <PaymentMethodCheckoutModal
      open={showPayment}
      onClose={() => setShowPayment(false)}
      amount={MONTHLY_PRICE_WON}
      productName="이달의 운세 상세 풀이"
      description="한 달 전체 달력, 주별 흐름, 목적별 좋은 날을 바로 보여 드립니다."
      confirmLabel="결제하고 상세 풀이 보기"
      buyerName={inputRef.current?.input.name || undefined}
      onPaymentSuccess={async ({ imp_uid, merchant_uid }) => {
        setShowPayment(false);
        const current = inputRef.current;
        if (current) await requestDetail({ paymentId: imp_uid, merchantUid: merchant_uid }, current.input, current.monthKey);
      }}
      onPaymentError={(message) => {
        setShowPayment(false);
        setError(message);
      }}
    />
  );

  return {
    paid,
    clearPaid: () => setPaid(null),
    busy,
    generating,
    error,
    purchases,
    app,
    isAdmin,
    startPurchase,
    reopen,
    paymentModal,
  };
}

/** 풀이를 쓰는 동안(약 15초) — 멈춘 게 아니라 진행 중이라는 걸 보여준다 */
const WAIT_STEPS = [
  "결제를 확인했어요",
  "이달의 날마다 흐름을 계산하고 있어요",
  "주별 흐름을 하나씩 읽고 있어요",
  "재물·연애·일·건강 풀이를 쓰고 있어요",
  "거의 다 됐어요. 정리하는 중이에요",
];

export function MonthlyWaiting() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 500);
    return () => window.clearInterval(id);
  }, []);
  const step = Math.min(WAIT_STEPS.length - 1, Math.floor(elapsed / 4));
  // 처음엔 빠르게, 끝으로 갈수록 천천히 차서 95% 에서 멈춘다(끝나면 결과가 바로 뜬다)
  const percent = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / 7))));

  return (
    <div className="mt-4 rounded-2xl border border-sky-400/30 bg-black/40 p-4 text-left" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" aria-hidden />
        <p className="text-sm font-bold text-sky-100">{WAIT_STEPS[step]}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-400 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-white/45">
        보통 15초쯤 걸려요. 화면을 닫아도 결제는 안전하고, 다시 열면 추가 결제 없이 이어서 받을 수 있어요.
      </p>
    </div>
  );
}

/** 결제 전 — 무엇을 받는지와 가격. 달력은 흐리게 보여 무엇이 열리는지 알 수 있게 한다 */
export function MonthlyPaywall({
  result,
  onBuy,
  busy,
  error,
  appNeedsUpdate,
  adminFree = false,
  generating = false,
  alreadyOwned = false,
}: {
  result: MonthlyResult;
  onBuy: () => void;
  busy: boolean;
  error: string | null;
  appNeedsUpdate: boolean;
  adminFree?: boolean;
  generating?: boolean;
  /** 이 사람의 이 달 풀이를 이 기기에서 이미 샀다 — 결제 없이 다시 연다 */
  alreadyOwned?: boolean;
}) {
  const first = new Date(Date.UTC(result.year, result.month - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(result.year, result.month, 0)).getUTCDate();
  return (
    <section className="rounded-3xl border border-sky-400/30 bg-gradient-to-b from-sky-950/40 to-violet-950/30 p-5 text-center">
      <p className="text-xs font-semibold tracking-widest text-sky-300/80">상세 풀이</p>
      <h3 className="mt-1 text-lg font-black text-sky-100">{result.month}월을 날짜까지 미리 준비하세요</h3>

      {/* 흐린 달력 미리보기 — 실제 날짜 색은 결제 후에만 보낸다 */}
      <div className="relative mx-auto mt-4 max-w-xs">
        <div className="grid grid-cols-7 gap-1 opacity-50 blur-[3px]" aria-hidden>
          {Array.from({ length: first }).map((_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length }).map((_, i) => (
            <span
              key={i}
              className={`rounded-md py-1.5 text-[10px] ${
                i % 5 === 1 ? "bg-emerald-500/40" : i % 7 === 4 ? "bg-amber-500/40" : "bg-white/10"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <p className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/85">
          🔒 좋은 날 {result.goodCount}일 · 조심할 날 {result.cautionCount}일
        </p>
      </div>

      <ul className="mx-auto mt-4 max-w-xs space-y-1.5 text-left text-[13px] text-white/70">
        <li>✦ {result.month}월 한 달 전체 달력(좋은 날·조심할 날)</li>
        <li>✦ 계약·고백·이사·면접 — 목적별 좋은 날</li>
        <li>✦ 주별 흐름과 할 일</li>
        <li>✦ 재물 · 연애 · 일 · 건강</li>
        <li>✦ 이달 안에는 언제든 다시 보기</li>
      </ul>

      {appNeedsUpdate ? (
        <a
          href={PLAY_STORE_URL}
          className="mt-4 block rounded-2xl border border-sky-400/40 py-3 text-sm font-bold text-sky-200"
        >
          앱 업데이트 후 볼 수 있어요 →
        </a>
      ) : generating ? (
        <MonthlyWaiting />
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onBuy}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-sky-400 via-sky-300 to-violet-300 py-3.5 text-sm font-black text-stone-950 shadow-lg shadow-sky-900/40 transition hover:brightness-105 disabled:opacity-60"
        >
          {busy
            ? "결제 진행 중…"
            : alreadyOwned
              ? "✓ 구매한 상세 풀이 다시 보기 (추가 결제 없음)"
              : adminFree
                ? "⚡ [운영자] 무료로 상세 풀이 보기"
                : `${result.month}월 상세 풀이 보기 · ${MONTHLY_PRICE_WON.toLocaleString()}원`}
        </button>
      )}
      {error ? <p className="mt-3 text-xs leading-relaxed text-rose-300">{error}</p> : null}
    </section>
  );
}

const TONE_CELL: Record<DayLuck["tone"], string> = {
  good: "bg-emerald-500/25 text-emerald-100 border-emerald-400/40",
  normal: "bg-white/[0.04] text-white/70 border-white/10",
  caution: "bg-amber-500/20 text-amber-100 border-amber-400/40",
};

function dayNum(date: string) {
  return Number(date.slice(8, 10));
}

/** 결제 후 — 한 달 달력·목적별 날짜·주별·영역별 풀이 */
export function MonthlyView({ paid }: { paid: MonthlyPaid }) {
  const { result, days, purposes, detail } = paid;
  const [picked, setPicked] = useState<string | null>(null);
  const first = new Date(Date.UTC(result.year, result.month - 1, 1)).getUTCDay();
  const pickedDay = days.find((d) => d.date === picked) ?? null;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-sky-400/30 bg-gradient-to-b from-sky-950/40 to-black/40 p-5">
        <p className="text-center text-xs font-semibold tracking-widest text-sky-300/80">
          {result.year}년 {result.month}월 상세 풀이
        </p>
        <p className="mt-2 text-center text-lg font-black text-sky-100">“{detail.motto}”</p>
        <p className="mt-4 text-sm leading-relaxed text-white/75">{detail.overview}</p>
      </section>

      {/* 한 달 달력 */}
      <section className="rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white/85">{result.month}월 달력</h3>
        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-white/40">
          {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: first }).map((_, i) => (
            <span key={`b${i}`} />
          ))}
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => setPicked(d.date === picked ? null : d.date)}
              className={`rounded-lg border py-2 text-xs font-bold transition ${TONE_CELL[d.tone]} ${
                picked === d.date ? "ring-2 ring-sky-300" : ""
              }`}
            >
              {dayNum(d.date)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-3 text-[10px] text-white/45">
          <span>🟩 좋은 날</span>
          <span>🟧 조심할 날</span>
          <span>날짜를 누르면 그날 풀이</span>
        </div>
        {pickedDay ? (
          <div className="mt-3 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <p className="text-sm font-bold text-white/85">
              {result.month}월 {dayNum(pickedDay.date)}일({pickedDay.weekday}) · {pickedDay.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">{pickedDay.action}</p>
            {pickedDay.note ? <p className="mt-1 text-xs leading-relaxed text-amber-200/90">{pickedDay.note}</p> : null}
          </div>
        ) : null}
      </section>

      {/* 목적별 좋은 날 */}
      <section className="grid gap-2 sm:grid-cols-2">
        {purposes.map((p) => (
          <div
            key={p.key}
            className={`rounded-2xl border p-3.5 ${
              p.key === "money" ? "border-amber-400/25 bg-amber-950/20" : "border-emerald-400/20 bg-emerald-950/15"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-white/85">{p.label}</p>
              <p className={`text-sm font-black ${p.key === "money" ? "text-amber-200" : "text-emerald-200"}`}>
                {p.dates.length ? p.dates.map((d) => `${dayNum(d)}일`).join(" · ") : "—"}
              </p>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/55">{p.tip}</p>
          </div>
        ))}
      </section>

      {/* 주별 흐름 */}
      <section className="rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-white/85">주별 흐름</h3>
        <div className="mt-3 space-y-2">
          {detail.weeks.map((w) => (
            <div key={w.index} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
              <p className="text-sm font-bold text-white/85">
                {w.index}주 <span className="text-xs font-normal text-white/40">({dayNum(w.start)}~{dayNum(w.end)}일)</span>
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{w.focus}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-emerald-200/90">✅ {w.doThis}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 재물·연애·일·건강 */}
      <section className="grid gap-3 sm:grid-cols-2">
        {detail.areas.map((area) => (
          <div key={area.key} className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-sm font-bold text-sky-200">{area.label}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/70">{area.summary}</p>
            <p className="mt-2 text-xs leading-relaxed text-emerald-200/90">✅ {area.doThis}</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/90">⚠️ {area.avoid}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
