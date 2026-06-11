import React from 'react';

export default function AppPrivacyPage() {
  return (
    <div style={{ backgroundColor: '#0F172A', color: '#E2E8F0', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.8, padding: '40px 24px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', color: '#FFFFFF', marginBottom: '8px' }}>개인정보처리방침</h1>
        <p style={{ fontSize: '14px', color: '#A78BFA', marginBottom: '32px' }}>직장인 키우기 - 다마고치 | YM Studio</p>
        <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '40px' }}>시행일: 2025년 1월 1일 | 최종 수정일: 2025년 6월 11일</p>

        <h2 style={{ fontSize: '20px', color: '#F59E0B', marginTop: '36px', marginBottom: '12px' }}>1. 개인정보의 수집 항목 및 방법</h2>
        <p style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '16px' }}>
          「직장인 키우기」(이하 "앱")는 <span style={{ color: '#10B981', fontWeight: 'bold' }}>별도의 회원가입 절차가 없으며, 서버에 개인정보를 수집·저장하지 않습니다.</span>
          게임 데이터(캐릭터 상태, 월급, 경험치, 설정 등)는 사용자의 기기 내부 저장소(AsyncStorage)에만 보관되며, 외부로 전송되지 않습니다.
        </p>

        <h2 style={{ fontSize: '20px', color: '#F59E0B', marginTop: '36px', marginBottom: '12px' }}>2. 광고 관련 정보</h2>
        <p style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '16px' }}>앱은 Google AdMob을 통해 광고를 표시합니다. 이 과정에서 Google이 아래 정보를 자동으로 수집할 수 있습니다.</p>
        <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
          <li style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '8px' }}>광고 식별자 (GAID/IDFA)</li>
          <li style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '8px' }}>기기 정보 (모델, OS 버전)</li>
          <li style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '8px' }}>광고 상호작용 데이터</li>
        </ul>
        <p style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '16px' }}>
          이는 Google의 개인정보처리방침에 따라 처리되며, 자세한 내용은
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" style={{ color: '#A78BFA' }}>Google 개인정보처리방침</a>을 참조해 주세요.
          사용자는 기기의 설정에서 광고 추적을 제한하거나 광고 식별자를 재설정할 수 있습니다.
        </p>

        <h2 style={{ fontSize: '20px', color: '#F59E0B', marginTop: '36px', marginBottom: '12px' }}>3. 알림(푸시 알림)</h2>
        <p style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '16px' }}>
          앱은 게임 내 알림 기능을 제공합니다. 이는 기기 내부에서 예약되는 로컬 알림이며, 별도의 서버를 통한 푸시 알림이 아닙니다.
          사용자는 기기의 알림 설정에서 언제든지 알림을 비활성화할 수 있습니다.
        </p>

        <h2 style={{ fontSize: '20px', color: '#F59E0B', marginTop: '36px', marginBottom: '12px' }}>4. 개인정보의 제3자 제공</h2>
        <p style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '16px' }}>앱은 사용자의 개인정보를 제3자에게 제공하지 않습니다. 단, 위 2항의 광고 서비스(Google AdMob)는 Google의 정책에 따릅니다.</p>

        <h2 style={{ fontSize: '20px', color: '#F59E0B', marginTop: '36px', marginBottom: '12px' }}>5. 개인정보의 보유 및 파기</h2>
        <p style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '16px' }}>
          모든 게임 데이터는 사용자의 기기에만 저장됩니다. 앱을 삭제하면 모든 데이터가 함께 삭제됩니다.
          별도의 서버 저장이 없으므로 파기 절차가 필요하지 않습니다.
        </p>

        <h2 style={{ fontSize: '20px', color: '#F59E0B', marginTop: '36px', marginBottom: '12px' }}>6. 아동의 개인정보 보호</h2>
        <p style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '16px' }}>앱은 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다. 만 14세 미만 사용자의 법정대리인이 아동의 개인정보 처리에 대해 문의할 경우, 아래 연락처로 문의해 주세요.</p>

        <h2 style={{ fontSize: '20px', color: '#F59E0B', marginTop: '36px', marginBottom: '12px' }}>7. 개인정보 보호책임자</h2>
        <ul style={{ paddingLeft: '20px', marginBottom: '16px' }}>
          <li style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '8px' }}>상호: YM Studio</li>
          <li style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '8px' }}>대표: 손용민</li>
          <li style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '8px' }}>사업자등록번호: 510-21-21827</li>
          <li style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '8px' }}>이메일: <a href="mailto:support@ymstudio.co.kr" style={{ color: '#A78BFA' }}>support@ymstudio.co.kr</a></li>
        </ul>

        <h2 style={{ fontSize: '20px', color: '#F59E0B', marginTop: '36px', marginBottom: '12px' }}>8. 개인정보처리방침의 변경</h2>
        <p style={{ fontSize: '15px', color: '#CBD5E1', marginBottom: '16px' }}>본 방침이 변경될 경우, 변경 사항은 이 페이지에 게시됩니다. 중요한 변경 사항이 있을 경우 앱 내 공지를 통해 안내할 수 있습니다.</p>

        <div style={{ marginTop: '60px', paddingTop: '24px', borderTop: '1px solid #1E293B', fontSize: '13px', color: '#64748B' }}>
          <p>© 2025 YM Studio. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}