/** 관리자 통합 CS 대시보드 탭 */
export type CsDashboardTabId = "vip" | "saju" | "altar";

/** VIP·제단·(향후) 사주 등 카드 한 장에 공통으로 쓰는 행 모델 */
export type CsDashboardRow = {
  id: string;
  user_name: string;
  phone_number: string | null;
  created_at: string;
  /** 원 단위 — DB에 없으면 null (제단 소원 등) */
  amountWon: number | null;
  /** 복사용 결제 식별자(imp_uid 등) — 없으면 null */
  paymentRef: string | null;
  report_url: string | null;
  status: string | null;
  /** 소원 본문 미리보기 등 */
  notes: string | null;
};

