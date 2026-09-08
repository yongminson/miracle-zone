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
import { usePdfDownload, VIP_PDF_FILENAME } from "@/hooks/usePdfDownload";
import { isLikelyPortOneReturnSuccess } from "@/lib/payments/imp-uid";
import { clearPendingPaymentData, readPendingPaymentData } from "@/lib/payments/pending-payment-data";
import { clearPendingPaymentState } from "@/lib/payments/pending-payment-state";
import { extractPaymentReturnId } from "@/lib/payments/return-params";
import { PAYMENT_VERIFY_URL } from "@/lib/payments/verify-endpoint";
import { appendVipSymbolicAmulet } from "@/lib/saju/vip-symbolic-amulet";
import { logEvent } from "@/lib/analytics";

type VipApiSuccess = { success: true; markdown: string };
type VipApiFail = { success: false; error?: string };
type VipStreamChunk =
  | { type: "chunk"; text: string }
  | { type: "done" }
  | { type: "error"; error: string }
  | { type: "progress"; step: number; total: number; message: string };

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

/** 모바일 PG 리다이렉트 후 풀 리로드 시에도 동일 입력으로 `/api/saju/vip` 호출 */
const VIP_CHECKOUT_DRAFT_KEY = "vip_checkout_draft";

type VipCheckoutDraft = {
  name: string;
  birthDate: string;
  birthTime: string;
  gender: "male" | "female";
  mbti: string;
};

function readVipCheckoutDraft(): VipCheckoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VIP_CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<VipCheckoutDraft>;
    if (typeof d.name !== "string" || typeof d.birthDate !== "string") return null;
    return {
      name: d.name,
      birthDate: d.birthDate,
      birthTime: typeof d.birthTime === "string" ? d.birthTime : "",
      gender: d.gender === "female" ? "female" : "male",
      mbti: typeof d.mbti === "string" ? d.mbti : "",
    };
  } catch {
    return null;
  }
}

function writeVipCheckoutDraft(draft: VipCheckoutDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIP_CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

function clearVipCheckoutDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(VIP_CHECKOUT_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

const SAVED_VIP_RESULT_KEY = "saved_vip_result";

type SavedVipResultV1 = {
  v: 1;
  savedAt: string;
  markdown: string;
  pdfUserInfo: VipPdfUserInfo;
  amuletUrl: string | null;
  name: string;
  birthDate: string;
  birthTime: string;
  gender: "male" | "female";
  mbti: string;
};

function parseSavedVipResult(raw: string): SavedVipResultV1 | null {
  try {
    const d = JSON.parse(raw) as Partial<SavedVipResultV1>;
    if (d.v !== 1 || typeof d.markdown !== "string" || !d.markdown.trim()) return null;
    if (!d.pdfUserInfo || typeof d.pdfUserInfo !== "object") return null;
    const pi = d.pdfUserInfo as Partial<VipPdfUserInfo>;
    if (typeof pi.name !== "string" || typeof pi.sajuSummary !== "string") return null;
    return {
      v: 1,
      savedAt: typeof d.savedAt === "string" ? d.savedAt : new Date().toISOString(),
      markdown: d.markdown,
      pdfUserInfo: { name: pi.name, sajuSummary: pi.sajuSummary },
      amuletUrl: typeof d.amuletUrl === "string" ? d.amuletUrl : null,
      name: typeof d.name === "string" ? d.name : "",
      birthDate: typeof d.birthDate === "string" ? d.birthDate : "",
      birthTime: typeof d.birthTime === "string" ? d.birthTime : "",
      gender: d.gender === "female" ? "female" : "male",
      mbti: typeof d.mbti === "string" ? d.mbti : "",
    };
  } catch {
    return null;
  }
}

function readSavedVipResult(): SavedVipResultV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_VIP_RESULT_KEY);
    if (!raw) return null;
    return parseSavedVipResult(raw);
  } catch {
    return null;
  }
}

function clearSavedVipResult(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SAVED_VIP_RESULT_KEY);
  } catch {
    /* ignore */
  }
}

function reportGenAlert(reason: string): void {
  alert(`리포트 생성 중 오류가 발생했습니다.\n(사유: ${reason})`);
}

export default function VipLandingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const pdfRootRef = useRef<HTMLDivElement>(null);
  const { buildPdfBlob, isGenerating: isPdfGenerating } = usePdfDownload({ scale: 1 });

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
  const [progressMessage, setProgressMessage] = useState<string>("분석을 시작합니다...");
  const [progressStep, setProgressStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [amuletUrl, setAmuletUrl] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  /** PDF 또는 부적 수동 저장 시도 완료 — '새 리포트 받기' CS 방어 */
  const [isDownloaded, setIsDownloaded] = useState(false);
  type VipPdfBlobLink = {
    blobUrl: string;
    filename: string;
    revoke: () => void;
  };
  const [pdfFallback, setPdfFallback] = useState<VipPdfBlobLink | null>(null);
  /** 부적 CORS 성공 시 Blob URL — 순수 `<a download>`용 */
  const [amuletBlobUrl, setAmuletBlobUrl] = useState<string | null>(null);
  const amuletBlobRevokeRef = useRef<(() => void) | null>(null);
  /** 동일 마크다운으로 PDF 빌드가 중복 실행되지 않도록 */
  const [reportRevision, setReportRevision] = useState(0);
  const [hasSavedVipRestore, setHasSavedVipRestore] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);

  const REVIEWS = [
    {
      name: "활용 예시 1",
      date: "성향 정리",
      star: "①",
      job: "자기이해",
      text: "입력한 생년월일과 선택 정보를 바탕으로 현재 확인 가능한 성향과 생활 패턴을 읽기 쉽게 정리합니다.",
    },
    {
      name: "활용 예시 2",
      date: "선택 점검",
      star: "②",
      job: "생활 인사이트",
      text: "일·관계·생활 습관을 돌아볼 질문과 실천 아이디어를 제공하며 중요한 결정은 사용자가 직접 판단하도록 돕습니다.",
    },
    {
      name: "활용 예시 3",
      date: "PDF 보관",
      star: "③",
      job: "실천 가이드",
      text: "결과를 PDF로 저장해 두고 목표와 행동 계획을 정리하는 참고 자료로 활용할 수 있습니다.",
    },
  ];

  // 자동 슬라이드 (4초마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setReviewIndex((prev) => (prev + 1) % REVIEWS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 📊 계측 — 사주 인사이트 페이지 도달. 유입량·진입 경로 판단용
  useEffect(() => {
    void logEvent("page_view", { page: "vip" });
  }, []);
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/admin/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { active?: boolean } | null) => {
        if (cancelled) return;
        const active = data?.active === true;
        setIsAdminMode(active);
        if (!active) localStorage.removeItem("MASTER_ADMIN");
      })
      .catch(() => {
        if (!cancelled) setIsAdminMode(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // GlobalSiteFooter에서 운영자 모드 활성화 감지
  useEffect(() => {
    const handleStorageChange = () => window.location.reload();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isSuccess) {
      setHasSavedVipRestore(false);
      return;
    }
    setHasSavedVipRestore(!!readSavedVipResult());
  }, [isSuccess]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isSuccess || !reportMarkdown.trim()) return;
    try {
      const payload: SavedVipResultV1 = {
        v: 1,
        savedAt: new Date().toISOString(),
        markdown: reportMarkdown,
        pdfUserInfo,
        amuletUrl,
        name: name.trim(),
        birthDate: birthDate.trim(),
        birthTime: birthTime.trim(),
        gender,
        mbti: mbti.trim(),
      };
      localStorage.setItem(SAVED_VIP_RESULT_KEY, JSON.stringify(payload));
    } catch {
      /* 저장 공간 부족 등 */
    }
  }, [isSuccess, reportMarkdown, pdfUserInfo, amuletUrl, name, birthDate, birthTime, gender, mbti]);

  useEffect(() => {
    if (!isSuccess || !reportMarkdown.trim()) return;

    let cancelled = false;
    void (async () => {
      // 페이지 분할(챕터별 렌더)이 끝날 시간을 준다.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      // 페이지 분할이 끝날 때까지 대기: 최소 대기 후, data-pdf-page 개수가
      // 10장 이상 & 8프레임 안정될 때까지 기다린다 (이어보기·처음생성 모두 안전).
      await new Promise<void>((resolve) => {
        let last = -1;
        let stable = 0;
        let tries = 0;
        const tick = () => {
          const n = pdfRootRef.current?.querySelectorAll("[data-pdf-page]").length ?? 0;
          if (n >= 10 && n === last) stable += 1;
          else stable = 0;
          last = n;
          tries += 1;
          // 10장 이상이 8프레임 안정될 때만 통과. 최대 6초까지 대기.
          if ((n >= 10 && stable >= 8) || tries > 360) {
            resolve();
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      });

      if (cancelled) return;

      setPdfFallback((prev) => {
        prev?.revoke();
        return null;
      });

      const res = await buildPdfBlob(pdfRootRef.current);
      if (cancelled) {
        if (res?.ok) res.revoke();
        return;
      }

      if (res?.ok) {
        setPdfFallback({
          blobUrl: res.blobUrl,
          filename: res.filename,
          revoke: res.revoke,
        });
      } else if (res && !res.ok) {
        setErrorMessage((prev) => {
          const line = `리포트 내용은 완성되었으나 PDF 변환에 실패했습니다: ${res.error}`;
          if (prev?.includes("PDF 변환")) return prev;
          return prev ? `${prev}\n${line}` : line;
        });
      }
    })();

    return () => {
      cancelled = true;
    };  }, [isSuccess, reportMarkdown, reportRevision, buildPdfBlob, pdfUserInfo.sajuSummary]);

  useEffect(() => {
    if (!isSuccess || !amuletUrl) {
      amuletBlobRevokeRef.current?.();
      amuletBlobRevokeRef.current = null;
      setAmuletBlobUrl(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(amuletUrl, { mode: "cors" });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        amuletBlobRevokeRef.current?.();
        amuletBlobRevokeRef.current = () => {
          try {
            URL.revokeObjectURL(url);
          } catch {
            /* ignore */
          }
        };
        if (!cancelled) setAmuletBlobUrl(url);
      } catch {
        if (!cancelled) setAmuletBlobUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSuccess, amuletUrl]);

  const showFullScreenLoader =
    (isFetchingReport && !reportMarkdown.trim()) || (isSuccess && isPdfGenerating && !pdfFallback);

    const loaderMessage = isFetchingReport
    ? progressMessage
    : isPdfGenerating
    ? "PDF 변환 중..."
    : "잠시만 기다려 주세요...";
  const isBusy = isFetchingReport || isPdfGenerating;

  const handleIssueReport = useCallback(async (options?: { imp_uid?: string | null }) => {
    setErrorMessage(null);
    if (!options?.imp_uid) {
      setIsSuccess(false);
      setAmuletUrl(null);
      setPdfFallback((p) => {
        p?.revoke();
        return null;
      });
      setIsDownloaded(false);
    }

    const draft = options?.imp_uid ? readVipCheckoutDraft() : null;
    const trimmedName = (draft?.name ?? name).trim();
    const birthDateEff = (draft?.birthDate ?? birthDate).trim();
    const birthTimeEff = (draft?.birthTime ?? birthTime).trim();
    const genderEff = draft?.gender ?? gender;
    const mbtiEff = (draft?.mbti ?? mbti).trim();

    if (!trimmedName) {
      const msg = options?.imp_uid
        ? "모바일 결제 직전에 저장된 이름이 없습니다. 다시 입력 후 결제해 주세요."
        : "이름을 입력해 주세요.";
      setErrorMessage(msg);
      reportGenAlert(msg);
      return;
    }
    if (!birthDateEff) {
      const msg = options?.imp_uid
        ? "모바일 결제 직전에 저장된 생년월일이 없습니다. 다시 입력 후 결제해 주세요."
        : "생년월일을 입력해 주세요.";
      setErrorMessage(msg);
      reportGenAlert(msg);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDateEff)) {
      const msg = "생년월일을 YYYY-MM-DD 형식(8자리 숫자)으로 입력해 주세요.";
      setErrorMessage(msg);
      reportGenAlert(msg);
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
          // 1. 백엔드에 스트리밍 요청
          const res = await fetch("/api/saju/vip", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmedName,
              gender: genderEff,
              birthDate: birthDateEff,
              birthTime: birthTimeEff || null,
              mbti: mbtiEff || null,
              calendarType: "solar",
              ...paymentPayload,
            }),
            signal: controller.signal,
          });
    
          if (!res.ok || !res.body) {
            let errMsg = "리포트 생성 실패";
            try {
              const errData = (await res.json()) as VipApiFail;
              if (!errData.success && errData.error) errMsg = errData.error;
            } catch {}
            const full = `API 응답 오류 (HTTP ${res.status}): ${errMsg}`;
            setErrorMessage(full);
            reportGenAlert(full);
            setIsSuccess(false);
            return;
          }
    
          // 스트리밍 수신
          setProgressMessage("1단계: 사주 원국 및 직업·재물·애정운 분석 중...");
          setProgressStep(1);
    
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let fullMarkdown = "";
          let buffer = "";
    
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line) as VipStreamChunk;
                if (parsed.type === "chunk") {
                  fullMarkdown += parsed.text;
                  setReportMarkdown(fullMarkdown);
                } else if (parsed.type === "progress") {
                  setProgressMessage(parsed.message);
                  setProgressStep(parsed.step);
                } else if (parsed.type === "error") {
                  throw new Error(parsed.error);
                }
              } catch (parseErr) {
                // JSON 파싱 실패 라인 무시
              }
            }
          }
    
          if (!fullMarkdown.trim()) {
            const msg = "리포트 내용이 비어 있습니다. 다시 시도해 주세요.";
            setErrorMessage(msg);
            reportGenAlert(msg);
            setIsSuccess(false);
            return;
          }
    
          if (options?.imp_uid) {
            clearVipCheckoutDraft();
            setName(trimmedName);
            setBirthDate(birthDateEff);
            setBirthTime(birthTimeEff);
            setGender(genderEff);
            setMbti(mbtiEff);
          }
    
          const summary = buildSajuSummary({
            name: trimmedName,
            birthDate: birthDateEff,
            birthTime: birthTimeEff,
            gender: genderEff,
            mbti: mbtiEff,
          });
    
          // 2. 텍스트 세팅 완료
          setPdfUserInfo({ name: trimmedName, sajuSummary: summary });
          setReportMarkdown(fullMarkdown);
    
          const extracted = extractAmuletUrlFromMarkdown(fullMarkdown);
          setAmuletUrl(extracted);
    
          // DOM 업데이트 대기
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
    
          setIsSuccess(true);
          setIsDownloaded(true);
          setReportRevision((r) => r + 1);

    } catch (e: unknown) {
      // 여기서 무조건 "네트워크 오류"라고 띄우던 악성 코드를 제거하고 진짜 원인 출력
      console.error("전체 프로세스 에러:", e);
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) {
        const msg = "시간 초과: 리포트 생성에 5분 이상 소요되었습니다.";
        setErrorMessage(msg);
        reportGenAlert(msg);
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        const full = `네트워크 또는 예외 — ${msg}`;
        setErrorMessage(`시스템 에러 (F12 콘솔 확인): ${msg}`);
        reportGenAlert(full);
      }
      setIsSuccess(false);
    } finally {
      window.clearTimeout(timeoutId);
      setIsFetchingReport(false);
    }
  }, [birthDate, birthTime, gender, mbti, name]);

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
            vip_customer_name: name.trim() || undefined,
            vip_phone: "010-0000-0000",
          }),
        });

        const verifyData = (await verifyRes.json()) as { success?: boolean; message?: string };

        if (!verifyRes.ok || !verifyData.success) {
          const msg = (verifyData.message && verifyData.message.trim()) || "결제 검증에 실패했습니다.";
          // 📊 계측 — 서버 검증 실패(퍼널 이탈 지점)
          void logEvent("payment_fail", { product: "vip", amount: 4400, reason: "verify" });
          setErrorMessage(msg);
          alert(`결제 검증 오류: ${msg}\n서버 키·IAMPORT 설정을 확인해 주세요.`);
          return;
        }

        // 📊 계측 — 서버 검증 통과(퍼널 3단계)
        void logEvent("payment_complete", { product: "vip", amount: 4400 });
        setShowPaymentModal(false);
        await handleIssueReport({ imp_uid });
      } catch (e: unknown) {
        const hint = e instanceof Error ? e.message : String(e);
        const msg = `결제 검증 또는 리포트 요청 중 예외 — ${hint}`;
        setErrorMessage(msg);
        alert(`리포트 생성 중 오류가 발생했습니다.\n(사유: ${msg})`);
      } finally {
        setIsPaymentPending(false);
      }
    },
    [handleIssueReport, name],
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
        alert("리포트 결제 복귀 오류: 주문번호(merchant_uid)가 없거나 세션이 만료되었습니다. 다시 결제를 시도해 주세요.");
        localStorage.removeItem("vip_mobile_payment_pending");
        localStorage.removeItem("pendingVipMerchantUid");
      }
      if (returnPayId) cleanUrl();
      return;
    }

    const pgReturnPositive = isLikelyPortOneReturnSuccess(params, returnPayId);

    if (!pgReturnPositive || !merchantUid) {
      localStorage.removeItem("vip_mobile_payment_pending");
      localStorage.removeItem("pendingVipMerchantUid");
      setErrorMessage(errorMsg?.trim() || "결제가 취소되었습니다.");
      cleanUrl();
      return;
    }

    const draft = readVipCheckoutDraft();
    if (draft) {
      if (draft.name) setName(draft.name);
      if (draft.birthDate) setBirthDate(draft.birthDate);
      setBirthTime(draft.birthTime ?? "");
      setGender(draft.gender);
      setMbti(draft.mbti ?? "");
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
    writeVipCheckoutDraft({
      name: trimmedName,
      birthDate: birthDate.trim(),
      birthTime: birthTime.trim(),
      gender,
      mbti: mbti.trim(),
    });
    // 📊 계측 — 입력 완료 후 결제창 진입(퍼널 2단계)
    void logEvent("payment_start", { product: "vip", amount: 4400 });
    setShowPaymentModal(true);
  }, [birthDate, birthTime, gender, mbti, name]);

  const pdfFallbackRef = useRef(pdfFallback);
  pdfFallbackRef.current = pdfFallback;

  useEffect(() => {
    return () => {
      pdfFallbackRef.current?.revoke();
      amuletBlobRevokeRef.current?.();
      amuletBlobRevokeRef.current = null;
    };
  }, []);

  const handleResumeSavedVip = useCallback(() => {
    const saved = readSavedVipResult();
    if (!saved) return;
    const restored = appendVipSymbolicAmulet(saved.markdown, `${saved.name}|${saved.birthDate}`);
    setErrorMessage(null);
    setPdfFallback((p) => {
      p?.revoke();
      return null;
    });
    amuletBlobRevokeRef.current?.();
    amuletBlobRevokeRef.current = null;
    setAmuletBlobUrl(null);
    setReportMarkdown("");
    setTimeout(() => setReportMarkdown(restored.markdown), 50);
    setPdfUserInfo(saved.pdfUserInfo);
    setAmuletUrl(saved.amuletUrl ?? restored.url);
    if (saved.name) setName(saved.name);
    setBirthDate(saved.birthDate);
    setBirthTime(saved.birthTime);
    setGender(saved.gender);
    setMbti(saved.mbti);
    setIsDownloaded(true);
    setIsSuccess(true);
    // reportMarkdown이 이전과 같아도 PDF 재생성이 확실히 트리거되도록 revision을 시간값으로 강제
    setReportRevision(Date.now());
  }, []);

  const handleNewReportClick = useCallback(() => {
    if (!isDownloaded) {
      if (
        !confirm(
          "아직 리포트를 저장하지 않으셨습니다!\n새 리포트를 받으면 현재 결과가 영구히 삭제됩니다.\n정말 새로 진행하시겠습니까?",
        )
      ) {
        return;
      }
    }
    setPdfFallback((p) => {
      p?.revoke();
      return null;
    });
    amuletBlobRevokeRef.current?.();
    amuletBlobRevokeRef.current = null;
    setAmuletBlobUrl(null);
    clearSavedVipResult();
    setReportRevision(0);
    setIsSuccess(false);
    setIsDownloaded(false);
    setAmuletUrl(null);
    setReportMarkdown("");
    setPdfUserInfo({ name: "", sajuSummary: "" });
    setErrorMessage(null);
    clearVipCheckoutDraft();
  }, [isDownloaded]);

  const amuletDownloadName =
    amuletUrl?.split("/").pop()?.replace(/[^a-zA-Z0-9._-]/g, "_") || "vip-amulet.jpg";

  const linkButtonPdf =
    "inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-500 px-5 py-3.5 text-sm font-bold text-stone-950 shadow-[0_0_24px_-6px_rgba(245,158,11,0.5)] transition hover:brightness-105 sm:min-w-[200px] sm:px-6";
  const linkButtonPdfDisabled =
    "inline-flex min-h-[48px] cursor-not-allowed items-center justify-center rounded-2xl bg-slate-800/90 px-5 py-3.5 text-sm font-bold text-slate-500 sm:min-w-[200px] sm:px-6";
  const linkButtonAmulet =
    "inline-flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-amber-400/60 bg-amber-500/15 px-5 py-3.5 text-sm font-bold text-amber-100 transition hover:bg-amber-500/25 sm:min-w-[200px] sm:px-6";
  const renderVipDownloadButtonRow = (placement: "top" | "bottom") => {
    const pdfHref = pdfFallback?.blobUrl;
    return (
      <div
        key={`vip-download-row-${placement}`}
        className="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:mx-auto sm:max-w-lg sm:flex-row sm:justify-center sm:items-center"
      >
        {pdfHref ? (
          <a href={pdfHref} download={VIP_PDF_FILENAME} className={linkButtonPdf}>
            [📥 PDF 다운로드]
          </a>
        ) : isPdfGenerating ? (
          <span className={linkButtonPdfDisabled} aria-disabled>
            PDF 생성 중…
          </span>
        ) : (
          <button
            type="button"
            className={linkButtonPdf}
            onClick={() => {
              setErrorMessage(null);
              setReportRevision(Date.now());
            }}
          >
            [📄 PDF 만들기 · 다시 시도]
          </button>
        )}
        {amuletUrl ? (
          amuletBlobUrl ? (
            <a href={amuletBlobUrl} download={amuletDownloadName} className={linkButtonAmulet}>
              [🖼️ 이미지 저장]
            </a>
          ) : (
            <a
              href={amuletUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkButtonAmulet}
            >
              [🖼️ 상징 이미지 열기 · 저장]
            </a>
          )
        ) : null}
      </div>
    );
  };

  const vipMobileSaveHint =
    isSuccess && (pdfFallback?.blobUrl || amuletUrl) ? (
      <p className="mx-auto mt-4 max-w-lg text-center text-xs leading-relaxed text-amber-200/65">
        모바일·인앱에서는 링크를 <strong className="text-amber-200/90">길게 눌러</strong> 파일로 저장하거나 공유 메뉴를 이용해 주세요.
      </p>
    ) : null;

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
        amount={4400}
        productName="명운 사주 인사이트 리포트"
        pendingPaymentType="vip"
        buyerName={name.trim().slice(0, 32) || "명운 리포트 고객"}
        buyerTel="010-0000-0000"
        buyerEmail="vip@ymstudio.co.kr"
        confirmLabel="결제하고 사주 인사이트 리포트 받기"
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
              🎉 사주 인사이트 리포트가 완성되었습니다! 아래 생성된 PDF를 확인해 주세요.
            </p>
            <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-slate-300">
              리포트 본문은 이 기기에 <strong className="text-amber-200">자동 저장</strong>되어, 나중에 이 페이지에서 다시 열 수 있습니다. PDF 파일은{" "}
              <strong className="text-amber-200">[📥 PDF 다운로드]</strong> 링크를 눌러 저장해 주세요. 파일명{" "}
              <span className="font-mono text-amber-300/90">{VIP_PDF_FILENAME}</span>
            </p>

            {renderVipDownloadButtonRow("top")}
            {vipMobileSaveHint}

            {errorMessage ? (
              <p className="mx-auto mt-4 max-w-lg rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </p>
            ) : null}

            {amuletUrl ? (
              <div className="mt-12">
                <p className="font-serif text-base font-medium text-amber-200/90">리포트 상징 이미지</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={amuletUrl}
                  alt="리포트 상징 이미지"
                  className="mx-auto mt-6 max-h-80 w-auto max-w-full rounded-3xl object-contain shadow-[0_0_40px_rgba(245,158,11,0.45),0_25px_50px_-12px_rgba(0,0,0,0.6)] ring-2 ring-amber-500/35"
                />
                <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-amber-200/60">
                  상징 이미지는 상단·하단 <strong className="text-amber-200/90">[🖼️ 이미지 저장]</strong> 링크를 길게 눌러 앨범에 저장해 주세요.
                </p>
              </div>
            ) : null}

            {amuletUrl ? renderVipDownloadButtonRow("bottom") : null}

            <div className="mt-12 flex flex-wrap items-center justify-center gap-4 border-t border-white/10 pt-10">
              <Link
                href="/"
                className="text-sm text-amber-400/90 underline-offset-4 hover:text-amber-300 hover:underline"
              >
                홈으로
              </Link>
              <button
                type="button"
                onClick={handleNewReportClick}
                className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/20"
              >
                새 리포트 받기
              </button>
            </div>
          </section>
        ) : (
          <>
        {hasSavedVipRestore ? (
          <div className="mb-8 rounded-2xl border border-amber-500/40 bg-amber-950/40 px-4 py-4 shadow-lg shadow-amber-950/20 sm:px-5">
            <p className="text-center text-xs text-amber-100/85 sm:text-sm">
              이 기기에 저장된 사주 인사이트 리포트가 있습니다. 결제를 다시 하지 않고 이어서 볼 수 있습니다.
            </p>
            <button
              type="button"
              onClick={handleResumeSavedVip}
              className="mt-3 flex w-full min-h-[48px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 px-4 py-3 text-sm font-bold text-stone-950 shadow-[0_0_20px_-6px_rgba(245,158,11,0.45)] transition hover:brightness-105"
            >
              [최근 결제한 사주 인사이트 리포트 이어보기]
            </button>
          </div>
        ) : null}

{isAdminMode && (
          <div className="fixed bottom-6 left-6 z-[100] bg-slate-900/95 border-2 border-yellow-500 p-4 rounded-2xl backdrop-blur-xl shadow-2xl max-w-[200px]">
            <h3 className="text-yellow-400 font-bold text-sm mb-2 border-b border-white/10 pb-2">👑 운영자 모드</h3>
            <p className="text-[11px] text-white/60 mb-3">운영 점검용 리포트 생성</p>
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/admin/session", { method: "DELETE" }).catch(() => null);
                localStorage.removeItem("MASTER_ADMIN");
                setIsAdminMode(false);
                alert("운영자 모드가 종료되었습니다.");
              }}
              className="w-full text-[10px] font-bold text-red-400/80 hover:text-red-400 transition-colors border border-red-400/20 rounded-lg py-1.5"
            >
              ❌ 운영자 모드 종료
            </button>
          </div>
        )}

        <p className="text-center text-xs font-medium uppercase tracking-[0.35em] text-amber-500/70">
          Miracle Zone Premium
        </p>
        <h1 className="mt-4 text-center font-serif text-[1.65rem] font-semibold leading-snug tracking-tight text-amber-50 sm:text-3xl sm:leading-tight">
          🔥 입력 정보로 살펴보는 나의 성향과 생활 인사이트
          <br className="sm:hidden" /> 이해하기 쉬운 PDF로 정리합니다
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-center text-sm leading-relaxed text-slate-400">
          절기 기준 명식·시주·십성·대운과 향후 5개년 흐름을 계산하고, 재물·직장·연애·관계·생활 관리까지 14장 PDF로 정리합니다.
        </p>

        {/* 제공 방식 배지 */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            { number: "PDF", label: "다운로드 제공" },
            { number: "1회", label: "결제당 리포트 발급" },
            { number: "참고용", label: "자기이해 콘텐츠" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
              <p className="text-lg font-bold text-amber-300">{item.number}</p>
              <p className="mt-1 text-[10px] text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>

        <section className="mt-14 space-y-4">
          <h2 className="text-center font-serif text-lg text-amber-200/90">사주 인사이트 리포트 구성</h2>
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            <article className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-black/40 p-5 shadow-lg shadow-amber-950/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <BrainCircuit className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-base font-semibold text-amber-100">명식·십성·대운 지도</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                입력한 생년월일시를 절기 기준으로 계산해 네 기둥과 십성, 현재 대운과 다음 대운, 향후 5개년 흐름을 표로 제공합니다.
              </p>
            </article>
            <article className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-black/40 p-5 shadow-lg shadow-amber-950/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <Gem className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-base font-semibold text-amber-100">참고용 맞춤 상징 부적</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                입력 정보로 일관되게 선택한 개인 상징 이미지를 PDF와 별도 이미지로 제공합니다. 용신 계산이나 효능을 의미하지 않습니다.
              </p>
            </article>
            <article className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-slate-900/90 to-black/40 p-5 shadow-lg shadow-amber-950/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                <BrainCircuit className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-4 font-serif text-base font-semibold text-amber-100">삶의 핵심 분야 분석</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                재물·직장과 사업·연애·가족 관계·선택 심리·실행 계획을 계산 근거와 현실 점검 질문으로 풀어 드립니다.
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
                onClick={isAdminMode ? () => handleIssueReport() : handleOpenPaymentModal}
                className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-700 via-amber-500 to-yellow-500 px-6 py-5 text-center font-serif text-base font-bold tracking-wide text-stone-950 shadow-[0_0_40px_-8px_rgba(245,158,11,0.55)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:text-lg"
              >
                <span className="relative z-10 drop-shadow-sm">
                  {isAdminMode ? "⚡ [운영자] 사주 인사이트 리포트 점검" : "4,400원 결제하고 사주 인사이트 리포트 받기"}
                </span>
                <span className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20 opacity-40" />
              </button>
              <p className="mt-3 text-center text-[11px] text-slate-500">
                결제 수단을 고른 뒤 포트원 결제창에서 결제합니다. 완료 및 서버 검증 후 리포트 생성과 PDF 저장이 진행됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* 리포트 활용 예시 - 슬라이드형 캐러셀 */}
        <div className="mt-8">
          <h2 className="text-center font-serif text-base text-amber-200/80 mb-4">📘 리포트 활용 예시</h2>

          {/* 슬라이드 카드 */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-white/5 p-5 min-h-[140px]">
            {REVIEWS.map((review, idx) => (
              <div
                key={review.name}
                className={`transition-all duration-500 ${
                  idx === reviewIndex
                    ? "opacity-100 translate-x-0"
                    : idx < reviewIndex
                    ? "opacity-0 -translate-x-full absolute inset-0 p-5"
                    : "opacity-0 translate-x-full absolute inset-0 p-5"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-sm font-bold text-amber-300">
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white/80">
                        {review.name}
                        <span className="text-white/40 font-normal"> · {review.job}</span>
                      </p>
                      <p className="text-[10px] text-white/30">{review.date}</p>
                    </div>
                  </div>
                  <span className="text-sm text-amber-400">{review.star}</span>
                </div>
                <p className="text-xs leading-relaxed text-white/65">{review.text}</p>
              </div>
            ))}
          </div>

          {/* 하단 인디케이터 + 수동 버튼 */}
          <div className="mt-3 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setReviewIndex((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length)}
              className="text-white/30 hover:text-white/70 transition-colors text-lg px-2"
            >
              ‹
            </button>
            <div className="flex gap-1.5">
              {REVIEWS.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReviewIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === reviewIndex ? "w-6 bg-amber-400" : "w-1.5 bg-white/20"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setReviewIndex((prev) => (prev + 1) % REVIEWS.length)}
              className="text-white/30 hover:text-white/70 transition-colors text-lg px-2"
            >
              ›
            </button>
          </div>
        </div>

        {/* 보안 배지 */}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {[
            { icon: "🔒", text: "SSL 보안 결제" },
            { icon: "📄", text: "즉시 PDF 발급" },
            { icon: "♻️", text: "7일 환불 보장" },
            { icon: "🤖", text: "AI 맞춤 분석" },
          ].map((badge) => (
            <div key={badge.text} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <span className="text-sm">{badge.icon}</span>
              <span className="text-[10px] text-white/50">{badge.text}</span>
            </div>
          ))}
        </div>
          </>
        )}
      </main>
      </div>
    </div>
  );
}
