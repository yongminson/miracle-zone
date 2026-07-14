export default function RefundPage() {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 px-6 py-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-8">환불정책</h1>
        <div className="space-y-6 text-sm text-white/80 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">인앱결제 환불 규정 안내</h2>
            <p>본 앱에서 제공되는 유료 서비스는 구글 플레이스토어 및 원스토어를 통한 인앱결제로 진행됩니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">1. 환불 기준</h2>
            <p>구글 플레이: 결제 후 48시간 이내 구글 플레이 고객센터를 통해 환불 요청 가능</p>
            <p>원스토어: 원스토어 환불 정책에 따라 처리</p>
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