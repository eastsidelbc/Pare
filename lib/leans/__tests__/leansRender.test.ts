/**
 * Leans render tests (react-dom/server, synthetic data — renderFixtures.ts).
 * Each /leans screen's pure view must show the responsible-gambling footer, a
 * lean pill and the "No lean" state where the data says so.
 */
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import GameView from '@/components/leans/GameView';
import LeansListView, { groupByDay } from '@/components/leans/LeansListView';
import { evaluateProp, leagueFormFor, leansForGame, propWhy } from '../evaluate';
import { LONDON, bundle, matchup, render, savedProp } from './renderFixtures';

const FOOTER = '21+ · Info only, not betting advice · <span class="whitespace-nowrap">Gambling problem? 1-800-GAMBLER</span>';

describe('Leans list (/leans)', () => {
  const b = bundle();
  const league = leagueFormFor(b, 7);
  const atl = matchup('ATL', 'LV');
  const groups = groupByDay([{ matchup: atl, leans: leansForGame(b, atl, league) }]);
  const props = [
    evaluateProp(savedProp(), b),
    evaluateProp(savedProp({ id: 'p2', playerId: LONDON.id, playerName: LONDON.name, position: 'WR', stat: 'rec_yd', line: 64.5 }), b),
  ];
  const html = render(createElement(LeansListView, { week: 7, status: 'ready', groups, props, onTrackProp: () => {} }));

  it('list: footer', () => {
    expect(html).toContain(FOOTER);
  });
  it('list: lean pill on the game card ("Data leans UNDER 44.5") and the prop ("OVER")', () => {
    expect(html).toContain('Data leans UNDER 44.5');
    expect(html).toMatch(/data-lean="over"[^>]*>.*?OVER<\/span>/);
  });
  it('list: No lean on the 2-of-4 prop', () => {
    expect(html).toMatch(/data-lean="none"[^>]*>No lean<\/span>/);
    expect(html).toContain('2 of last 4');
  });
  it('list: lines row (spread · total · moneyline)', () => {
    expect(html).toContain('LV −1.5');
    expect(html).toContain('O/U 44.5');
    expect(html).toContain('LV −125');
  });
  it('list: empty props → the add card', () => {
    const empty = render(createElement(LeansListView, { week: 7, status: 'ready', groups, props: [], onTrackProp: () => {} }));
    expect(empty).toContain('Track a prop line');
    expect(empty).toContain(FOOTER);
  });
  it('list: empty week', () => {
    const none = render(createElement(LeansListView, { week: 9, status: 'empty', groups: [], props: [], onTrackProp: () => {} }));
    expect(none).toContain('No games this week');
  });
});

describe('Leans game screen (/leans/[gameId])', () => {
  const b = bundle();
  const league = leagueFormFor(b, 7);
  const m = matchup('ATL', 'LV');
  const leans = leansForGame(b, m, league);
  const base = {
    matchup: m, leans, league, openLine: null, onToggleLine: () => {}, statsOpen: false, onToggleStats: () => {},
    compare: createElement('div', null, 'COMPARE'), props: [], onAddProp: () => {},
  } as const;
  const closed = render(createElement(GameView, base));
  const totalOpen = render(createElement(GameView, { ...base, openLine: 'total' as const }));

  it('game: footer', () => {
    expect(closed).toContain(FOOTER);
  });
  it('game: lean pill on the total ("Data leans UNDER")', () => {
    expect(closed).toMatch(/data-line-row="total"[\s\S]*?data-lean="under"[^>]*>.*?Data leans UNDER<\/span>/);
  });
  it('game: No lean on the spread + "Same story as the spread" on the moneyline', () => {
    expect(closed).toMatch(/data-line-row="spread"[\s\S]*?data-lean="none"[^>]*>No lean<\/span>/);
    expect(closed).toContain('Same story as the spread — no clear side');
  });
  it('game: 3 signals when the total row is open', () => {
    expect(totalOpen).toContain('Why — 3 of 3 signals agree');
    expect((totalOpen.match(/data-signal="ok"/g) ?? []).length).toBe(3);
    expect(totalOpen).toContain('Game totals, last 4 (line 44.5)');
  });
  it('game: props empty state + add row', () => {
    expect(closed).toContain('No prop lines yet');
    expect(closed).toContain('Add a prop line');
  });
  it('game: hero names are not buttons; "Compare these teams" is', () => {
    expect(closed).not.toContain('tap to change team');
    expect(closed).toContain('Compare these teams');
    expect(closed).not.toContain('COMPARE');
    expect(render(createElement(GameView, { ...base, statsOpen: true }))).toContain('Hide team stats');
  });
  it('game: a saved prop renders as a card with dots + tier', () => {
    const e = evaluateProp(savedProp(), b);
    const html = render(createElement(GameView, { ...base, props: [{ e, why: propWhy(e, b) }] }));
    expect(html).toContain('data-prop-card');
    expect(html).toContain('Data leans OVER');
    expect(html).toContain('LV allows the 1st-most RB pts');
    expect(html).not.toContain('No prop lines yet');
  });
});
