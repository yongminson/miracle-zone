export default function TermsPage() {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 px-6 py-12 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-8">이용약관</h1>
        <div className="space-y-6 text-sm text-white/80 leading-relaxed">
          <section>
            <h2 className="text-base font-bold text-white mb-2">제1조 (목적)</h2>
            <p>본 약관은 와이엠 스튜디오(이하 &quot;회사&quot;)가 운영하는 명운(命運) 서비스(이하 &quot;서비스&quot;)의 이용조건 및 절차, 이용자와 회사의 권리·의무·책임사항을 규정함을 목적으로 합니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제2조 (용어의 정의)</h2>
            <p>① &quot;서비스&quot;란 회사가 제공하는 사주, 운세, 관상, 이름 풀이, 궁합, 로또 번호 추출 등 명리학 기반 디지털 콘텐츠를 말합니다.</p>
            <p>② &quot;이용자&quot;란 본 약관에 동의하고 서비스를 이용하는 모든 자를 말합니다.</p>
            <p>③ &quot;유료 서비스&quot;란 광고 시청 또는 인앱결제 완료 후 이용 가능한 프리미엄 분석 결과, VIP 리포트 등 디지털 콘텐츠를 말합니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제3조 (서비스의 성격 및 면책)</h2>
            <p>① 본 서비스에서 제공하는 모든 결과는 정통 명리학에 기반한 통계적·학술적 해석으로, 절대적인 미래를 예측하거나 보장하지 않습니다.</p>
            <p>② 본 서비스는 의료, 법률, 재정 등 전문 분야의 조언을 대체하지 않으며, 회사는 서비스 이용 결과로 인한 어떠한 법적 책임도 지지 않습니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제4조 (서비스 제공 및 변경)</h2>
            <p>① 유료 서비스는 광고 시청 또는 인앱결제 완료 후 즉시 이용 가능합니다.</p>
            <p>② 회사는 서비스의 내용, 품질 향상을 위해 사전 고지 없이 서비스를 변경하거나 중단할 수 있습니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제5조 (이용자의 의무)</h2>
            <p>이용자는 타인의 정보 도용, 서비스 결과물 무단 복제·배포·판매, 서비스 정상 운영 방해, 회사 지식재산권 침해 행위를 하여서는 안 됩니다.</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제6조 (개인정보 보호)</h2>
            <p>회사는 관련 법령 및 개인정보처리방침에 따라 이용자의 개인정보를 보호합니다.</p>
          </section>
          <section>
          <h2 className="text-base font-bold text-white mb-2">제7조 (결제 및 환불)</h2>
          <p>유료 서비스 결제는 포트원(PortOne) 결제 시스템을 통해 한국결제네트웍스, 카카오페이, 토스페이로 처리됩니다. 환불은 결제 후 7일 이내 미사용 시 전액 환불이 가능하며, 디지털 콘텐츠 특성상 사용(열람) 후에는 환불이 제한됩니다. 환불 문의: support@ymstudio.co.kr</p>
          </section>
          <section>
            <h2 className="text-base font-bold text-white mb-2">제8조 (분쟁 해결)</h2>
            <p>본 서비스 이용에 관한 분쟁에는 대한민국 법률을 적용합니다.</p>
          </section>
          <p className="text-white/40 text-xs mt-8">시행일: 2026년 1월 1일</p>
        </div>
      </div>
    );
  }