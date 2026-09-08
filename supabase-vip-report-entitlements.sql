-- 검증된 사주 인사이트 리포트 결제와 1회 발급을 연결하는 서버 전용 지급권 테이블.
-- 기존 주문 테이블은 변경하지 않는 추가형 마이그레이션이다.

create table if not exists public.vip_report_entitlements (
  payment_ref text primary key,
  platform text not null check (platform in ('web', 'google_play', 'apps_in_toss')),
  provider_reference text not null,
  subject_key text,
  product_key text not null check (product_key = 'vip_report'),
  amount integer not null check (amount > 0),
  currency text not null default 'KRW' check (currency = 'KRW'),
  status text not null default 'available' check (status in ('available', 'processing', 'completed')),
  processing_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vip_report_entitlements_status_idx
  on public.vip_report_entitlements (status);

alter table public.vip_report_entitlements enable row level security;

comment on table public.vip_report_entitlements is
  '서버 결제 검증을 통과한 사주 인사이트 리포트 1회 발급 권한. service role 전용.';

-- 공개 정책을 만들지 않는다. 서버의 service role만 접근한다.
