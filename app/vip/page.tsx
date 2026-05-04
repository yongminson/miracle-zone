"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PaymentMethodCheckoutModal } from "@/components/payments/PaymentMethodCheckoutModal";
import { BrainCircuit, Calendar, Clock, Gem, Sparkles } from "lucide-react";
import { DynamicLoader } from "@/components/ui/DynamicLoader";
import { VipPdfTemplate } from "@/components/vip/VipPdfTemplate";
import type { VipPdfUserInfo } from "@/components/vip/VipPdfTemplate";
import { usePdfDownload } from "@/hooks/usePdfDownload";
import { isLikelyPortOneReturnSuccess } from "@/lib/payments/imp-uid";
import { clearPendingPaymentData, readPendingPaymentData } from "@/lib/payments/pending-payment-data";
import { clearPendingPaymentState } from "@/lib/payments/pending-payment-state";
import { extractPaymentReturnId } from "@/lib/payments/return-params";
import { PAYMENT_VERIFY_URL } from "@/lib/payments/verify-endpoint";

type VipApiSuccess = { success: true; markdown: string };
type VipApiFail = { success: false; error?: string };

function buildSajuSummary(params: {
  name: string;
  birthDate: string;
  birthTime: string;
  gender: "male" | "female";
  mbti: string;
}): string {
  const genderKo = params.gender === "male" ? "남성" : "여성";
  const timeLine = params.birthTime.trim() ? params.birthTime.trim() : "미입력 (시주 미반영)";
  const mbtiLine = params.mbti.trim() ? params.mbti.trim().toUpperCase() : "미입력";
  return [
    `내담자: ${params.name}`,
    `양력 생년월일: ${params.birthDate}`,
    `출생 시각: ${timeLine}`,
    `성별: ${genderKo}`,
    `MBTI: ${mbtiLine}`,
    "",
    "※ 본 요약은 입력 정보 기준이며, PDF 본문은 서버 만세력·AI 분석 결과를 반영합니다.",
  ].join("\n");
}

/** 마크다운 이미지에서 부적 파일 경로 추출 (예: ...amulet-....jpg) */
function extractAmuletUrlFromMarkdown(markdown: string): string | null {
  const m = markdown.match(/!\[[^\]]*]\(([^)]*amulet[^)]*\.jpe?g)\)/i);
  if (!m?.[1]) return null;
  const raw = m[1].trim().replace(/^<|>$/g, "");
  if (!raw) return null;
  return raw;
}

/** 숫자만 받아 `YYYY-MM-DD`로 하이픈 삽입 (예: 19841013 → 1984-10-13) */
function maskBirthDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** 숫자만 받아 `HH:MM`으로 콜론 삽입 (예: 0930 → 09:30) */
function maskBirthTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function VipLandingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const pdfRootRef = useRef<HTMLDivElement>(null);
  const { downloadPdf, isGenerating: isPdfGenerating } = usePdfDownload({ scale: 2 });

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [mbti, setMbti] = useState("");

  const [reportMarkdown, setReportMarkdown] = useState("");
  const [pdfUserInfo, setPdfUserInfo] = useState<VipPdfUserInfo>({
    name: "",
    sajuSummary: "",
  });

  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [amuletUrl, setAmuletUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const showFullScreenLoader = (isFetchingReport || isPdfGenerating) && !reportMarkdown.trim();
  const isBusy = isFetchingReport || isPdfGenerating;

  const handleIssueReport = useCallback(async (options?: { imp_uid?: string | null }) => {
    setErrorMessage(null);
    if (!options?.imp_uid) {
      setIsSuccess(false);
      setAmuletUrl(null);
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("이름을 입력해 주세요.");
      return;
    }
    if (!birthDate.trim()) {
      setErrorMessage("생년월일을 입력해 주세요.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      setErrorMessage("생년월일을 YYYY-MM-DD 형식(8자리 숫자)으로 입력해 주세요.");
      return;
    }

    const VIP_FETCH_MS = 330_000;
    setIsFetchingReport(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), VIP_FETCH_MS);

    const imp = options?.imp_uid?.trim();
    const paymentPayload =
      imp != null && imp !== ""
        ? { imp_uid: imp, phone_number: "010-0000-0000" as const }
        : {};

    try {
      // 1. 백엔드에 14페이지 생성 요청 (이 부분은 41초 만에 완벽히 성공하고 있음)
      const res = await fetch("/api/saju/vip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          gender,
          birthDate: birthDate.trim(),
          birthTime: birthTime.trim() || null,
          mbti: mbti.trim() || null,
          calendarType: "solar",
          ...paymentPayload,
        }),
        signal: controller.signal,
      });

      const data = (await res.json()) as VipApiSuccess | VipApiFail;

      if (!res.ok || !data.success) {
        const msg = !data.success && "error" in data && data.error ? data.error : "리포트 생성 실패";
        setErrorMessage(`API 에러: ${msg}`);
        setIsSuccess(false);
        return;
      }

      const summary = buildSajuSummary({
        name: trimmedName,
        birthDate: birthDate.trim(),
        birthTime,
        gender,
        mbti,
      });

      // 2. 텍스트 세팅 완료
      setPdfUserInfo({ name: trimmedName, sajuSummary: summary });
      setReportMarkdown(data.markdown);

      const extracted = extractAmuletUrlFromMarkdown(data.markdown);
      setAmuletUrl(extracted);

      // DOM 업데이트 대기
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      setIsSuccess(true);

      // 3. PDF 렌더링·다운로드
      try {
        await downloadPdf(pdfRootRef.current);
      } catch (pdfError: unknown) {
        console.error("PDF 생성 에러:", pdfError);
        const msg = pdfError instanceof Error ? pdfError.message : "알 수 없는 오류";
        setErrorMessage(`리포트 내용은 완성되었으나 PDF 변환 중 에러가 발생했습니다: ${msg}`);
      }

    } catch (e: unknown) {
      // 여기서 무조건 "네트워크 오류"라고 띄우던 악성 코드를 제거하고 진짜 원인 출력
      console.error("전체 프로세스 에러:", e);
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) {
        setErrorMessage("시간 초과: 리포트 생성에 5분 이상 소요되었습니다.");
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMessage(`시스템 에러 (F12 콘솔 확인): ${msg}`);
      }
      setIsSuccess(false);
    } finally {
      window.clearTimeout(timeoutId);
      setIsFetchingReport(false);
    }
  }, [birthDate, birthTime, downloadPdf, gender, mbti, name]);

  const completeVipAfterPayment = useCallback(
    async (imp_uid: string, merchant_uid: string) => {
      setErrorMessage(null);
      setIsPaymentPending(true);
      try {
        const verifyRes = await fetch(PAYMENT_VERIFY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentType: "vip",
            imp_uid,
            paymentId: imp_uid,
            merchant_uid,
          }),
        });

        const verifyData = (await verifyRes.json()) as { success?: boolean; message?: string };

        if (!verifyRes.ok || !verifyData.success) {
          const msg = (verifyData.message && verifyData.message.trim()) || "결제 검증에 실패했습니다.";
          setErrorMessage(msg);
          alert(`결제 검증 오류: ${msg}\n서버 키·IAMPORT 설정을 확인해 주세요.`);
          return;
        }

        setShowPaymentModal(false);
        await handleIssueReport({ imp_uid });
      } catch {
        setErrorMessage("결제 검증 중 오류가 발생했습니다.");
      } finally {
        setIsPaymentPending(false);
      }
    },
    [handleIssueReport],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const returnPayId = extractPaymentReturnId(params);
    const errorMsg = params.get("message") || params.get("error_msg");
    const errorCode = params.get("code");
    const vipMobile = localStorage.getItem("vip_mobile_payment_pending") === "1";
    const merchantUid = localStorage.getItem("pendingVipMerchantUid");
    const pendingMeta = readPendingPaymentData();
    const impSuccess = params.get("imp_success") === "true";

    const hasReturnSignal =
      impSuccess ||
      !!returnPayId ||
      !!params.get("paymentId") ||
      !!params.get("success") ||
      !!errorCode ||
      !!errorMsg;

    if (!hasReturnSignal) return;

    const cleanUrl = () => {
      clearPendingPaymentData();
      clearPendingPaymentState();
      router.replace(pathname || "/vip");
    };

    if (!returnPayId) {
      if (vipMobile || impSuccess) {
        setErrorMessage(
          errorMsg?.trim() ||
            "결제 복귀 URL에 결제 식별자(paymentId / imp_uid)가 없습니다. 결제 완료 후 이 페이지로 돌아왔는지 확인해 주세요.",
        );
        localStorage.removeItem("vip_mobile_payment_pending");
        localStorage.removeItem("pendingVipMerchantUid");
      }
      cleanUrl();
      return;
    }

    const canProcessVip =
      (vipMobile && !!merchantUid) ||
      (impSuccess && !!merchantUid && pendingMeta?.flow === "vip");

    if (!canProcessVip) {
      if (returnPayId && (vipMobile || impSuccess)) {
        alert("VIP 결제 복귀 오류: 주문번호(merchant_uid)가 없거나 세션이 만료되었습니다. 다시 결제를 시도해 주세요.");
        localStorage.removeItem("vip_mobile_payment_pending");
        localStorage.removeItem("pendingVipMerchantUid");
      }
      if (returnPayId) cleanUrl();
      return;
    }

    const isSuccess = isLikelyPortOneReturnSuccess(params, returnPayId);

    if (!isSuccess || !merchantUid) {
      localStorage.removeItem("vip_mobile_payment_pending");
      localStorage.removeItem("pendingVipMerchantUid");
      setErrorMessage(errorMsg?.trim() || "결제가 취소되었습니다.");
      cleanUrl();
      return;
    }

    localStorage.removeItem("vip_mobile_payment_pending");
    localStorage.removeItem("pendingVipMerchantUid");
    void completeVipAfterPayment(returnPayId, merchantUid).finally(() => {
      cleanUrl();
    });
  }, [completeVipAfterPayment, pathname, router]);

  const handleOpenPaymentModal = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("이름을 입력해 주세요.");
      return;
    }
    if (!birthDate.trim()) {
      setErrorMessage("생년월일을 입력해 주세요.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      setErrorMessage("생년월일을 YYYY-MM-DD 형식(8자리 숫자)으로 입력해 주세요.");
      return;
    }
    setErrorMessage(null);
    setShowPaymentModal(true);
  }, [birthDate, name]);

  const amuletDownloadName =
    amuletUrl?.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || "vip-amulet.jpg";

  return (
    <div
      className="relative min-h-screen overflow-x-hidden bg-[#030712] text-slate-100"
      style={{
        backgroundImage: "url('/images/bg-vip.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* 숨김 PDF 템플릿 — 화면 밖 렌더링(템플릿 내부). ref 루트로 페이지 노드를 캡처 */}
      <VipPdfTemplate ref={pdfRootRef} markdownData={reportMarkdown} userInfo={pdfUserInfo} />

      <PaymentMethodCheckoutModal
        open={showPaymentModal}
        onClose={() => {
          if (!isPaymentPending) setShowPaymentModal(false);
        }}
        amount={29900}
        productName="명운 VIP 대운 종합 분석 리포트"
        pendingPaymentType="vip"
        buyerName={name.trim().slice(0, 32) || "명운 VIP 고객"}
        buyerTel="010-0000-0000"
        buyerEmail="vip@ymstudio.co.kr"
        confirmLabel="결제하고 VIP 리포트 받기"
        onPaymentSuccess={async ({ imp_uid, merchant_uid }) => {
          setShowPaymentModal(false);
          await completeVipAfterPayment(imp_uid, merchant_uid);
        }}
        onPaymentError={(msg) => {
          setShowPaymentModal(false);
          setErrorMessage(msg);
        }}
      />

      {showFullScreenLoader ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <DynamicLoader
            subtitle={isPdfGenerating ? "고해상도 PDF로 저장하고 있어요." : undefined}
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(217,119,6,0.18),transparent)]" />

      <div className="relative z-10">
      <SiteHeader variant="vip" />

      <main className="relative mx-auto max-w-3xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        {isSuccess ? (
          <section className="rounded-3xl border border-amber-500/30 bg-slate-950/75 px-6 py-12 text-center shadow-2xl shadow-black/40 backdrop-blur-sm sm:px-10">
            <p className="font-serif text-2xl font-semibold text-amber-50 sm:text-3xl">
              🎉 VIP 대운 리포트가 완성되었습니다! 아래 생성된 PDF를 확인해 주세요.
            </p>
            <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-slate-300">
              PDF 파일이 브라우저 기본 <strong className="text-amber-200">다운로드 폴더</strong>에 저장되었습니다.
              파일명{' '}
              <span className="font-mono text-amber-300/90">명운_VIP_대운리포트.pdf</span>
              를 확인해 주세요.
            </p>

            {amuletUrl ? (
              <div className="mt-12">
                <p className="font-serif text-base font-medium text-amber-200/90">나만의 맞춤 디지털 부적</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={amuletUrl}
                  alt="맞춤 부적"
                  className="mx-auto mt-6 max-h-80 w-auto max-w-full rounded-3xl object-contain shadow-[0_0_40px_rgba(245,158,11,0.45),0_25px_50px_-12px_rgba(0,0,0,0.6)] ring-2 ring-amber-500/35"
                />
                <a
                  href={amuletUrl}
                  download={amuletDownloadName}
                  className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-500 px-6 py-4 font-serif text-sm font-bold leading-snug text-stone-950 shadow-[0_0_28px_-6px_rgba(245,158,11,0.55)] transition hover:brightness-105 sm:px-8 sm:text-base"
                >
                  [황금색 1:1 맞춤 부적 저장하기 (스마트폰 배경화면용)]
                </a>
              </div>
            ) : null}

            <div className="mt-12 flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-10">
              <Link
                href="/"
                className="text-sm text-amber-400/90 underline-offset-4 hover:text-amber-300 hover:underline"
              >
                홈으로
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  setAmuletUrl(null);
                  setReportMarkdown("");
                  setPdfUserInfo({ name: "", sajuSummary: "" });
                  setErrorMessage(null);
                }}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
              >
                새 리포트 받기
              </button>
            </div>
          </section>
        ) : (
          <>
        <p className="text-center text-xs font-medium uppercase tracking-[0.35em] text-amber-500/70">
          Miracle Zone Premium
        </p>
        <h1 className="mt-4 text-center font-serif text-[1.65rem] font-semibold leading-snug tracking-tight text-amber-50 sm:text-3xl sm:leading-tight">
          🔥 당신의 10년 대운과 재물 길방을
          <br className="sm:hidden" /> 완벽히 해부합니다
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-slate-400">
          만세력 명식과 AI 심층 해설을 한 장의 프리미엄 PDF로 압축합니다. 지금 입력하면 리포트가 바로 준비됩니다.
        </p>

        <section className="mt-14 space-y-4">
          <h2 className="text-center font-serif text-lg text-amber-200/90">VIP 리포트 시그니처</h2>
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <article className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-black/40 p-5 shadow-lg shadow-amber-950/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <Gem className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-base font-semibold text-amber-100">맞춤 디지털 부적</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                용신 기운을 보완하는 상징·색·자연물까지, 나만의 1:1 부적 처방 파트를 마지막 장에 담았습니다.
              </p>
            </article>
            <article className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-black/40 p-5 shadow-lg shadow-amber-950/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <BrainCircuit className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-base font-semibold text-amber-100">명리학 × MBTI</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                동양 명식과 서양 성격유형을 접목해 연애·대인관계 시나리오를 입체적으로 풀어 드립니다.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-amber-500/25 bg-gradient-to-br from-slate-950/95 via-[#0c1222] to-black/80 p-6 shadow-2xl shadow-black/50 sm:p-8">
          <div className="mb-6 flex items-center gap-2 text-amber-400">
            <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
            <h2 className="font-serif text-lg font-semibold text-amber-50">정보 입력</h2>
          </div>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-amber-500/80">
                이름 (표지에 표시)
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                autoComplete="name"
                className="w-full rounded-xl border border-slate-700/80 bg-black/40 px-4 py-3 text-sm text-slate-100 outline-none ring-amber-500/0 transition placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-amber-500/80">
                  생년월일 (양력)
                </span>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={10}
                    placeholder="YYYY-MM-DD"
                    value={birthDate}
                    onChange={(e) => setBirthDate(maskBirthDateInput(e.target.value))}
                    className="w-full rounded-xl border border-slate-700/80 bg-black/40 py-3 pl-4 pr-11 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <Calendar
                    className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500/55"
                    aria-hidden
                  />
                </div>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-amber-500/80">
                  출생 시각 (선택)
                </span>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={5}
                    placeholder="HH:MM"
                    value={birthTime}
                    onChange={(e) => setBirthTime(maskBirthTimeInput(e.target.value))}
                    className="w-full rounded-xl border border-slate-700/80 bg-black/40 py-3 pl-4 pr-11 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <Clock
                    className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500/55"
                    aria-hidden
                  />
                </div>
              </label>
              <fieldset className="block">
                <legend className="mb-1.5 text-xs font-medium uppercase tracking-wider text-amber-500/80">
                  성별
                </legend>
                <div className="flex gap-3 pt-1">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700/80 bg-black/40 px-4 py-3 has-[:checked]:border-amber-500/50 has-[:checked]:bg-amber-500/10">
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === "male"}
                      onChange={() => setGender("male")}
                      className="accent-amber-500"
                    />
                    <span className="text-sm">남성</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700/80 bg-black/40 px-4 py-3 has-[:checked]:border-amber-500/50 has-[:checked]:bg-amber-500/10">
                    <input
                      type="radio"
                      name="gender"
                      checked={gender === "female"}
                      onChange={() => setGender("female")}
                      className="accent-amber-500"
                    />
                    <span className="text-sm">여성</span>
                  </label>
                </div>
              </fieldset>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-amber-500/80">
                  MBTI (선택)
                </span>
                <input
                  type="text"
                  value={mbti}
                  onChange={(e) => setMbti(e.target.value.toUpperCase())}
                  placeholder="예: INFJ"
                  maxLength={4}
                  className="w-full rounded-xl border border-slate-700/80 bg-black/40 px-4 py-3 text-sm uppercase tracking-widest text-slate-100 outline-none placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                />
              </label>
            </div>

            {errorMessage ? (
              <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </p>
            ) : null}

            <div className="pt-2">
              <button
                type="button"
                disabled={isBusy || isPaymentPending}
                onClick={handleOpenPaymentModal}
                className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-500 px-6 py-5 text-center font-serif text-base font-bold tracking-wide text-stone-950 shadow-[0_0_40px_-8px_rgba(245,158,11,0.55)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
              >
                <span className="relative z-10 drop-shadow-sm">29,900원 결제하고 VIP 리포트 즉시 발급받기</span>
                <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20 opacity-40" />
              </button>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                결제 수단을 고른 뒤 포트원 결제창에서 결제합니다. 완료 및 서버 검증 후 리포트 생성과 PDF 저장이 진행됩니다.
              </p>
            </div>
          </div>
        </section>
          </>
        )}
      </main>
      </div>
    </div>
  );
}
