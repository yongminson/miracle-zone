import type { CsDashboardTabPayload } from "@/lib/admin/cs-dashboard-types";

/**
 * 사주·관상·이름(4,900원) 등은 현재 `/api/payments/verify`(paymentType: `saju`)에서
 * 검증만 하고 Supabase에 별도 테이블로 적재하지 않습니다.
 * 전용 테이블·insert를 추가하면 이 모듈에서 조회하도록 연결하면 됩니다.
 */
export async function fetchSajuNameFaceCsPlaceholder(): Promise<CsDashboardTabPayload> {
  return {
    rows: [],
    sourceNote:
      "이 탭은 사주·관상·이름 프리미엄 결제용입니다. 현재 코드베이스에는 해당 결제 행을 담는 Supabase 테이블이 없어 목록이 비어 있습니다. " +
      "예: `mini_payments` 테이블에 verify 성공 시 insert 후, 여기서 `select` 하도록 연결하세요.",
  };
}
