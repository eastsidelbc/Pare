/**
 * Client side of /api/live/scoreboard (pure, client-safe): the JSON shape and
 * the one revive step (kickoff ISO string → Date) before matchups reach app state.
 */

import type { Matchup } from '@/lib/schedule';

/** Matchup as it arrives over JSON (kickoff is an ISO string). */
export interface SerializedMatchup extends Omit<Matchup, 'kickoff'> {
  kickoff: string;
}

/** GET /api/live/scoreboard?week=N body. `stale` = ESPN failed; this is our last good copy. */
export interface LiveScoreboardResponse {
  week: number;
  updatedAt: string;
  stale: boolean;
  matchups: SerializedMatchup[];
}

export function reviveMatchups(list: readonly SerializedMatchup[]): Matchup[] {
  return list.map((m) => ({ ...m, kickoff: new Date(m.kickoff) }));
}
