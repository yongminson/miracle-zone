-- 소원 자물쇠 — 영구 보관 자물쇠 벽.
-- 기존 wishes(기적의 제단) 테이블은 건드리지 않는 별도 테이블이다.
-- 운영 DB에는 검토 후 Supabase SQL Editor에서 수동 적용한다.

create table if not exists public.locks (
  id uuid primary key default gen_random_uuid(),

  -- 등급은 시간이 아니라 생김새만 나눈다 (basic 은색 / color 색상 / shine 반짝임)
  tier text not null check (tier in ('basic', 'color', 'shine')),
  color text not null default '#c3c7cf',

  -- 자물쇠에 새길 이름. 비우면 익명으로 표시한다
  display_name text,
  wish text not null check (char_length(wish) between 1 and 300),

  -- 소유 확인용. 로그인했으면 auth 사용자 id, 아니면 기기에서 만든 임의 토큰
  owner_key text not null,
  user_id uuid,

  -- 결제 1건당 자물쇠 1개. 같은 결제로 두 번 지급되지 않게 막는다
  payment_ref text not null unique,
  amount integer not null check (amount >= 0),
  platform text not null default 'web' check (platform in ('web', 'app', 'toss')),

  created_at timestamptz not null default now()
);

create index if not exists locks_created_at_idx on public.locks (created_at desc);
create index if not exists locks_owner_key_idx on public.locks (owner_key);
create index if not exists locks_user_id_idx on public.locks (user_id);

alter table public.locks enable row level security;

-- 공개 정책을 만들지 않는다. 이 테이블에 직접 접근하는 것은 서버의 service role뿐이다.
-- 화면에서 읽는 것은 아래 공개 뷰다.

-- 벽에 보여줄 정보만 담은 공개 뷰.
-- owner_key / payment_ref / user_id 는 내보내지 않는다.
create or replace view public.locks_public as
select
  id,
  tier,
  color,
  display_name,
  wish,
  created_at
from public.locks;

-- 뷰는 조회하는 사람 권한이 아니라 뷰 소유자 권한으로 동작하게 한다
alter view public.locks_public set (security_invoker = false);

grant select on public.locks_public to anon, authenticated;

comment on table public.locks is '소원 자물쇠 — 결제로 걸린 영구 보관 자물쇠';
comment on view public.locks_public is '자물쇠 벽 표시용 공개 뷰 (소유자 식별 정보 제외)';
