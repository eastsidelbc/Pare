/**
 * Leans render tests (react-dom/server, synthetic data — renderFixtures.ts).
 * Each /leans screen's pure view must show the responsible-gambling footer, a
 * lean pill and the "No lean" state where the data says so.
 */
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import GameView from '@/components/leans/GameView';
import PlayerVsDefenseView from '@/components/leans/PlayerVsDefenseView';
import PropDetailView from '@/components/leans/PropDetailView';
import { buildRanks, cellFor } from '@/lib/myteam/viewModel';
import LeansListView, { groupByDay } from '@/components/leans/LeansListView';
import { evaluateProp, fpaBefore, leagueFormFor, leansForGame, propWhy, ratingFor, whyFor } from '../evaluate';
import { propMatchupData } from '../matchupData';
import { BIJAN, JEANTY, LONDON, ODDS, bundle, matchup, render, savedProp, v2Tables } from './renderFixtures';

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
  const html = render(createElement(LeansListView, { week: 7, status: 'ready', groups, props, propsState: 'ready' }));

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
  it('list: no prop leans → a quiet note (typing retired 2026-10-23)', () => {
    const empty = render(createElement(LeansListView, { week: 7, status: 'ready', groups, props: [], propsState: 'ready' }));
    expect(empty).toContain('No prop leans this week yet');
    expect(empty).not.toContain('Track a prop line');
    expect(render(createElement(LeansListView, { week: 7, status: 'ready', groups, props: [], propsState: 'loading' }))).toContain('Checking this week');
    expect(empty).toContain(FOOTER);
  });
  it('list: empty week', () => {
    const none = render(createElement(LeansListView, { week: 9, status: 'empty', groups: [], props: [], propsState: 'ready' }));
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
    compare: createElement('div', null, 'COMPARE'), props: [],
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
  it('game: props empty state (no add row since 2026-10-23)', () => {
    expect(closed).toContain('No prop lines yet');
    expect(closed).not.toContain('Add a prop line');
  });
  it('game: leans show, other lines wait behind "Show all N lines"', () => {
    const lean = evaluateProp(savedProp(), b);
    const flat = evaluateProp(savedProp({ id: 'p2', playerId: LONDON.id, playerName: LONDON.name, position: 'WR', stat: 'rec_yd', line: 64.5 }), b);
    const html = render(createElement(GameView, { ...base, props: [lean, flat].map((e) => ({ e, why: propWhy(e, b) })) }));
    expect(html).toContain('Data leans OVER');
    expect(html).toContain('Show all 2 lines');
    expect(html).not.toContain(LONDON.name);
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

describe('Leans prop detail (/leans/prop/[propId])', () => {
  const b = bundle();
  const view = (p: ReturnType<typeof savedProp>) => {
    const e = evaluateProp(p, b);
    return render(createElement(PropDetailView, { e, why: propWhy(e, b), loading: false }));
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
    expect(over).not.toContain('Edit line');
  });
  it('prop: No lean + "Why no lean — signals split" + the reason', () => {
    expect(none).toMatch(/data-lean="none"[^>]*>No lean<\/span>/);
    expect(none).toContain('Why no lean — signals split (');
    expect(none).toContain('Pare only shows a lean when all three signals point the same way');
    expect(none).toContain('data-injury="Q"');
  });
  it('prop: line arrow (green ▲ over / red ▼ under, spoken "over 85.5")', () => {
    expect(over).toMatch(/role="img" aria-label="over" data-line-dir="over"[^>]*><svg[^>]*color:var\(--green\)[^>]*>.*?<\/svg><\/span>85\.5/);
    expect(over).not.toContain('o85.5');
    const under = view(savedProp({ id: 'p4', side: 'under', line: 6.5 }));
    expect(under).toMatch(/aria-label="under" data-line-dir="under"[^>]*><svg[^>]*color:var\(--red\);transform:rotate\(180deg\)/);
    expect(under).not.toContain('u6.5');
  });
  it('prop: not enough games (2 played)', () => {
    expect(thin).toContain('Not enough games yet');
    expect(thin).toContain('has played 2 games so far');
  });
});

describe('Leans prop detail — matchup data (prop engine v2, info only)', () => {
  const b = { ...bundle(), tables: v2Tables() };
  const e = evaluateProp(savedProp(), b);
  const data = propMatchupData(e, b, ODDS);
  const html = render(createElement(PropDetailView, { e, why: propWhy(e, b), loading: false, data }));

  it('prop: matchup data block with the defense-vs-role row and facts', () => {
    expect(html).toContain('Matchup data · info only');
    expect(html).toMatch(/vs RB1s, last 5: LV allowed <\/span><b[^>]*>97<\/b><span> rush yds · over 85\.5 in <\/span><b[^>]*>4 of 5<\/b>/);
    expect(html).toContain('LV allows rush yds / game to RBs');
    expect(html).toContain('ATL points the line implies');
  });
  it('prop: data rows never add a lean (one lean pill only, the v1 one)', () => {
    expect(html.match(/data-lean=/g)).toHaveLength(1);
  });
  it('prop: no tables in the bundle → no matchup data block', () => {
    expect(propMatchupData(e, bundle(), ODDS)).toBeNull();
    const plain = render(createElement(PropDetailView, { e, why: propWhy(e, bundle()), loading: false }));
    expect(plain).not.toContain('data-matchup-data');
  });
  it('prop: receptions → the defense vs each receiver role, his role marked; rushing → none', () => {
    const rec = evaluateProp(savedProp({ id: 'p8', playerId: LONDON.id, playerName: LONDON.name, position: 'WR', stat: 'rec', line: 5.5 }), b);
    const d = propMatchupData(rec, b, ODDS);
    expect(d?.roles.map((r) => [r.label, r.value])).toEqual([
      ["vs WR1s, last 4 · **Drake's role**", '5.5'],
      ['vs WR2s, last 4', '3.5'],
      ['vs RB1s, last 5', '3'],
    ]);
    expect(data?.roles).toEqual([]);
    const out = render(createElement(PropDetailView, { e: rec, why: propWhy(rec, b), loading: false, data: d }));
    expect(out).toContain('LV vs each receiver · receptions / game');
  });
  it('prop: anytime TD has no matchup data', () => {
    const td = evaluateProp(savedProp({ id: 'p9', stat: 'anytime_td', line: 0.5 }), b);
    expect(propMatchupData(td, b, ODDS)).toBeNull();
  });
});

describe('Leans week by week (prop research v3)', () => {
  const b = { ...bundle(), tables: v2Tables() };
  const e = evaluateProp(savedProp(), b);
  const data = propMatchupData(e, b, ODDS);

  it('prop: his weeks newest first, dot = cleared tonight’s line', async () => {
    const { default: PropHistory } = await import('@/components/leans/PropHistory');
    const html = render(createElement(PropHistory, { his: data?.his ?? [], defense: data?.defense ?? [], name: BIJAN.name, opp: 'LV', position: 'RB', stat: 'rush_yd', side: 'over', role: data?.role ?? null }));
    expect(html).toContain('Week by week');
    const weeks = [...html.matchAll(/data-hit="(yes|no)"/g)].map((m) => m[1]);
    // Bijan 64, 92, 112, 71, 97, 104 (W1–W6) vs 85.5 → newest first: W6 yes, W5 yes, W4 no, W3 yes, W2 yes, W1 no.
    expect(weeks).toEqual(['yes', 'yes', 'no', 'yes', 'yes', 'no']);
  });
  it('prop: the defense’s weeks — who it faced, allowed to RBs, his role’s player by name', async () => {
    const { default: PropHistory } = await import('@/components/leans/PropHistory');
    const html = render(createElement(PropHistory, { his: data?.his ?? [], defense: data?.defense ?? [], name: BIJAN.name, opp: 'LV', position: 'RB', stat: 'rush_yd', side: 'over', role: 'RB1', initialView: 'def' }));
    expect(html).toContain('data-view="def"');
    expect(html).toContain('RB1 that week');
    expect(html).toContain('I. Pacheco');
    expect((html.match(/role="row"/g) ?? []).length).toBe(1 + 6);
  });
  it('player: game log Usage view (targets, carries, share, snaps, aDOT, red zone)', async () => {
    const { default: GameLog } = await import('@/components/leans/GameLog');
    const html = render(createElement(GameLog, { games: BIJAN.games, position: 'RB', tables: v2Tables(), initialView: 'usage' }));
    expect(html).toContain('data-view="usage"');
    for (const h of ['Tgt', 'Car', 'Share', 'Snap', 'aDOT', 'RZ']) expect(html).toContain(`>${h}</span>`);
  });
  it('prop: depth rows — red-zone looks the defense allows, with a rank', () => {
    expect(data?.rows.some((r) => r.label === 'LV allows red-zone looks / game to RBs' && r.rank.startsWith('#'))).toBe(true);
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
      propsHref: '/leans/2026-w7-ATL-LV#props',
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
  it('player: last-4 bars, week cells with a bye, Season | Last 4, props link', () => {
    expect(html).toContain('Bijan · rush yds, last 4');
    expect((html.match(/data-weekcell/g) ?? []).length).toBe(3);
    expect(html).toContain('data-bye="true"');
    expect(html).toContain('Last 4');
    expect(html).toContain('href="/leans/2026-w7-ATL-LV#props"');
    expect(html).toContain('See prop lines for Bijan');
  });
});

describe('Leans track record (honesty note)', () => {
  it('list: shows the measured prop-lean record under PROP LEANS', () => {
    const html = render(createElement(LeansListView, { week: 7, status: 'ready', groups: [], props: [], propsState: 'ready' }));
    expect(html).toContain('2025 317–273 (−2.7%) · 2024 439–355 (−5.6%)');
    expect(html).toContain('not an edge');
  });
});

describe('Leans player game log (Wave C1)', () => {
  it('player: every game, newest first, TD column', async () => {
    const { GameLog } = await import('@/components/leans/PlayerVsDefenseView');
    const html = render(createElement(GameLog, { games: BIJAN.games }));
    expect(html).toContain('Season game log');
    expect((html.match(/role="row"/g) ?? []).length).toBe(BIJAN.games.length + 1);
    const weeks = [...html.matchAll(/role="cell" style="[^"]*">(\d+)<\/span>/g)].map((m) => Number(m[1]));
    expect(weeks[0]).toBe(Math.max(...BIJAN.games.map((g) => g.week)));
  });
});
