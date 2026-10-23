/**
 * Core team stats → TeamStats fields (Wave B3). Fixture: real ESPN Core responses for DAL 2026
 * (own + /900 opponent split), trimmed to name/value (lib/__fixtures__/espn/core-team-stats-dal-2026.json).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFENSE_OPPONENT_FIELDS, flattenStats, mapCoreStats, type EspnStatsResponse } from '@/lib/espnStats';
import { AVAILABLE_METRICS } from '@/lib/metricsConfig';
import { transformTeamDataByMode } from '@/utils/teamDataTransform';

const fx = JSON.parse(readFileSync(new URL('../__fixtures__/espn/core-team-stats-dal-2026.json', import.meta.url), 'utf8')) as { own: EspnStatsResponse; opponent: EspnStatsResponse };
const own = mapCoreStats(flattenStats(fx.own));
const opp = mapCoreStats(flattenStats(fx.opponent), DEFENSE_OPPONENT_FIELDS);

describe('offense map — DAL 2026 after 6 games', () => {
  it('1:1 fields (first occurrence: sacks = taken)', () => {
    expect(own).toMatchObject({ g: '6', points: '151', pass_fd: '87', rush_fd: '33', penalties: '45', penalty_yds: '422', pen_fd: '20', red_zone_td_pct: '77.27', fourth_down_pct: '50', takeaways: '3', turnover_diff: '-4', sacks_taken: '7', pass_cmp_pct: '66.3', passer_rating: '90.1' });
  });
  it('derived: yds/play, explosive plays, possession minutes', () => {
    expect(Number(own.yds_per_play_offense)).toBeCloseTo(2059 / 375, 6);
    expect(own.explosive_plays).toBe('17');
    expect(Number(own.time_of_possession)).toBeCloseTo(9945 / 60, 6);
  });
});

describe('defense opponent split — allowed fields only', () => {
  it('only DEFENSE_OPPONENT_FIELDS, never points / yards / takeaways', () => {
    expect(Object.keys(opp).sort()).toEqual([...DEFENSE_OPPONENT_FIELDS].sort());
    expect(opp.points).toBeUndefined();
    expect(opp.takeaways).toBeUndefined();
    expect(opp.red_zone_td_pct).toBe('66.67');
    expect(opp.passer_rating).toBe('110.163');
  });
  it('every defense field is an allowed stat (offense higher-is-better → defense lower-is-better, bar swap holds)', () => {
    for (const f of DEFENSE_OPPONENT_FIELDS) {
      expect(AVAILABLE_METRICS[f]?.higherIsBetter, f).toBe(true);
      expect(AVAILABLE_METRICS[f]?.availableInDefense, f).toBe(true);
    }
  });
});

describe('per-game transform of the new fields', () => {
  const pg = transformTeamDataByMode({ team: 'Dallas Cowboys', ...own }, 'per-game');
  it('counts divide by games, rates and the rating do not', () => {
    expect(Number(pg?.explosive_plays)).toBeCloseTo(17 / 6, 6);
    expect(Number(pg?.time_of_possession)).toBeCloseTo(9945 / 60 / 6, 6);
    expect(Number(pg?.passer_rating)).toBeCloseTo(90.1, 6);
    expect(Number(pg?.red_zone_td_pct)).toBeCloseTo(77.27, 6);
    expect(Number(pg?.yds_per_play_offense)).toBeCloseTo(2059 / 375, 6);
  });
});
