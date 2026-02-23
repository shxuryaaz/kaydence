import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { createClient } from '@/lib/supabase';
import { verifySlackSignature, parseStandupMessage } from '@/lib/slack-helpers';

// ─── Slack Events Webhook ─────────────────────────────────────────────────────
// This route receives events from Slack (DM replies from team members).
// When a user replies to the standup DM, we parse it and save to daily_logs.
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = createClient();

  // Get raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('x-slack-signature');
  const timestamp = request.headers.get('x-slack-request-timestamp');

  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
  }

  // Verify request is from Slack
  const isValid = verifySlackSignature(
    process.env.SLACK_SIGNING_SECRET!,
    body,
    timestamp,
    signature
  );

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(body);

  // Handle URL verification challenge (Slack sends this when configuring webhook)
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Handle message events
  if (payload.type === 'event_callback' && payload.event.type === 'message') {
    const event = payload.event;

    // Ignore bot messages, edits, and threaded replies
    if (event.bot_id || event.subtype || event.thread_ts) {
      return NextResponse.json({ ok: true });
    }

    const slackUserId = event.user;
    const messageText = event.text;
    const channelId = event.channel; // DM channel ID

    try {
      // Look up Kaydence user from Slack user ID
      const { data: slackUserData, error: slackUserError } = await supabase
        .from('slack_users')
        .select('user_id')
        .eq('slack_user_id', slackUserId)
        .single();

      if (slackUserError || !slackUserData) {
        console.error('Slack user not found:', slackUserId);
        return NextResponse.json({ ok: true }); // Silent fail
      }

      const userId = slackUserData.user_id;

      // Parse standup message
      const parsed = parseStandupMessage(messageText);

      if (!parsed) {
        // Invalid format - send help message
        const { data: teamData } = await supabase
          .from('slack_users')
          .select('user_id')
          .eq('slack_user_id', slackUserId)
          .single();

        if (teamData) {
          const { data: teams } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', teamData.user_id)
            .limit(1)
            .single();

          if (teams) {
            const { data: team } = await supabase
              .from('teams')
              .select('slack_bot_token')
              .eq('id', teams.team_id)
              .single();

            if (team?.slack_bot_token) {
              const client = new WebClient(team.slack_bot_token);
              await client.chat.postMessage({
                channel: slackUserId,
                text: "❌ Invalid format. Please reply with:\n\n1. What you worked on\n2. What's next\n3. Blockers (or \"none\")\n4. Score (1-5)\n\nExample:\n```1. Fixed the login bug\n2. Dashboard redesign\n3. None\n4. 4```",
              });
            }
          }
        }

        return NextResponse.json({ ok: true });
      }

      // Save standup to database
      const today = new Date().toISOString().split('T')[0];

      const { error: insertError } = await supabase
        .from('daily_logs')
        .upsert(
          {
            user_id: userId,
            log_date: today,
            worked_on: parsed.worked_on,
            working_next: parsed.working_next,
            blockers: parsed.blockers,
            score: parsed.score,
            submitted_at: new Date().toISOString(),
            submitted_via: 'slack',
          },
          { onConflict: 'user_id,log_date' }
        );

      if (insertError) {
        console.error('Failed to save standup:', insertError);
        return NextResponse.json({ ok: true }); // Silent fail
      }

      // Send confirmation message
      const { data: teamData2 } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (teamData2) {
        const { data: team } = await supabase
          .from('teams')
          .select('slack_bot_token')
          .eq('id', teamData2.team_id)
          .single();

        if (team?.slack_bot_token) {
          const client = new WebClient(team.slack_bot_token);
          await client.chat.postMessage({
            channel: slackUserId,
            text: `✅ Standup recorded! Score: ${parsed.score}/5`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `✅ *Standup recorded!*\n\nScore: *${parsed.score}/5*\nYour team can see this on the dashboard.`,
                },
              },
            ],
          });
        }
      }

      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('Error processing Slack message:', err);
      return NextResponse.json({ ok: true }); // Always return 200 to Slack
    }
  }

  return NextResponse.json({ ok: true });
}
