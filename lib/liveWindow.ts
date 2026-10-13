/**
 * liveWindow — decides WHEN the schedule should poll for live scores, and how
 * long the server may cache a scoreboard.
 *
 * Pure functions (no React) so they're unit-testable. `shouldPollLive` gates the
 * client poll (useLiveScores); `scoreboardTtlMs` sets the server cache TTL
 * (lib/espnLive.ts) from the same constants.
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

/** Server cache TTL for a scoreboard while any game is watch-worthy (= the client poll). */
export const LIVE_TTL_MS = 15_000;
/** Server cache TTL for a scoreboard with nothing live (capped by the next live window). */
export const IDLE_TTL_MS = 5 * 60_000;
/** Never cache for less than this (a window opening "now" still gets one shared fetch). */
const MIN_TTL_MS = 1_000;

/**
 * How long the server may cache a scoreboard (`/api/live/scoreboard`).
 * Live window → LIVE_TTL_MS. Otherwise IDLE_TTL_MS, capped so the copy goes
 * stale no later than the moment the next `pre` game's live window opens
 * (kickoff − KICKOFF_LEAD_MS) — an idle TTL can never delay a kickoff.
 */
export function scoreboardTtlMs(matchups: readonly LiveCheckGame[], nowMs: number): number {
  if (shouldPollLive(matchups, nowMs)) return LIVE_TTL_MS;
  let nextWindowStart = Infinity;
  for (const m of matchups) {
    if (m.state !== 'pre') continue;
    const kickoffMs = new Date(m.kickoff).getTime();
    if (!Number.isFinite(kickoffMs)) continue;
    const start = kickoffMs - KICKOFF_LEAD_MS;
    if (start > nowMs && start < nextWindowStart) nextWindowStart = start;
  }
  return Math.max(MIN_TTL_MS, Math.min(IDLE_TTL_MS, nextWindowStart - nowMs));
}
