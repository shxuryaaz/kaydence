'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import HomeCard from '@/components/HomeCard';
import { getTodayLog, getRecentLogs, getWeekStart, getLogsForWeek, computeTrend, computeStreak } from '@/lib/queries';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { DailyLog, Trend } from '@/types';

function WelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  const steps = [
    { n: '01', text: 'Check in daily — takes 60 seconds. What you worked on, what\'s next, any blockers.' },
    { n: '02', text: 'Reflect every Saturday — summarise what you shipped across the week.' },
    { n: '03', text: 'Your weekly report auto-generates. Score, trend, completed items, open blockers.' },
  ];
  return (
    <div className="rounded-2xl bg-[#0f0f0f] px-6 py-5 space-y-4" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.1)' }}>
      <div>
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-0.5">How Kaydence works</p>
        <p className="text-[15px] font-semibold text-white">Three steps, every week.</p>
      </div>
      <div className="space-y-3">
        {steps.map(({ n, text }) => (
          <div key={n} className="flex gap-3">
            <span className="text-[13px] font-bold text-white/25 shrink-0 mt-0.5">{n}</span>
            <p className="text-[13px] text-white/70 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onDismiss}
        className="text-[12px] font-medium text-white/40 hover:text-white/70 transition-colors"
      >
        Got it →
      </button>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const justCheckedIn = searchParams.get('checked') === '1';

  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [daysCheckedIn, setDaysCheckedIn] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [trend, setTrend] = useState<Trend>('stable');
  const [streak, setStreak] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [welcomed, setWelcomed] = useState(true); // start true to avoid flicker

  const dayOfWeek = new Date().getDay();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'there';

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured()) { setLoadingData(false); return; }

    // Read welcomed flag after mount (localStorage not available during SSR)
    const alreadyWelcomed = typeof window !== 'undefined' && !!localStorage.getItem('kaydence_welcomed');
    setWelcomed(alreadyWelcomed);

    async function load() {
      try {
        const [today, weekLogs, recentLogs] = await Promise.all([
          getTodayLog(user!.uid),
          getLogsForWeek(user!.uid, getWeekStart()),
          getRecentLogs(user!.uid, 14),
        ]);
        setTodayLog(today);
        setDaysCheckedIn(weekLogs.length);
        const avg = weekLogs.length > 0 ? weekLogs.reduce((s, l) => s + l.score, 0) / weekLogs.length : 0;
        setAvgScore(avg);
        setTrend(computeTrend(recentLogs));
        setStreak(computeStreak(recentLogs));
        if (recentLogs.length === 0) setIsFirstTime(true);
      } catch {
        // Supabase not reachable — show empty state
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, [user, justCheckedIn]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-5 pt-10 pb-16 space-y-8">
        <div className="space-y-1">
          <p className="text-[12px] font-semibold text-[#aaa] uppercase tracking-wider">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-[28px] font-bold text-[#0f0f0f] tracking-tight leading-tight">
            {greeting}, {displayName}.
          </h1>
          <p className="text-[14px] text-[#737373]">
            {justCheckedIn ? 'Check-in saved. Keep moving.' : 'Did you actually move forward today?'}
          </p>
        </div>

        {!welcomed && isFirstTime && !loadingData && (
          <WelcomeCard onDismiss={() => {
            localStorage.setItem('kaydence_welcomed', '1');
            setWelcomed(true);
          }} />
        )}

        {loadingData ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <HomeCard
            todayLog={todayLog}
            daysCheckedIn={daysCheckedIn}
            avgScore={avgScore}
            trend={trend}
            streak={streak}
            dayOfWeek={dayOfWeek}
          />
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <Suspense>
        <DashboardContent />
      </Suspense>
    </AuthGuard>
  );
}
