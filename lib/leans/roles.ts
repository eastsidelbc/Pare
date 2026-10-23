/**
 * Player roles going into a week — pure (prop engine v2, A1). WR1/WR2/WR3 and TE1 by
 * target share, RB1/RB2 by touch share (carries + targets), each among the candidates at
 * his position on his team. Share = his volume ÷ his team's volume over the games HE played
 * for that team before the week (an injured WR1 coming back is still the WR1; after a trade
 * only games with the new team count), shrunk toward 0 by `roleShrinkGames`.
 *
 * Never "most targets that game": the role is what was known before kickoff. Candidates are
 * passed in — for a past week the players who played it (inactives are public before the
 * game), for the coming week the healthy roster. Week 1 has no earlier games → no roles.
 */

import { shrink } from '@/lib/formulas/stats';
import type { PlayerGameLine } from '@/lib/myteam/types';
import { LEAN_CONFIG } from './config';
import { playedGame } from './players';
import type { Role } from './types';

const CFG = LEAN_CONFIG.propV2;
type RolePosition = keyof typeof CFG.roleSlots;
const SLOT_NAMES: Readonly<Record<RolePosition, readonly Role[]>> = {
  WR: ['WR1', 'WR2', 'WR3'],
  TE: ['TE1'],
  RB: ['RB1', 'RB2'],
};
const isRolePosition = (p: string): p is RolePosition => p in CFG.roleSlots;

const stat = (l: PlayerGameLine, k: string) => l.stats[k] ?? 0;

/** The volume a role is ranked on: targets for WR / TE, touches for RB. */
export function roleVolume(position: RolePosition, l: PlayerGameLine): number {
  return position === 'RB' ? stat(l, 'rush_att') + stat(l, 'rec_tgt') : stat(l, 'rec_tgt');
}

export interface RoleCandidate {
  id: string;
  position: string;
}

/**
 * Index for repeated role lookups over one season's lines: played lines by team, so a
 * whole season of weeks × teams stays cheap.
 */
export interface RoleBook {
  byTeam: ReadonlyMap<string, readonly PlayerGameLine[]>;
}

export function buildRoleBook(lines: readonly PlayerGameLine[]): RoleBook {
  const byTeam = new Map<string, PlayerGameLine[]>();
  for (const l of lines) {
    if (!playedGame(l)) continue;
    const list = byTeam.get(l.team) ?? [];
    list.push(l);
    byTeam.set(l.team, list);
  }
  return { byTeam };
}

/** Roles on `team` going into `week`, among `candidates` (anyone else gets none). */
export function rolesAsOf(book: RoleBook, team: string, week: number, candidates: readonly RoleCandidate[]): Map<string, Role> {
  const before = (book.byTeam.get(team) ?? []).filter((l) => l.week < week);
  const out = new Map<string, Role>();
  if (before.length === 0) return out;
  const teamVolume = new Map<string, number>(); // `${pos}|${week}` → team volume that week
  const volumeOf = (pos: RolePosition, w: number) => {
    const key = `${pos}|${w}`;
    let v = teamVolume.get(key);
    if (v === undefined) {
      v = before.filter((l) => l.week === w).reduce((sum, l) => sum + roleVolume(pos, l), 0);
      teamVolume.set(key, v);
    }
    return v;
  };
  for (const pos of Object.keys(SLOT_NAMES) as RolePosition[]) {
    const ranked = candidates
      .filter((c) => c.position === pos)
      .map((c) => {
        const mine = before.filter((l) => l.playerId === c.id);
        const own = mine.reduce((sum, l) => sum + roleVolume(pos, l), 0);
        const total = mine.reduce((sum, l) => sum + volumeOf(pos, l.week), 0);
        const share = total > 0 ? own / total : 0;
        return { id: c.id, key: shrink(mine.length, share, 0, CFG.roleShrinkGames) ?? 0, own };
      })
      .filter((r) => r.own > 0)
      .sort((a, b) => b.key - a.key || b.own - a.own || a.id.localeCompare(b.id));
    ranked.slice(0, CFG.roleSlots[pos]).forEach((r, i) => out.set(r.id, SLOT_NAMES[pos][i]));
  }
  return out;
}

/** Candidates for a past week: everyone on the team who played it. */
export function playedCandidates(book: RoleBook, team: string, week: number): RoleCandidate[] {
  return (book.byTeam.get(team) ?? []).filter((l) => l.week === week && isRolePosition(l.position)).map((l) => ({ id: l.playerId, position: l.position }));
}
