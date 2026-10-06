/**
 * scheduleRefresh — merge a quietly re-fetched schedule week into the one
 * already on screen.
 *
 * WHY: ScheduleProvider loads each week once. A week loaded before ESPN posts
 * its betting lines would stay blank for the whole session (on the installed
 * iPhone app that can be days). The provider now re-fetches stale weeks when
 * the app returns to the foreground / the week scrolls into view, and this
 * pure function decides what the fresh copy is allowed to change.
 *
 * RULES (per game, matched by id):
 *  • Never erase a known line — `fresh.odds ?? old.odds` (same rule as the
 *    live poll merge in ScheduleProvider.patchLiveMatchups).
 *  • Never step a game backwards. /api/schedule can be up to ~5 min behind
 *    ESPN (server fetch cache), while the 15s live poll may already have moved
 *    a game to `in`/`post`. A fresh copy that is behind keeps the on-screen game.
 *  • Games in progress belong to the live poll (fresher than this fetch) —
 *    only a missing line is filled in.
 *  • An empty fresh list is treated as a failed fetch (the API returns `[]` on
 *    ESPN errors) → keep what is on screen.
 *
 * Pure (no React) so it's unit-testable.
 */

import type { GameState, Matchup } from '@/lib/schedule';

const STATE_RANK: Record<GameState, number> = { pre: 0, in: 1, post: 2 };

/** True when two versions of the same game would render identically. */
function sameGame(a: Matchup, b: Matchup): boolean {
  return (
    a.id === b.id &&
    a.state === b.state &&
    a.completed === b.completed &&
    a.statusDetail === b.statusDetail &&
    a.awayScore === b.awayScore &&
    a.homeScore === b.homeScore &&
    a.winner === b.winner &&
    a.awayRecord === b.awayRecord &&
    a.homeRecord === b.homeRecord &&
    a.network === b.network &&
    a.espnEventId === b.espnEventId &&
    a.kickoff.getTime() === b.kickoff.getTime() &&
    (a.odds?.spread ?? null) === (b.odds?.spread ?? null) &&
    (a.odds?.overUnder ?? null) === (b.odds?.overUnder ?? null)
  );
}

function mergeGame(old: Matchup, fresh: Matchup): Matchup {
  const odds = fresh.odds ?? old.odds;
  const behindLivePoll =
    STATE_RANK[fresh.state] < STATE_RANK[old.state] || (old.state === 'in' && fresh.state === 'in');
  const merged = behindLivePoll ? { ...old, odds } : { ...fresh, odds };
  // Keep the old object when nothing visible changed (no needless re-render).
  return sameGame(old, merged) ? old : merged;
}

/**
 * Merge a re-fetched week into the current one.
 * @returns the merged list, or `null` when nothing changed (keep the old entry).
 */
export function mergeRefreshedWeek(current: Matchup[], fresh: Matchup[]): Matchup[] | null {
  if (fresh.length === 0) return null;

  const byId = new Map(current.map((m) => [m.id, m]));
  const merged = fresh.map((f) => {
    const old = byId.get(f.id);
    return old ? mergeGame(old, f) : f;
  });

  const changed =
    merged.length !== current.length || merged.some((m, i) => m !== current[i]);
  return changed ? merged : null;
}
