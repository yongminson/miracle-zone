"use client";

import { useEffect, useState } from "react";
import { PaymentMethodSelector, type PayMethodPg } from "@/components/payments/PaymentMethodSelector";
import { pickPaymentLookupIdFromPortOneResponse } from "@/lib/payments/imp-uid";
import { savePendingPaymentData } from "@/lib/payments/pending-payment-data";
import { savePendingPaymentState } from "@/lib/payments/pending-payment-state";

const STORE_ID = "store-dfe94d23-cfea-4a4d-a36a-0b1864b0903d";

function channelKeyFor(method: PayMethodPg): string {
  if (method === "kpn") return "channel-key-47b05312-c2e5-4e20-8b76-afb3915eb765";
  if (method === "tosspay") return "channel-key-ec9a613e-4407-413c-9ad1-921edb7b694e";
  return "channel-key-314bb395-3a71-48e6-a2a1-fed1d4ccb8c1";
}

/** 포트원 콘솔 채널(KPN·카카오·토스)과 동일한 의미로 로깅·customData에 실어두는 PG 코드 (V2는 주로 channelKey로 채널이 결정됨) */
function legacyPgAndPayMethod(method: PayMethodPg): { pg: string; pay_method: string } {
  if (method === "kpn") return { pg: "kpn", pay_method: "card" };
  if (method === "kakaopay") return { pg: "kakaopay", pay_method: "kakaopay" };
  return { pg: "tosspay", pay_method: "tosspay" };
}

export type PortOnePaymentSuccessPayload = {
  imp_uid: string;
  merchant_uid: string;
};

type PortOneWindow = {
  requestPayment: (params: Record<string, unknown>) => Promise<{
    code?: string | null;
    message?: string;
    paymentId?: string;
    txId?: string;
  } | void>;
};

export type PaymentMethodCheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  /** 원 단위 금액 */
  amount: number;
  /** 결제창·주문명 */
  productName: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  buyerName?: string;
  /** KPN 등 표준 PG 필수 필드 — 미입력 시 더미 번호 사용 */
  buyerTel?: string;
  buyerEmail?: string;
  /** VIP 모바일 PG 복귀 시에만 사용 — `tools` 결제용 `pendingPaymentType`과 절대 공유하지 않음 */
  pendingPaymentType?: string;
  /** 결제 성공 시 PG 거래 식별자 전달 */
  onPaymentSuccess: (payload: PortOnePaymentSuccessPayload) => void | Promise<void>;
  onPaymentError: (message: string) => void;
};

export function PaymentMethodCheckoutModal({
  open,
  onClose,
  amount,
  productName,
  title,
  description,
  confirmLabel = "결제하고 진행하기",
  buyerName = "명운 VIP 고객",
  buyerTel = "010-0000-0000",
  buyerEmail = "vip@ymstudio.co.kr",
  pendingPaymentType,
  onPaymentSuccess,
  onPaymentError,
}: PaymentMethodCheckoutModalProps) {
  const [selectedPayMethod, setSelectedPayMethod] = useState<PayMethodPg>("kpn");
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedPayMethod("kpn");
      setIsRequesting(false);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (typeof window === "undefined") return;

    let PortOne: PortOneWindow | undefined = (window as unknown as { PortOne?: PortOneWindow }).PortOne;
    if (!PortOne) {
      for (let i = 0; i < 10; i += 1) {
        await new Promise((r) => setTimeout(r, 500));
        PortOne = (window as unknown as { PortOne?: PortOneWindow }).PortOne;
        if (PortOne) break;
      }
    }
    if (!PortOne?.requestPayment) {
      onPaymentError("결제 시스템을 불러오지 못했습니다. 페이지를 새로고침 후 다시 시도해 주세요.");
      return;
    }

    /** KPN 등 PG `ALLOWED_CHARACTERS` — 밑줄·하이픈 없이 영숫자만 */
    const merchant_uid = `VIP${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (pendingPaymentType === "vip" && isMobile) {
      localStorage.setItem("vip_mobile_payment_pending", "1");
      localStorage.setItem("pendingVipMerchantUid", merchant_uid);
      savePendingPaymentData({ v: 1, tab: "vip", flow: "vip" });
      savePendingPaymentState({ tab: "vip", flow: "vip" });
    }

    setIsRequesting(true);
    try {
      const { pg, pay_method } = legacyPgAndPayMethod(selectedPayMethod);
      const customerFullName = (buyerName?.trim() || "명운 VIP 고객").slice(0, 64);
      const customerEmail = (buyerEmail?.trim() || "vip@ymstudio.co.kr").slice(0, 128);
      const customerPhone = (buyerTel?.trim() || "010-0000-0000").slice(0, 32);

      const payPayload: Record<string, unknown> = {
        storeId: STORE_ID,
        channelKey: channelKeyFor(selectedPayMethod),
        paymentId: merchant_uid,
        orderName: productName,
        totalAmount: amount,
        currency: "KRW",
        customer: {
          fullName: customerFullName,
          phoneNumber: customerPhone,
          email: customerEmail,
        },
        /** IAMPORT `request_pay`와 동일 의미 — 일부 PG·연동 레이어에서 참조 */
        buyer_tel: customerPhone,
        buyer_email: customerEmail,
        customData: { pg, pay_method },
        redirectUrl: isMobile ? window.location.href.split("?")[0] : undefined,
      };

      if (selectedPayMethod === "kpn") {
        payPayload.payMethod = "CARD";
      } else {
        payPayload.payMethod = "EASY_PAY";
        payPayload.easyPay = {
          easyPayProvider: selectedPayMethod === "kakaopay" ? "KAKAOPAY" : "TOSSPAY",
        };
      }

      const response = await PortOne.requestPayment(payPayload);

      if (isMobile && pendingPaymentType === "vip") {
        if (response && typeof response === "object" && response.code) {
          localStorage.removeItem("vip_mobile_payment_pending");
          localStorage.removeItem("pendingVipMerchantUid");
          const rsp = response as { message?: string; error_msg?: string };
          console.error("결제 실패 상세 사유:", rsp.message ?? rsp.error_msg, rsp);
          const msg = rsp.message?.trim() || rsp.error_msg?.trim();
          onPaymentError(msg || "결제가 취소되었습니다.");
        }
        return;
      }

      if (response && typeof response === "object" && response.code) {
        localStorage.removeItem("vip_mobile_payment_pending");
        localStorage.removeItem("pendingVipMerchantUid");
        const rsp = response as { message?: string; error_msg?: string };
        console.error("결제 실패 상세 사유:", rsp.message ?? rsp.error_msg, rsp);
        const msg = rsp.message?.trim() || rsp.error_msg?.trim();
        onPaymentError(msg || "결제에 실패했습니다.");
        return;
      }

      const resObj = response && typeof response === "object" ? (response as Record<string, unknown>) : null;
      const imp_uid = pickPaymentLookupIdFromPortOneResponse(resObj, merchant_uid);
      if (!imp_uid) {
        localStorage.removeItem("vip_mobile_payment_pending");
        localStorage.removeItem("pendingVipMerchantUid");
        onPaymentError(
          "결제 식별 오류: 포트원 응답에서 paymentId·imp_uid 등 결제 식별자를 찾지 못했습니다. 모바일은 결제 완료 후 이 페이지로 돌아왔는지 확인해 주세요.",
        );
        return;
      }

      localStorage.removeItem("vip_mobile_payment_pending");
      localStorage.removeItem("pendingVipMerchantUid");

      await onPaymentSuccess({ imp_uid, merchant_uid });
    } catch (err) {
      console.error("결제 예외(포트원 SDK):", err);
      localStorage.removeItem("vip_mobile_payment_pending");
      localStorage.removeItem("pendingVipMerchantUid");
      onPaymentError("결제가 취소되었거나 오류가 발생했습니다.");
    } finally {
      setIsRequesting(false);
    }
  };

  if (!open) return null;

  const heading = title ?? productName;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (!isRequesting && e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl border-2 border-amber-500/50 bg-slate-950/95 p-6 shadow-2xl shadow-amber-500/10 backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vip-pay-modal-title"
      >
        <h3 id="vip-pay-modal-title" className="mb-2 text-center text-lg font-semibold text-amber-300">
          {heading}
        </h3>
        <p className="mb-1 text-center text-sm font-medium text-amber-100/90">
          {amount.toLocaleString("ko-KR")}원
        </p>
        {description ? (
          <p className="mb-6 text-center text-sm text-white/70">{description}</p>
        ) : (
          <p className="mb-6 text-center text-sm text-white/70">결제 수단을 선택한 뒤 진행해 주세요.</p>
        )}
        <PaymentMethodSelector selectedPayMethod={selectedPayMethod} setSelectedPayMethod={setSelectedPayMethod} />
        <div className="flex gap-3">
          <button
            type="button"
            disabled={isRequesting}
            onClick={() => !isRequesting && onClose()}
            className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isRequesting}
            onClick={() => void handleConfirm()}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 px-4 py-3 text-sm font-bold text-stone-950 shadow-lg shadow-amber-500/25 transition-all hover:brightness-105 disabled:opacity-50"
          >
            {isRequesting ? "결제 처리 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
