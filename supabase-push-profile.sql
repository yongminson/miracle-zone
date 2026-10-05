-- 웹 알림 구독에 생년월일(선택)을 함께 저장한다.
-- 매일 아침 알림을 "오늘은 ‘기회에 먼저 손 내미는 날’"처럼 그 사람의 흐름으로 보내기 위해서다.
-- 기존 구독은 그대로 두고(칸만 추가), 비워 두면 기본 문구를 받는다.

alter table public.push_subscriptions
  add column if not exists birth_date text,
  add column if not exists calendar_type text,
  add column if not exists updated_at timestamptz default now();
