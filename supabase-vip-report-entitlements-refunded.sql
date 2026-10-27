-- 사주 인사이트 지급권에 '환불됨(refunded)' 상태를 추가하고, 10/13 환불한 결제를 정리한다.
-- (그대로 두면 '결제했는데 리포트 못 받은 손님' 알림에 매일 잡힌다)
-- 리포트 받기는 status = 'available' 일 때만 되므로 refunded 는 다시 받을 수 없다.

do $$
declare c text;
begin
  select conname into c
  from pg_constraint
  where conrelid = 'public.vip_report_entitlements'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%status%';
  if c is not null then
    execute format('alter table public.vip_report_entitlements drop constraint %I', c);
  end if;
end $$;

alter table public.vip_report_entitlements
  add constraint vip_report_entitlements_status_check
  check (status in ('available', 'processing', 'completed', 'refunded'));

update public.vip_report_entitlements
set status = 'refunded', updated_at = now()
where payment_ref = 'google:3bfc9e646db4a9840a486edabb62c282866dec04a76f1ec934b325aff8f00b88'
  and status = 'available';

-- 확인: 1줄이 refunded 로 보이면 끝
select created_at, platform, status, provider_reference
from public.vip_report_entitlements
where payment_ref = 'google:3bfc9e646db4a9840a486edabb62c282866dec04a76f1ec934b325aff8f00b88';
