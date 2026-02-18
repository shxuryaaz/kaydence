'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import SprintReflectionForm from '@/components/SprintReflectionForm';
import { getTodayReflection } from '@/lib/queries';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { SprintReflection } from '@/types';

function ReflectionContent() {
  const { user } = useAuth();
  const [todayReflection, setTodayReflection] = useState<SprintReflection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    getTodayReflection(user.uid)
      .then(setTodayReflection)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-xl mx-auto px-5 pt-10 pb-16">

        {/* Page header */}
        <div className="mb-8 space-y-1">
          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">End of Sprint Report</p>
          <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">Sprint reflection.</h1>
          <p className="text-[13px] text-[#737373]">What did you actually finish? Be honest.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : todayReflection ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border border-emerald-200 px-5 py-5 space-y-4"
              style={{ boxShadow: '0 1px 4px rgba(16,185,129,0.08)' }}>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                ✓ Reflection submitted
              </span>

              <div className="space-y-3 pt-1">
                <div>
                  <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wide mb-0.5">Finished this sprint</p>
                  <p className="text-[13px] text-[#0f0f0f] whitespace-pre-wrap leading-relaxed">{todayReflection.finished_this_sprint}</p>
                </div>
                {todayReflection.doc_link && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wide mb-0.5">Doc</p>
                    <a href={todayReflection.doc_link} target="_blank" rel="noopener noreferrer"
                      className="text-[13px] text-blue-600 hover:underline underline-offset-2 break-all">
                      {todayReflection.doc_link}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <Link href="/report" className="block">
              <div className="rounded-2xl bg-white border border-[#e8e8e8] px-5 py-4 flex items-center justify-between hover:border-[#0f0f0f] transition-colors"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div>
                  <p className="text-[13px] font-semibold text-[#0f0f0f]">View weekly report →</p>
                  <p className="text-[12px] text-[#737373] mt-0.5">Auto-generated from your sprint.</p>
                </div>
              </div>
            </Link>

            <Link href="/dashboard"
              className="flex items-center justify-center text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] transition-colors py-2">
              ← Back to home
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
            <SprintReflectionForm userId={user!.uid} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReflectionPage() {
  return (
    <AuthGuard>
      <ReflectionContent />
    </AuthGuard>
  );
}
