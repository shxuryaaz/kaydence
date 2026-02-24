import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { createServerClient, createClient } from '@/lib/supabase';

// ─── Slack OAuth Callback ─────────────────────────────────────────────────────
// This route handles the OAuth callback after a team owner connects Slack.
// Flow: User clicks "Connect Slack" → Slack OAuth page → redirects here with code
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Use service role so the update succeeds even if RLS is enabled on teams
  const supabase = createServerClient();
  if (!supabase) {
    console.error('Slack OAuth: SUPABASE_SERVICE_ROLE_KEY is not set. Add it in Vercel env vars.');
    const state = new URL(request.url).searchParams.get('state') || '';
    return NextResponse.redirect(
      new URL(`/team/${state}/settings?slack_error=service_role_required`, request.url)
    );
  }
  const { searchParams } = new URL(request.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state'); // state = teamId
  const error = searchParams.get('error');

  // Handle OAuth denial
  if (error) {
    return NextResponse.redirect(
      new URL(`/team/${state}/settings?slack_error=denied`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`/team/${state}/settings?slack_error=missing_params`, request.url)
    );
  }

  const teamId = state;

  try {
    // Exchange authorization code for access token
    const client = new WebClient();
    const result = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
    });

    if (!result.ok || !result.access_token || !result.team?.id) {
      throw new Error('Invalid OAuth response from Slack');
    }

    const botToken = result.access_token;
    const slackTeamId = result.team.id;
    const slackTeamName = result.team.name;

    // Update team with Slack credentials
    const { error: updateError } = await supabase
      .from('teams')
      .update({
        slack_team_id: slackTeamId,
        slack_bot_token: botToken, // TODO: Encrypt in production
      })
      .eq('id', teamId);

    if (updateError) {
      console.error('Failed to save Slack credentials:', updateError);
      return NextResponse.redirect(
        new URL(`/team/${teamId}/settings?slack_error=db_error`, request.url)
      );
    }

    // Success! Redirect back to settings with success message
    return NextResponse.redirect(
      new URL(`/team/${teamId}/settings?slack_connected=${slackTeamName}`, request.url)
    );
  } catch (err) {
    console.error('Slack OAuth error:', err);
    return NextResponse.redirect(
      new URL(`/team/${teamId}/settings?slack_error=oauth_failed`, request.url)
    );
  }
}
