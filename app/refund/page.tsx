export default function RefundPage() {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 px-6 py-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-8">환불정책</h1>
        <div className="space-y-6 text-sm text-white/80 leading-relaxed">
        <section>
          <h2 className="text-base font-bold text-white mb-2">환불 규정 안내</h2>
          <p>본 서비스의 유료 결제는 포트원(PortOne) 결제 시스템을 통해 한국결제네트웍스, 카카오페이, 토스페이로 처리됩니다.</p>
        </section>
        <section>
          <h2 className="text-base font-bold text-white mb-2">1. 환불 기준</h2>
          <p>결제 후 7일 이내 미사용(미열람) 시: 전액 환불 가능</p>
          <p>디지털 콘텐츠 특성상 사용(열람) 후에는 환불이 제한됩니다</p>
        </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">2. 환불 문의</h2>
            <p>이메일: support@ymstudio.co.kr</p>
            <p>전화: 0507-1385-9994</p>
            <p>운영시간: 평일 10:00 ~ 18:00</p>
          </section>
          <p className="text-white/40 text-xs mt-8">시행일: 2026년 1월 1일</p>
        </div>
      </div>
    );
  }