'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import { getUserTeams, getTeamByInviteCode } from '@/lib/team-queries';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Team } from '@/types';

function TeamHubContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    getUserTeams(user.uid)
      .then((t) => setTeams(t))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  async function handleJoinCode(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setCodeError('');
    setChecking(true);
    try {
      const team = await getTeamByInviteCode(code.trim().toLowerCase());
      if (!team) {
        setCodeError('No team found with that code.');
        return;
      }
      router.push(`/join/${team.invite_code}`);
    } catch {
      setCodeError('Something went wrong. Try again.');
    } finally {
      setChecking(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5]">
        <Navbar />
        <div className="flex justify-center py-20">
          <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-xl mx-auto px-5 pt-10 pb-16">

        <div className="mb-8 space-y-1">
          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Teams</p>
          <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">Your teams.</h1>
          <p className="text-[13px] text-[#737373]">Create a team or join one with an invite code.</p>
        </div>

        <div className="space-y-3">

          {/* Existing teams list */}
          {teams.length > 0 && (
            <div className="space-y-2">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/team/${team.id}`}
                  className="flex items-center justify-between rounded-2xl bg-white border border-[#e8e8e8] px-5 py-4 hover:border-[#0f0f0f] transition-colors"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
                >
                  <div>
                    <p className="text-[14px] font-semibold text-[#0f0f0f]">{team.name}</p>
                    {team.standup_deadline && (
                      <p className="text-[12px] text-[#737373] mt-0.5">Deadline {team.standup_deadline}</p>
                    )}
                  </div>
                  <span className="text-[#aaa] text-[13px]">→</span>
                </Link>
              ))}
            </div>
          )}

          {/* Create team CTA */}
          <Link href="/team/new"
            className="block rounded-2xl bg-[#0f0f0f] px-6 py-5 hover:bg-[#262626] transition-colors"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <p className="text-[15px] font-semibold text-white">Create a team →</p>
            <p className="text-[13px] text-white/50 mt-0.5">Set up a team and invite your people.</p>
          </Link>

          {/* Join with code */}
          <div className="rounded-2xl bg-white border border-[#e8e8e8] px-6 py-5"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p className="text-[13px] font-semibold text-[#0f0f0f] mb-3">Join with invite code</p>
            <form onSubmit={handleJoinCode} className="space-y-2.5">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. a3f9b2"
                className="w-full rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-2.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:bg-white focus:border-[#0f0f0f] transition-all font-mono"
              />
              {codeError && (
                <p className="text-[12px] text-red-500">{codeError}</p>
              )}
              <button
                type="submit"
                disabled={checking || !code.trim()}
                className="w-full py-2.5 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-40"
              >
                {checking ? 'Looking up...' : 'Join team'}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <AuthGuard>
      <TeamHubContent />
    </AuthGuard>
  );
}
