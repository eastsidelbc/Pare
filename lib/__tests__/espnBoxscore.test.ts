/**
 * Aggregator parity (My Team P2 / F3a): the extracted pure functions must give
 * Compare's season yards-allowed EXACTLY what the old inline espnStats code did.
 * `legacy*` below are verbatim copies of the pre-extraction logic.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  aggregateYardsAllowed,
  parseGameBox,
  toTeamGameLines,
  type EspnSummaryResponse,
  type EspnSummaryTeam,
  type GameTeamYards,
  type YardsAllowed,
} from '../espnBoxscore';

const summary = JSON.parse(
  readFileSync(new URL('../myteam/__fixtures__/espn-summary-boxscore.json', import.meta.url), 'utf8'),
) as EspnSummaryResponse;

// ── verbatim pre-extraction logic (lib/espnStats.ts @ 0ff505b) ──────────────
function legacyParse(data: EspnSummaryResponse): GameTeamYards[] | null {
  const teams = data.boxscore?.teams ?? [];
  if (teams.length !== 2) return null;
  const statVal = (t: EspnSummaryTeam, name: string): number | null => {
    const s = t.statistics?.find((x) => x.name === name);
    if (!s) return null;
    if (typeof s.value === 'number' && Number.isFinite(s.value)) return s.value;
    const n = parseFloat(String(s.displayValue ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  const thirdDown = (t: EspnSummaryTeam): { conv: number; att: number } => {
    const s = t.statistics?.find((x) => x.name === 'thirdDownEff');
    const m = String(s?.displayValue ?? '').match(/^\s*(\d+)\s*-\s*(\d+)\s*$/);
    if (!m) return { conv: 0, att: 0 };
    return { conv: parseInt(m[1], 10), att: parseInt(m[2], 10) };
  };
  const out: GameTeamYards[] = [];
  for (const t of teams) {
    const id = t.team?.id;
    const total = statVal(t, 'totalYards');
    const pass = statVal(t, 'netPassingYards');
    const rush = statVal(t, 'rushingYards');
    if (!id || total === null || pass === null || rush === null) return null;
    const td = thirdDown(t);
    out.push({ teamId: id, total, pass, rush, td3Conv: td.conv, td3Att: td.att });
  }
  return out;
}

function legacyAggregate(games: Array<GameTeamYards[] | null>, idToName: Map<string, string>) {
  const allowed = new Map<string, YardsAllowed>();
  const ensureAllowed = (name: string): YardsAllowed => {
    let v = allowed.get(name);
    if (!v) {
      v = { total_yards: 0, pass_yds: 0, rush_yds: 0, td3Conv: 0, td3Att: 0, games: 0 };
      allowed.set(name, v);
    }
    return v;
  };
  let counted = 0;
  let skipped = 0;
  for (const g of games) {
    if (!g || g.length !== 2) { skipped++; continue; }
    const [x, y] = g;
    const nameX = idToName.get(x.teamId);
    const nameY = idToName.get(y.teamId);
    if (!nameX || !nameY) { skipped++; continue; }
    const aX = ensureAllowed(nameX);
    aX.total_yards += y.total; aX.pass_yds += y.pass; aX.rush_yds += y.rush;
    aX.td3Conv += y.td3Conv; aX.td3Att += y.td3Att; aX.games += 1;
    const aY = ensureAllowed(nameY);
    aY.total_yards += x.total; aY.pass_yds += x.pass; aY.rush_yds += x.rush;
    aY.td3Conv += x.td3Conv; aY.td3Att += x.td3Att; aY.games += 1;
    counted++;
  }
  return { allowed: Object.fromEntries(allowed), counted, skipped };
}
// ─────────────────────────────────────────────────────────────────────────────

const yards = (teamId: string, total: number, pass: number, rush: number, c = 4, a = 11): GameTeamYards => ({
  teamId, total, pass, rush, td3Conv: c, td3Att: a,
});
const idToName = new Map([['1', 'Alpha'], ['2', 'Bravo'], ['3', 'Charlie'], ['5', 'Cleveland Browns'], ['23', 'Pittsburgh Steelers']]);

describe('parseGameBox (fixture box score: PIT @ CLE, week 4)', () => {
  const { teams } = parseGameBox(summary);

  it('yards fields equal the legacy parser exactly', () => {
    const legacy = legacyParse(summary);
    expect(legacy).not.toBeNull();
    expect(teams?.map(({ teamId, total, pass, rush, td3Conv, td3Att }) => ({ teamId, total, pass, rush, td3Conv, td3Att }))).toEqual(legacy);
  });
  it('reads the extra My Team fields', () => {
    const pit = teams?.find((t) => t.teamId === '23');
    const cle = teams?.find((t) => t.teamId === '5');
    expect(pit).toMatchObject({ points: 24, passTd: 3, rushTd: 0, interceptions: 2, sacks: 5, fumblesLost: 0, turnovers: 2, redZoneAtt: 3, drives: 12 });
    expect(cle).toMatchObject({ points: 27, passTd: 1, rushTd: 2, interceptions: 1, sacks: 2, fumblesLost: 1, turnovers: 2, redZoneAtt: 2, drives: 13 });
  });
  it('missing required yards → null + which team', () => {
    const broken: EspnSummaryResponse = {
      boxscore: { teams: [{ team: { id: '9' }, statistics: [] }, { team: { id: '8' }, statistics: [] }] },
    };
    expect(parseGameBox(broken)).toEqual({ teams: null, missingTeam: '9' });
    expect(parseGameBox({})).toEqual({ teams: null });
  });
});

describe('aggregateYardsAllowed parity with the legacy aggregation', () => {
  const fixtureGame = legacyParse(summary);
  const games: Array<GameTeamYards[] | null> = [
    fixtureGame,
    [yards('1', 350, 250, 100), yards('2', 410, 300, 110, 7, 13)],
    [yards('2', 280.5, 180, 100.5), yards('3', 199, 120, 79, 2, 10)],
    [yards('1', 1_200, 900, 300), yards('3', 0, 0, 0, 0, 0)],
    null, // failed box score
    [yards('1', 300, 200, 100)], // malformed (one team)
    [yards('1', 300, 200, 100), yards('99', 10, 5, 5)], // unknown team id
  ];

  it('season totals, games, counted and skipped are identical', () => {
    const legacy = legacyAggregate(games, idToName);
    const next = aggregateYardsAllowed(games, idToName);
    expect(next.allowed).toEqual(legacy.allowed);
    expect(next.counted).toBe(legacy.counted);
    expect(next.skipped).toBe(legacy.skipped);
    expect(next.counted).toBe(4);
    expect(next.skipped).toBe(3);
  });
  it('Σ allowed === Σ gained (consistency bookkeeping)', () => {
    const { allowed, gained } = aggregateYardsAllowed(games, idToName);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    expect(sum(Object.values(allowed).map((v) => v.total_yards))).toBe(sum(Object.values(gained).map((v) => v.total)));
  });
});

describe('toTeamGameLines', () => {
  const { teams } = parseGameBox(summary);
  const lines = toTeamGameLines(
    [
      { week: 4, eventId: 'e1', teams },
      { week: 4, eventId: 'e2', teams: null },
    ],
    new Map([['5', 'CLE'], ['23', 'PIT']]),
  );
  it('two lines per game, each with its opponent and points allowed', () => {
    expect(lines).toHaveLength(2);
    const pit = lines.find((l) => l.team === 'PIT');
    expect(pit).toMatchObject({ opponent: 'CLE', week: 4, points: 24, pointsAllowed: 27, passTd: 3, sacks: 5 });
    expect(lines.find((l) => l.team === 'CLE')).toMatchObject({ opponent: 'PIT', pointsAllowed: 24 });
  });
});
