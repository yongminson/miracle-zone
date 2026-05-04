"use client";

export type PayMethodPg = "kpn" | "kakaopay" | "tosspay";

export function PaymentMethodSelector({
  selectedPayMethod,
  setSelectedPayMethod,
}: {
  selectedPayMethod: PayMethodPg;
  setSelectedPayMethod: (v: PayMethodPg) => void;
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-sm font-bold text-yellow-400">결제 수단 선택</p>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setSelectedPayMethod("kpn")}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-3 text-[11px] font-semibold leading-tight text-white/90 transition-colors sm:text-xs ${
            selectedPayMethod === "kpn"
              ? "border-yellow-500 bg-yellow-500/20"
              : "border-white/10 bg-white/5"
          }`}
        >
          <span className="text-lg leading-none" aria-hidden>
            💳
          </span>
          <span>신용카드</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedPayMethod("kakaopay")}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-3 text-[11px] font-semibold leading-tight text-white/90 transition-colors sm:text-xs ${
            selectedPayMethod === "kakaopay"
              ? "border-[#FEE500] bg-[#FEE500]/20"
              : "border-white/10 bg-white/5"
          }`}
        >
          <span className="text-lg leading-none" aria-hidden>
            💬
          </span>
          <span>카카오페이</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedPayMethod("tosspay")}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-1 py-3 text-[11px] font-semibold leading-tight transition-colors sm:text-xs ${
            selectedPayMethod === "tosspay"
              ? "border-[#0064FF] bg-[#0064FF]/20 text-white"
              : "border-white/10 bg-white/5 text-white/90"
          }`}
        >
          <span className="text-[13px] font-extrabold tracking-tight">Toss</span>
          <span>토스페이</span>
        </button>
      </div>
    </div>
  );
}
