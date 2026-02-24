'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [windowOpen, setWindowOpen] = useState('');
  const [windowClose, setWindowClose] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [slackUserId, setSlackUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    // Check for OAuth + link callback messages
    const slackConnected = searchParams.get('slack_connected');
    const slackError = searchParams.get('slack_error');
    const slackLinked = searchParams.get('slack_linked');
    const slackLinkError = searchParams.get('slack_link_error');

    if (slackConnected) {
      setSuccess(`Successfully connected to Slack workspace: ${slackConnected}`);
      setTimeout(() => setSuccess(''), 5000);
    } else if (slackLinked) {
      setSuccess('Your Slack account is linked. You will receive standup DMs.');
      setTimeout(() => setSuccess(''), 5000);
    } else if (slackError || slackLinkError) {
      const errorMessages: Record<string, string> = {
        denied: 'Slack authorization was denied.',
        missing_params: 'Invalid OAuth callback parameters.',
        db_error: 'Failed to save Slack credentials to database. Add SUPABASE_SERVICE_ROLE_KEY in Vercel and ensure the teams table allows updates.',
        service_role_required: 'Server config missing: add SUPABASE_SERVICE_ROLE_KEY in Vercel project environment variables, then try connecting again.',
        oauth_failed: 'Slack OAuth failed. Please try again.',
        link_denied: 'Slack linking was denied.',
        link_missing_params: 'Invalid Slack link callback parameters.',
        link_failed: 'Slack linking failed. Please try again.',
      };
      const code = slackError || slackLinkError || '';
      setError(errorMessages[code] || 'An unknown error occurred.');
      setTimeout(() => setError(''), 5000);
    }

    Promise.all([getTeamById(teamId), isUserInTeam(user.uid, teamId)])
      .then(async ([teamData, inTeam]) => {
        if (!teamData || !inTeam) {
          router.replace('/team');
          return;
        }
        setTeam(teamData);
        setWindowOpen(teamData.standup_window_open || '');
        setWindowClose(teamData.standup_window_close || '');

        // Check if this user already has a linked Slack account
        try {
          const { data } = await supabase
            .from('slack_users')
            .select('slack_user_id')
            .eq('user_id', user.uid)
            .limit(1)
            .maybeSingle();

          if (data?.slack_user_id) {
            setSlackUserId(data.slack_user_id);
          }
        } catch {
          // best-effort only
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, teamId, router, searchParams]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!team || !user) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`/api/team/${teamId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standup_window_open: windowOpen || null,
          standup_window_close: windowClose || null,
          user_id: user.uid,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleConnectSlack() {
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
    if (!clientId) {
      setError('Slack app not configured. Add NEXT_PUBLIC_SLACK_CLIENT_ID to environment variables.');
      return;
    }

    const redirectUri = `${window.location.origin}/api/slack/oauth`;
    const scope = 'chat:write,im:write,users:read,channels:read';
    const state = teamId; // Pass team ID as state

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    window.location.href = slackAuthUrl;
  }

  async function handleDisconnect() {
    if (!team || !user || !confirm('Disconnect Slack? Team members will stop receiving standup DMs.')) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`/api/team/${teamId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disconnect_slack: true, user_id: user.uid }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Disconnect failed');
      }

      setSuccess('Slack disconnected successfully');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect Slack. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleLinkSlack() {
    if (!team || !user) return;
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID;
    if (!clientId) {
      setError('Slack app not configured. Add NEXT_PUBLIC_SLACK_CLIENT_ID to environment variables.');
      return;
    }

    setLinking(true);
    const redirectUri = `${window.location.origin}/api/slack/link-user/oauth`;
    const scope = 'chat:write,im:write,users:read,channels:read';
    const state = `${teamId}:${user.uid}`;
    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    window.location.href = slackAuthUrl;
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

            {/* Slack Integration */}
            <div className="bg-white rounded-2xl border border-[#e8e8e8] p-6 space-y-4"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div>
                <h2 className="text-[15px] font-semibold text-[#0f0f0f] mb-1">Slack Integration</h2>
                <p className="text-[12px] text-[#737373]">
                  Connect your Slack workspace, then link your own Slack account to receive standup DMs.
                </p>
              </div>

              {team.slack_team_id ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px]">✅</span>
                      <p className="text-[13px] text-[#0f0f0f] font-medium">Workspace connected</p>
                    </div>
                    <p className="text-[11px] text-[#737373]">
                      Daily standup DMs are sent from this Slack workspace at the window open time.
                    </p>
                    {isOwner && (
                      <button
                        onClick={handleDisconnect}
                        disabled={saving}
                        className="px-4 py-2 bg-red-600 text-white text-[13px] font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50">
                        {saving ? 'Disconnecting...' : 'Disconnect Slack'}
                      </button>
                    )}
                  </div>

                  <div className="border-t border-[#f0f0f0] pt-4 space-y-2">
                    <p className="text-[12px] font-semibold text-[#0f0f0f]">Your Slack account</p>
                    {slackUserId ? (
                      <p className="text-[12px] text-[#737373]">
                        Linked as{' '}
                        <code className="px-1.5 py-0.5 rounded-md bg-[#f5f5f5] border border-[#e5e5e5] text-[11px]">
                          {slackUserId}
                        </code>. You&apos;ll receive standup DMs in Slack.
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px] text-[#737373]">
                          Click below to link your Slack account. You&apos;ll be taken to Slack to authorize, then
                          redirected back here.
                        </p>
                        <button
                          type="button"
                          onClick={handleLinkSlack}
                          disabled={linking}
                          className="w-full py-2.5 bg-[#0f0f0f] text-white text-[13px] font-medium rounded-xl hover:bg-[#262626] transition-colors disabled:opacity-40"
                        >
                          {linking ? 'Opening Slack…' : 'Link my Slack account with Slack'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {isOwner ? (
                    <button
                      onClick={handleConnectSlack}
                      className="w-full py-3 bg-[#4A154B] text-white text-[13px] font-semibold rounded-xl hover:bg-[#611f69] transition-colors flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 127 127" fill="none">
                        <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z" fill="#E01E5A"/>
                        <path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z" fill="#36C5F0"/>
                        <path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z" fill="#2EB67D"/>
                        <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z" fill="#ECB22E"/>
                      </svg>
                      <span>Connect Slack Workspace</span>
                    </button>
                  ) : (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                      <p className="text-[13px] text-amber-800">Only the team owner can connect Slack.</p>
                    </div>
                  )}
                  <p className="text-[11px] text-[#737373]">
                    After your team owner connects Slack, you&apos;ll be able to link your own Slack account here.
                  </p>
                </>
              )}
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
      <Suspense fallback={
        <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-[#0f0f0f] border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <SettingsContent />
      </Suspense>
    </AuthGuard>
  );
}
