'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AuthGuard from '@/components/AuthGuard';
import Navbar from '@/components/Navbar';
import { getTeamById, isUserInTeam } from '@/lib/team-queries';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Team } from '@/types';

function SettingsContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [windowOpen, setWindowOpen] = useState('');
  const [windowClose, setWindowClose] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    Promise.all([getTeamById(teamId), isUserInTeam(user.uid, teamId)])
      .then(([teamData, inTeam]) => {
        if (!teamData || !inTeam) {
          router.replace('/team');
          return;
        }
        setTeam(teamData);
        setWindowOpen(teamData.standup_window_open || '');
        setWindowClose(teamData.standup_window_close || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, teamId, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!team) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          standup_window_open: windowOpen || null,
          standup_window_close: windowClose || null,
        })
        .eq('id', teamId);

      if (updateError) throw updateError;

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to save settings. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const isOwner = team?.owner_id === user?.uid;

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Navbar />
      <div className="max-w-xl mx-auto px-5 pt-10 pb-16">

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !team ? null : (
          <div className="space-y-6">
            {/* Header */}
            <div className="space-y-1">
              <Link href={`/team/${teamId}`}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#737373] hover:text-[#0f0f0f] transition-colors mb-2">
                ← Back to {team.name}
              </Link>
              <p className="text-[11px] font-semibold text-[#aaa] uppercase tracking-wider">Team Settings</p>
              <h1 className="text-[26px] font-bold text-[#0f0f0f] tracking-tight">{team.name}</h1>
            </div>

            {!isOwner && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-[13px] text-amber-800">Only the team owner can modify settings.</p>
              </div>
            )}

            {/* Time Window Settings */}
            <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6 space-y-5"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div>
                <h2 className="text-[15px] font-semibold text-[#0f0f0f] mb-1">Standup Time Window</h2>
                <p className="text-[12px] text-[#737373]">
                  Set the daily window when team members should submit their check-ins.
                  Submissions outside this window will be marked as "Late".
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#0f0f0f] mb-2">
                      Opens at
                    </label>
                    <input
                      type="time"
                      value={windowOpen}
                      onChange={(e) => setWindowOpen(e.target.value)}
                      disabled={!isOwner}
                      className="w-full rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-2.5 text-[13px] text-[#0f0f0f] focus:outline-none focus:bg-white focus:border-[#0f0f0f] transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#0f0f0f] mb-2">
                      Closes at
                    </label>
                    <input
                      type="time"
                      value={windowClose}
                      onChange={(e) => setWindowClose(e.target.value)}
                      disabled={!isOwner}
                      className="w-full rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-3.5 py-2.5 text-[13px] text-[#0f0f0f] focus:outline-none focus:bg-white focus:border-[#0f0f0f] transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[#aaa] italic">
                  Leave both fields empty to disable the time window (no late tracking).
                </p>

                {success && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5">
                    <p className="text-[13px] text-emerald-700">✓ {success}</p>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5">
                    <p className="text-[13px] text-red-600">{error}</p>
                  </div>
                )}

                {isOwner && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-40"
                  >
                    {saving ? 'Saving...' : 'Save settings'}
                  </button>
                )}
              </form>
            </div>

            {/* Slack Integration (Phase 2 - placeholder) */}
            <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6 space-y-4"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div>
                <h2 className="text-[15px] font-semibold text-[#0f0f0f] mb-1">Slack Integration</h2>
                <p className="text-[12px] text-[#737373]">
                  Connect your Slack workspace to send standup DMs and collect responses automatically.
                </p>
              </div>

              {team.slack_team_id ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">✅</span>
                    <p className="text-[13px] text-[#0f0f0f]">Connected to Slack workspace</p>
                  </div>
                  {isOwner && (
                    <button
                      disabled
                      className="px-4 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg opacity-50 cursor-not-allowed">
                      Disconnect (Coming in Phase 2)
                    </button>
                  )}
                </div>
              ) : (
                <button
                  disabled
                  className="w-full py-3 bg-[#4A154B] text-white text-[13px] font-semibold rounded-xl opacity-50 cursor-not-allowed flex items-center justify-center gap-2">
                  <span>Connect Slack (Coming in Phase 2)</span>
                </button>
              )}

              <p className="text-[11px] text-[#bbb] italic">
                Slack integration will be available in the next release.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamSettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
