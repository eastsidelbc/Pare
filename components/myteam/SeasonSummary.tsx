/**
 * "Your season" line under the week bar (Wave A3, lib/myteam/leagueSeason.ts):
 * record · points rank · luck (actual wins − all-play expected wins) · bench points left.
 * One quiet line in the WeekBar's type scale; hidden before week 1 is scored.
 */

import type { LeagueSeason } from '@/lib/myteam/leagueSeason';
import { formatRank } from '@/utils/ordinal';

const signed = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x).toFixed(1)}`;

export default function SeasonSummary({ season }: { season: LeagueSeason | null | undefined }) {
  if (!season || season.weeks === 0) return null;
  const record = `${season.wins}-${season.losses}${season.ties ? `-${season.ties}` : ''}`;
  const parts = [
    `#${season.pointsRank} of ${season.teams} in points`,
    `Luck ${signed(season.luck)} W`,
    ...(season.benchLeft !== null ? [`${season.benchLeft.toFixed(1)} pts left on bench`] : []),
  ];
  const spoken = [
    `Your season: ${season.wins} wins, ${season.losses} losses${season.ties ? `, ${season.ties} ties` : ''}.`,
    `${formatRank(season.pointsRank)} of ${season.teams} in points scored.`,
    `Luck ${signed(season.luck)} wins: your record compared with how your weekly scores would do against every team (all-play ${season.allPlay.wins}-${season.allPlay.losses}).`,
    season.benchLeft !== null ? `${season.benchLeft.toFixed(1)} points left on your bench.` : '',
  ].join(' ');
  return (
    <p data-season className="flex flex-wrap items-baseline tabular-nums" style={{ gap: '2px 8px', padding: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
      <span className="sr-only">{spoken}</span>
      <span aria-hidden style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--muted)' }}>
        YOUR SEASON
      </span>
      <span aria-hidden style={{ fontWeight: 800, color: 'var(--text)' }}>{record}</span>
      {parts.map((p) => (
        <span key={p} aria-hidden>
          · {p}
        </span>
      ))}
    </p>
  );
}
