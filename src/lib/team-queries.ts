import { supabase } from './supabase';
import type {
  Team, TeamMember, TeamMemberWithProfile,
  Profile, DailyLog, SprintReflection,
} from '@/types';

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function createTeam(
  ownerId: string,
  name: string,
  standupDeadline?: string,
): Promise<Team> {
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .insert({ name, owner_id: ownerId, standup_deadline: standupDeadline || null })
    .select()
    .single();
  if (teamError) throw teamError;

  // Owner is also added as a member with role 'owner'
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({ team_id: team.id, user_id: ownerId, role: 'owner' });
  if (memberError) throw memberError;

  return team as Team;
}

export async function getUserTeams(userId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);
  if (error || !data || data.length === 0) return [];

  const teamIds = (data as { team_id: string }[]).map((d) => d.team_id);
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds)
    .order('created_at', { ascending: false});
  if (teamsError) return [];
  return (teams || []) as Team[];
}

export async function getFirstTeam(userId: string): Promise<Team | null> {
  const teams = await getUserTeams(userId);
  return teams.length > 0 ? teams[0] : null;
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();
  if (error) return null;
  return data as Team;
}

export async function getTeamByInviteCode(code: string): Promise<Team | null> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('invite_code', code)
    .single();
  if (error) return null;
  return data as Team;
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function getTeamMembers(teamId: string): Promise<TeamMemberWithProfile[]> {
  const { data: members, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  if (!members || members.length === 0) return [];

  const userIds = (members as TeamMember[]).map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map(
    ((profiles || []) as Profile[]).map((p) => [p.id, p]),
  );

  return (members as TeamMember[]).map((m) => ({
    ...m,
    profile: profileMap.get(m.user_id) ?? {
      id: m.user_id,
      email: '',
      display_name: 'Unknown',
      created_at: '',
    },
  })) as TeamMemberWithProfile[];
}

export async function joinTeam(teamId: string, userId: string): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId, role: 'member' })
    .select()
    .single();
  if (error) throw error;
  return data as TeamMember;
}

export async function isUserInTeam(userId: string, teamId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();
  return !error && !!data;
}

export async function getTeamMemberCount(teamId: string): Promise<number> {
  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', teamId);
  return count ?? 0;
}

// ─── Team Status ──────────────────────────────────────────────────────────────

export async function getTeamDailyLogs(
  teamId: string,
  date: string,
): Promise<{ member: Profile; log: DailyLog | null }[]> {
  const members = await getTeamMembers(teamId);
  if (members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: logs } = await supabase
    .from('daily_logs')
    .select('*')
    .in('user_id', userIds)
    .eq('log_date', date);

  const logMap = new Map(
    ((logs || []) as DailyLog[]).map((l) => [l.user_id, l]),
  );

  return members.map((m) => ({
    member: m.profile,
    log: logMap.get(m.user_id) ?? null,
  }));
}

export async function getTeamReflections(
  teamId: string,
  date: string,
): Promise<{ member: Profile; reflection: SprintReflection | null }[]> {
  const members = await getTeamMembers(teamId);
  if (members.length === 0) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: reflections } = await supabase
    .from('sprint_reflections')
    .select('*')
    .in('user_id', userIds)
    .eq('reflection_date', date);

  const reflMap = new Map(
    ((reflections || []) as SprintReflection[]).map((r) => [r.user_id, r]),
  );

  return members.map((m) => ({
    member: m.profile,
    reflection: reflMap.get(m.user_id) ?? null,
  }));
}
