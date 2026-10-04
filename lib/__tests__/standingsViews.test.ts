import { describe, it, expect } from 'vitest';
import type { ConferenceStandings, TeamStanding } from '@/lib/standings';
import { conferenceBySeed, leagueHasTies, playoffPicture, seedKind } from '@/lib/standingsViews';
import { getListTeamColor, contrastRatio, LIST_CARD_BG, LIST_LEADER_BG, LIST_MIN_CONTRAST } from '@/lib/teamColors';
import { NFL_TEAMS } from '@/lib/teams';

const team = (abbr: string, seed: number | null, ties = 0): TeamStanding => ({
  abbr, name: abbr, nickname: abbr, wins: 1, losses: 1, ties, pct: '.500',
  pointsFor: 10, pointsAgainst: 10, diff: '0', streak: 'W1', divRecord: '0-0', seed,
});

// 16 teams in 4 divisions, seeds scrambled across divisions (like ESPN).
const seeds = [3, 9, 14, 16, 4, 8, 11, 13, 1, 6, 10, 15, 2, 5, 7, 12];
const conf: ConferenceStandings = {
  conference: 'AFC',
  divisions: (['North', 'South', 'East', 'West'] as const).map((division, d) => ({
    division, label: `AFC ${division}`,
    teams: seeds.slice(d * 4, d * 4 + 4).map((s) => team(`T${s}`, s)),
  })),
};

describe('seedKind', () => {
  it('1–4 division, 5–7 wild card, 8+ out, null none', () => {
    expect([1, 4, 5, 7, 8, 16, null].map(seedKind)).toEqual(['division', 'division', 'wildcard', 'wildcard', 'out', 'out', 'none']);
  });
});

describe('conferenceBySeed', () => {
  it('orders all 16 teams 1 → 16', () => {
    expect(conferenceBySeed(conf).map((t) => t.seed)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });
  it('keeps unseeded teams at the end in ESPN order', () => {
    const c: ConferenceStandings = { conference: 'NFC', divisions: [{ division: 'North', label: 'NFC North', teams: [team('A', null), team('B', 2), team('C', null), team('D', 1)] }] };
    expect(conferenceBySeed(c).map((t) => t.abbr)).toEqual(['D', 'B', 'A', 'C']);
  });
});

describe('playoffPicture', () => {
  const p = playoffPicture(conf);
  it('seeds 1–7 in order', () => expect(p.seeds.map((t) => t.seed)).toEqual([1, 2, 3, 4, 5, 6, 7]));
  it('wild card round is 7@2, 6@3, 5@4 (1 has the bye)', () => {
    expect(p.wildCard.map(([a, h]) => [a.seed, h.seed])).toEqual([[7, 2], [6, 3], [5, 4]]);
  });
  it('hunt = first three out', () => expect(p.hunt.map((t) => t.seed)).toEqual([8, 9, 10]));
  it('no seeds → empty picture, no crash', () => {
    const c: ConferenceStandings = { conference: 'AFC', divisions: [{ division: 'North', label: 'AFC North', teams: [team('A', null)] }] };
    expect(playoffPicture(c)).toEqual({ seeds: [], wildCard: [], hunt: [] });
  });
});

describe('leagueHasTies (T column rule: league-wide)', () => {
  it('false with no ties, true when any one team has a tie', () => {
    expect(leagueHasTies([conf])).toBe(false);
    const withTie: ConferenceStandings = { ...conf, divisions: [{ ...conf.divisions[0], teams: [team('X', 1, 1)] }] };
    expect(leagueHasTies([conf, withTie])).toBe(true);
  });
});

describe('getListTeamColor (Standings small text)', () => {
  it('every team clears 4.5:1 on the card and on the leader tint', () => {
    for (const t of NFL_TEAMS) {
      const c = getListTeamColor(t.abbr);
      expect(c, t.abbr).not.toBeNull();
      expect(contrastRatio(c as string, LIST_CARD_BG), t.abbr).toBeGreaterThanOrEqual(LIST_MIN_CONTRAST);
      expect(contrastRatio(c as string, LIST_LEADER_BG), t.abbr).toBeGreaterThanOrEqual(LIST_MIN_CONTRAST);
    }
  });
  it('unknown team → null', () => expect(getListTeamColor('XXX')).toBeNull());
});
