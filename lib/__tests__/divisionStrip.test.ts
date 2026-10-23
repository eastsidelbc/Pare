/** Leaders division strip (components/leaderboards/DivisionStrip.tsx) — react-dom/server render. */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DivisionStrip from '@/components/leaderboards/DivisionStrip';
import type { ConferenceStandings, TeamStanding } from '@/lib/standings';

const team = (abbr: string, wins: number, losses: number, ties = 0): TeamStanding => ({
  abbr, name: abbr, nickname: abbr, wins, losses, ties, pct: '.500', pointsFor: 0, pointsAgainst: 0, diff: '0',
  streak: '—', divRecord: '0-0', seed: null, homeRecord: '—', roadRecord: '—', confRecord: '—', gamesBehind: '—', clincher: null,
});

const conferences: ConferenceStandings[] = [
  {
    conference: 'AFC',
    divisions: [
      { division: 'East', label: 'AFC East', teams: [team('BUF', 6, 1), team('MIA', 4, 3), team('NYJ', 2, 4, 1), team('NE', 1, 6)] },
      { division: 'West', label: 'AFC West', teams: [] },
    ],
  },
];

const html = (c: ConferenceStandings[]) => renderToStaticMarkup(createElement(DivisionStrip, { conferences: c }));

describe('DivisionStrip', () => {
  it('one card per division with teams, each → /standings with a readable label', () => {
    const out = html(conferences);
    expect(out.match(/href="\/standings"/g)).toHaveLength(1);
    expect(out).toContain('aria-label="AFC East standings: BUF 6-1, MIA 4-3, NYJ 2-4-1, NE 1-6"');
  });
  it('W-L, ties only when the team has one; leader row tinted', () => {
    const out = html(conferences);
    expect(out).toContain('>6-1<');
    expect(out).toContain('>2-4-1<');
    expect(out.match(/var\(--leader-tint\)/g)).toHaveLength(1);
  });
  it('hidden when ESPN never returned standings', () => {
    expect(html([{ conference: 'AFC', divisions: [{ division: 'East', label: 'AFC East', teams: [] }] }])).toBe('');
  });
});
