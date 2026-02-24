import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { createServerClient } from '@/lib/supabase';

// POST /api/slack/link-user
// Body: { team_id, user_id, slack_user_id }
// Links a Kaydence user to a Slack user and opens a DM channel.
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server configuration error. SUPABASE_SERVICE_ROLE_KEY required.' },
      { status: 500 },
    );
  }

  let body: { team_id?: string; user_id?: string; slack_user_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const teamId = body.team_id;
  const userId = body.user_id;
  const slackUserId = body.slack_user_id;

  if (!teamId || !userId || !slackUserId) {
    return NextResponse.json({ error: 'team_id, user_id and slack_user_id are required' }, { status: 400 });
  }

  // Ensure the user is actually a member of this team
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError || !member) {
    return NextResponse.json({ error: 'You are not a member of this team' }, { status: 403 });
  }

  // Fetch team Slack bot token
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('slack_bot_token')
    .eq('id', teamId)
    .maybeSingle();

  if (teamError || !team || !team.slack_bot_token) {
    return NextResponse.json({ error: 'Team is not connected to Slack' }, { status: 400 });
  }

  const client = new WebClient(team.slack_bot_token as string);

  // Open or get DM channel with this Slack user
  let dmChannelId: string | null = null;
  try {
    const resp = await client.conversations.open({ users: slackUserId });
    if (!resp.ok || !resp.channel || !('id' in resp.channel) || !resp.channel.id) {
      throw new Error('Slack did not return a DM channel');
    }
    dmChannelId = resp.channel.id as string;
  } catch (err) {
    console.error('Slack conversations.open error:', err);
    return NextResponse.json(
      { error: 'Failed to open DM with this Slack user. Check the Slack user ID and app scopes.' },
      { status: 400 },
    );
  }

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
    return NextResponse.json({ error: 'Failed to link Slack account' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slack_dm_channel_id: dmChannelId });
}

