import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// PATCH /api/team/[teamId]/settings – update standup window (service role, owner-only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server configuration error. SUPABASE_SERVICE_ROLE_KEY required.' },
      { status: 500 }
    );
  }

  let body: {
    standup_window_open?: string | null;
    standup_window_close?: string | null;
    disconnect_slack?: boolean;
    user_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const userId = body.user_id;
  if (!userId) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const { data: team, error: fetchError } = await supabase
    .from('teams')
    .select('owner_id')
    .eq('id', teamId)
    .single();

  if (fetchError || !team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }
  if (team.owner_id !== userId) {
    return NextResponse.json({ error: 'Only the team owner can update settings' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (body.standup_window_open !== undefined) updates.standup_window_open = body.standup_window_open || null;
  if (body.standup_window_close !== undefined) updates.standup_window_close = body.standup_window_close || null;
  if (body.disconnect_slack) {
    updates.slack_team_id = null;
    updates.slack_bot_token = null;
    updates.slack_channel_id = null;
  }

  const { error: updateError } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId);

  if (updateError) {
    console.error('Team settings update failed:', updateError);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }

  if (body.disconnect_slack) {
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId);
    if (members && members.length > 0) {
      const userIds = members.map((m) => m.user_id);
      await supabase.from('slack_users').delete().in('user_id', userIds);
    }
  }

  return NextResponse.json({ ok: true });
}
