-- ═════════════════════════════════════════════════════════════════════════════
-- Kaydence — Complete Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- This creates all tables from scratch for a fresh project
-- ═════════════════════════════════════════════════════════════════════════════

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists profiles (
  id           text primary key,
  email        text not null unique,
  display_name text not null,
  created_at   timestamptz not null default now()
);

alter table profiles disable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- DAILY LOGS (Standups)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists daily_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references profiles(id) on delete cascade,
  log_date      date not null,
  worked_on     text not null,
  working_next  text not null,
  blockers      text not null,
  score         int not null check (score >= 1 and score <= 5),
  created_at    timestamptz not null default now(),
  submitted_at  timestamptz not null default now(),
  submitted_via text not null default 'web' check (submitted_via in ('web', 'slack')),
  unique(user_id, log_date)
);

create index if not exists idx_daily_logs_user on daily_logs (user_id);
create index if not exists idx_daily_logs_date on daily_logs (log_date);
create index if not exists idx_daily_logs_submitted_at on daily_logs (submitted_at);

alter table daily_logs disable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- SPRINT REFLECTIONS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists sprint_reflections (
  id                   uuid primary key default gen_random_uuid(),
  user_id              text not null references profiles(id) on delete cascade,
  reflection_date      date not null,
  finished_this_sprint text not null,
  doc_link             text,
  created_at           timestamptz not null default now(),
  unique(user_id, reflection_date)
);

create index if not exists idx_sprint_reflections_user on sprint_reflections (user_id);
create index if not exists idx_sprint_reflections_date on sprint_reflections (reflection_date);

alter table sprint_reflections disable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- WEEKLY REPORTS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists weekly_reports (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null references profiles(id) on delete cascade,
  week_start          date not null,
  days_checked_in     int not null,
  avg_score           numeric(3,2) not null,
  completed_items     text not null,
  unresolved_blockers text not null,
  trend               text not null check (trend in ('improving', 'stable', 'declining')),
  created_at          timestamptz not null default now(),
  unique(user_id, week_start)
);

create index if not exists idx_weekly_reports_user on weekly_reports (user_id);
create index if not exists idx_weekly_reports_week on weekly_reports (week_start);

alter table weekly_reports disable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEAMS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists teams (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  owner_id             text not null references profiles(id) on delete cascade,
  invite_code          text not null unique default encode(gen_random_bytes(6), 'hex'),
  standup_deadline     text,  -- Legacy field (nullable for backwards compat)
  standup_window_open  text,  -- "HH:MM" 24h format
  standup_window_close text,  -- "HH:MM" 24h format
  slack_team_id        text,
  slack_bot_token      text,  -- TODO: encrypt in app layer
  slack_channel_id     text,
  created_at           timestamptz not null default now()
);

alter table teams disable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- TEAM MEMBERS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists team_members (
  team_id   uuid not null references teams(id) on delete cascade,
  user_id   text not null references profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user on team_members (user_id);
create index if not exists idx_team_members_team on team_members (team_id);

alter table team_members disable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- SLACK USERS (for Slack integration)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists slack_users (
  user_id             text not null references profiles(id) on delete cascade,
  slack_user_id       text not null,
  slack_dm_channel_id text,
  created_at          timestamptz not null default now(),
  primary key (user_id, slack_user_id)
);

create index if not exists idx_slack_users_slack_id on slack_users (slack_user_id);

alter table slack_users disable row level security;

-- ═════════════════════════════════════════════════════════════════════════════
-- Schema setup complete!
-- ═════════════════════════════════════════════════════════════════════════════
