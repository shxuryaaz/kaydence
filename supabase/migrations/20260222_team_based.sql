-- ─────────────────────────────────────────────────────────────────────────────
-- Kaydence — Team-Based Architecture Migration
-- Adds time windows, submission tracking, and prepares for Slack integration
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Add time window to teams ─────────────────────────────────────────────────
alter table teams add column if not exists standup_window_open text;   -- "HH:MM" 24h format
alter table teams add column if not exists standup_window_close text;  -- "HH:MM" 24h format

-- Rename existing deadline to window_close for consistency (optional migration path)
-- If you have existing teams with standup_deadline, uncomment this:
-- update teams set standup_window_close = standup_deadline where standup_deadline is not null;

-- ─── Add submission tracking to daily_logs ─────────────────────────────────────
alter table daily_logs add column if not exists submitted_at timestamptz default now();
alter table daily_logs add column if not exists submitted_via text default 'web' check (submitted_via in ('web', 'slack'));

-- Backfill existing logs with web submission
update daily_logs set submitted_via = 'web' where submitted_via is null;

-- ─── Slack integration schema (Phase 2, but created now for consistency) ──────
alter table teams add column if not exists slack_team_id text;
alter table teams add column if not exists slack_bot_token text;  -- TODO: encrypt in app layer
alter table teams add column if not exists slack_channel_id text;

create table if not exists slack_users (
  user_id         text not null references profiles(id) on delete cascade,
  slack_user_id   text not null,
  slack_dm_channel_id text,
  created_at      timestamptz not null default now(),
  primary key (user_id, slack_user_id)
);

alter table slack_users disable row level security;

-- ─── Indexes for performance ──────────────────────────────────────────────────
create index if not exists idx_daily_logs_submitted_at on daily_logs (submitted_at);
create index if not exists idx_slack_users_slack_id on slack_users (slack_user_id);
