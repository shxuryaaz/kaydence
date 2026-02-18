'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSprintReflection, getWeekStart, upsertWeeklyReport, getLogsForWeek, computeTrend } from '@/lib/queries';

interface Props {
  userId: string;
}

export default function SprintReflectionForm({ userId }: Props) {
  const router = useRouter();
  const [finished, setFinished] = useState('');
  const [docLink, setDocLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!finished.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createSprintReflection(userId, {
        finished_this_sprint: finished,
        doc_link: docLink.trim() || undefined,
      });

      const weekStart = getWeekStart();
      const logs = await getLogsForWeek(userId, weekStart);
      const avgScore = logs.length > 0 ? logs.reduce((s, l) => s + l.score, 0) / logs.length : 0;
      const blockers = logs
        .map((l) => l.blockers)
        .filter((b) => b && b.toLowerCase() !== 'none')
        .join('; ');
      const trend = computeTrend(logs);

      await upsertWeeklyReport(userId, weekStart, {
        days_checked_in: logs.length,
        avg_score: Math.round(avgScore * 100) / 100,
        completed_items: finished,
        unresolved_blockers: blockers || 'None',
        trend,
      });

      router.push('/report?generated=1');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <div>
          <label className="block text-[13px] font-semibold text-[#0f0f0f]">
            What did you finish this sprint?
          </label>
          <p className="text-[12px] text-[#aaa] mt-0.5">This generates your weekly report. Be specific — what shipped, what closed, what you can point to.</p>
        </div>
        <textarea
          autoFocus
          value={finished}
          onChange={(e) => setFinished(e.target.value)}
          placeholder="List everything you shipped, completed, or closed out this sprint..."
          rows={7}
          className="w-full rounded-2xl border border-[#e8e8e8] bg-[#fafafa] px-4 py-3.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:bg-white focus:border-[#0f0f0f] resize-none transition-all leading-relaxed"
          required
        />
        <p className="text-[11px] text-[#bbb] italic px-1">e.g. Shipped onboarding v2, fixed 3 prod bugs, wrote API docs, closed 7 tickets</p>
      </div>

      <div className="space-y-2">
        <label className="block text-[13px] font-semibold text-[#0f0f0f]">
          Google Doc link
          <span className="ml-1.5 text-[11px] font-normal text-[#aaa] bg-[#f5f5f5] border border-[#e8e8e8] rounded-full px-2 py-0.5">optional</span>
        </label>
        <input
          type="url"
          value={docLink}
          onChange={(e) => setDocLink(e.target.value)}
          placeholder="https://docs.google.com/..."
          className="w-full rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:bg-white focus:border-[#0f0f0f] transition-all"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-[13px] text-red-600">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!finished.trim() || loading}
        className="w-full py-3 bg-[#0f0f0f] hover:bg-[#262626] text-white text-[13px] font-semibold rounded-full disabled:opacity-40 transition-all"
      >
        {loading ? 'Generating...' : 'Generate report →'}
      </button>
    </form>
  );
}
