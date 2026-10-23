/**
 * Prop lines from ESPN's Core `propBets` feed (Wave B2) — pure + client-safe.
 * Replaces typed prop lines: every prop-eligible player's line now comes from the
 * book feed (Kobe, 2026-10-23: auto-fill only). Traps (docs/data-catalog.md):
 *
 * - One main line is split into an OVER item and an UNDER item on the same target;
 *   unpriced items around it can be an alternate-line LADDER (2025 feed). Some feeds
 *   (2026) post exactly one unpriced line per player — that IS the main line.
 * - `current` keeps moving after kickoff (in-game) — once a game starts, read `open`.
 * - TD-scorer markets can come back empty; Anytime TD is judged on a fixed 0.5.
 */

import { impliedProb } from '@/lib/formulas/odds';
import { parseAmericanOdds } from '@/lib/espnScoreboard';
import type { PropStat } from './types';

/** One book offer (main line or an alternate). Prices are American odds. */
export interface PropOffer {
  target: number;
  over: number | null;
  under: number | null;
}

/** ESPN prop market type id → the Leans stat it settles. */
export const PROP_TYPES: Readonly<Record<string, PropStat>> = { '12': 'rush_yd', '13': 'rec_yd', '14': 'rec', '20': 'rush_rec_yd', '31': 'anytime_td' };

/** Merge offers that share a target, so each carries both prices when the book has them. */
export function mergeOffers(offers: readonly PropOffer[]): PropOffer[] {
  const byTarget = new Map<number, PropOffer>();
  for (const o of offers) {
    const prev = byTarget.get(o.target);
    byTarget.set(o.target, { target: o.target, over: prev?.over ?? o.over, under: prev?.under ?? o.under });
  }
  return [...byTarget.values()];
}

/**
 * The main line. Two-way priced: closest to even. One-way priced (anytime TD): the first.
 * Nothing priced: null — unless `unpriced` allows it (a feed without prices): a single
 * offer is the line; several → the median target.
 */
export function pickMainLine(offers: readonly PropOffer[], { unpriced = false }: { unpriced?: boolean } = {}): PropOffer | null {
  const merged = mergeOffers(offers);
  const twoWay = merged.filter((o) => o.over !== null && o.under !== null);
  if (twoWay.length > 0) {
    const gap = (o: PropOffer) => Math.abs((impliedProb(o.over ?? 0) ?? 0) - (impliedProb(o.under ?? 0) ?? 0));
    return [...twoWay].sort((a, b) => gap(a) - gap(b) || a.target - b.target)[0];
  }
  const oneWay = merged.find((o) => o.over !== null || o.under !== null);
  if (oneWay) return oneWay;
  if (!unpriced || merged.length === 0) return null;
  const sorted = [...merged].sort((a, b) => a.target - b.target);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

// ── ESPN shapes (only what we read) ──
interface EspnPrice {
  american?: string;
}
interface EspnPropSide {
  target?: { value?: number };
  over?: EspnPrice;
  under?: EspnPrice;
}
export interface EspnPropBet {
  athlete?: { $ref?: string };
  type?: { id?: string };
  lastUpdated?: string;
  open?: EspnPropSide;
  current?: EspnPropSide;
}

/** One player's line for one stat in one game, as the book posted it. */
export interface BookLine {
  /** ESPN athlete id (the server maps it to a Sleeper id). */
  espnId: string;
  stat: PropStat;
  /** The opening line — the only one to trust once the game has started. */
  open: PropOffer | null;
  /** The latest pregame line. */
  current: PropOffer | null;
  updatedAt: string | null;
}

function offerOf(side: EspnPropSide | undefined): PropOffer | null {
  const target = side?.target?.value;
  if (typeof target !== 'number' || !Number.isFinite(target)) return null;
  return { target, over: parseAmericanOdds(side?.over?.american), under: parseAmericanOdds(side?.under?.american) };
}

/** All pages' items → one main line per player per Leans stat. */
export function parseBookLines(items: readonly EspnPropBet[]): BookLine[] {
  const groups = new Map<string, { open: PropOffer[]; current: PropOffer[]; updatedAt: string | null }>();
  for (const it of items) {
    const stat = PROP_TYPES[it.type?.id ?? ''];
    const espnId = /athletes\/(\d+)/.exec(it.athlete?.$ref ?? '')?.[1];
    if (!stat || !espnId) continue;
    const key = `${espnId}|${stat}`;
    const g = groups.get(key) ?? { open: [], current: [], updatedAt: null };
    const o = offerOf(it.open);
    const c = offerOf(it.current);
    if (o) g.open.push(o);
    if (c) g.current.push(c);
    if (it.lastUpdated && (!g.updatedAt || it.lastUpdated > g.updatedAt)) g.updatedAt = it.lastUpdated;
    groups.set(key, g);
  }
  const out: BookLine[] = [];
  for (const [key, g] of groups) {
    const [espnId, stat] = key.split('|') as [string, PropStat];
    const open = pickMainLine(g.open, { unpriced: true });
    const current = pickMainLine(g.current, { unpriced: true });
    if (open || current) out.push({ espnId, stat, open, current, updatedAt: g.updatedAt });
  }
  return out;
}

/** A book line the client can use: the player's Sleeper id instead of ESPN's. */
export interface GamePropLine extends Omit<BookLine, 'espnId'> {
  playerId: string;
}

/** Before kickoff the current line; once the game started, the opener (current moves in-game). */
export function lineFor(l: Pick<GamePropLine, 'open' | 'current'>, started: boolean): PropOffer | null {
  return started ? l.open ?? null : l.current ?? l.open ?? null;
}

/** Stable id for a prop on the prop screen route: game · player · stat. */
export function propIdOf(gameId: string, playerId: string, stat: PropStat): string {
  return `${gameId}~${playerId}~${stat}`;
}

export function parsePropId(id: string): { gameId: string; playerId: string; stat: PropStat } | null {
  const [gameId, playerId, stat] = id.split('~');
  const stats = Object.values(PROP_TYPES);
  return gameId && playerId && stats.includes(stat as PropStat) ? { gameId, playerId, stat: stat as PropStat } : null;
}
