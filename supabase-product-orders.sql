-- 유료 상세 풀이 공통 주문(궁합 심층·택일·시즌 운세). 결제 1건 = 1행, 같은 결제로 두 번 만들지 않는다.
-- product: match_deep / taekil / season_luck. input 에 결제할 때 넣은 값(두 사람 생년월일 등)을 담는다.
-- 서버(service role)만 읽고 쓴다. 정책을 두지 않아 브라우저에서는 접근할 수 없다.

create table if not exists public.product_orders (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  payment_ref text not null unique,
  platform text not null default 'web',
  amount integer not null,
  input jsonb not null,
  detail jsonb,
  created_at timestamptz not null default now(),
  generated_at timestamptz
);

alter table public.product_orders enable row level security;

create index if not exists product_orders_created_idx on public.product_orders (created_at);
create index if not exists product_orders_product_idx on public.product_orders (product);
