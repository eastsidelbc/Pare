/**
 * Auto props (Wave B2) — pure. Turns the book's lines for a game into the prop shape the
 * engine and views already use (`SavedProp`), for the bundle's prop-eligible players.
 * The side shown follows the lean (an UNDER lean reads "u85.5 · Under in 3 of last 4");
 * with no lean it reads as the over.
 */

import type { Matchup } from '@/lib/schedule';
import { evaluateProp, type EvaluatedProp } from './evaluate';
import { lineFor, propIdOf, type GamePropLine } from './propLines';
import type { LeansBundle, SavedProp } from './types';

/** Lines → props for one game. Players outside the bundle (backups, traded away) are left out. */
export function buildGameProps(matchup: Matchup, lines: readonly GamePropLine[] | undefined, bundle: Pick<LeansBundle, 'players'> | null): SavedProp[] {
  if (!lines || !bundle) return [];
  const started = matchup.state !== 'pre';
  const out: SavedProp[] = [];
  for (const l of lines) {
    const player = bundle.players.find((p) => p.id === l.playerId);
    if (!player) continue;
    const home = player.team === matchup.home.abbr;
    if (!home && player.team !== matchup.away.abbr) continue;
    const offer = lineFor(l, started);
    if (!offer) continue;
    out.push({
      id: propIdOf(matchup.id, player.id, l.stat),
      gameId: matchup.id,
      week: matchup.week,
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      team: player.team,
      opp: home ? matchup.away.abbr : matchup.home.abbr,
      home,
      stat: l.stat,
      side: 'over',
      line: offer.target,
      createdAt: l.updatedAt ?? '',
    });
  }
  return out;
}

/** Evaluate, then flip the shown side to UNDER when that's the lean. */
export function evaluateAutoProp(prop: SavedProp, bundle: LeansBundle | null): EvaluatedProp {
  const e = evaluateProp(prop, bundle);
  return e.lean?.verdict === 'under' ? evaluateProp({ ...prop, side: 'under' }, bundle) : e;
}

const RANK: Readonly<Record<string, number>> = { over: 0, under: 0, none: 1, 'not-enough': 2 };

/** Leans first, then no lean, then not enough games; by name within each. */
export function sortProps(list: readonly EvaluatedProp[]): EvaluatedProp[] {
  return [...list].sort(
    (a, b) => (RANK[a.lean?.verdict ?? 'not-enough'] ?? 2) - (RANK[b.lean?.verdict ?? 'not-enough'] ?? 2) || a.prop.playerName.localeCompare(b.prop.playerName) || a.prop.stat.localeCompare(b.prop.stat),
  );
}

export const isLean = (e: EvaluatedProp) => e.lean?.verdict === 'over' || e.lean?.verdict === 'under';
