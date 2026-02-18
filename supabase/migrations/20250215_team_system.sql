-- ─── Teams ────────────────────────────────────────────────────────────────────
create table if not exists teams (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text unique,
  -- Standup deadline stored as UTC time (no timezone).
  -- Example: owner sets "6:30 PM IST" → stored as "13:00:00".
  -- Frontend converts to each viewer's local time via utcTimeToLocalDisplay().
  standup_deadline_utc  time not null default '13:00:00', -- default: 6:30 PM IST / 1:00 PM UTC
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── Team Members ─────────────────────────────────────────────────────────────
create table if not exists team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  user_id     text not null references profiles(id) on delete cascade,
  role        text not null default 'member'
              check (role in ('owner', 'admin', 'member')),
  joined_at   timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists idx_team_members_team on team_members (team_id);
create index if not exists idx_team_members_user on team_members (user_id);

-- ─── Team Invites ─────────────────────────────────────────────────────────────
create table if not exists team_invites (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  email       text not null,
  role        text not null default 'member'
              check (role in ('admin', 'member')),
  invited_by  text not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (team_id, email)
);

create index if not exists idx_team_invites_team on team_invites (team_id);
create index if not exists idx_team_invites_email on team_invites (email);

-- ─── Auto-update updated_at on teams ─────────────────────────────────────────
create or replace function update_teams_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger teams_updated_at
  before update on teams
  for each row execute procedure update_teams_updated_at();
