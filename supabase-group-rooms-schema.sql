-- 단톡방 궁합 순위 · 둘이 완성하는 카드 (2026-11-04)
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run.
-- 여러 번 실행해도 안전하다(if not exists).
--
-- 개인정보 원칙
--  - 이 두 표는 서버(service role)만 읽고 쓴다. 손님 브라우저(anon)는 직접 못 본다(RLS 켜고 정책 없음).
--  - 화면에는 별명과 궁합 결과만 보여 주고, 다른 참가자의 생일은 내보내지 않는다.
--  - 방은 만든 지 30일이 지나면 서버 크론이 지운다(참가자도 함께 지워짐).

create table if not exists public.group_rooms (
  code        text primary key,                                   -- 링크에 들어가는 방 코드(무작위 10자리)
  kind        text not null check (kind in ('group', 'pair')),    -- group: 단톡방 순위, pair: 둘이 완성하는 카드
  title       text check (title is null or char_length(title) <= 30),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '30 days')
);

create table if not exists public.group_members (
  id             uuid primary key default gen_random_uuid(),
  room_code      text not null references public.group_rooms (code) on delete cascade,
  nickname       text not null check (char_length(nickname) between 1 and 20),
  birth_date     date not null,
  calendar_type  text not null default 'solar' check (calendar_type in ('solar', 'lunar', 'lunar-leap')),
  gender         text not null default 'male' check (gender in ('male', 'female')),
  member_token   text not null,                                   -- 본인 기기만 자기 항목을 지울 수 있게(무작위 값의 해시)
  created_at     timestamptz not null default now()
);

create index if not exists group_members_room_code_idx on public.group_members (room_code);
create index if not exists group_rooms_expires_at_idx on public.group_rooms (expires_at);

alter table public.group_rooms enable row level security;
alter table public.group_members enable row level security;
-- 정책을 하나도 만들지 않는다 = anon·로그인 사용자 모두 접근 불가, service role(서버)만 가능.
