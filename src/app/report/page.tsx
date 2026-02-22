'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import WeeklyReportCard from '@/components/WeeklyReportCard';
import { getLatestWeeklyReport } from '@/lib/queries';
import { getFirstTeam } from '@/lib/team-queries';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { WeeklyReport } from '@/types';

function ReportContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const justGenerated = searchParams.get('generated') === '1';

  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    Promise.all([getLatestWeeklyReport(user.uid), getFirstTeam(user.uid)])
      .then(([latestReport, team]) => {
        if (!team) {
          router.push('/team');
          return;
        }
        setReport(latestReport);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-xl mx-auto px-5 pt-10 pb-16">

        {/* Page header */}
        <div className="mb-8 space-y-1">
          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Weekly Summary</p>
          <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">
            {justGenerated ? 'Report generated.' : 'Your week.'}
          </h1>
          <p className="text-[13px] text-[#737373]">
            {justGenerated ? 'Sprint wrapped. Here\'s where you stand.' : 'A clear look at how your week went.'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : report ? (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
            <WeeklyReportCard report={report} />
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-[#e8e8e8] px-6 py-10 text-center space-y-3"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="w-12 h-12 rounded-2xl bg-[#f5f5f5] border border-[#e8e8e8] flex items-center justify-center mx-auto text-xl">
              📊
            </div>
            <div className="space-y-1">
              <p className="text-[14px] font-semibold text-[#0f0f0f]">No report yet.</p>
              <p className="text-[13px] text-[#737373] max-w-xs mx-auto">
                Submit your sprint reflection on Saturday to auto-generate your weekly report.
              </p>
            </div>
            <Link href="/reflection"
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-full hover:bg-[#262626] transition-colors">
              Fill reflection →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <AuthGuard>
      <Suspense>
        <ReportContent />
      </Suspense>
    </AuthGuard>
  );
}
