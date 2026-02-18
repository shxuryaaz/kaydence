'use client';

import Link from 'next/link';
import type { DailyLog, Trend } from '@/types';

interface Props {
  todayLog: DailyLog | null;
  daysCheckedIn: number;
  avgScore: number;
  trend: Trend;
  streak: number;
  dayOfWeek: number;
}

const trendIcon: Record<Trend, string> = { improving: '↑', stable: '→', declining: '↓' };
const trendBg: Record<Trend, string> = {
  improving: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  stable: 'bg-[#f5f5f5] text-[#737373] border-[#e8e8e8]',
  declining: 'bg-red-50 text-red-600 border-red-200',
};

export default function HomeCard({ todayLog, daysCheckedIn, avgScore, trend, streak, dayOfWeek }: Props) {
  return (
    <div className="space-y-3">

      {/* Friday banner */}
      {dayOfWeek === 5 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-base">📋</div>
          <div>
            <p className="text-[13px] font-semibold text-amber-900">Planning day is tomorrow.</p>
            <p className="text-[12px] text-amber-700 mt-0.5">Update your items before Saturday.</p>
          </div>
        </div>
      )}

      {/* Saturday banner */}
      {dayOfWeek === 6 && (
        <div className="rounded-2xl bg-[#0f0f0f] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-base">🏁</div>
            <div>
              <p className="text-[13px] font-semibold text-white">End of Sprint.</p>
              <p className="text-[12px] text-white/60 mt-0.5">Time to reflect on the week.</p>
            </div>
          </div>
          <Link
            href="/reflection"
            className="px-3.5 py-1.5 bg-white text-[#0f0f0f] text-[12px] font-semibold rounded-full hover:bg-white/90 transition-colors shrink-0"
          >
            Reflect →
          </Link>
        </div>
      )}

      {/* Today check-in */}
      {!todayLog ? (
        <div
          className="rounded-2xl bg-white border border-[#e8e8e8] px-5 py-5 flex items-center justify-between"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        >
          <div className="space-y-0.5">
            <p className="text-[15px] font-semibold text-[#0f0f0f]">Quick check-in.</p>
            <p className="text-[13px] text-[#737373]">You haven't logged today yet.</p>
          </div>
          <Link
            href="/standup"
            className="px-4 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-full hover:bg-[#262626] transition-colors shrink-0 ml-4"
          >
            Check in
          </Link>
        </div>
      ) : (
        <div
          className="rounded-2xl bg-white border border-emerald-200 px-5 py-4"
          style={{ boxShadow: '0 1px 4px rgba(16,185,129,0.08)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                  ✓ Checked in
                </span>
                <span className="text-[12px] text-[#737373]">Score {todayLog.score}/5</span>
              </div>
              <p className="text-[13px] text-[#0f0f0f] line-clamp-1">{todayLog.worked_on}</p>
            </div>
          </div>
        </div>
      )}

      {/* Weekly stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: daysCheckedIn, label: 'days checked in', suffix: '' },
          { value: avgScore > 0 ? avgScore.toFixed(1) : '—', label: 'avg score', suffix: avgScore > 0 ? '/5' : '' },
          { value: trendIcon[trend], label: trend, suffix: '', colored: true },
        ].map((stat, i) => (
          <div
            key={i}
            className="rounded-2xl bg-white border border-[#e8e8e8] px-4 py-4 text-center"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <p className={`text-2xl font-bold leading-none ${i === 2 ? trendBg[trend].split(' ')[1] : 'text-[#0f0f0f]'}`}>
              {stat.value}
              {stat.suffix && <span className="text-sm font-normal text-[#737373]">{stat.suffix}</span>}
            </p>
            <p className="text-[11px] text-[#aaa] mt-1.5 font-medium uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div
          className="rounded-2xl bg-white border border-[#e8e8e8] px-5 py-3.5 flex items-center gap-3"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <span className="text-xl">🔥</span>
          <div>
            <p className="text-[13px] font-semibold text-[#0f0f0f]">{streak}-day streak</p>
            <p className="text-[12px] text-[#737373]">Keep it going.</p>
          </div>
          <div className="ml-auto">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${trendBg[trend]}`}>
              {trendIcon[trend]} {trend}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
