# Kaydence — Team System Implementation Plan

This document describes how the team system will work and how to implement it so Kaydence supports **team collaboration**: daily standup reports for the whole team and sprint reports at team level, not just solo.

---

## 1. How the Team System Works (Product)

### 1.1 Core idea

- **Solo mode (current):** Each user has their own daily check-ins, sprint reflections, and weekly report. No shared context.
- **Team mode:** Users belong to one or more **teams**. Each team has:
  - **Team daily standup:** One place to see everyone’s check-ins for a given day (or week). “Who checked in today? What did they work on? Any blockers?”
  - **Team sprint report:** One place to see everyone’s sprint reflections and/or weekly summaries for the same sprint/week. “What did the team ship? What’s blocked? What’s the one truth we’re avoiding?”

Individual check-ins and reflections **stay per-user**; we don’t change the fact that each person logs their own work. The team layer is **aggregation + shared views**, not a separate “team log” entity.

### 1.2 User flows

| Flow | Description |
|------|-------------|
| **Create a team** | User creates a team (name, optional slug). They become the **owner**. |
| **Invite members** | Owner (or admin) invites by email. Invitee gets link; accepting adds them to the team. |
| **Daily standup (team)** | Team view for “today” (or a chosen date): list of members with “checked in / not yet” and, for those who checked in, their worked_on, next, blockers, score. Optional: filter by “this week” to see a week’s standups. |
| **Sprint reflection (team)** | Team view for “this sprint” (e.g. week or 2-week window): list of members with “reflected / not yet” and, for those who did, their “finished this sprint” and doc link. |
| **Team weekly report** | Aggregate of the team’s week: who checked in how many days, team average score, combined “completed” and “blockers” themes (or list), trend. Can be one page that reads from existing weekly_reports of all members. |
| **Leave / remove** | Member can leave; owner can remove members. Owner can transfer ownership or delete the team. |

### 1.3 What stays the same

- **Personal check-in:** User still goes to **Check-in** and submits their own daily log (no change to `daily_logs` schema per se; we only add optional `team_id` if we want “this check-in is for team X” later; see 2.2).
- **Personal reflection:** User still goes to **Reflection** and submits their own sprint reflection.
- **Personal report:** User’s own weekly report is unchanged.
- **Dashboard:** Can stay “my stuff” by default, with a way to switch context to “Team: Acme” to see team standup/report.

So: **same actions, new “team views” that aggregate by team membership.**

---

## 2. Data Model

### 2.1 New tables

```sql
-- Teams (one row per team)
create table teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique,                    -- optional, e.g. "acme" for /t/acme
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Membership: which users are in which team, with role
create table team_members (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  user_id       text not null references profiles(id) on delete cascade,
  role          text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at     timestamptz not null default now(),
  unique (team_id, user_id)
);

create index idx_team_members_team on team_members (team_id);
create index idx_team_members_user on team_members (user_id);

-- Invites (optional but recommended): pending invites by email
create table team_invites (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references teams(id) on delete cascade,
  email         text not null,
  role          text not null default 'member' check (role in ('admin', 'member')),
  invited_by    text not null references profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (team_id, email)
);

create index idx_team_invites_team on team_invites (team_id);
create index idx_team_invites_email on team_invites (email);
```

- **teams:** name, optional slug for pretty URLs.
- **team_members:** many-to-many with role. One owner per team (enforce in app or with partial unique index).
- **team_invites:** pending invite by email; on signup or “accept invite” we create a `team_member` and delete the invite.

### 2.2 Existing tables: optional team scoping (phase 2)

Today, `daily_logs` and `sprint_reflections` and `weekly_reports` are **user-scoped only**. Two approaches:

- **Option A (recommended for v1):** Do **not** add `team_id` to `daily_logs` / `sprint_reflections` / `weekly_reports`. Team standup = “all members of this team” + “all daily_logs where user_id IN (member ids) and log_date = X”. Simple and works: everyone’s check-in is “their” check-in; the team view is just a filter over members’ data.
- **Option B (later):** Add optional `team_id` to `daily_logs` so a user could theoretically have “personal” vs “team” check-ins. Only needed if you want explicit “this log is for team X” and different visibility rules. **Recommend skipping for first version.**

So for the plan below we assume **no schema change** to `daily_logs`, `sprint_reflections`, or `weekly_reports`; team views are **read-only aggregations** by membership.

---

## 3. Backend / Query Layer

### 3.1 New query functions (in `src/lib/queries.ts` or `src/lib/team-queries.ts`)

- **Teams:**  
  - `createTeam(ownerId, { name, slug? })` → create team + insert owner in `team_members` with role `owner`.  
  - `getTeam(teamId)`  
  - `getTeamsForUser(userId)` → teams where user is a member.  
  - `updateTeam(teamId, { name?, slug? })` (owner/admin).  
  - `deleteTeam(teamId)` (owner only).

- **Members:**  
  - `getTeamMembers(teamId)` → profiles + role for that team.  
  - `addMember(teamId, userId, role)` (owner/admin).  
  - `removeMember(teamId, userId)` (self or owner/admin).  
  - `setMemberRole(teamId, userId, role)` (owner only; at most one owner).  
  - `leaveTeam(teamId, userId)` (remove self; if owner, transfer or delete team).

- **Invites:**  
  - `createInvite(teamId, email, role, invitedBy)`  
  - `getPendingInvitesForEmail(email)`  
  - `acceptInvite(inviteId, userId)` → add to `team_members`, delete invite.  
  - `revokeInvite(inviteId)` (owner/admin).

- **Team standup (aggregate):**  
  - `getTeamStandupForDate(teamId, date)`  
    - Resolve member IDs from `team_members` for `team_id`.  
    - Query `daily_logs` where `user_id IN (...)` and `log_date = date`.  
    - Optionally join `profiles` for display_name.  
    - Return list of { profile, log | null } so UI can show “checked in” vs “not yet”.

- **Team standup for week:**  
  - `getTeamStandupForWeek(teamId, weekStart)`  
    - Same idea; filter `log_date` in [weekStart, weekStart+6].  
    - Return structure suitable for “this week’s standups” (e.g. by date, then by member).

- **Team sprint report (aggregate):**  
  - `getTeamReflectionsForSprint(teamId, sprintEndDate)`  
    - Define “sprint” as e.g. the week ending on `sprintEndDate` (or 2-week window).  
    - Members from `team_members`; for each, get `sprint_reflections` in that window (or latest by reflection_date).  
    - Return list of { profile, reflection | null }.

- **Team weekly report (aggregate):**  
  - `getTeamWeeklyReport(teamId, weekStart)`  
    - Get `weekly_reports` for all members for that `week_start`.  
    - Aggregate: total days checked in, team avg score, concatenate or list completed_items / unresolved_blockers, overall trend (e.g. majority or average).  
    - Return one “team report” object (could be computed in JS or in SQL).

### 3.2 RLS / security (when you enable Supabase RLS)

- **teams:** Only members can read; only owner/admin can update/delete.  
- **team_members:** Only members can read; only owner/admin can insert/delete/update.  
- **team_invites:** Only members can read; only owner/admin can insert/delete.  
- Existing tables: keep user-scoped access; team views only use member IDs the current user is allowed to see (because they’re in the same team).

---

## 4. Frontend / Routes

### 4.1 New routes

| Route | Purpose |
|-------|--------|
| `/teams` | List my teams; “Create team” CTA. |
| `/teams/new` | Create team form (name, optional slug). |
| `/teams/[teamId]` (or `/t/[slug]`) | Team home: quick stats + links to “Today’s standup” and “Sprint report” / “Weekly report”. |
| `/teams/[teamId]/standup` (or `.../standup?date=YYYY-MM-DD`) | **Team daily standup:** list of members, each with “Checked in” (and expand/card with worked_on, next, blockers, score) or “Not yet”. Optional date picker. |
| `/teams/[teamId]/standup/week` | **Team standup for the week:** e.g. table or list by day, then by member. |
| `/teams/[teamId]/report` | **Team weekly/sprint report:** aggregated view (team avg score, days checked in, combined completed/blockers, links to each member’s reflection if needed). |
| `/teams/[teamId]/settings` | Name, slug, members list, invite by email, leave team, (owner) transfer/delete team. |
| `/invite/[inviteId]` (or query param) | Accept invite: if not logged in → auth then redirect; if logged in → accept and redirect to team. |

### 4.2 Nav / context

- **Navbar:** When user has teams, show “Teams” or a team switcher. “Home” stays personal dashboard; “Team: Acme” could go to `/teams/[id]` or team standup.
- **Dashboard:** Optional “Team standup” card: “3/5 checked in today” with link to team standup. (Only if user has at least one team.)
- **Standup (personal):** Unchanged; after submitting, optional “View team standup →” if in a team.

### 4.3 Components to add

- **Team list** (teams page).  
- **Create team form.**  
- **Team standup view:** member list + per-member today log (or “Not yet”).  
- **Team weekly/sprint report view:** aggregated stats + list of member reflections/summaries.  
- **Team settings:** members table, invite form, leave/remove, owner actions.  
- **Invite accept flow:** page or modal that calls `acceptInvite` and redirects.

---

## 5. Phasing

### Phase 1 — Foundation (no UI for teams yet)

1. Add DB: `teams`, `team_members`, `team_invites` (migrations).  
2. Implement: createTeam, getTeam, getTeamsForUser, getTeamMembers, addMember, removeMember, leaveTeam.  
3. (Optional) Implement invite CRUD + acceptInvite.  
4. No new routes yet; optional: seed one team in DB and call from a script or temporary UI to validate.

### Phase 2 — Team daily standup

1. Implement `getTeamStandupForDate` and `getTeamStandupForWeek`.  
2. Add `/teams`, `/teams/new`, `/teams/[teamId]`, `/teams/[teamId]/standup`.  
3. Team standup page: list members, show who checked in today (and their log); “not yet” for others.  
4. Link from dashboard: “Team standup” when user has teams.

### Phase 3 — Team sprint / weekly report

1. Implement `getTeamReflectionsForSprint` and `getTeamWeeklyReport`.  
2. Add `/teams/[teamId]/report`.  
3. Team report page: aggregated stats + per-member reflections/summaries.  
4. Link from team home and from personal report: “View team report”.

### Phase 4 — Invites and settings

1. Invite by email: create invite, send email (or “copy invite link” for now).  
2. `/invite/[inviteId]` accept flow.  
3. Team settings: members, invite, leave, remove, (owner) transfer/delete.

### Phase 5 — Polish

- Slug-based URLs `/t/[slug]` for teams.  
- Notifications or badges: “2 teammates haven’t checked in yet”.  
- Optional: “Team” filter on personal dashboard (e.g. “Show only my team’s activity”) if you add activity feed later.

---

## 6. Edge Cases and Rules

- **One owner per team:** When removing the owner, require “transfer ownership” to another member first, or “delete team”.  
- **Last person leaving:** Either delete the team or prevent leave until they transfer ownership; recommend “owner transfers or deletes”.  
- **Invite same email twice:** Unique (team_id, email) so one pending invite per team per email; re-invite = update or revoke + create.  
- **Deleted user (profile):** Cascade on `team_members` and `team_invites`; team standup/report just omit that user.  
- **Timezone for “today”:** Use server date or user’s timezone; keep consistent with current standup behavior (today = date of check-in).

---

## 7. Summary

- **Team** = named group with members (owner/admin/member).  
- **No change** to how individuals submit check-ins or reflections; team system is **aggregation and views**.  
- **Team daily standup** = one view of everyone’s check-ins for a day (or week).  
- **Team sprint report** = one view of everyone’s reflections + aggregated weekly report for the team.  
- Implement in phases: DB + membership → team standup UI → team report UI → invites and settings → polish.

This keeps your existing solo experience intact while adding a clear path to “software used by teams to collaborate on standups and sprint reports.”
