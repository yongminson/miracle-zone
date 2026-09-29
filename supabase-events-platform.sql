-- user_events 에 접속 경로(웹/앱/토스)를 남긴다.
-- 기존 기록은 비어 있고(null), 배포 이후 기록부터 채워진다.

alter table public.user_events
  add column if not exists platform text;

create index if not exists user_events_platform_created_idx
  on public.user_events (platform, created_at);
