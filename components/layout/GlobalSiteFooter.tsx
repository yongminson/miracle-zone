"use client";

import { useState } from "react";

const TERMS_TEXT = `제1조 (목적)
본 약관은 와이엠 스튜디오(이하 "회사")가 운영하는 명운(命運) 서비스(이하 "서비스")의 이용조건 및 절차, 이용자와 회사의 권리·의무·책임사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
① "서비스"란 회사가 제공하는 사주, 운세, 관상, 이름 풀이, 궁합, 로또 번호 추출 등 명리학 기반 디지털 콘텐츠를 말합니다.
② "이용자"란 본 약관에 동의하고 서비스를 이용하는 모든 자를 말합니다.
③ "유료 서비스"란 광고 시청 또는 인앱결제 완료 후 이용 가능한 프리미엄 분석 결과, VIP 리포트 등 디지털 콘텐츠를 말합니다.

제3조 (서비스의 성격 및 면책)
① 본 서비스에서 제공하는 모든 결과는 정통 명리학에 기반한 통계적·학술적 해석으로, 절대적인 미래를 예측하거나 보장하지 않습니다.
② 본 서비스는 의료, 법률, 재정 등 전문 분야의 조언을 대체하지 않으며, 회사는 서비스 이용 결과로 인한 어떠한 법적 책임도 지지 않습니다.
③ 이용자는 서비스 이용 결과를 참고 자료로만 활용하여야 하며, 이를 근거로 한 의사결정에 대한 책임은 이용자 본인에게 있습니다.

제4조 (서비스 제공 및 변경)
① 유료 서비스는 광고 시청 또는 인앱결제 완료 후 즉시 이용 가능합니다.
② 회사는 서비스의 내용, 품질 향상을 위해 사전 고지 없이 서비스를 변경하거나 중단할 수 있습니다.

제5조 (이용자의 의무)
① 이용자는 다음 행위를 하여서는 안 됩니다.
- 타인의 정보를 도용하거나 허위 정보를 입력하는 행위
- 서비스의 결과물을 무단으로 복제·배포·판매하는 행위
- 서비스의 정상적인 운영을 방해하는 행위
- 회사의 지식재산권을 침해하는 행위

제6조 (개인정보 보호)
회사는 관련 법령 및 개인정보처리방침에 따라 이용자의 개인정보를 보호합니다.

제7조 (지식재산권)
서비스 내 모든 콘텐츠에 대한 지식재산권은 회사에 귀속됩니다.

제8조 (환불 정책)
인앱결제 환불은 구글 플레이스토어 및 원스토어 환불 정책을 따릅니다.

제9조 (분쟁 해결)
본 서비스 이용에 관한 분쟁에는 대한민국 법률을 적용합니다.

시행일: 2026년 1월 1일`;

const PRIVACY_TEXT = `개인정보처리방침

와이엠 스튜디오(이하 "회사")는 개인정보보호법 및 관련 법령을 준수하며, 이용자의 개인정보 보호를 중요하게 생각합니다.

1. 수집하는 개인정보 항목
- 필수 입력 정보: 이름(또는 닉네임), 생년월일, 출생 시간, 성별
- 자동 수집 정보: 서비스 이용 기록, 접속 IP, 기기 정보

2. 개인정보의 수집 및 이용 목적
- 사주, 운세, 관상, 이름 풀이, 궁합 등 서비스 분석 결과 제공
- 인앱결제 처리 및 이용 내역 관리
- 서비스 품질 개선 및 통계 분석

3. 개인정보의 보유 및 이용 기간
- 분석용 입력 정보: 분석 완료 후 즉시 폐기
- 결제 관련 정보: 전자상거래법에 따라 5년간 보관

4. 개인정보의 제3자 제공
회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다.
단, 구글 플레이 및 원스토어 인앱결제 처리를 위해 최소한의 정보를 제공합니다.

5. 개인정보 보호책임자
- 성명: 손용민
- 연락처: support@ymstudio.co.kr | 0507-1385-9994

시행일: 2026년 1월 1일`;

const REFUND_TEXT = `[인앱결제 환불 규정 안내]

본 앱에서 제공되는 유료 서비스는 구글 플레이스토어 및 원스토어를 통한 인앱결제로 진행됩니다.

1. 환불 기준
- 구글 플레이: 결제 후 48시간 이내 구글 플레이 고객센터를 통해 환불 요청 가능
- 원스토어: 원스토어 환불 정책에 따라 처리

2. 환불 문의
- 이메일: support@ymstudio.co.kr
- 전화: 0507-1385-9994
- 운영시간: 평일 10:00 ~ 18:00

시행일: 2026년 1월 1일`;

/** 앱 전용 하단 푸터 */
export function GlobalSiteFooter() {
  const [showPolicy, setShowPolicy] = useState<"terms" | "privacy" | "refund" | null>(null);
  const [showCompanyInfo, setShowCompanyInfo] = useState(false);

  const handleCopyrightDoubleClick = () => {
    if (localStorage.getItem("MASTER_ADMIN") === "true") {
      if (confirm("현재 운영자 모드입니다. 종료할까요?")) {
        localStorage.removeItem("MASTER_ADMIN");
        alert("운영자 모드가 종료되었습니다.");
        window.location.reload();
      }
      return;
    }
    const pwd = prompt("운영자 비밀번호를 입력하세요.");
    if (pwd === "s1223534") {
      localStorage.setItem("MASTER_ADMIN", "true");
      alert("✨ 운영자 모드 활성화!");
      window.location.reload();
    } else if (pwd !== null) {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  return (
    <>
      <footer className="border-t border-white/10 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <p className="text-center text-[10px] leading-relaxed text-white/45">
            본 서비스는 정통 명리학에 기반한 통계적 해석으로, 절대적인 미래를 보장하지 않습니다.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-2 text-[11px] font-medium text-white/55">
            <button type="button" onClick={() => setShowPolicy("terms")} className="transition-colors hover:text-white">
              이용약관
            </button>
            <span aria-hidden>|</span>
            <button type="button" onClick={() => setShowPolicy("privacy")} className="transition-colors hover:text-white">
              개인정보처리방침
            </button>
            <span aria-hidden>|</span>
            <button type="button" onClick={() => setShowPolicy("refund")} className="transition-colors hover:text-white">
              환불정책
            </button>
            <span aria-hidden>|</span>
            <button type="button" onClick={() => setShowCompanyInfo(!showCompanyInfo)} className="transition-colors hover:text-white">
              사업자 정보 {showCompanyInfo ? "▲" : "▼"}
            </button>
          </div>

          {showCompanyInfo && (
            <div className="mx-auto mt-4 max-w-lg space-y-1 border-t border-white/10 pt-4 text-[10px] leading-relaxed text-white/40">
              <p className="font-bold text-white/55">와이엠 스튜디오 (YM Studio)</p>
              <p>대표자: 손용민 | 사업자등록번호: 510-21-21827</p>
              <p>주소: 충청남도 아산시 둔포면 운교길 129번길 14-71</p>
              <p>고객센터: 0507-1385-9994 | support@ymstudio.co.kr</p>
              <p>통신판매업신고번호: 제 2026-충남아산-0479 호</p>
            </div>
          )}

          <p
            onDoubleClick={handleCopyrightDoubleClick}
            className="mt-6 text-center text-[10px] text-white/25 select-none cursor-default"
          >
            © {new Date().getFullYear()} 명운(命運). All rights reserved.
          </p>
        </div>
      </footer>

      {showPolicy && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowPolicy(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-white/20 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 flex shrink-0 items-center justify-between border-b border-white/10 pb-3 text-lg font-bold text-yellow-400">
              <span>
                {showPolicy === "terms" ? "이용약관" : showPolicy === "privacy" ? "개인정보처리방침" : "환불정책"}
              </span>
              <button type="button" onClick={() => setShowPolicy(null)} className="text-2xl font-light text-white/50 hover:text-white">
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
              className="mt-6 w-full rounded-xl bg-white/10 py-3 font-medium text-white hover:bg-white/20"
              onClick={() => setShowPolicy(null)}
            >
              확인하고 닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}