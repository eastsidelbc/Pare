/**
 * The "why" inside an expanded row or pinned card (design-system §9.4):
 * pts/g-allowed hero for this week's opponent, then the position's opponent
 * stats with league ranks (same Season / Last 4 window as the meter).
 */

import { whyStats, type DefenseGame, type OffenseGame } from '@/lib/myteam/defenseProfile';
import type { LeagueBundle } from '@/lib/myteam/apiTypes';
import type { RatingWindow } from '@/lib/myteam/types';
import type { RosterRow } from '@/lib/myteam/viewModel';
import { POSITION_PLURAL, scoringLabel, tierColor } from './style';

export interface DetailContext {
  window: RatingWindow;
  format: LeagueBundle['league']['format'];
  defenseLog: readonly DefenseGame[];
  offenseLog: readonly OffenseGame[];
}

const WINDOW_TEXT: Record<RatingWindow, string> = { season: 'Season', last4: 'Last 4 games' };

function formatValue(key: string, value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (key === 'rz_per_drive') return value.toFixed(2);
  return value.toFixed(1);
}

export default function MatchupDetails({ row, ctx }: { row: RosterRow; ctx: DetailContext }) {
  const { player, thisWeek } = row;
  const opp = thisWeek.kind === 'game' ? thisWeek.opp : null;
  const rating = thisWeek.rating;

  if (thisWeek.kind === 'bye') {
    return <p style={{ fontSize: 13, color: 'var(--subtext)' }}>On bye in week {thisWeek.week}.</p>;
  }
  if (!opp || !player.position || !rating) {
    return <p style={{ fontSize: 13, color: 'var(--subtext)' }}>No matchup rating for week {thisWeek.week} yet.</p>;
  }

  const stats = whyStats(player.position, opp, ctx.defenseLog, ctx.offenseLog, ctx.window);
  const rank = `${rating.isTied ? 'T-' : '#'}${rating.rank}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2.5">
        <span className="tabular-nums" style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, color: tierColor(rating.tier) }}>
          {rating.perGame.toFixed(1)}
        </span>
        <span style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--subtext)' }}>
          {scoringLabel(ctx.format)} pts/g {opp} allows to {POSITION_PLURAL[player.position]}
          <br />
          <span style={{ color: 'var(--text)', fontWeight: 700 }}>
            {rating.label} {rank}
          </span>{' '}
          of 32 · {WINDOW_TEXT[ctx.window]}
        </span>
      </div>

      {stats.length > 0 && (
        <div>
          <dl className="overflow-hidden" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)' }}>
            {stats.map((s, i) => (
              <div
                key={s.key}
                className="flex items-center justify-between px-3"
                style={{ minHeight: 36, borderTop: i > 0 ? '1px solid var(--hairline)' : 'none', background: 'var(--nav-bg)' }}
              >
                <dt style={{ fontSize: 12, color: 'var(--subtext)' }}>{s.label}</dt>
                <dd className="flex items-center gap-2 tabular-nums" style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                  {formatValue(s.key, s.value)}
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)', minWidth: 40, textAlign: 'right' }}>{s.formattedRank}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-1" style={{ fontSize: 11, color: 'var(--subtext)' }}>
            {player.position === 'DEF' ? `${opp} offense` : `${opp} defense`}, per game · rank 1st = best in the league at that stat.
          </p>
        </div>
      )}
    </div>
  );
}
