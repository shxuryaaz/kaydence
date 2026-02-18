'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import {
  getTeamByInviteCode,
  getTeamMemberCount,
  isUserInTeam,
  joinTeam,
} from '@/lib/team-queries';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Team } from '@/types';

function JoinTeamContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const inviteCode = params.inviteCode as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    async function load() {
      try {
        const foundTeam = await getTeamByInviteCode(inviteCode);
        if (!foundTeam) { setInvalid(true); return; }

        const [count, isMember] = await Promise.all([
          getTeamMemberCount(foundTeam.id),
          isUserInTeam(user!.uid, foundTeam.id),
        ]);

        setTeam(foundTeam);
        setMemberCount(count);
        setAlreadyMember(isMember);
      } catch {
        setInvalid(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, inviteCode]);

  async function handleJoin() {
    if (!user || !team) return;
    setJoining(true);
    try {
      await joinTeam(team.id, user.uid);
      router.replace(`/team/${team.id}`);
    } catch (err) {
      console.error('Join failed:', err);
      setJoining(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-xl mx-auto px-5 pt-10 pb-16">

        <div className="mb-8 space-y-1">
          <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Teams</p>
          <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">Join a team.</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invalid ? (
          <div className="rounded-2xl bg-white border border-[#e8e8e8] px-6 py-8 text-center"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p className="text-[32px] mb-3">🔍</p>
            <p className="text-[15px] font-semibold text-[#0f0f0f] mb-1">Invalid invite link.</p>
            <p className="text-[13px] text-[#737373] mb-5">
              This code doesn't match any team. Ask the team owner for a new link.
            </p>
            <Link href="/team"
              className="inline-flex items-center px-4 py-2 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-full hover:bg-[#262626] transition-colors">
              Go to Teams
            </Link>
          </div>
        ) : team && alreadyMember ? (
          <div className="rounded-2xl bg-white border border-emerald-200 px-6 py-6 space-y-4"
            style={{ boxShadow: '0 1px 4px rgba(16,185,129,0.08)' }}>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
              ✓ Already a member
            </span>
            <div>
              <p className="text-[18px] font-bold text-[#0f0f0f] tracking-tight">{team.name}</p>
              <p className="text-[13px] text-[#737373] mt-0.5">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
            </div>
            <Link href={`/team/${team.id}`}
              className="inline-flex items-center px-5 py-2.5 bg-[#0f0f0f] text-white text-[13px] font-semibold rounded-full hover:bg-[#262626] transition-colors">
              Go to team dashboard →
            </Link>
          </div>
        ) : team ? (
          <div className="rounded-2xl bg-white border border-[#e8e8e8] px-6 py-6 space-y-5"
            style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}>
            <div>
              <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wide mb-1.5">You're invited to</p>
              <p className="text-[22px] font-bold text-[#0f0f0f] tracking-tight">{team.name}</p>
              <p className="text-[13px] text-[#737373] mt-1">
                {memberCount} member{memberCount !== 1 ? 's' : ''}
                {team.standup_deadline && ` · Daily deadline ${team.standup_deadline}`}
              </p>
            </div>

            <div className="space-y-2 text-[13px] text-[#737373]">
              <p>✓ Daily standup check-ins</p>
              <p>✓ Saturday sprint reflections</p>
              <p>✓ See your whole team's progress</p>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-3 bg-[#0f0f0f] hover:bg-[#262626] text-white text-[14px] font-semibold rounded-xl transition-colors disabled:opacity-40"
            >
              {joining ? 'Joining...' : `Join ${team.name} →`}
            </button>
          </div>
        ) : null}

        <Link href="/team"
          className="flex items-center justify-center text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] transition-colors py-4 mt-2">
          ← Back to Teams
        </Link>
      </div>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <AuthGuard>
      <JoinTeamContent />
    </AuthGuard>
  );
}
