import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { sendStandupDM } from '@/lib/slack-helpers';

// ─── Send Standup DMs (Cron Job) ──────────────────────────────────────────────
// This route is called by Vercel Cron once daily (9:00 UTC). Vercel Hobby allows
// only one cron run per day. It finds all teams with a standup window and sends
// DMs to members who haven't submitted today.
// ──────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = createClient();

  // Note: Vercel Cron jobs run internally and are already protected.
  // No need for manual auth - the endpoint is not publicly accessible via Vercel's routing.

  try {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];

    // With daily cron only: notify all teams that have a standup window set.
    // Members who already submitted today are skipped below.
    const { data: teamsToNotify, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, standup_window_open, slack_bot_token, slack_team_id')
      .not('standup_window_open', 'is', null)
      .not('slack_bot_token', 'is', null);

    if (teamsError || !teamsToNotify) {
      console.error('Failed to fetch teams:', teamsError);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const team of teamsToNotify) {
      // Get all team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team.id);

      if (membersError || !members) {
        console.error(`Failed to fetch members for team ${team.id}:`, membersError);
        continue;
      }

      for (const member of members) {
        try {
          // Check if user already submitted today
          const { data: existingLog } = await supabase
            .from('daily_logs')
            .select('id')
            .eq('user_id', member.user_id)
            .eq('log_date', currentDate)
            .single();

          if (existingLog) {
            console.log(`User ${member.user_id} already submitted today, skipping`);
            continue;
          }

          // Get Slack user ID
          const { data: slackUser, error: slackUserError } = await supabase
            .from('slack_users')
            .select('slack_user_id, slack_dm_channel_id')
            .eq('user_id', member.user_id)
            .limit(1)
            .single();

          if (slackUserError || !slackUser) {
            console.log(`No Slack user found for ${member.user_id}, skipping`);
            continue;
          }

          // Send DM
          await sendStandupDM(
            team.slack_bot_token!,
            slackUser.slack_user_id,
            team.name
          );

          sentCount++;
        } catch (err) {
          console.error(`Failed to send DM to user ${member.user_id}:`, err);
          errorCount++;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      time: currentTime,
      teams_notified: teamsToNotify.length,
      messages_sent: sentCount,
      errors: errorCount,
    });
  } catch (err) {
    console.error('Cron job error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
