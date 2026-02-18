import { supabase } from "@/lib/supabase";
import type {
  Team,
  TeamWithRole,
  TeamRole,
  TeamMemberWithProfile,
  TeamInvite,
  TeamStandupEntry,
  TeamStandupDay,
  TeamStandupWeek,
  TeamReflectionEntry,
  TeamWeeklyReport,
  DailyLog,
  SprintReflection,
  WeeklyReport,
} from "@/types";

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function createTeam(
  ownerId: string,
  data: { name: string; slug?: string; standupDeadlineUtc?: string }
): Promise<Team> {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name: data.name,
      slug: data.slug ?? null,
      standup_deadline_utc: data.standupDeadlineUtc ?? "13:00:00",
    })
    .select()
    .single();

  if (teamError || !team) throw new Error(teamError?.message ?? "Failed to create team");

  const { error: memberError } = await supabase
    .from("team_members")
    .insert({ team_id: team.id, user_id: ownerId, role: "owner" });

  if (memberError) throw new Error(memberError.message);

  return team as Team;
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();
  if (error) return null;
  return data as Team;
}

interface TeamMemberRow {
  role: string;
  teams: Team | null;
}

export async function getTeamsForUser(userId: string): Promise<TeamWithRole[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("role, teams(*)")
    .eq("user_id", userId);
  if (error || !data) return [];
  const rows = data as unknown as TeamMemberRow[];
  return rows
    .filter((row) => row.teams != null)
    .map((row) => ({ ...(row.teams as Team), role: row.role as TeamRole }));
}

export async function updateTeam(
  teamId: string,
  data: { name?: string; slug?: string; standupDeadlineUtc?: string }
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.slug !== undefined) update.slug = data.slug;
  if (data.standupDeadlineUtc !== undefined)
    update.standup_deadline_utc = data.standupDeadlineUtc;

  const { error } = await supabase.from("teams").update(update).eq("id", teamId);
  if (error) throw new Error(error.message);
}

export async function deleteTeam(teamId: string): Promise<void> {
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw new Error(error.message);
}

// ─── Members ──────────────────────────────────────────────────────────────────

interface TeamMemberSelectRow {
  id: string;
  role: string;
  joined_at: string;
  profiles: {
    id: string;
    display_name: string | null;
    email: string;
  } | null;
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("id, role, joined_at, profiles(id, display_name, email)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });
  if (error || !data) return [];
  const rows = data as unknown as TeamMemberSelectRow[];
  return rows.map((row) => ({
    id: row.id,
    role: row.role as TeamRole,
    joined_at: row.joined_at,
    profile: row.profiles ?? {
      id: "",
      display_name: null,
      email: "",
      avatar_url: null,
    },
  }));
}

export async function addMember(
  teamId: string,
  userId: string,
  role: TeamRole = "member"
): Promise<void> {
  const { error } = await supabase
    .from("team_members")
    .insert({ team_id: teamId, user_id: userId, role });
  if (error) throw new Error(error.message);
}

export async function removeMember(teamId: string, userId: string): Promise<void> {
  const { data: member } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .single();
  if ((member as { role: string } | null)?.role === "owner") {
    throw new Error("Cannot remove the team owner. Transfer ownership first.");
  }
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function setMemberRole(
  teamId: string,
  userId: string,
  newRole: TeamRole
): Promise<void> {
  if (newRole === "owner") {
    const { data: currentOwner } = await supabase
      .from("team_members")
      .select("user_id")
      .eq("team_id", teamId)
      .eq("role", "owner")
      .single();
    const owner = currentOwner as { user_id: string } | null;
    if (owner && owner.user_id !== userId) {
      await supabase
        .from("team_members")
        .update({ role: "member" })
        .eq("team_id", teamId)
        .eq("user_id", owner.user_id);
    }
  }
  const { error } = await supabase
    .from("team_members")
    .update({ role: newRole })
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  await removeMember(teamId, userId);
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function createInvite(
  teamId: string,
  email: string,
  role: Exclude<TeamRole, "owner">,
  invitedBy: string
): Promise<TeamInvite> {
  const { data, error } = await supabase
    .from("team_invites")
    .upsert(
      { team_id: teamId, email: email.toLowerCase().trim(), role, invited_by: invitedBy },
      { onConflict: "team_id,email" }
    )
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create invite");
  return data as TeamInvite;
}

export async function getPendingInvitesForTeam(teamId: string): Promise<TeamInvite[]> {
  const { data, error } = await supabase
    .from("team_invites")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as TeamInvite[];
}

export async function getPendingInvitesForEmail(email: string): Promise<TeamInvite[]> {
  const { data, error } = await supabase
    .from("team_invites")
    .select("*, teams(name)")
    .eq("email", email.toLowerCase());
  if (error || !data) return [];
  return data as TeamInvite[];
}

export async function acceptInvite(inviteId: string, userId: string): Promise<string> {
  const { data: invite, error: inviteError } = await supabase
    .from("team_invites")
    .select("*")
    .eq("id", inviteId)
    .single();
  if (inviteError || !invite) throw new Error("Invite not found or already used.");

  const inv = invite as TeamInvite;
  await addMember(inv.team_id, userId, inv.role);
  await supabase.from("team_invites").delete().eq("id", inviteId);
  return inv.team_id;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from("team_invites").delete().eq("id", inviteId);
  if (error) throw new Error(error.message);
}

export async function getInvite(inviteId: string): Promise<{ invite: TeamInvite; teamName: string } | null> {
  const { data, error } = await supabase
    .from("team_invites")
    .select("*, teams(name)")
    .eq("id", inviteId)
    .single();
  if (error || !data) return null;
  const row = data as TeamInvite & { teams: { name: string } | null };
  return {
    invite: {
      id: row.id,
      team_id: row.team_id,
      email: row.email,
      role: row.role,
      invited_by: row.invited_by,
      created_at: row.created_at,
    },
    teamName: row.teams?.name ?? "Unknown",
  };
}

// ─── Team Standup Aggregation ─────────────────────────────────────────────────

interface StandupMemberRow {
  user_id: string;
  role: string;
  profiles: { id: string; display_name: string | null; email: string } | null;
}

/** "Today" is UTC-date-based. See §1.2 in TEAM_SYSTEM_PLAN. */
export async function getTeamStandupForDate(
  teamId: string,
  date: string
): Promise<TeamStandupEntry[]> {
  const { data: members, error: memberError } = await supabase
    .from("team_members")
    .select("user_id, role, profiles(id, display_name, email)")
    .eq("team_id", teamId);
  if (memberError || !members) return [];

  const memberRows = members as unknown as StandupMemberRow[];
  const userIds = memberRows.map((m) => m.user_id);

  const { data: logs, error: logError } = await supabase
    .from("daily_logs")
    .select("*")
    .in("user_id", userIds)
    .eq("log_date", date);
  if (logError) return [];

  const logMap = new Map(((logs ?? []) as DailyLog[]).map((l) => [l.user_id, l]));

  return memberRows.map((m) => ({
    profile: {
      id: m.profiles?.id ?? "",
      display_name: m.profiles?.display_name ?? null,
      email: m.profiles?.email ?? "",
      avatar_url: null,
    },
    role: m.role as TeamRole,
    log: logMap.get(m.user_id) ?? null,
  }));
}

export async function getTeamStandupForWeek(
  teamId: string,
  weekStart: string
): Promise<TeamStandupWeek> {
  const { data: members, error: memberError } = await supabase
    .from("team_members")
    .select("user_id, role, profiles(id, display_name, email)")
    .eq("team_id", teamId);
  if (memberError || !members) return { weekStart, days: [] };

  const memberRows = members as unknown as StandupMemberRow[];
  const userIds = memberRows.map((m) => m.user_id);

  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const weekEnd = end.toISOString().split("T")[0];

  const { data: logs, error: logError } = await supabase
    .from("daily_logs")
    .select("*")
    .in("user_id", userIds)
    .gte("log_date", weekStart)
    .lte("log_date", weekEnd)
    .order("log_date", { ascending: true });
  if (logError) return { weekStart, days: [] };

  const logsList = (logs ?? []) as DailyLog[];
  const days: TeamStandupDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    const dayLogs = logsList.filter((l) => l.log_date === dateStr);
    const logByUserId = new Map(dayLogs.map((l) => [l.user_id, l]));

    days.push({
      date: dateStr,
      entries: memberRows.map((m) => ({
        profile: {
          id: m.profiles?.id ?? "",
          display_name: m.profiles?.display_name ?? null,
          email: m.profiles?.email ?? "",
          avatar_url: null,
        },
        role: m.role as TeamRole,
        log: logByUserId.get(m.user_id) ?? null,
      })),
    });
  }

  return { weekStart, days };
}

// ─── Team Report Aggregation ──────────────────────────────────────────────────

export async function getTeamReflectionsForSprint(
  teamId: string,
  weekStart: string
): Promise<TeamReflectionEntry[]> {
  const { data: members, error: memberError } = await supabase
    .from("team_members")
    .select("user_id, role, profiles(id, display_name, email)")
    .eq("team_id", teamId);
  if (memberError || !members) return [];

  const memberRows = members as unknown as StandupMemberRow[];
  const userIds = memberRows.map((m) => m.user_id);

  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const weekEnd = end.toISOString().split("T")[0];

  const { data: reflections, error } = await supabase
    .from("sprint_reflections")
    .select("*")
    .in("user_id", userIds)
    .gte("reflection_date", weekStart)
    .lte("reflection_date", weekEnd);
  if (error) return [];

  const reflMap = new Map(
    ((reflections ?? []) as SprintReflection[]).map((r) => [r.user_id, r])
  );

  return memberRows.map((m) => ({
    profile: {
      id: m.profiles?.id ?? "",
      display_name: m.profiles?.display_name ?? null,
      email: m.profiles?.email ?? "",
      avatar_url: null,
    },
    role: m.role as TeamRole,
    reflection: reflMap.get(m.user_id) ?? null,
  }));
}

interface ReportMemberRow {
  user_id: string;
  profiles: { id: string; display_name: string | null; email: string } | null;
}

export async function getTeamWeeklyReport(
  teamId: string,
  weekStart: string
): Promise<TeamWeeklyReport> {
  const { data: members, error: memberError } = await supabase
    .from("team_members")
    .select("user_id, profiles(id, display_name, email)")
    .eq("team_id", teamId);
  if (memberError || !members) {
    return {
      weekStart,
      memberCount: 0,
      avgScore: null,
      totalCheckIns: 0,
      memberReports: [],
    };
  }

  const memberRows = members as unknown as ReportMemberRow[];
  const userIds = memberRows.map((m) => m.user_id);

  const { data: reports, error } = await supabase
    .from("weekly_reports")
    .select("*")
    .in("user_id", userIds)
    .eq("week_start", weekStart);
  if (error) {
    return {
      weekStart,
      memberCount: memberRows.length,
      avgScore: null,
      totalCheckIns: 0,
      memberReports: memberRows.map((m) => ({
        profile: {
          id: m.profiles?.id ?? "",
          display_name: m.profiles?.display_name ?? null,
          email: m.profiles?.email ?? "",
          avatar_url: null,
        },
        report: null,
      })),
    };
  }

  const reportMap = new Map(((reports ?? []) as WeeklyReport[]).map((r) => [r.user_id, r]));

  const memberReports = memberRows.map((m) => ({
    profile: {
      id: m.profiles?.id ?? "",
      display_name: m.profiles?.display_name ?? null,
      email: m.profiles?.email ?? "",
      avatar_url: null,
    },
    report: reportMap.get(m.user_id) ?? null,
  }));

  const reportsWithData = memberReports.filter((mr) => mr.report !== null);
  const totalCheckIns = reportsWithData.reduce(
    (sum, mr) => sum + (mr.report?.days_checked_in ?? 0),
    0
  );
  const avgScore =
    reportsWithData.length > 0
      ? reportsWithData.reduce((sum, mr) => sum + (mr.report?.avg_score ?? 0), 0) /
        reportsWithData.length
      : null;

  return {
    weekStart,
    memberCount: memberRows.length,
    avgScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
    totalCheckIns,
    memberReports,
  };
}
