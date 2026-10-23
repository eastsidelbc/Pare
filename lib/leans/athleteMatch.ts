/**
 * ESPN athlete → Sleeper player id — pure. The book's prop lines name players by ESPN
 * athlete id, the Leans bundle by Sleeper id. Sleeper fills `espn_id` for only a quarter of
 * skill players (2026-10-23: 210 of 829 — Chase, Nacua, Bijan, St. Brown all missing), so an
 * id-only join silently dropped most star props. Order: ESPN id when Sleeper has it, else
 * normalized name + team (lib/rookieMatch, the Home box-score join's key), narrowed by
 * position when the name is shared. Still two candidates → no match (never guess).
 */

import { normalizePlayerName, rookieKey } from '@/lib/rookieMatch';
import { normalizeTeamAbbr } from '@/lib/teams';

export interface SleeperCandidate {
  id: string;
  name: string;
  position: string;
  team: string;
  espnId?: string;
}

export interface AthleteIndex {
  byEspn: ReadonlyMap<string, string>;
  byKey: ReadonlyMap<string, ReadonlyArray<{ id: string; position: string }>>;
}

export function buildAthleteIndex(players: Iterable<SleeperCandidate>): AthleteIndex {
  const byEspn = new Map<string, string>();
  const byKey = new Map<string, Array<{ id: string; position: string }>>();
  for (const p of players) {
    if (p.espnId) byEspn.set(p.espnId, p.id);
    if (!p.name || !p.team || !normalizePlayerName(p.name)) continue;
    const key = rookieKey(p.name, p.team);
    const list = byKey.get(key) ?? [];
    if (!list.some((c) => c.id === p.id)) list.push({ id: p.id, position: p.position });
    byKey.set(key, list);
  }
  return { byEspn, byKey };
}

export interface EspnAthlete {
  espnId: string;
  /** ESPN full name; absent → id join only. */
  name?: string;
  /** ESPN position abbreviation (QB / RB / WR / TE …), narrows a shared name. */
  position?: string;
  /** Teams he could be on for this game (both sides; a trade can lag in either feed). */
  teams: readonly string[];
}

export function matchAthlete(idx: AthleteIndex, a: EspnAthlete): string | null {
  const byId = idx.byEspn.get(a.espnId);
  if (byId) return byId;
  if (!a.name) return null;
  const found = new Map<string, string>();
  for (const team of a.teams) {
    for (const c of idx.byKey.get(rookieKey(a.name, normalizeTeamAbbr(team))) ?? []) found.set(c.id, c.position);
  }
  if (found.size === 1) return [...found.keys()][0];
  if (found.size > 1 && a.position) {
    const same = [...found].filter(([, pos]) => pos === a.position);
    if (same.length === 1) return same[0][0];
  }
  return null;
}
