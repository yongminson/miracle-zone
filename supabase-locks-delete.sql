-- 소원 자물쇠 — 본인 자물쇠 내리기 기능 추가.
-- 기존 locks 테이블에 컬럼 하나를 더하고 공개 뷰를 다시 만든다.
-- 데이터는 지우지 않는다(결제 기록은 환불·분쟁 대비로 남긴다).

alter table public.locks
  add column if not exists deleted_at timestamptz;

create index if not exists locks_deleted_at_idx
  on public.locks (deleted_at);

-- 내린 자물쇠는 벽에서 보이지 않는다
create or replace view public.locks_public as
select
  id,
  tier,
  color,
  display_name,
  wish,
  created_at
from public.locks
where deleted_at is null;

alter view public.locks_public set (security_invoker = false);

grant select on public.locks_public to anon, authenticated;

comment on column public.locks.deleted_at is
  '본인이 내린 시각. 값이 있으면 벽에 보이지 않는다(데이터는 보존).';
