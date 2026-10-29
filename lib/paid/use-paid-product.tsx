"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PaymentMethodCheckoutModal } from "@/components/payments/PaymentMethodCheckoutModal";
import { logEvent, logTesterOrder } from "@/lib/analytics";
import { extractPaymentReturnId } from "@/lib/payments/return-params";
import { readPendingPaymentState } from "@/lib/payments/pending-payment-state";

/**
 * 유료 상세 풀이 공통 — 결제·다시 보기·앱 구글 결제·운영자 모드(궁합 심층·택일·시즌 운세).
 * 신년운세(app/newyear/NewYearDetail.tsx)·이달의 운세(app/monthly/MonthlyDetail.tsx)와 같은 방식이다.
 *
 * 결제가 끝났는데 풀이를 못 받는 일이 없도록, 결제 식별자를 받자마자 기기에 먼저
 * 남겨 두고(PENDING) 서버 응답을 받은 뒤에 지운다. 모바일 결제는 결제창으로
 * 이동했다가 돌아오므로, 돌아온 주소의 결제 식별자로 이어서 처리한다.
 */

const PENDING_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** 웹 결제창으로 떠난 뒤 돌아오기까지 기다려 주는 시간 */
const RETURN_WINDOW_MS = 30 * 60 * 1000;
/** 이 부품을 쓰는 상품의 저장 키 — 도구 화면(/tools)의 결제 복귀 처리가 이 상품들 복귀를 건드리지 않게 알려 준다 */
const PAID_STORAGE_KEYS = ["myeongun_match_deep", "myeongun_taekil", "myeongun_season"];

/** 도구 화면의 다른 결제(제단·로또·관상…)가 진행 중인지 — 그 복귀는 도구 화면이 처리한다 */
function toolsPaymentPending(): boolean {
  try {
    return !!readPendingPaymentState() || !!localStorage.getItem("pendingPaymentType");
  } catch {
    return false;
  }
}

/**
 * 지금 주소의 결제 복귀가 이 부품 상품(궁합 심층·택일·시즌)의 것인지 — app/tools/page.tsx 의 복귀 처리가 부른다.
 * 결제창으로 떠난 뒤 30분 안의 PENDING 이 있거나, 이미 그 결제 식별자로 풀이를 받는 중이면 이 상품 것이다.
 * (화면 안쪽 부품의 처리가 먼저 돌아 PENDING 에 결제 식별자가 이미 들어가 있을 수 있다)
 */
export function isPaidProductReturn(returnId: string): boolean {
  return PAID_STORAGE_KEYS.some((k) => {
    const p = readJson<Pending<unknown>>(`${k}_pending_v1`);
    if (!p?.input) return false;
    if (p.ids) return p.ids.paymentId === returnId;
    const age = Date.now() - new Date(p.savedAt).getTime();
    return Number.isFinite(age) && age < RETURN_WINDOW_MS;
  });
}


type PaymentIds = {
  paymentId?: string;
  merchantUid?: string | null;
  purchaseToken?: string;
  admin?: boolean;
};

export type PaidPurchase<TInput> = { input: TInput; ids: PaymentIds; savedAt: string };
type Pending<TInput> = { input: TInput; ids?: PaymentIds; savedAt: string };

export type PaidProductConfig<TInput> = {
  /** 분석 기록의 product 이름 */
  product: string;
  /** 구글 플레이 상품 ID */
  googleProductId: string;
  priceWon: number;
  /** /api/... 경로 */
  endpoint: string;
  /** 기기 저장 키 접두사 */
  storageKey: string;
  /** 앱이 이 상품을 살 수 있는 새 버전인지 — 명운-rn 이 사용자 에이전트에 붙이는 표시 */
  appUaToken: string;
  productName: string;
  description: string;
  /** 같은 풀이인지 가르는 값(예: 두 사람 생년월일+관계) — 이미 샀으면 다시 결제하지 않는다 */
  sameKey: (input: TInput) => string;
};

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

const hasIds = (ids?: PaymentIds) => !!(ids?.paymentId || ids?.purchaseToken);
const idOf = (ids: PaymentIds) => ids.purchaseToken ?? ids.paymentId;

export function usePaidProduct<TInput, TPaid extends { input: TInput; reopened: boolean }>(
  config: PaidProductConfig<TInput>,
  onRestore?: (paid: TPaid) => void,
) {
  const pendingKey = `${config.storageKey}_pending_v1`;
  const purchasesKey = `${config.storageKey}_purchases_v1`;

  const [paid, setPaid] = useState<TPaid | null>(null);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [purchases, setPurchases] = useState<PaidPurchase<TInput>[]>([]);
  const [app, setApp] = useState({ isApp: false, canBuy: false });
  const [isAdmin, setIsAdmin] = useState(false);
  const inputRef = useRef<TInput | null>(null);
  const configRef = useRef(config);
  const onRestoreRef = useRef(onRestore);
  useEffect(() => {
    configRef.current = config;
    onRestoreRef.current = onRestore;
  });

  const readPurchases = useCallback((): PaidPurchase<TInput>[] => {
    const list = readJson<PaidPurchase<TInput>[]>(purchasesKey);
    return Array.isArray(list) ? list.filter((p) => p?.input && hasIds(p.ids)) : [];
  }, [purchasesKey]);

  useEffect(() => {
    setPurchases(readPurchases());
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    const isApp = ua.includes("MyeongunApp");
    setApp({ isApp, canBuy: ua.includes(configRef.current.appUaToken) });
    try {
      // 운영자 모드(하단 저작권 두 번 눌러 로그인) — 웹에서만
      setIsAdmin(!isApp && localStorage.getItem("MASTER_ADMIN") === "true");
    } catch {
      setIsAdmin(false);
    }
  }, [readPurchases]);

  const requestDetail = useCallback(
    async (ids: PaymentIds, input: TInput) => {
      const c = configRef.current;
      writeJson(pendingKey, { input, ids, savedAt: new Date().toISOString() } satisfies Pending<TInput>);
      setBusy(true);
      setGenerating(true);
      setError(null);
      try {
        const res = await fetch(c.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: ids.paymentId,
            merchant_uid: ids.merchantUid ?? null,
            purchaseToken: ids.purchaseToken,
            admin: ids.admin === true,
            input,
          }),
        });
        const json = (await res.json()) as { success?: boolean; message?: string; detail?: unknown } & Partial<TPaid>;
        if (!res.ok || !json.success || !json.detail || !json.input) {
          setError(json.message || "상세 풀이를 불러오지 못했습니다.");
          // 결제 확인 자체가 거절된 건(금액·입력 불일치 등)은 다시 시도해도 같으므로 접는다
          if (res.status === 400 || res.status === 404 || res.status === 409) writeJson(pendingKey, null);
          return;
        }
        writeJson(pendingKey, null);
        const entry: PaidPurchase<TInput> = { input: json.input as TInput, ids, savedAt: new Date().toISOString() };
        const next = [entry, ...readPurchases().filter((p) => idOf(p.ids) !== idOf(ids))].slice(0, 20);
        writeJson(purchasesKey, next);
        setPurchases(next);
        const result = json as unknown as TPaid;
        setPaid(result);
        onRestoreRef.current?.(result);
        if (!json.reopened) {
          void logEvent("payment_complete", { product: c.product, amount: c.priceWon, recorded: "product_orders" });
          // 앱 결제는 영수증 앞 12자만 남긴다(product_orders.payment_ref 가 'app:영수증' 으로 시작)
          logTesterOrder(c.product, ids.paymentId ?? (ids.purchaseToken ? `app:${ids.purchaseToken.slice(0, 12)}` : null));
        }
      } catch {
        setError("상세 풀이를 불러오는 중 오류가 발생했습니다. 결제했다면 잠시 후 다시 열어 주세요. 추가 결제는 되지 않습니다.");
      } finally {
        setBusy(false);
        setGenerating(false);
      }
    },
    [pendingKey, purchasesKey, readPurchases],
  );

  // 모바일 결제에서 돌아왔거나, 지난번에 결제까지 하고 못 받은 풀이가 있으면 이어서 받는다
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    const pending = readJson<Pending<TInput>>(pendingKey);
    const returnId = extractPaymentReturnId(new URLSearchParams(window.location.search));
    if (returnId) {
      // 결제창을 연 상품만 PENDING(결제 식별자 없음)이 있다. 도구 화면의 다른 결제 복귀면 손대지 않는다
      const age = pending ? Date.now() - new Date(pending.savedAt).getTime() : Infinity;
      if (pending?.input && !pending.ids && age < RETURN_WINDOW_MS && !toolsPaymentPending()) {
        // 결제창은 쿼리 없는 주소로 돌려보낸다(PaymentMethodCheckoutModal) — 결제 식별자만 지운다
        window.history.replaceState({}, "", window.location.pathname);
        void requestDetail({ paymentId: returnId }, pending.input);
      }
      return;
    }
    if (!pending?.input || !pending.ids || !hasIds(pending.ids)) return;
    const age = Date.now() - new Date(pending.savedAt).getTime();
    if (!Number.isFinite(age) || age > PENDING_MAX_AGE_MS) {
      writeJson(pendingKey, null);
      return;
    }
    void requestDetail(pending.ids, pending.input);
  }, [pendingKey, requestDetail]);

  // 앱이 구글 결제 결과를 알려주면 풀이를 받는다
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      let msg: { type?: string; productId?: string; purchaseToken?: string; message?: string; code?: string; detail?: string } | null = null;
      try {
        msg = typeof event.data === "string" ? JSON.parse(event.data) : null;
      } catch {
        return;
      }
      const c = configRef.current;
      // 앱은 다른 상품에도 같은 메시지를 쓰므로 이 상품만 받는다
      if (!msg?.type || msg.productId !== c.googleProductId) return;
      if (msg.type === "PURCHASE_SUCCESS" && msg.purchaseToken && inputRef.current) {
        void requestDetail({ purchaseToken: msg.purchaseToken }, inputRef.current);
      } else if (msg.type === "PURCHASE_FAILED") {
        setBusy(false);
        setError(msg.message || "결제를 완료하지 못했습니다.");
        void logEvent("payment_fail", { product: c.product, amount: c.priceWon, method: "google_play", reason: String(msg.message || "").slice(0, 80), code: msg.code ?? null, detail: msg.detail ?? null });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [requestDetail]);

  const findOwned = useCallback(
    (input: TInput) => readPurchases().find((p) => configRef.current.sameKey(p.input) === configRef.current.sameKey(input)),
    [readPurchases],
  );

  const startPurchase = useCallback(
    (input: TInput) => {
      const c = configRef.current;
      inputRef.current = input;
      setError(null);

      const owned = findOwned(input);
      if (owned) {
        void logEvent(`${c.product}_reopen`, { from: "buy_button" });
        void requestDetail(owned.ids, owned.input);
        return;
      }
      void logEvent("payment_start", { product: c.product, amount: c.priceWon });

      if (isAdmin) {
        // 서버가 운영자 로그인을 다시 확인한다. 금액 0원으로 남아 매출에서 빠진다
        const adminId = `adm${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
        void requestDetail({ paymentId: adminId, admin: true }, input);
        return;
      }

      if (app.isApp) {
        const bridge = (window as unknown as { ReactNativeWebView?: { postMessage: (m: string) => void } }).ReactNativeWebView;
        if (!app.canBuy || !bridge) {
          setError("앱을 최신 버전으로 업데이트하면 상세 풀이를 볼 수 있어요.");
          return;
        }
        setBusy(true);
        void logEvent("payment_open", { product: c.product, amount: c.priceWon, method: "google_play" });
        bridge.postMessage(JSON.stringify({ type: "PURCHASE_ITEM", productId: c.googleProductId }));
        return;
      }

      // 모바일은 결제창으로 이동했다 돌아오므로 입력값을 먼저 남겨 둔다
      writeJson(pendingKey, { input, savedAt: new Date().toISOString() } satisfies Pending<TInput>);
      setShowPayment(true);
    },
    [app, findOwned, isAdmin, pendingKey, requestDetail],
  );

  const reopen = useCallback(
    (purchase: PaidPurchase<TInput>) => {
      inputRef.current = purchase.input;
      void requestDetail(purchase.ids, purchase.input);
    },
    [requestDetail],
  );

  const paymentModal = (
    <PaymentMethodCheckoutModal
      open={showPayment}
      onClose={() => {
        setShowPayment(false);
        // 결제창을 닫았으면 이어 받을 것도 없다 — 같은 화면의 다른 상품 복귀와 섞이지 않게 지운다
        writeJson(pendingKey, null);
      }}
      amount={config.priceWon}
      productName={config.productName}
      description={config.description}
      confirmLabel="결제하고 상세 풀이 보기"
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
    paid,
    clearPaid: () => setPaid(null),
    busy,
    generating,
    error,
    purchases,
    app,
    isAdmin,
    owned: findOwned,
    startPurchase,
    reopen,
    paymentModal,
  };
}

/** 풀이를 쓰는 동안 — 멈춘 게 아니라 진행 중이라는 걸 보여준다 */
export function PaidWaiting({ steps, seconds = 15 }: { steps: string[]; seconds?: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 500);
    return () => window.clearInterval(id);
  }, []);
  const step = Math.min(steps.length - 1, Math.floor(elapsed / Math.max(2, seconds / steps.length)));
  const percent = Math.min(95, Math.round(100 * (1 - Math.exp(-elapsed / (seconds / 2)))));
  return (
    <div className="mt-4 rounded-2xl border border-white/15 bg-black/40 p-4 text-left" role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-pink-300 border-t-transparent" aria-hidden />
        <p className="text-sm font-bold text-white/90">{steps[step]}</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-400 transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-white/45">
        보통 {seconds}초쯤 걸려요. 화면을 닫아도 결제는 안전하고, 다시 열면 추가 결제 없이 이어서 받을 수 있어요.
      </p>
    </div>
  );
}
