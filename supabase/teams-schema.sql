-- ─────────────────────────────────────────────────────────────────────────────
-- Kaydence — Teams Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- (Run AFTER the main schema.sql)
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ─── Teams ────────────────────────────────────────────────────────────────────
create table if not exists teams (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  owner_id         text not null references profiles(id) on delete cascade,
  invite_code      text not null unique default encode(gen_random_bytes(6), 'hex'),
  standup_deadline text,           -- "HH:MM" 24h, e.g. "10:00", nullable
  created_at       timestamptz not null default now()
);

-- ─── Team Members ─────────────────────────────────────────────────────────────
-- Owner is also inserted as a member (role = 'owner') on team creation
create table if not exists team_members (
  team_id   uuid not null references teams(id) on delete cascade,
  user_id   text not null references profiles(id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user on team_members (user_id);
create index if not exists idx_team_members_team on team_members (team_id);

alter table teams        disable row level security;
alter table team_members disable row level security;
