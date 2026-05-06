"use client";

import { useState } from "react";

const TERMS_TEXT =
  "제1조 (목적)\n본 약관은 서비스의 이용조건 및 절차, 이용자와 회사의 권리, 의무, 책임사항을 규정함을 목적으로 합니다.\n\n제2조 (서비스의 성격)\n본 서비스에서 제공하는 모든 결과는 통계적, 학술적 해석에 기반하며 절대적인 사실이나 미래를 보장하지 않습니다.\n\n제3조 (서비스 제공 시기)\n본 서비스에서 제공하는 모든 유료 서비스(디지털 콘텐츠)는 결제 완료 후 즉시 이용 가능합니다.";

const PRIVACY_TEXT =
  "1. 수집하는 개인정보 항목\n회사는 회원가입 없이 서비스를 제공하며, 사주 분석을 위해 입력하신 생년월일, 성별, 이름 등은 서버에 영구 저장되지 않고 분석 즉시 폐기됩니다.\n\n2. 쿠키의 사용\n서비스 편의를 위해 기기 내부에 일부 설정(예: 프리미엄 해제 상태)이 임시 저장될 수 있습니다.";

const REFUND_TEXT =
  "[디지털 콘텐츠 환불 규정 안내]\n\n본 서비스에서 제공되는 모든 유료 서비스는 '디지털 콘텐츠'에 해당하며, 관련 법령에 의거하여 다음과 같이 환불 정책을 운영합니다.\n\n1. 환불 기준 (청약철회)\n- 이용권을 결제하였으나 실제 서비스를 전혀 이용하지 않은 경우(결과 열람 전), 결제일로부터 7일 이내에 고객센터를 통해 100% 환불을 요청하실 수 있습니다.\n\n2. 시스템 오류 및 서비스 장애\n- 결제는 정상적으로 완료되었으나 시스템 오류로 인해 결과 화면을 전혀 열람하지 못한 경우, 고객센터 확인을 거쳐 즉시 100% 환불 또는 서비스 재제공 처리를 해드립니다.\n\n3. 환불 제한 사항\n- 전자상거래법 제17조 제2항 제5호에 따라, 소비자의 사용 또는 일부 소비로 재화 등의 가치가 현저히 감소한 경우(예: 운세/관상/번호 추출 결과를 이미 열람한 경우)에는 청약철회가 제한됩니다.";

/** 전역 하단 신뢰·법적 정보 (모든 페이지 공통) */
export function GlobalSiteFooter() {
  const [showPolicy, setShowPolicy] = useState<"terms" | "privacy" | "refund" | null>(null);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);

  return (
    <>
      <footer className="border-t border-white/10 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <p className="text-center text-[10px] leading-relaxed text-white/45">
            본 서비스에서 제공하는 운세, 해몽, 관상 및 이름 풀이 결과는 정통 명리학에 기반한 통계적 해석으로, 절대적인 미래를 보장하지 않으며 법적 책임을 지지 않습니다.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-x-3 gap-y-2 text-[11px] font-medium text-white/55">
            <button
              type="button"
              onClick={() => setShowPolicy("terms")}
              className="transition-colors hover:text-white"
            >
              이용약관
            </button>
            <span aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setShowPolicy("privacy")}
              className="transition-colors hover:text-white"
            >
              개인정보처리방침
            </button>
            <span aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setShowPolicy("refund")}
              className="transition-colors hover:text-white"
            >
              환불정책
            </button>
            <span aria-hidden>|</span>
            <button
              type="button"
              onClick={() => setShowCompanyInfo(!showCompanyInfo)}
              className="flex items-center gap-1 transition-colors hover:text-white"
            >
              사업자 정보 {showCompanyInfo ? "▲" : "▼"}
            </button>
          </div>

          {showCompanyInfo ? (
            <div className="mx-auto mt-6 max-w-lg space-y-1.5 border-t border-white/10 pt-6 text-[10px] leading-relaxed text-white/40">
              <p className="font-bold text-white/55">와이엠 스튜디오 (YM Studio)</p>
              <p>대표자: 손용민 | 사업자등록번호: 510-21-21827</p>
              <p>주소: 충청남도 아산시 둔포면 운교길 129번길 14-71</p>
              <p>고객센터: 0507-1385-9994 | 이메일: support@ymsudio.co.kr</p>
              <p>통신판매업신고번호: 제 2026-충남아산-0479 호</p>
            </div>
          ) : null}

          <p className="mt-8 text-center text-[10px] text-white/25">
            © {new Date().getFullYear()} 명운(命運). All rights reserved.
          </p>
        </div>
      </footer>

      {showPolicy ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowPolicy(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="global-policy-title"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-white/20 bg-slate-900 p-6 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="global-policy-title"
              className="mb-4 flex shrink-0 items-center justify-between border-b border-white/10 pb-3 text-lg font-bold text-yellow-400"
            >
              <span>
                {showPolicy === "terms"
                  ? "이용약관"
                  : showPolicy === "privacy"
                    ? "개인정보처리방침"
                    : "환불정책"}
              </span>
              <button
                type="button"
                onClick={() => setShowPolicy(null)}
                className="text-2xl font-light text-white/50 hover:text-white"
                aria-label="닫기"
              >
                &times;
              </button>
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 text-xs leading-relaxed text-white/80 whitespace-pre-wrap">
              {showPolicy === "terms" && TERMS_TEXT}
              {showPolicy === "privacy" && PRIVACY_TEXT}
              {showPolicy === "refund" && REFUND_TEXT}
            </div>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-white/10 py-3 font-medium text-white transition-colors hover:bg-white/20"
              onClick={() => setShowPolicy(null)}
            >
              확인하고 닫기
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
