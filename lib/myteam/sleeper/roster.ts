/**
 * Sleeper rosters → normalized FantasyRoster (pure).
 *
 * - My roster = the one I own (`owner_id`), else one I co-own (`co_owners`).
 * - Groups: `starters` (in roster_positions order; "0" = empty slot),
 *   `reserve` → IR, `taxi` → taxi, every other player → bench.
 * - Pre-draft leagues (`status` pre_draft/drafting, or `players: null`) give
 *   empty groups + `preDraft: true` instead of throwing.
 * Shapes verified in P0a (docs/devnotes/2026-10-07-my-team-data-spike.md);
 * co-owner and pre-draft cases use synthetic fixtures (not observed live).
 */

import { normalizeTeamAbbr } from '@/lib/teams';
import { isFantasyPosition, type FantasyRoster, type InjuryTag, type RosterGroup, type RosterPlayer } from '../types';

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  co_owners?: string[] | null;
  players: string[] | null;
  starters: string[] | null;
  reserve?: string[] | null;
  taxi?: string[] | null;
}

/** The slice of Sleeper's player map My Team needs. */
export interface SleeperPlayerInfo {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  team?: string | null;
  injury_status?: string | null;
}

const INJURY: Readonly<Record<string, InjuryTag>> = { Questionable: 'Q', Doubtful: 'D', Out: 'O', IR: 'IR' };

/** Sleeper injury_status → tag. Anything else (PUP, Sus, NA, …) shows no tag. */
export function toInjuryTag(status: string | null | undefined): InjuryTag | null {
  return (status && INJURY[status]) || null;
}

export function findMyRoster<R extends Pick<SleeperRoster, 'owner_id' | 'co_owners'>>(rosters: readonly R[] | null | undefined, userId: string): R | null {
  const list = rosters ?? [];
  return list.find((r) => r.owner_id === userId) ?? list.find((r) => (r.co_owners ?? []).includes(userId)) ?? null;
}

/** Starter slots only (bench "BN" excluded), in Sleeper's order. */
export function starterSlots(rosterPositions: readonly string[] | null | undefined): string[] {
  return (rosterPositions ?? []).filter((slot) => slot !== 'BN');
}

function displayName(id: string, p: SleeperPlayerInfo | undefined): string {
  if (!p) return id;
  return p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || id;
}

export function normalizeRoster(
  roster: SleeperRoster,
  rosterPositions: readonly string[] | null | undefined,
  players: Readonly<Record<string, SleeperPlayerInfo>>,
  leagueStatus: string | null | undefined,
): FantasyRoster {
  const preDraft = leagueStatus === 'pre_draft' || leagueStatus === 'drafting' || roster.players === null;
  if (preDraft) return { rosterId: roster.roster_id, players: [], preDraft: true };

  const slots = starterSlots(rosterPositions);
  const out: RosterPlayer[] = [];
  const seen = new Set<string>();
  const add = (id: string, group: RosterGroup, slot: string | null) => {
    if (!id || id === '0' || seen.has(id)) return;
    seen.add(id);
    const p = players[id];
    const team = p?.team ? normalizeTeamAbbr(p.team) : null;
    out.push({
      playerId: id,
      name: displayName(id, p),
      position: isFantasyPosition(p?.position) ? p.position : null,
      nflTeam: team,
      group,
      slot,
      injury: toInjuryTag(p?.injury_status),
    });
  };

  (roster.starters ?? []).forEach((id, i) => add(id, 'starter', slots[i] ?? null));
  for (const id of roster.reserve ?? []) add(id, 'ir', null);
  for (const id of roster.taxi ?? []) add(id, 'taxi', null);
  for (const id of roster.players ?? []) add(id, 'bench', null);

  return { rosterId: roster.roster_id, players: out, preDraft: false };
}
