-- 2026-11-19 보안 점검 후속: 공개(anon) 키로 쓰기·읽기가 열려 있던 표 잠그기
-- ⚠ 먼저 코드 배포(블로그 크론·꿈 공유 페이지를 관리자 키로)를 마친 뒤 Supabase SQL Editor 에서 한 번에 실행한다.
-- 서버(관리자 키 = service role)는 RLS 를 무시하므로 서버 기능은 영향 없다. 데이터는 지우지 않는다.

begin;

-- 1) 대상 표: RLS 켜고, 예전에 있던 정책은 모두 지운 뒤 필요한 것만 다시 만든다
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'push_subscriptions', 'dreams', 'profiles', 'blog_posts', 'tab_stats',
    'visitors', 'credit_history', 'analysis_history', 'coupons'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end $$;

-- 2) 누구나 읽어도 되는 공개 내용 — 읽기만 허용(쓰기는 서버만)
create policy "public read" on public.blog_posts for select to anon, authenticated using (true);
create policy "public read" on public.tab_stats  for select to anon, authenticated using (true);
create policy "public read" on public.visitors   for select to anon, authenticated using (true);

-- 3) profiles(카카오 로그인 손님): 본인 줄만 읽기, 본인 로또 이용권 수만 고치기
create policy "own read"   on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "own update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
-- 가입 때 프로필을 만드는 트리거가 보안 정의자(security definer)가 아니어도 막히지 않게
create policy "auth signup insert" on public.profiles for insert to supabase_auth_admin with check (true);
revoke update on public.profiles from anon, authenticated;
grant update (premium_lotto_count) on public.profiles to authenticated;

-- push_subscriptions · dreams · credit_history · analysis_history · coupons 는 정책 없음 = 공개 키로 읽기·쓰기 모두 막힘

-- 4) 화면이 부르는 집계 함수는 표 잠금과 상관없이 계속 돌게 소유자 권한으로
alter function public.increment_tab_click security definer;
alter function public.increment_tab_click set search_path = public;
alter function public.increment_visitor security definer;
alter function public.increment_visitor set search_path = public;
alter function public.use_premium_lotto security definer;
alter function public.use_premium_lotto set search_path = public;

-- 5) 서버만 쓰는 함수는 공개 키로 못 부르게(로또 이용권을 아무나 늘리던 구멍)
revoke execute on function public.add_premium_lotto from public, anon, authenticated;
revoke execute on function public.reset_daily_free_credits from public, anon, authenticated;

commit;

-- 확인용: 아래 결과에서 9개 표 모두 rowsecurity = true 이면 끝
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('push_subscriptions','dreams','profiles','blog_posts','tab_stats','visitors','credit_history','analysis_history','coupons')
order by tablename;
