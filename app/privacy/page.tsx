export default function PrivacyPage() {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 px-6 py-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-8">개인정보처리방침</h1>
        <div className="space-y-6 text-sm text-white/80 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">제1조 (목적)</h2>
            <p>와이엠 스튜디오(이하 "회사")는 이용자의 개인정보를 중요시하며, 개인정보보호법 등 관련 법령을 준수합니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제2조 (수집하는 개인정보)</h2>
            <p>서비스 이용 시 이름, 생년월일, 이메일 주소를 수집할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제3조 (개인정보의 이용목적)</h2>
            <p>수집된 정보는 서비스 제공, 운세 분석, 고객 지원 목적으로만 사용됩니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제4조 (개인정보 보유기간)</h2>
            <p>회원 탈퇴 시 즉시 삭제하며, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제5조 (제3자 제공)</h2>
            <p>이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제6조 (문의)</h2>
            <p>개인정보 관련 문의: support@ymstudio.co.kr</p>
          </section>
          <p className="text-white/40 text-xs mt-8">시행일: 2026년 1월 1일</p>
        </div>
      </div>
    );
  }