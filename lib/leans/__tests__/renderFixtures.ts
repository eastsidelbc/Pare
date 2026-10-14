/**
 * Synthetic data for the Leans render tests: a 32-team league where ATL and LV are
 * both bottom-10 offenses (→ total UNDER), a Bijan-like RB who clears 85.5 in 3 of
 * his last 4 against an LV defense that gives RBs the most PPR points (→ OVER), and
 * a London-like WR at 2 of 4 (→ No lean). Plus the React wrappers screens need
 * (Next app-router context + FavoritesProvider) for react-dom/server.
 */
import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { FavoritesProvider } from '@/components/FavoritesProvider';
import type { FpaTable } from '@/lib/myteam/fpa';
import { getTeamByAbbr } from '@/lib/teams';
import type { Matchup, MatchupOdds } from '@/lib/schedule';
import type { LeansBundle, LeansPlayer, PlayerGame, SavedProp, TeamGame } from '../types';

export const WEEK = 7;
const WEEKS = [1, 2, 3, 4, 5, 6];
const FILLERS = Array.from({ length: 30 }, (_, i) => `F${i + 1}`);

function teamLog(): TeamGame[] {
  const line = (team: string, points: number, allowed: number) => WEEKS.map((week) => ({ team, opp: 'X', week, points, pointsAllowed: allowed }));
  return [...FILLERS.flatMap((t) => line(t, 21, 21)), ...line('ATL', 14, 24), ...line('LV', 13, 24)];
}

/** LV gives RBs 30 PPR a game (most), WRs 20 (middle); everyone else 15 / 20. */
function fpa(): FpaTable {
  const cells = (pts: number) => Object.fromEntries(WEEKS.map((w) => [w, { pts, games: 1 }]));
  const table: FpaTable = {};
  for (const t of [...FILLERS, 'ATL', 'LV']) {
    table[t] = { QB: cells(18), RB: cells(t === 'LV' ? 30 : 15), WR: cells(20 + (FILLERS.indexOf(t) % 5)), TE: cells(9), K: {}, DEF: {} };
  }
  return table;
}

const games = (key: 'rush_yd' | 'rec_yd', values: number[]): PlayerGame[] =>
  values.map((v, i) => ({ week: i + 1, opp: 'X', rush_yd: 0, rec: 4, rec_yd: 0, rush_td: 0, rec_td: 0, [key]: v }));

export const BIJAN: LeansPlayer = { id: '9509', name: 'Bijan Robinson', position: 'RB', team: 'ATL', injury: null, games: games('rush_yd', [64, 92, 112, 71, 97, 104]) };
export const LONDON: LeansPlayer = { id: '8112', name: 'Drake London', position: 'WR', team: 'ATL', injury: 'Q', games: games('rec_yd', [88, 59, 71, 48, 66, 52]) };
export const JEANTY: LeansPlayer = { id: '12500', name: 'Ashton Jeanty', position: 'RB', team: 'LV', injury: null, games: games('rush_yd', [55, 80]) };

export function bundle(): LeansBundle {
  return {
    season: 2026,
    week: WEEK,
    completedWeeks: WEEKS,
    teamLog: teamLog(),
    defenseLog: [...FILLERS, 'ATL', 'LV'].flatMap((team) =>
      WEEKS.map((week) => ({ team, week, pass_yds: 220, rush_yds: team === 'LV' ? 132 : 110, pass_td: 1.4, rush_td: team === 'LV' ? 1.3 : 0.8, int: 1, sacks: 2, points: 22, red_zone_att: 3, drives: 11 })),
    ),
    fpa: fpa(),
    players: [BIJAN, LONDON, JEANTY],
    schedule: {
      ATL: { 7: { opp: 'LV', home: false, kickoff: '2026-10-25T20:05:00.000Z', eventId: '1' }, 8: { opp: 'TB', home: true, kickoff: '2026-11-01T17:00:00.000Z', eventId: '2' }, 9: 'BYE' },
      LV: { 7: { opp: 'ATL', home: true, kickoff: '2026-10-25T20:05:00.000Z', eventId: '1' } },
    },
    generatedAt: '2026-10-14T00:00:00.000Z',
  };
}

export const ODDS: MatchupOdds = { spread: 'LV -1.5', overUnder: 44.5, spreadLine: { team: 'LV', line: -1.5 }, moneyline: { away: 105, home: -125 } };

export function matchup(away = 'ATL', home = 'LV', odds: MatchupOdds | null = ODDS): Matchup {
  const a = getTeamByAbbr(away);
  const h = getTeamByAbbr(home);
  if (!a || !h) throw new Error('bad team');
  return {
    id: `2026-w${WEEK}-${away}-${home}`, week: WEEK, away: a, home: h, kickoff: new Date('2026-10-25T20:05:00.000Z'),
    state: 'pre', completed: false, statusDetail: '', awayScore: null, homeScore: null, winner: null, odds,
    awayRecord: '3-3', homeRecord: '3-3', network: 'CBS', espnEventId: '1',
  };
}

export function savedProp(over: Partial<SavedProp> = {}): SavedProp {
  return {
    id: 'p1', gameId: `2026-w${WEEK}-ATL-LV`, week: WEEK, playerId: BIJAN.id, playerName: BIJAN.name, position: 'RB', team: 'ATL', opp: 'LV',
    home: false, stat: 'rush_yd', side: 'over', line: 85.5, createdAt: '2026-10-14T00:00:00.000Z', ...over,
  };
}

const router = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };

/** SSR-render a Leans screen inside the contexts it needs. */
export function render(el: ReactElement): string {
  const wrapped: ReactNode = createElement(AppRouterContext.Provider, { value: router }, createElement(FavoritesProvider, null, el));
  return renderToStaticMarkup(wrapped as ReactElement);
}
