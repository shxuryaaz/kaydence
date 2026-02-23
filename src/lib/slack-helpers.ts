import { WebClient } from '@slack/web-api';
import crypto from 'crypto';

// ─── Send standup DM ──────────────────────────────────────────────────────────
export async function sendStandupDM(
  botToken: string,
  slackUserId: string,
  teamName: string
): Promise<void> {
  const client = new WebClient(botToken);

  const message = {
    channel: slackUserId,
    text: `Time for your daily standup with ${teamName}!`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🏁 ${teamName} Standup`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Reply to this message with your standup update in this format:\n\n*1.* What you worked on\n*2.* What\'s next\n*3.* Blockers (or "none")\n*4.* Score (1-5)',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Example: ```1. Fixed the login bug\n2. Dashboard redesign\n3. None\n4. 4```',
          },
        ],
      },
    ],
  };

  await client.chat.postMessage(message);
}

// ─── Parse standup response ───────────────────────────────────────────────────
export interface ParsedStandup {
  worked_on: string;
  working_next: string;
  blockers: string;
  score: number;
}

export function parseStandupMessage(text: string): ParsedStandup | null {
  try {
    const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean);

    // Find lines starting with 1., 2., 3., 4.
    const workedOn = lines.find((l) => /^1\.\s/.test(l))?.replace(/^1\.\s*/, '').trim();
    const workingNext = lines.find((l) => /^2\.\s/.test(l))?.replace(/^2\.\s*/, '').trim();
    const blockers = lines.find((l) => /^3\.\s/.test(l))?.replace(/^3\.\s*/, '').trim();
    const scoreStr = lines.find((l) => /^4\.\s/.test(l))?.replace(/^4\.\s*/, '').trim();

    if (!workedOn || !workingNext || !scoreStr) return null;

    const score = parseInt(scoreStr, 10);
    if (isNaN(score) || score < 1 || score > 5) return null;

    return {
      worked_on: workedOn,
      working_next: workingNext,
      blockers: blockers || 'None',
      score,
    };
  } catch {
    return null;
  }
}

// ─── Verify Slack signature ───────────────────────────────────────────────────
export function verifySlackSignature(
  signingSecret: string,
  requestBody: string,
  timestamp: string,
  signature: string
): boolean {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  const requestTimestamp = parseInt(timestamp, 10);

  if (requestTimestamp < fiveMinutesAgo) {
    return false; // Replay attack protection
  }

  const sigBaseString = `v0:${timestamp}:${requestBody}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBaseString)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}

// ─── Get user info ─────────────────────────────────────────────────────────────
export async function getSlackUserInfo(botToken: string, slackUserId: string) {
  const client = new WebClient(botToken);
  const result = await client.users.info({ user: slackUserId });
  return result.user;
}
