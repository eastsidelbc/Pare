/**
 * Leans render tests (react-dom/server, synthetic data — renderFixtures.ts).
 * Each /leans screen's pure view must show the responsible-gambling footer, a
 * lean pill and the "No lean" state where the data says so.
 */
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import LeansListView, { groupByDay } from '@/components/leans/LeansListView';
import { evaluateProp, leagueFormFor, leansForGame } from '../evaluate';
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
