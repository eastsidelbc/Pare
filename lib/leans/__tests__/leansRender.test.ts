/**
 * Leans render tests (react-dom/server, synthetic data — renderFixtures.ts).
 * Each /leans screen's pure view must show the responsible-gambling footer, a
 * lean pill and the "No lean" state where the data says so.
 */
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import AddLineSheet from '@/components/leans/AddLineSheet';
import GameView from '@/components/leans/GameView';
import PlayerPickerSheet from '@/components/leans/PlayerPickerSheet';
import PlayerVsDefenseView from '@/components/leans/PlayerVsDefenseView';
import PropDetailView from '@/components/leans/PropDetailView';
import { buildRanks, cellFor } from '@/lib/myteam/viewModel';
import LeansListView, { groupByDay } from '@/components/leans/LeansListView';
import { evaluateProp, fpaBefore, leagueFormFor, leansForGame, propWhy, ratingFor, whyFor } from '../evaluate';
import { BIJAN, JEANTY, LONDON, bundle, matchup, render, savedProp } from './renderFixtures';

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

describe('Leans prop detail (/leans/prop/[propId]) + sheets', () => {
  const b = bundle();
  const view = (p: ReturnType<typeof savedProp>) => {
    const e = evaluateProp(p, b);
    return render(createElement(PropDetailView, { e, why: propWhy(e, b), onEdit: () => {}, onRemove: () => {}, loading: false }));
  };
  const over = view(savedProp());
  const none = view(savedProp({ id: 'p2', playerId: LONDON.id, playerName: LONDON.name, position: 'WR', stat: 'rec_yd', line: 64.5 }));
  const thin = view(savedProp({ id: 'p3', playerId: JEANTY.id, playerName: JEANTY.name, team: 'LV', opp: 'ATL', home: true }));

  it('prop: footer', () => {
    for (const html of [over, none, thin]) expect(html).toContain(FOOTER);
  });
  it('prop: lean pill + "Why — 3 of 3 signals agree"', () => {
    expect(over).toMatch(/data-lean="over"[^>]*>.*?Data leans OVER<\/span>/);
    expect(over).toContain('Why — 3 of 3 signals agree');
    expect(over).toMatch(/LV allows <\/span><b[^>]*>132\.0<\/b><span> rush yds \/ game/);
    expect(over).toContain('Edit line');
  });
  it('prop: No lean + "Why no lean — signals split" + the reason', () => {
    expect(none).toMatch(/data-lean="none"[^>]*>No lean<\/span>/);
    expect(none).toContain('Why no lean — signals split (');
    expect(none).toContain('Pare only shows a lean when all three signals point the same way');
    expect(none).toContain('data-injury="Q"');
  });
  it('prop: not enough games (2 played)', () => {
    expect(thin).toContain('Not enough games yet');
    expect(thin).toContain('has played 2 games so far');
  });
  it('sheet: add line (stat chips, Over | Under, live dots, device-only note)', () => {
    const html = render(
      createElement(AddLineSheet, {
        open: true, onClose: () => {}, matchup: matchup('ATL', 'LV'), player: BIJAN, onChangePlayer: () => {}, onSaved: () => {},
        initial: savedProp(),
      }),
    );
    for (const s of ['Rush yds', 'Rec yds', 'Receptions', 'Rush + rec yds', 'Anytime TD', 'Over', 'Under', 'Save &amp; check the data', 'Pare never sees your sportsbook. The line stays on this device.']) {
      expect(html).toContain(s);
    }
    expect((html.match(/data-hit="yes"/g) ?? []).length).toBe(4);
    expect(html).toContain(FOOTER);
  });
  it('sheet: player picker lists both teams with meters + injury badge', () => {
    const html = render(createElement(PlayerPickerSheet, { open: true, onClose: () => {}, matchup: matchup('ATL', 'LV'), bundle: b, onPick: () => {} }));
    expect(html).toContain('In this game · ATL @ LV');
    expect(html).toContain('B. Robinson');
    expect(html).toContain('data-meter');
    expect(html).toContain('data-injury="Q"');
  });
});

describe('Leans player vs defense (/leans/player/[playerId])', () => {
  const b = bundle();
  const m = matchup('ATL', 'LV');
  const { rating, of } = ratingFor(b, 'RB', 'LV', 7, 'season');
  const ranks = buildRanks(fpaBefore(b.fpa, 7), 'season');
  const rp = { playerId: BIJAN.id, name: BIJAN.name, position: 'RB' as const, nflTeam: 'ATL', group: 'starter' as const, slot: null, injury: null };
  const cells = [7, 8, 9].map((w) => cellFor(rp, w, b.schedule, ranks));
  const html = render(
    createElement(PlayerVsDefenseView, {
      player: BIJAN, matchup: m, window: 'season', onWindow: () => {}, rating, of,
      why: whyFor(b, 'RB', 'LV', 7, 'season'), cells, weekRange: 'Oct 22 – Oct 26',
      bars: { label: 'rush yds', games: BIJAN.games.slice(-4).map((g) => ({ week: g.week, value: g.rush_yd })) },
      addHref: '/leans/2026-w7-ATL-LV?add=1&player=9509',
    }),
  );
  it('player: footer', () => {
    expect(html).toContain(FOOTER);
  });
  it('player: allows the Nth-most + PPR pts/g line + meter + why-stats', () => {
    expect(html).toContain('LV allows the 1st-most RB pts');
    expect(html).toContain('PPR pts/g to RBs · #32 of 32');
    expect(html).toContain('data-meter');
    expect(html).toContain('Rush yds / game');
  });
  it('player: last-4 bars, week cells with a bye, Season | Last 4, add link', () => {
    expect(html).toContain('Bijan · rush yds, last 4');
    expect((html.match(/data-weekcell/g) ?? []).length).toBe(3);
    expect(html).toContain('data-bye="true"');
    expect(html).toContain('Last 4');
    expect(html).toContain('href="/leans/2026-w7-ATL-LV?add=1&amp;player=9509"');
  });
});
