/**
 * liveWindow — decides WHEN the schedule should poll ESPN for live scores.
 *
 * Pure function (no React) so it's unit-testable. Used by useLiveScores.
 *
 * A game is "watch-worthy" if it is:
 *   • live right now (`state === 'in'`), OR
 *   • still listed as upcoming (`'pre'`) but its kickoff is within the next
 *     KICKOFF_LEAD_MS, or kickoff has passed less than LATE_START_GRACE_MS ago.
 *     NFL games routinely start a few minutes after the listed time, and ESPN
 *     can lag flipping "pre" → "in", so we keep watching through that gap.
 *
 * Finished games (`'post'`) never trigger polling.
 */

import type { Matchup } from '@/lib/schedule';

/** Start watching this long before a listed kickoff. */
export const KICKOFF_LEAD_MS = 10 * 60_000; // 10 min
/** Keep watching a still-"pre" game this long after its listed kickoff (delays). */
export const LATE_START_GRACE_MS = 3 * 60 * 60_000; // 3 h

type LiveCheckGame = Pick<Matchup, 'state' | 'kickoff'>;

export function shouldPollLive(matchups: readonly LiveCheckGame[], nowMs: number): boolean {
  return matchups.some((m) => {
    if (m.state === 'in') return true;
    if (m.state !== 'pre') return false;
    // `kickoff` is a Date in app state; tolerate a serialized string just in case.
    const kickoffMs = new Date(m.kickoff).getTime();
    if (!Number.isFinite(kickoffMs)) return false;
    return nowMs >= kickoffMs - KICKOFF_LEAD_MS && nowMs <= kickoffMs + LATE_START_GRACE_MS;
  });
}
