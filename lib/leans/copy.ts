/**
 * Leans copy (pure). The only words a lean is ever shown with (DECISIONS §8):
 * "Data leans OVER / UNDER / <TEAM>", "No lean", "Not enough games yet".
 * lib/__tests__/leansCopy.test.ts scans this folder for banned words.
 */

import type { MatchupOdds } from '@/lib/schedule';
import { lineFor } from './gameLean';
import { formatRank } from '@/utils/ordinal';
import type { MatchupRating } from '@/lib/myteam/rating';
import { moneylineText, num } from './format';
import type { LeanResult } from './types';

export interface LeanTextContext {
  awayTeam: string;
  homeTeam: string;
  /** Append the number ("Data leans UNDER 44.5", "Data leans LV −1.5") — the list card does. */
  withNumber?: boolean;
  total?: number | null;
  spreadLine?: { team: string; line: number } | null;
  /** Which line the result belongs to (side leans read differently per line). */
  kind: 'total' | 'spread' | 'moneyline' | 'prop';
}

export function leanText(r: Pick<LeanResult, 'verdict' | 'side'>, ctx: LeanTextContext): string {
  switch (r.verdict) {
    case 'over':
    case 'under': {
      const word = r.verdict.toUpperCase();
      return ctx.withNumber && ctx.total != null ? `Data leans ${word} ${ctx.total}` : `Data leans ${word}`;
    }
    case 'side': {
      const side = r.side ?? 'home';
      const team = side === 'away' ? ctx.awayTeam : ctx.homeTeam;
      if (ctx.kind === 'spread' && ctx.withNumber) return `Data leans ${team} ${num(lineFor(side, ctx.awayTeam, ctx.homeTeam, ctx.spreadLine ?? null))}`;
      return `Data leans ${team}`;
    }
    case 'not-enough':
      return 'Not enough games yet';
    default:
      return 'No lean';
  }
}

/** Lines-row values: "LV −1.5" · "O/U 44.5" · "LV −125" ("—" when missing). */
export function spreadText(odds: MatchupOdds | null): string {
  if (!odds) return '—';
  if (odds.spreadLine) return `${odds.spreadLine.team} ${num(odds.spreadLine.line)}`;
  return /^(EVEN|PK)$/i.test(odds.spread.trim()) ? 'PK' : odds.spread || '—';
}

export function totalText(odds: MatchupOdds | null): string {
  return odds?.overUnder != null ? `O/U ${odds.overUnder}` : '—';
}

/** The favorite's moneyline (the lower number); both sides in the game screen's `small`. */
export function moneylineParts(odds: MatchupOdds | null, awayTeam: string, homeTeam: string): { main: string; other: string | null } | null {
  const ml = odds?.moneyline;
  if (!ml || (ml.away == null && ml.home == null)) return null;
  const sides = [
    { team: awayTeam, n: ml.away },
    { team: homeTeam, n: ml.home },
  ].filter((s): s is { team: string; n: number } => s.n != null);
  sides.sort((a, b) => a.n - b.n);
  const [fav, dog] = sides;
  return { main: `${fav.team} ${moneylineText(fav.n)}`, other: dog ? `${dog.team} ${moneylineText(dog.n)}` : null };
}

/** "LV allows the 3rd-most RB pts" (rank #1 = fewest allowed, so Nth-most = of − rank + 1). */
export function allowsText(opp: string, position: string, rating: MatchupRating | null, of: number): string {
  if (!rating || of <= 0) return `No ${position} matchup rating for ${opp} yet`;
  const nth = of - rating.rank + 1;
  return `${opp} allows the ${formatRank(nth, rating.isTied)}-most ${position} pts`;
}
