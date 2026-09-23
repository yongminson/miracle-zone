-- 출석 체크와 보상.
-- 출석은 서버가 한국 날짜로 하루 한 번만 기록한다. 그래서 브라우저 저장값을
-- 고쳐도 출석 일수를 늘릴 수 없다(10일을 채우려면 실제로 10일이 지나야 한다).
-- 운영 DB에는 검토 후 Supabase SQL Editor에서 수동 적용한다.

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),

  -- 기기에서 만든 토큰, 또는 로그인했다면 사용자 id
  owner_key text not null,
  user_id uuid,

  -- 한국 날짜. 서버가 정한다
  checkin_date date not null,
  created_at timestamptz not null default now(),

  unique (owner_key, checkin_date)
);

create index if not exists checkins_owner_key_idx on public.checkins (owner_key);
create index if not exists checkins_date_idx on public.checkins (checkin_date desc);

alter table public.checkins enable row level security;
-- 공개 정책을 만들지 않는다. 서버의 service role만 접근한다.

comment on table public.checkins is
  '출석 체크 — owner_key 당 하루 한 번, 날짜는 서버가 한국 기준으로 정한다';


create table if not exists public.checkin_rewards (
  id uuid primary key default gen_random_uuid(),

  owner_key text not null,
  -- 몇 번째 출석에서 받은 보상인지 (10, 20, 30 …)
  milestone integer not null check (milestone > 0),

  -- 받아간 시각과, 그때 올라간 소원
  claimed_at timestamptz,
  granted_wish_id uuid,

  created_at timestamptz not null default now(),

  unique (owner_key, milestone)
);

create index if not exists checkin_rewards_owner_key_idx
  on public.checkin_rewards (owner_key);

alter table public.checkin_rewards enable row level security;
-- 공개 정책을 만들지 않는다. 서버의 service role만 접근한다.

comment on table public.checkin_rewards is
  '출석 보상 — 10회마다 기적의 제단 1일권 1장. claimed_at 이 비어 있으면 아직 안 받은 것';
