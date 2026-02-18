import { supabase } from './supabase';
import type { DailyLog, SprintReflection, WeeklyReport, Profile, Trend } from '@/types';

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function upsertProfile(profile: Omit<Profile, 'created_at'>) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as Profile | null;
}

// ─── Daily Logs ───────────────────────────────────────────────────────────────

export async function getTodayLog(userId: string): Promise<DailyLog | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', today)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as DailyLog | null;
}

export async function createDailyLog(
  userId: string,
  payload: { worked_on: string; working_next: string; blockers: string; score: number }
) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_logs')
    .insert({ user_id: userId, log_date: today, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as DailyLog;
}

export async function getLogsForWeek(userId: string, weekStart: string): Promise<DailyLog[]> {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', weekStart)
    .lte('log_date', end.toISOString().split('T')[0])
    .order('log_date', { ascending: true });
  if (error) throw error;
  return (data || []) as DailyLog[];
}

export async function getRecentLogs(userId: string, days = 14): Promise<DailyLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', since.toISOString().split('T')[0])
    .order('log_date', { ascending: true });
  if (error) throw error;
  return (data || []) as DailyLog[];
}

// ─── Sprint Reflections ───────────────────────────────────────────────────────

export async function createSprintReflection(
  userId: string,
  payload: { finished_this_sprint: string; doc_link?: string }
) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('sprint_reflections')
    .insert({ user_id: userId, reflection_date: today, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as SprintReflection;
}

export async function getLatestReflection(userId: string): Promise<SprintReflection | null> {
  const { data, error } = await supabase
    .from('sprint_reflections')
    .select('*')
    .eq('user_id', userId)
    .order('reflection_date', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as SprintReflection | null;
}

export async function getTodayReflection(userId: string): Promise<SprintReflection | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('sprint_reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('reflection_date', today)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as SprintReflection | null;
}

// ─── Weekly Reports ───────────────────────────────────────────────────────────

export async function upsertWeeklyReport(
  userId: string,
  weekStart: string,
  payload: {
    days_checked_in: number;
    avg_score: number;
    completed_items: string;
    unresolved_blockers: string;
    trend: Trend;
  }
) {
  const { data, error } = await supabase
    .from('weekly_reports')
    .upsert({ user_id: userId, week_start: weekStart, ...payload }, { onConflict: 'user_id,week_start' })
    .select()
    .single();
  if (error) throw error;
  return data as WeeklyReport;
}

export async function getLatestWeeklyReport(userId: string): Promise<WeeklyReport | null> {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('*')
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as WeeklyReport | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getWeekStart(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function computeTrend(logs: DailyLog[]): Trend {
  if (logs.length < 4) return 'stable';
  const half = Math.floor(logs.length / 2);
  const first = logs.slice(0, half);
  const second = logs.slice(half);
  const avg = (arr: DailyLog[]) => arr.reduce((s, l) => s + l.score, 0) / arr.length;
  const diff = avg(second) - avg(first);
  if (diff >= 0.3) return 'improving';
  if (diff <= -0.3) return 'declining';
  return 'stable';
}

export function computeStreak(logs: DailyLog[]): number {
  if (logs.length === 0) return 0;
  const today = new Date().toISOString().split('T')[0];
  const dates = new Set(logs.map((l) => l.log_date));
  let streak = 0;
  const cursor = new Date();
  // Start from today or yesterday
  if (!dates.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (true) {
    const d = cursor.toISOString().split('T')[0];
    if (!dates.has(d)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
