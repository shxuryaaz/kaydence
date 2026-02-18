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

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  standup_deadline: string | null; // "HH:MM" 24h
  created_at: string;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
}

export interface TeamMemberWithProfile extends TeamMember {
  profile: Profile;
}
