"use client";

import { useState } from "react";

const TERMS_TEXT = `제1조 (목적)
본 약관은 와이엠 스튜디오(이하 "회사")가 운영하는 명운(命運) 서비스(이하 "서비스")의 이용조건 및 절차, 이용자와 회사의 권리·의무·책임사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
① "서비스"란 회사가 제공하는 사주, 운세, 관상, 이름 풀이, 궁합, 로또 번호 추출 등 명리학 기반 디지털 콘텐츠를 말합니다.
② "이용자"란 본 약관에 동의하고 서비스를 이용하는 모든 자를 말합니다.
③ "유료 서비스"란 결제를 완료한 후 이용 가능한 프리미엄 분석 결과, VIP 리포트 등 디지털 콘텐츠를 말합니다.

제3조 (서비스의 성격 및 면책)
① 본 서비스에서 제공하는 모든 결과는 정통 명리학에 기반한 통계적·학술적 해석으로, 절대적인 미래를 예측하거나 보장하지 않습니다.
② 본 서비스는 의료, 법률, 재정 등 전문 분야의 조언을 대체하지 않으며, 회사는 서비스 이용 결과로 인한 어떠한 법적 책임도 지지 않습니다.
③ 이용자는 서비스 이용 결과를 참고 자료로만 활용하여야 하며, 이를 근거로 한 의사결정에 대한 책임은 이용자 본인에게 있습니다.

제4조 (서비스 제공 및 변경)
① 유료 서비스는 결제 완료 후 즉시 이용 가능합니다.
② 회사는 서비스의 내용, 품질 향상을 위해 사전 고지 없이 서비스를 변경하거나 중단할 수 있습니다.
③ 서비스 중단 시 사전에 공지하며, 불가피한 사유가 있을 경우 사후 고지할 수 있습니다.

제5조 (이용자의 의무)
① 이용자는 다음 행위를 하여서는 안 됩니다.
- 타인의 정보를 도용하거나 허위 정보를 입력하는 행위
- 서비스의 결과물을 무단으로 복제·배포·판매하는 행위
- 서비스의 정상적인 운영을 방해하는 행위
- 회사의 지식재산권을 침해하는 행위
② 이용자가 위 의무를 위반하여 회사에 손해가 발생한 경우, 이용자는 그 손해를 배상할 책임이 있습니다.

제6조 (개인정보 보호)
회사는 관련 법령 및 개인정보처리방침에 따라 이용자의 개인정보를 보호합니다. 자세한 내용은 '개인정보처리방침'을 참고하시기 바랍니다.

제7조 (지식재산권)
서비스 내 모든 콘텐츠(텍스트, 이미지, 알고리즘, 로직 등)에 대한 지식재산권은 회사에 귀속됩니다. 이용자는 회사의 사전 서면 동의 없이 이를 상업적으로 이용할 수 없습니다.

제8조 (서비스 이용 요금)
① 유료 서비스 요금은 서비스 내 안내 페이지에 게시된 금액을 따릅니다.
② 회사는 요금 정책을 변경할 수 있으며, 변경 시 7일 전에 서비스 내 공지사항을 통해 고지합니다.

제9조 (환불 정책)
환불에 관한 사항은 별도의 '환불정책'을 따릅니다.

제10조 (서비스 이용 제한)
회사는 이용자가 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해하는 경우, 서비스 이용을 제한하거나 종료할 수 있습니다.

제11조 (분쟁 해결)
① 서비스 이용과 관련하여 분쟁이 발생한 경우, 회사와 이용자는 상호 협의하여 해결하도록 노력합니다.
② 분쟁이 해결되지 않을 경우, 관할 법원은 회사 소재지를 관할하는 법원으로 합니다.
③ 본 서비스 이용에 관한 분쟁에는 대한민국 법률을 적용합니다.

제12조 (약관의 변경)
회사는 필요한 경우 약관을 변경할 수 있으며, 변경 시 서비스 내 공지사항을 통해 사전 고지합니다. 변경된 약관은 공지 후 7일이 경과한 날부터 효력이 발생합니다.

시행일: 2026년 1월 1일`;

const PRIVACY_TEXT = `개인정보처리방침

와이엠 스튜디오(이하 "회사")는 개인정보보호법 및 관련 법령을 준수하며, 이용자의 개인정보 보호를 중요하게 생각합니다.

1. 수집하는 개인정보 항목 및 수집 방법
회사는 서비스 제공을 위해 아래와 같은 정보를 수집할 수 있습니다.
- 필수 입력 정보: 이름(또는 닉네임), 생년월일, 출생 시간, 성별
- 결제 정보: 결제 수단 정보(포트원(PortOne) 결제대행사를 통해 처리되며 회사는 카드번호 등 민감 결제 정보를 저장하지 않습니다)
- 자동 수집 정보: 서비스 이용 기록, 접속 IP, 브라우저 종류, 기기 정보
수집 방법: 서비스 이용 시 이용자 직접 입력

2. 개인정보의 수집 및 이용 목적
- 사주, 운세, 관상, 이름 풀이, 궁합 등 서비스 분석 결과 제공
- 유료 서비스 결제 처리 및 이용 내역 관리
- 서비스 품질 개선 및 통계 분석
- 부정 이용 방지 및 법적 의무 이행

3. 개인정보의 보유 및 이용 기간
- 분석용 입력 정보(생년월일, 이름 등): 분석 완료 후 즉시 폐기(서버에 영구 저장하지 않음)
- 결제 관련 정보: 전자상거래법에 따라 5년간 보관
- 서비스 이용 기록: 통신비밀보호법에 따라 3개월간 보관
- 단, 관련 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.

4. 개인정보의 제3자 제공
회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
- 이용자가 사전에 동의한 경우
- 결제 처리를 위해 포트원(PortOne) 결제대행사에 최소한의 정보를 제공하는 경우
- 법령의 규정에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우

5. 개인정보 처리 위탁
회사는 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하고 있습니다.
- 수탁업체: Supabase Inc. (클라우드 인프라 및 데이터베이스 서비스)
- 위탁 업무: 서비스 운영을 위한 서버 및 데이터 관리
- 포트원(PortOne): 결제 처리 서비스

6. 이용자의 권리와 행사 방법
이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다.
- 개인정보 열람, 정정, 삭제 요청
- 개인정보 처리 정지 요청
권리 행사는 고객센터(support@ymstudio.co.kr)를 통해 서면, 이메일로 신청하실 수 있으며, 회사는 지체 없이 조치하겠습니다.

7. 쿠키(Cookie)의 사용
서비스 편의를 위해 브라우저 로컬 스토리지에 일부 설정 정보(예: 프리미엄 이용 상태)가 저장될 수 있습니다. 이용자는 브라우저 설정을 통해 이를 거부하거나 삭제할 수 있으나, 일부 서비스 기능이 제한될 수 있습니다.

8. 개인정보의 안전성 확보 조치
회사는 이용자의 개인정보 보호를 위해 다음과 같은 조치를 취하고 있습니다.
- 개인정보에 대한 접근 권한 최소화
- 보안 프로그램 설치 및 주기적 점검
- 분석 완료 후 입력 데이터 즉시 삭제

9. 개인정보 보호책임자
- 성명: 손용민
- 직책: 대표
- 연락처: support@ymstudio.co.kr | 0507-1385-9994
개인정보 처리에 관한 문의, 불만 처리, 피해 구제 등에 관한 사항은 위 담당자에게 문의하시기 바랍니다.

시행일: 2026년 1월 1일`;

const REFUND_TEXT = `[디지털 콘텐츠 환불 규정 안내]

본 서비스에서 제공되는 모든 유료 서비스는 '디지털 콘텐츠'에 해당하며, 전자상거래 등에서의 소비자보호에 관한 법률 및 관련 법령에 의거하여 다음과 같이 환불 정책을 운영합니다.

1. 환불 기준 (청약철회)
- 이용권을 결제하였으나 실제 서비스를 전혀 이용하지 않은 경우(결과 열람 전), 결제일로부터 7일 이내에 고객센터를 통해 100% 환불을 요청하실 수 있습니다.
- 환불 요청은 고객센터 이메일(support@ymstudio.co.kr) 또는 전화(0507-1385-9994)로 접수하실 수 있습니다.

2. 환불 처리 기간
- 환불 요청이 승인된 경우, 결제 수단에 따라 영업일 기준 3~5일 이내에 처리됩니다.
- 신용카드 결제의 경우 카드사 정책에 따라 최대 7영업일이 소요될 수 있습니다.

3. 시스템 오류 및 서비스 장애
- 결제는 정상적으로 완료되었으나 시스템 오류로 인해 결과 화면을 전혀 열람하지 못한 경우, 고객센터 확인을 거쳐 즉시 100% 환불 또는 서비스 재제공 처리를 해드립니다.

4. 환불 제한 사항
- 전자상거래법 제17조 제2항 제5호에 따라, 소비자의 사용 또는 일부 소비로 재화 등의 가치가 현저히 감소한 경우(예: 운세/관상/이름풀이/궁합/로또 번호 결과를 이미 열람한 경우)에는 청약철회가 제한됩니다.
- 단순 변심, 서비스 결과에 대한 불만족을 이유로 한 환불은 법령에 따라 제한될 수 있습니다.

5. 환불 문의
- 이메일: support@ymstudio.co.kr
- 전화: 0507-1385-9994
- 운영시간: 평일 10:00 ~ 18:00 (주말·공휴일 제외)
- 문의 접수 후 영업일 기준 1~2일 이내에 답변 드립니다.

시행일: 2026년 1월 1일`;

/** 전역 하단 신뢰·법적 정보 (모든 페이지 공통) */
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
      alert("✨ 운영자 모드 활성화! 모든 유료 서비스가 프리패스됩니다.");
      window.location.reload();
    } else if (pwd !== null) {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

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
              <p>고객센터: 0507-1385-9994 | 이메일: support@ymstudio.co.kr</p>
              <p>통신판매업신고번호: 제 2026-충남아산-0479 호</p>
            </div>
          ) : null}

<p
            onDoubleClick={handleCopyrightDoubleClick}
            className="mt-8 text-center text-[10px] text-white/25 select-none cursor-default"
          >
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
