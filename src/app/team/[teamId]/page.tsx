'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import {
  getTeamById,
  getTeamDailyLogs,
  getTeamReflections,
  isUserInTeam,
} from '@/lib/team-queries';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Team, Profile, DailyLog, SprintReflection } from '@/types';

type DailyStatus = { member: Profile; log: DailyLog | null };
type ReflectionStatus = { member: Profile; reflection: SprintReflection | null };

function isLate(deadline: string | null): boolean {
  if (!deadline) return false;
  const [h, m] = deadline.split(':').map(Number);
  const now = new Date();
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

function memberName(member: Profile): string {
  return member.display_name || member.email.split('@')[0] || 'Unknown';
}

// ─── Member cards ─────────────────────────────────────────────────────────────

function LogCard({ member, log, late, isMe }: { member: Profile; log: DailyLog | null; late: boolean; isMe: boolean }) {
  if (log) {
    return (
      <div className="rounded-2xl bg-white border border-emerald-200 px-5 py-4 space-y-2.5"
        style={{ boxShadow: '0 1px 4px rgba(16,185,129,0.08)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full w-5 h-5 justify-center shrink-0">✓</span>
            <p className="text-[13px] font-semibold text-[#0f0f0f] truncate">{memberName(member)}</p>
            {isMe && <span className="text-[10px] text-[#aaa] shrink-0">(you)</span>}
          </div>
          <span className="text-[12px] font-bold text-[#0f0f0f] shrink-0">{log.score}/5</span>
        </div>
        <p className="text-[12px] text-[#737373] line-clamp-2 leading-relaxed">{log.worked_on}</p>
        {log.blockers && log.blockers.toLowerCase() !== 'none' && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 line-clamp-1">
            ⚠ {log.blockers}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl px-5 py-4 border ${
      late ? 'bg-amber-50 border-amber-200' : 'bg-white border-[#e8e8e8]'
    }`} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[13px] font-semibold text-[#0f0f0f] truncate">{memberName(member)}</p>
          {isMe && <span className="text-[10px] text-[#aaa] shrink-0">(you)</span>}
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
          late
            ? 'text-amber-700 bg-amber-100 border-amber-200'
            : 'text-[#aaa] bg-[#f5f5f5] border-[#e8e8e8]'
        }`}>
          {late ? 'Late' : 'Pending'}
        </span>
      </div>
    </div>
  );
}

function ReflectionCard({ member, reflection, isMe }: { member: Profile; reflection: SprintReflection | null; isMe: boolean }) {
  if (reflection) {
    return (
      <div className="rounded-2xl bg-white border border-emerald-200 px-5 py-4 space-y-2"
        style={{ boxShadow: '0 1px 4px rgba(16,185,129,0.08)' }}>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full w-5 h-5 justify-center shrink-0">✓</span>
          <p className="text-[13px] font-semibold text-[#0f0f0f]">{memberName(member)}</p>
          {isMe && <span className="text-[10px] text-[#aaa]">(you)</span>}
        </div>
        <p className="text-[12px] text-[#737373] line-clamp-2 leading-relaxed">{reflection.finished_this_sprint}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-[#e8e8e8] px-5 py-4"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[13px] font-semibold text-[#0f0f0f] truncate">{memberName(member)}</p>
          {isMe && <span className="text-[10px] text-[#aaa] shrink-0">(you)</span>}
        </div>
        <span className="text-[11px] font-semibold text-[#aaa] bg-[#f5f5f5] border border-[#e8e8e8] rounded-full px-2.5 py-1 shrink-0">
          Pending
        </span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function TeamDashboardContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [dailyStatus, setDailyStatus] = useState<DailyStatus[]>([]);
  const [reflectionStatus, setReflectionStatus] = useState<ReflectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const isSaturday = new Date().getDay() === 6;

  const inviteUrl = typeof window !== 'undefined' && team
    ? `${window.location.origin}/join/${team.invite_code}`
    : '';

  const load = useCallback(async () => {
    if (!user) return;
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    try {
      const [teamData, inTeam] = await Promise.all([
        getTeamById(teamId),
        isUserInTeam(user.uid, teamId),
      ]);

      if (!teamData || !inTeam) {
        router.replace('/team');
        return;
      }

      setTeam(teamData);

      if (isSaturday) {
        const reflections = await getTeamReflections(teamId, today);
        setReflectionStatus(reflections);
      } else {
        const logs = await getTeamDailyLogs(teamId, today);
        setDailyStatus(logs);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [user, teamId, today, isSaturday, router]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh on tab focus
  useEffect(() => {
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);

  function handleCopy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const late = isLate(team?.standup_deadline ?? null);
  const statuses = isSaturday ? reflectionStatus : dailyStatus;
  const submittedCount = isSaturday
    ? reflectionStatus.filter((s) => s.reflection).length
    : dailyStatus.filter((s) => s.log).length;
  const totalCount = statuses.length;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-5 pt-10 pb-16">

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !team ? null : (
          <div className="space-y-6">

            {/* Header */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Team</p>
              <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">{team.name}</h1>
              <p className="text-[13px] text-[#737373]">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Deadline callout */}
            {team.standup_deadline && (
              <div className={`rounded-xl px-4 py-3 flex items-center gap-3 border ${
                late
                  ? 'bg-red-50 border-red-200'
                  : 'bg-[#fffbeb] border-amber-200'
              }`}>
                <span className="text-[16px]">{late ? '🔴' : '🕐'}</span>
                <div>
                  <p className={`text-[13px] font-semibold ${late ? 'text-red-700' : 'text-amber-800'}`}>
                    {late ? 'Deadline passed' : `Check-in closes at ${team.standup_deadline}`}
                  </p>
                  <p className={`text-[11px] ${late ? 'text-red-500' : 'text-amber-600'}`}>
                    {late ? `Standup was due at ${team.standup_deadline}. Members without a check-in are marked Late.` : 'Members who miss this time will be marked Late.'}
                  </p>
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="rounded-2xl bg-white border border-[#e8e8e8] px-5 py-4"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-semibold text-[#0f0f0f]">
                  {isSaturday ? 'Sprint reflections' : 'Check-ins today'}
                </p>
                <span className="text-[13px] font-bold text-[#0f0f0f]">
                  {submittedCount}<span className="text-[#aaa] font-normal">/{totalCount}</span>
                </span>
              </div>
              <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: totalCount > 0 ? `${(submittedCount / totalCount) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Member cards */}
            {totalCount === 0 ? (
              <div className="rounded-2xl bg-white border border-[#e8e8e8] px-5 py-8 text-center"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <p className="text-[14px] font-semibold text-[#0f0f0f] mb-1">No members yet.</p>
                <p className="text-[13px] text-[#737373]">Share the invite link below to get people in.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Legend */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[11px] text-[#737373]">Submitted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#d4d4d4] shrink-0" />
                    <span className="text-[11px] text-[#737373]">Pending</span>
                  </div>
                  {team.standup_deadline && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="text-[11px] text-[#737373]">Late</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {isSaturday
                    ? reflectionStatus.map(({ member, reflection }) => (
                        <ReflectionCard key={member.id} member={member} reflection={reflection} isMe={member.id === user?.uid} />
                      ))
                    : dailyStatus.map(({ member, log }) => (
                        <LogCard key={member.id} member={member} log={log} late={!log && late} isMe={member.id === user?.uid} />
                      ))}
                </div>
              </div>
            )}

            {/* Invite */}
            <div className="rounded-2xl bg-white border border-[#e8e8e8] px-5 py-4"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wide mb-2.5">Invite link</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[12px] text-[#737373] bg-[#f5f5f5] rounded-lg px-3 py-2 truncate select-all">
                  {inviteUrl || `…/join/${team.invite_code}`}
                </code>
                <button
                  onClick={handleCopy}
                  className="px-3.5 py-2 bg-[#0f0f0f] text-white text-[12px] font-medium rounded-lg hover:bg-[#262626] transition-colors shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamDashboard() {
  return (
    <AuthGuard>
      <TeamDashboardContent />
    </AuthGuard>
  );
}
