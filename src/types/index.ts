export interface Profile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface DailyLog {
  id: string;
  user_id: string;
  log_date: string;
  worked_on: string;
  working_next: string;
  blockers: string;
  score: number;
  created_at: string;
}

export interface SprintReflection {
  id: string;
  user_id: string;
  reflection_date: string;
  finished_this_sprint: string;
  doc_link: string | null;
  created_at: string;
}

export interface WeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  days_checked_in: number;
  avg_score: number;
  completed_items: string;
  unresolved_blockers: string;
  trend: 'improving' | 'stable' | 'declining';
  created_at: string;
}

export type Trend = 'improving' | 'stable' | 'declining';

// ─── Team System Types ────────────────────────────────────────────────────────

export type TeamRole = "owner" | "admin" | "member";

export interface Team {
  id: string;
  name: string;
  slug: string | null;
  standup_deadline_utc: string; // "HH:MM:SS" UTC time
  created_at: string;
  updated_at: string;
}

export interface TeamWithRole extends Team {
  role: TeamRole;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
}

export interface TeamMemberWithProfile {
  id: string;
  role: TeamRole;
  joined_at: string;
  profile: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
}

export interface TeamInvite {
  id: string;
  team_id: string;
  email: string;
  role: Exclude<TeamRole, "owner">;
  invited_by: string;
  created_at: string;
}

// Standup aggregation types
export interface TeamStandupEntry {
  profile: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
  role: TeamRole;
  log: DailyLog | null;
}

export interface TeamStandupDay {
  date: string;
  entries: TeamStandupEntry[];
}

export interface TeamStandupWeek {
  weekStart: string;
  days: TeamStandupDay[];
}

// Reflection aggregation types
export interface TeamReflectionEntry {
  profile: {
    id: string;
    display_name: string | null;
    email: string;
    avatar_url?: string | null;
  };
  role: TeamRole;
  reflection: SprintReflection | null;
}

// Weekly report aggregation types
export interface TeamWeeklyReport {
  weekStart: string;
  memberCount: number;
  avgScore: number | null;
  totalCheckIns: number;
  memberReports: {
    profile: {
      id: string;
      display_name: string | null;
      email: string;
      avatar_url?: string | null;
    };
    report: WeeklyReport | null;
  }[];
}
