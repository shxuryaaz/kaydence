'use client';

import type { WeeklyReport } from '@/types';

interface Props {
  report: WeeklyReport;
}

const trendConfig = {
  improving: { icon: '↑', label: 'Improving week', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  stable:    { icon: '→', label: 'Stable week',    cls: 'bg-[#f5f5f5] text-[#737373] border-[#e8e8e8]' },
  declining: { icon: '↓', label: 'Declining week', cls: 'bg-red-50 text-red-600 border-red-200' },
};

export default function WeeklyReportCard({ report }: Props) {
  const tc = trendConfig[report.trend];
  const weekDate = new Date(report.week_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider mb-1">End of Sprint</p>
          <h2 className="text-[20px] font-bold text-[#0f0f0f] tracking-tight">Weekly Report</h2>
        </div>
        <span className="text-[12px] text-[#737373] bg-[#f5f5f5] border border-[#e8e8e8] rounded-full px-3 py-1 shrink-0">
          Week of {weekDate}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl bg-[#f5f5f5] border border-[#e8e8e8] px-4 py-4 text-center">
          <p className="text-[28px] font-bold text-[#0f0f0f] leading-none">{report.days_checked_in}</p>
          <p className="text-[11px] text-[#aaa] font-medium uppercase tracking-wide mt-1.5">Check-ins</p>
        </div>
        <div className="rounded-2xl bg-[#f5f5f5] border border-[#e8e8e8] px-4 py-4 text-center">
          <p className="text-[28px] font-bold text-[#0f0f0f] leading-none">{Number(report.avg_score).toFixed(1)}</p>
          <p className="text-[11px] text-[#aaa] font-medium uppercase tracking-wide mt-1.5">Avg score</p>
        </div>
        <div className={`rounded-2xl border px-4 py-4 text-center ${tc.cls}`}>
          <p className="text-[28px] font-bold leading-none">{tc.icon}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide mt-1.5">{tc.label}</p>
        </div>
      </div>

      {/* Stats legend */}
      <p className="text-[11px] text-[#bbb] -mt-2">Score = your daily mood rating (1–5). Trend compares first vs. second half of the week.</p>

      {/* Completed */}
      <div className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="px-5 py-3 border-b border-[#f0f0f0] flex items-center gap-2">
          <span className="text-base">✅</span>
          <p className="text-[12px] font-semibold text-[#0f0f0f] uppercase tracking-wide">Completed this sprint</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-[#0f0f0f] whitespace-pre-wrap leading-relaxed">
            {report.completed_items || '—'}
          </p>
        </div>
      </div>

      {/* Blockers */}
      <div className="rounded-2xl border border-[#e8e8e8] bg-white overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div className="px-5 py-3 border-b border-[#f0f0f0] flex items-center gap-2">
          <span className="text-base">🚧</span>
          <p className="text-[12px] font-semibold text-[#0f0f0f] uppercase tracking-wide">Unresolved blockers</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[13px] text-[#0f0f0f] whitespace-pre-wrap leading-relaxed">
            {report.unresolved_blockers === 'None' ? (
              <span className="text-[#aaa]">None — clear runway.</span>
            ) : report.unresolved_blockers}
          </p>
        </div>
      </div>
    </div>
  );
}
