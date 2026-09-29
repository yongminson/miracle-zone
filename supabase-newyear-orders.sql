-- 2027 신년운세 상세 풀이 주문. 결제 1건 = 1행, 같은 결제로 두 번 만들지 않는다.
-- 서버(service role)만 읽고 쓴다. 정책을 두지 않아 브라우저에서는 접근할 수 없다.

create table if not exists public.newyear_orders (
  id uuid primary key default gen_random_uuid(),
  payment_ref text not null unique,
  platform text not null default 'web',
  amount integer not null,
  name text,
  birth_date text not null,
  calendar_type text not null,
  gender text not null,
  detail jsonb,
  created_at timestamptz not null default now(),
  generated_at timestamptz
);

alter table public.newyear_orders enable row level security;

create index if not exists newyear_orders_created_idx on public.newyear_orders (created_at);
