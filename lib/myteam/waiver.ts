/**
 * Waiver watch (Wave B5) — pure. Sleeper's most-added players (last 24h, whole platform)
 * that nobody in YOUR league rosters. Positions limited to what the league can start.
 */

import type { FantasyPosition } from './types';
import { isFantasyPosition } from './types';

export interface TrendingRaw {
  player_id?: string;
  count?: number;
}

export interface WaiverPlayer {
  playerId: string;
  name: string;
  position: FantasyPosition;
  team: string | null;
  /** Adds across Sleeper in the last 24 hours. */
  adds: number;
}

export interface MapPlayer {
  name: string;
  position: string;
  team?: string | null;
}

/** How many trending players the card shows. */
export const WAIVER_SHOWN = 5;

export function pickAvailable(
  trending: readonly TrendingRaw[],
  owned: ReadonlySet<string>,
  players: Readonly<Record<string, MapPlayer>>,
  startable: ReadonlySet<FantasyPosition>,
  shown = WAIVER_SHOWN,
): WaiverPlayer[] {
  const out: WaiverPlayer[] = [];
  for (const t of trending) {
    if (out.length >= shown) break;
    const id = t.player_id;
    if (!id || owned.has(id) || typeof t.count !== 'number') continue;
    const p = players[id];
    if (!p?.name || !isFantasyPosition(p.position) || !startable.has(p.position)) continue;
    out.push({ playerId: id, name: p.name, position: p.position, team: p.team || null, adds: t.count });
  }
  return out;
}

/** Roster slots → positions a league can start (FLEX = RB/WR/TE, SUPER_FLEX adds QB, IDP slots ignored). */
export function startablePositions(slots: readonly string[]): Set<FantasyPosition> {
  const out = new Set<FantasyPosition>();
  for (const s of slots) {
    if (isFantasyPosition(s)) out.add(s);
    if (s === 'FLEX' || s === 'REC_FLEX' || s === 'WRRB_FLEX') ['RB', 'WR', 'TE'].forEach((p) => out.add(p as FantasyPosition));
    if (s === 'SUPER_FLEX') ['QB', 'RB', 'WR', 'TE'].forEach((p) => out.add(p as FantasyPosition));
  }
  return out;
}

/** 876294 → "876K", 12400 → "12.4K", 940 → "940". */
export function addsText(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
