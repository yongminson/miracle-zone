import { AccountDeleteAction } from "./AccountDeleteAction";

// Google Play 데이터 보안 양식에 등록하는 주소다(계정 삭제·데이터 삭제 둘 다). 주소를 바꾸지 말 것.
// 앱 또는 개발자 이름, 요청 단계, 삭제·보관 항목과 기간을 반드시 적어야 한다.
export const metadata = {
  title: "계정·데이터 삭제 안내 | 명운(命運)",
  description: "와이엠 스튜디오(YM Studio) 명운 앱·웹사이트의 계정과 데이터를 삭제하는 방법, 삭제·보관되는 정보를 안내합니다.",
  alternates: { canonical: "https://saju.ymstudio.co.kr/account-delete" },
};

export default function AccountDeletePage() {
  const h2 = "text-base font-bold text-white mb-2";
  const ul = "list-disc space-y-1 pl-5";
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-yellow-400 mb-3">명운 계정·데이터 삭제 안내</h1>
      <p className="mb-8 text-sm text-white/60 break-keep">와이엠 스튜디오(YM Studio)가 운영하는 명운(命運) 웹사이트와 Google Play 앱에 적용됩니다.</p>

      <div className="space-y-8 text-sm text-white/80 leading-relaxed">
        <section>
          <h2 className={h2}>1. 계정 삭제 방법</h2>
          <p className="break-keep">앱이나 웹사이트에서 아래 순서로 바로 삭제할 수 있습니다.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li className="break-keep">이 페이지를 엽니다(화면 맨 아래 &lsquo;계정 삭제&rsquo; 또는 소원 자물쇠 화면의 &lsquo;계정 삭제&rsquo;).</li>
            <li className="break-keep">카카오로 로그인합니다.</li>
            <li className="break-keep">&lsquo;계정 삭제하기&rsquo;를 누르고 한 번 더 확인합니다.</li>
          </ol>
          <AccountDeleteAction />
          <p className="mt-3 break-keep">
            로그인이 어렵거나 앱을 지웠다면 <a className="text-yellow-300 underline" href="mailto:support@ymstudio.co.kr?subject=%EB%AA%85%EC%9A%B4%20%EA%B3%84%EC%A0%95%20%EC%82%AD%EC%A0%9C%20%EC%9A%94%EC%B2%AD">support@ymstudio.co.kr</a>로 카카오 닉네임과 함께 요청해 주세요. 본인 확인 후 7일 안에 처리합니다.
          </p>
        </section>

        <section>
          <h2 className={h2}>2. 삭제되는 정보</h2>
          <ul className={ul}>
            <li className="break-keep">로그인 계정 정보: 카카오 닉네임, 프로필 사진, 계정 식별값 (즉시 삭제)</li>
            <li className="break-keep">계정에 남은 이용권 (즉시 삭제)</li>
            <li className="break-keep">소원 자물쇠: 벽에서 내리고 소원 내용과 이름을 삭제 (즉시 삭제)</li>
            <li className="break-keep">출석 기록과 계정의 연결 (즉시 해제)</li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>3. 삭제 후에도 보관되는 정보</h2>
          <ul className={ul}>
            <li className="break-keep">주문·결제 확인 정보, 유료 풀이 기록, 소원 자물쇠의 금액·결제번호: 전자상거래법에 따라 5년 보관 후 삭제</li>
            <li className="break-keep">사주 인사이트 리포트 본문: 생성일부터 30일 뒤 자동 삭제</li>
          </ul>
        </section>

        <section>
          <h2 className={h2}>4. 계정 없이, 또는 계정은 두고 데이터만 삭제</h2>
          <p className="break-keep">로그인 없이 쓴 경우에도 <a className="text-yellow-300 underline" href="mailto:support@ymstudio.co.kr?subject=%EB%AA%85%EC%9A%B4%20%EB%8D%B0%EC%9D%B4%ED%84%B0%20%EC%82%AD%EC%A0%9C%20%EC%9A%94%EC%B2%AD">support@ymstudio.co.kr</a>로 삭제를 요청할 수 있습니다. 어떤 기능의 어떤 정보인지 알려 주세요. 확인 후 7일 안에 처리합니다.</p>
          <ul className={`${ul} mt-2`}>
            <li className="break-keep">꿈해몽 공유 기록: 90일 뒤 자동 삭제</li>
            <li className="break-keep">단톡방 궁합·우리 둘 궁합: 30일 뒤 자동 삭제, 넣은 기기에서 직접 뺄 수 있음</li>
            <li className="break-keep">소원 자물쇠: 건 기기나 로그인한 계정에서 직접 내릴 수 있음</li>
            <li className="break-keep">알림 정보: 알림을 끄면 삭제</li>
            <li className="break-keep">기기에 저장된 입력값: 앱 데이터 또는 브라우저 저장 정보를 지우면 삭제</li>
          </ul>
          <p className="mt-2 text-xs text-white/50 break-keep">자세한 내용은 <a className="underline" href="/privacy">개인정보처리방침</a>에 있습니다.</p>
        </section>
      </div>
    </div>
  );
}
