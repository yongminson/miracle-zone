-- 앱인토스 인앱결제 전용 주문/지급 기록.
-- 기존 vip_orders, PortOne, Google Play 결제 테이블과 분리된 추가형 스키마다.
-- 운영 DB에는 검토 후 Supabase SQL Editor에서 수동 적용한다.

create table if not exists public.toss_iap_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  product_key text not null,
  sku text not null,
  expected_amount integer not null check (expected_amount >= 0),
  currency text not null default 'KRW',
  payment_status text not null check (
    payment_status in ('PAYMENT_COMPLETED', 'PURCHASED')
  ),
  grant_status text not null default 'granted' check (
    grant_status in ('granted', 'revoked')
  ),
  toss_user_key text not null,
  status_determined_at timestamp without time zone,
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists toss_iap_orders_toss_user_key_idx
  on public.toss_iap_orders (toss_user_key);

create index if not exists toss_iap_orders_product_key_idx
  on public.toss_iap_orders (product_key);

alter table public.toss_iap_orders enable row level security;

comment on table public.toss_iap_orders is
  '앱인토스 mTLS 검증을 통과한 인앱결제 주문 및 상품 지급 기록';

-- 공개 정책을 만들지 않는다. 서버의 service role만 이 테이블에 접근한다.
