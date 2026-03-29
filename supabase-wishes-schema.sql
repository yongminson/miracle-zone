-- Supabase 'wishes' 테이블 생성 (기적의 제단용)
-- Supabase Dashboard > SQL Editor에서 실행하세요.
-- Realtime 사용: Database > Replication에서 'wishes' 테이블 활성화

create table if not exists public.wishes (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  created_at timestamptz default now()
);

-- RLS: 익명 사용자도 읽기/쓰기 허용 (무료 소원 등록용)
alter table public.wishes enable row level security;

create policy "Allow anonymous read" on public.wishes
  for select using (true);

create policy "Allow anonymous insert" on public.wishes
  for insert with check (true);
