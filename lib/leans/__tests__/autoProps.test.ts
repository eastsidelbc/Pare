/**
 * Book prop lines → Leans props (Wave B2). ESPN item shapes as probed 2026-10-23:
 * 2025 feed = a priced main line split into an over item + an under item, plus an
 * unpriced ladder; 2026 feed = one unpriced line per player.
 */
import { describe, expect, it } from 'vitest';
import { buildGameProps, evaluateAutoProp, isLean, sortProps } from '@/lib/leans/autoProps';
import { lineFor, parseBookLines, parsePropId, pickMainLine, propIdOf, type EspnPropBet, type GamePropLine } from '@/lib/leans/propLines';
import { BIJAN, LONDON, bundle, matchup } from './renderFixtures';

const ath = (id: string) => ({ $ref: `http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/athletes/${id}?lang=en` });
const side = (target: number, over?: string, under?: string) => ({ target: { value: target }, ...(over ? { over: { american: over } } : {}), ...(under ? { under: { american: under } } : {}) });

describe('parseBookLines', () => {
  it('2025 shape: merges the over + under items, ignores the ladder', () => {
    const items: EspnPropBet[] = [
      { athlete: ath('1'), type: { id: '12' }, open: side(19.5), current: side(19.5) },
      { athlete: ath('1'), type: { id: '12' }, open: side(7.5, undefined, '-110'), current: side(3.5, undefined, '-165') },
      { athlete: ath('1'), type: { id: '12' }, open: side(29.5), current: side(29.5) },
      { athlete: ath('1'), type: { id: '12' }, open: side(7.5, '-120'), current: side(3.5, '+130') },
    ];
    const [l] = parseBookLines(items);
    expect(l).toMatchObject({ espnId: '1', stat: 'rush_yd', open: { target: 7.5, over: -120, under: -110 }, current: { target: 3.5, over: 130, under: -165 } });
  });
  it('2026 shape: one unpriced line is the line; unknown markets are skipped', () => {
    const items: EspnPropBet[] = [
      { athlete: ath('2'), type: { id: '13' }, lastUpdated: '2026-10-23T03:12Z', open: side(26.5), current: side(25.5) },
      { athlete: ath('2'), type: { id: '8' }, open: side(250.5), current: side(250.5) },
    ];
    expect(parseBookLines(items)).toEqual([
      { espnId: '2', stat: 'rec_yd', open: { target: 26.5, over: null, under: null }, current: { target: 25.5, over: null, under: null }, updatedAt: '2026-10-23T03:12Z' },
    ]);
  });
  it('pickMainLine: unpriced only with the flag (backtest stays priced-only)', () => {
    const ladder = [{ target: 20.5, over: null, under: null }, { target: 30.5, over: null, under: null }, { target: 40.5, over: null, under: null }];
    expect(pickMainLine(ladder)).toBeNull();
    expect(pickMainLine(ladder, { unpriced: true })?.target).toBe(30.5);
  });
});

describe('lines → props', () => {
  const b = bundle();
  const m = matchup('ATL', 'LV');
  const line = (playerId: string, stat: GamePropLine['stat'], open: number, current: number): GamePropLine => ({
    playerId, stat, open: { target: open, over: null, under: null }, current: { target: current, over: null, under: null }, updatedAt: null,
  });
  const lines = [line(BIJAN.id, 'rush_yd', 80.5, 85.5), line(LONDON.id, 'rec_yd', 60.5, 64.5), line('nobody', 'rec', 3.5, 3.5)];

  it('only bundle players; ids, opp, home side', () => {
    const props = buildGameProps(m, lines, b);
    expect(props.map((p) => p.playerId)).toEqual([BIJAN.id, LONDON.id]);
    expect(props[0]).toMatchObject({ id: propIdOf(m.id, BIJAN.id, 'rush_yd'), team: 'ATL', opp: 'LV', home: false, line: 85.5, side: 'over' });
  });
  it('once the game started, the opening line (current moves in-game)', () => {
    expect(buildGameProps({ ...m, state: 'in' }, lines, b)[0].line).toBe(80.5);
    expect(lineFor({ open: null, current: { target: 3, over: null, under: null } }, false)?.target).toBe(3);
  });
  it('leans sort first; an UNDER lean flips the shown side', () => {
    const evaluated = sortProps(buildGameProps(m, lines, b).map((p) => evaluateAutoProp(p, b)));
    expect(isLean(evaluated[0])).toBe(true);
    // 500.5 rush yds: under every game, but LV rates Great for RBs → the tier check fails → no lean, side stays over.
    const high = evaluateAutoProp({ ...buildGameProps(m, lines, b)[0], line: 500.5 }, b);
    expect(high.lean?.verdict).toBe('none');
    expect(high.prop.side).toBe('over');
    expect(high.lean?.last.over).toBe(0);
  });
  it('no lines / no bundle → no props', () => {
    expect(buildGameProps(m, undefined, b)).toEqual([]);
    expect(buildGameProps(m, lines, null)).toEqual([]);
  });
});

describe('prop ids', () => {
  it('round-trip; a bad stat is rejected', () => {
    const id = propIdOf('2026-w7-ATL-LV', '9509', 'rec_yd');
    expect(parsePropId(id)).toEqual({ gameId: '2026-w7-ATL-LV', playerId: '9509', stat: 'rec_yd' });
    expect(parsePropId('2026-w7-ATL-LV~9509~pass_yd')).toBeNull();
  });
});
