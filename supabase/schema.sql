-- ─────────────────────────────────────────────────────────────────────────────
-- Kaydence — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            text primary key,          -- Firebase UID
  email         text not null,
  display_name  text not null default '',
  created_at    timestamptz not null default now()
);

-- ─── Daily Logs ───────────────────────────────────────────────────────────────
create table if not exists daily_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references profiles(id) on delete cascade,
  log_date      date not null,
  worked_on     text not null default '',
  working_next  text not null default '',
  blockers      text not null default '',
  score         int  not null check (score between 1 and 5),
  created_at    timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists idx_daily_logs_user_date on daily_logs (user_id, log_date desc);

-- ─── Sprint Reflections ───────────────────────────────────────────────────────
create table if not exists sprint_reflections (
  id                    uuid primary key default gen_random_uuid(),
  user_id               text not null references profiles(id) on delete cascade,
  reflection_date       date not null,
  finished_this_sprint  text not null default '',
  doc_link              text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_sprint_reflections_user on sprint_reflections (user_id, reflection_date desc);

-- ─── Weekly Reports ───────────────────────────────────────────────────────────
create table if not exists weekly_reports (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null references profiles(id) on delete cascade,
  week_start          date not null,
  days_checked_in     int  not null default 0,
  avg_score           numeric(3,2) not null default 0,
  completed_items     text not null default '',
  unresolved_blockers text not null default '',
  trend               text not null default 'stable' check (trend in ('improving', 'stable', 'declining')),
  created_at          timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists idx_weekly_reports_user on weekly_reports (user_id, week_start desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- NOTE: Since this app uses Firebase Auth (not Supabase Auth), we're using the
-- anon key with explicit user_id filters in queries. For production, consider:
-- 1. Passing Firebase ID tokens to a Supabase Edge Function
-- 2. Or using Supabase's custom JWT support with Firebase tokens
--
-- For now, disable RLS and rely on application-level filtering.
-- ─────────────────────────────────────────────────────────────────────────────
alter table profiles          disable row level security;
alter table daily_logs        disable row level security;
alter table sprint_reflections disable row level security;
alter table weekly_reports    disable row level security;
