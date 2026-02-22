'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import StandupForm from '@/components/StandupForm';
import { getTodayLog } from '@/lib/queries';
import { getFirstTeam } from '@/lib/team-queries';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { DailyLog, Team } from '@/types';

function isWithinWindow(team: Team): { within: boolean; status: string } {
  if (!team.standup_window_open || !team.standup_window_close) {
    return { within: true, status: '' };
  }

  const now = new Date();
  const [openH, openM] = team.standup_window_open.split(':').map(Number);
  const [closeH, closeM] = team.standup_window_close.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;

  if (nowMins < openMins) {
    return { within: false, status: `Window opens at ${team.standup_window_open}` };
  } else if (nowMins >= closeMins) {
    return { within: false, status: `Window closed at ${team.standup_window_close}. Submissions will be marked late.` };
  } else {
    const remaining = closeMins - nowMins;
    const hours = Math.floor(remaining / 60);
    const mins = remaining % 60;
    const timeLeft = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    return { within: true, status: `Closes in ${timeLeft} (${team.standup_window_close})` };
  }
}

function StandupContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    Promise.all([getTodayLog(user.uid), getFirstTeam(user.uid)])
      .then(([log, userTeam]) => {
        if (!userTeam) {
          // No team → redirect to team hub
          router.push('/team');
          return;
        }
        setTodayLog(log);
        setTeam(userTeam);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  const windowStatus = team ? isWithinWindow(team) : { within: true, status: '' };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-xl mx-auto px-5 pt-10 pb-16">

        {/* Page header */}
        <div className="mb-8 space-y-1">
          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Daily Check-in</p>
          <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">Quick check-in.</h1>
          <p className="text-[13px] text-[#737373]">Shouldn't take more than 60 seconds.</p>
        </div>

        {/* Time window banner */}
        {team && windowStatus.status && (
          <div className={`mb-6 rounded-xl px-4 py-3 flex items-center gap-3 border ${
            windowStatus.within
              ? 'bg-[#fffbeb] border-amber-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <span className="text-[16px]">{windowStatus.within ? '🕐' : '⏰'}</span>
            <p className={`text-[13px] font-medium ${windowStatus.within ? 'text-amber-800' : 'text-red-700'}`}>
              {windowStatus.status}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : todayLog ? (
          <div className="space-y-4">
            {/* Already checked in */}
            <div className="rounded-2xl bg-white border border-emerald-200 px-5 py-5 space-y-4"
              style={{ boxShadow: '0 1px 4px rgba(16,185,129,0.08)' }}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                  ✓ Checked in today
                </span>
                <span className="text-[13px] font-semibold text-[#0f0f0f]">{todayLog.score}/5</span>
              </div>

              <div className="space-y-3 pt-1">
                {[
                  { label: 'Worked on', value: todayLog.worked_on },
                  { label: 'Up next', value: todayLog.working_next },
                  ...(todayLog.blockers && todayLog.blockers.toLowerCase() !== 'none'
                    ? [{ label: 'Blockers', value: todayLog.blockers }]
                    : []),
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wide mb-0.5">{item.label}</p>
                    <p className="text-[13px] text-[#0f0f0f]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link href="/dashboard"
              className="flex items-center justify-center gap-1.5 text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] transition-colors py-2">
              ← Back to home
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
            <StandupForm userId={user!.uid} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function StandupPage() {
  return (
    <AuthGuard>
      <StandupContent />
    </AuthGuard>
  );
}
