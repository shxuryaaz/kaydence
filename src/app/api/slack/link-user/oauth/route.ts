import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { createServerClient } from '@/lib/supabase';

// GET /api/slack/link-user/oauth
// Slack OAuth callback for per-user linking.
// state = `${teamId}:${userId}`
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  const redirectToSettings = (teamId: string, query: string) =>
    NextResponse.redirect(new URL(`/team/${teamId}/settings?${query}`, request.url));

  // If Slack denied the request
  if (error) {
    const teamId = state?.split(':')[0] || '';
    if (!teamId) {
      return NextResponse.redirect(new URL(`/team?slack_link_error=link_denied`, request.url));
    }
    return redirectToSettings(teamId, 'slack_link_error=link_denied');
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL(`/team?slack_link_error=link_missing_params`, request.url));
  }

  const [teamId, userId] = state.split(':');
  if (!teamId || !userId) {
    return redirectToSettings(teamId || '', 'slack_link_error=link_missing_params');
  }

  if (!supabase) {
    return redirectToSettings(teamId, 'slack_link_error=link_failed');
  }

  try {
    const origin = url.origin;
    const redirectUri = `${origin}/api/slack/link-user/oauth`;

    const client = new WebClient();
    const result = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: redirectUri,
    });

    if (!result.ok || !result.authed_user?.id) {
      throw new Error('Invalid OAuth response from Slack');
    }

    const slackUserId = result.authed_user.id as string;

    // Ensure the user is actually a member of this team
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError || !member) {
      return redirectToSettings(teamId, 'slack_link_error=link_failed');
    }

    // Fetch team Slack bot token
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('slack_bot_token')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError || !team || !team.slack_bot_token) {
      return redirectToSettings(teamId, 'slack_link_error=link_failed');
    }

    const botClient = new WebClient(team.slack_bot_token as string);

    // Open or get DM channel with this Slack user
    const resp = await botClient.conversations.open({ users: slackUserId });
    if (!resp.ok || !resp.channel || !('id' in resp.channel) || !resp.channel.id) {
      throw new Error('Slack did not return a DM channel');
    }
    const dmChannelId = resp.channel.id as string;

    const { error: upsertError } = await supabase
      .from('slack_users')
      .upsert(
        {
          user_id: userId,
          slack_user_id: slackUserId,
          slack_dm_channel_id: dmChannelId,
        },
        { onConflict: 'user_id,slack_user_id' },
      );

    if (upsertError) {
      console.error('Failed to upsert slack_users:', upsertError);
      return redirectToSettings(teamId, 'slack_link_error=link_failed');
    }

    return redirectToSettings(teamId, 'slack_linked=1');
  } catch (err) {
    console.error('Slack link-user OAuth error:', err);
    return redirectToSettings(teamId, 'slack_link_error=link_failed');
  }
}

