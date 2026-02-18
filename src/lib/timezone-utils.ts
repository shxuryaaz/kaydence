/**
 * Timezone utilities for Kaydence team standup deadlines.
 *
 * Storage format: UTC "HH:MM:SS" string in teams.standup_deadline_utc
 * Display format: Viewer's local time, computed at runtime in the browser
 *
 * NEVER store wall-clock times without converting to UTC first.
 */

/**
 * Converts a stored UTC time string to a human-readable local time string.
 * Uses the current viewer's browser timezone automatically.
 *
 * @param utcTimeStr - "HH:MM:SS" or "HH:MM" in UTC
 * @returns e.g. "6:30 PM IST" or "5:00 AM PST"
 *
 * @example
 * utcTimeToLocalDisplay("13:00:00") // → "6:30 PM IST" for a viewer in IST
 * utcTimeToLocalDisplay("13:00:00") // → "5:00 AM PST" for a viewer in PST
 */
export function utcTimeToLocalDisplay(utcTimeStr: string): string {
  const [hours, minutes] = utcTimeStr.split(":").map(Number);
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes ?? 0, 0)
  );
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

/**
 * Converts a local time string (from <input type="time">) to a UTC time string for storage.
 * Uses the current viewer's browser timezone automatically.
 *
 * @param localTimeStr - "HH:MM" in the user's local timezone (from <input type="time">)
 * @returns "HH:MM:00" in UTC
 *
 * @example
 * // Called from a browser in IST (UTC+5:30):
 * localTimeToUtc("18:30") // → "13:00:00"
 *
 * // Called from a browser in PST (UTC-8):
 * localTimeToUtc("18:30") // → "02:30:00" (next day UTC, but stored as time only)
 */
export function localTimeToUtc(localTimeStr: string): string {
  const [hours, minutes] = localTimeStr.split(":").map(Number);
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes ?? 0, 0);
  const utcH = d.getUTCHours().toString().padStart(2, "0");
  const utcM = d.getUTCMinutes().toString().padStart(2, "0");
  return `${utcH}:${utcM}:00`;
}

/**
 * Converts a stored UTC time string to a "HH:MM" value suitable for <input type="time">.
 * Shows the time in the viewer's local timezone.
 *
 * @param utcTimeStr - "HH:MM:SS" in UTC
 * @returns "HH:MM" in local time
 *
 * @example
 * // In IST browser:
 * utcTimeToLocalInputValue("13:00:00") // → "18:30"
 */
export function utcTimeToLocalInputValue(utcTimeStr: string): string {
  const [hours, minutes] = utcTimeStr.split(":").map(Number);
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes ?? 0, 0)
  );
  const localH = d.getHours().toString().padStart(2, "0");
  const localM = d.getMinutes().toString().padStart(2, "0");
  return `${localH}:${localM}`;
}

/**
 * Returns today's date as a "YYYY-MM-DD" UTC string.
 * Use this for all "today's standup" queries — never use local date.
 */
export function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Returns the Monday of the current UTC week as "YYYY-MM-DD".
 * Used for week-based report queries.
 */
export function currentWeekStartUtc(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diff);
  return monday.toISOString().split("T")[0];
}
