-- 구글 플레이 결제 종류 기록 (/api/payment/verify-google 가 결제 확인 때 한 줄씩 남긴다)
-- 목적: 매출 집계에서 구글 테스트 결제(라이선스 테스터)를 빼기 위해.
-- 기존 표(vip_orders, vip_report_entitlements)는 바꾸지 않는다. 개인정보 없음.
create table if not exists public.google_purchase_checks (
  order_id      text primary key,          -- 구글 주문번호(GPA.xxxx) — Play Console 주문 목록과 같은 값
  product_id    text not null,             -- vip_report / altar_10days
  purchase_type smallint,                  -- 비어 있음 = 실제 결제, 0 = 테스트, 1 = 프로모션 코드, 2 = 리워드
  payment_ref   text,                      -- vip_orders.imp_uid 와 같은 값(사주 인사이트는 vip_report_entitlements.payment_ref 와도 같음)
  checked_at    timestamptz not null default now()
);

-- 서버(service role)만 읽고 쓴다 — 공개 정책 없음
alter table public.google_purchase_checks enable row level security;
