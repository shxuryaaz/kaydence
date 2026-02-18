'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import { createTeam } from '@/lib/team-queries';
import { isSupabaseConfigured } from '@/lib/supabase';

function CreateTeamContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !name.trim()) return;
    if (!isSupabaseConfigured()) {
      setError('Database not configured. Add Supabase keys to .env.local.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const team = await createTeam(user.uid, name.trim(), deadline || undefined);
      router.replace(`/team/${team.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-xl mx-auto px-5 pt-10 pb-16">

        <div className="mb-8 space-y-1">
          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Teams</p>
          <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">Create a team.</h1>
          <p className="text-[13px] text-[#737373]">You'll get an invite link to share with your team.</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6"
          style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#0f0f0f]">Team name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Founding Team"
                required
                className="w-full rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:bg-white focus:border-[#0f0f0f] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-[#0f0f0f]">
                Standup deadline
                <span className="text-[#aaa] font-normal ml-1">(optional)</span>
              </label>
              <p className="text-[12px] text-[#737373]">
                Members who miss this time will be marked "Late" on the team dashboard.
              </p>
              <input
                type="time"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-2.5 text-[13px] text-[#0f0f0f] focus:outline-none focus:bg-white focus:border-[#0f0f0f] transition-all"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5">
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full py-2.5 bg-[#0f0f0f] hover:bg-[#262626] text-white text-[13px] font-medium rounded-xl transition-colors disabled:opacity-40"
            >
              {submitting ? 'Creating...' : 'Create team →'}
            </button>
          </form>
        </div>

        <Link href="/team"
          className="flex items-center justify-center text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] transition-colors py-4 mt-2">
          ← Back
        </Link>
      </div>
    </div>
  );
}

export default function NewTeamPage() {
  return (
    <AuthGuard>
      <CreateTeamContent />
    </AuthGuard>
  );
}
