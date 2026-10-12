/**
 * The "why" inside an expanded row or pinned card (design-system §9.4, P4 final
 * mockup): a one-line hero — tier-colored pts/g-allowed number + "PPR pts/g LV
 * allows to QBs · #27 of 32" — then the position's opponent stats ("Pass yds /
 * game", rank "#28") in one bordered box. The Season / Last 4 window lives on
 * the toggle, so it isn't repeated here.
 */

import { whyStats, type DefenseGame, type OffenseGame } from '@/lib/myteam/defenseProfile';
import type { LeagueBundle } from '@/lib/myteam/apiTypes';
import type { RatingWindow } from '@/lib/myteam/types';
import type { RosterRow } from '@/lib/myteam/viewModel';
import { positionPlural, rankText, scoringLabel, tierColor } from './style';

export interface DetailContext {
  window: RatingWindow;
  format: LeagueBundle['league']['format'];
  defenseLog: readonly DefenseGame[];
  offenseLog: readonly OffenseGame[];
}

function formatValue(key: string, value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (key === 'rz_per_drive' || key === 'pass_td' || key === 'rush_td' || key === 'int') return value.toFixed(2);
  return value.toFixed(1);
}

export default function MatchupDetails({ row, ctx, compact = false }: { row: RosterRow; ctx: DetailContext; compact?: boolean }) {
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
  const rank = rankText(rating.rank, rating.isTied);

  return (
    <>
      <div data-hero className="flex items-baseline" style={{ gap: 8 }}>
        <span className="flex-none tabular-nums" style={{ fontSize: compact ? 22 : 26, fontWeight: 800, lineHeight: 1.1, color: tierColor(rating.tier) }}>
          {rating.perGame.toFixed(1)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>
          {scoringLabel(ctx.format)} pts/g {opp} allows to {positionPlural(player.position)} · {rank}
          {compact ? '' : ' of 32'}
        </span>
      </div>

      {stats.length > 0 && (
        <dl data-why className="overflow-hidden" style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--nav-bg)' }}>
          {stats.map((s, i) => (
            <div
              key={s.key}
              className="flex items-center justify-between"
              style={{ minHeight: compact ? 34 : 36, padding: '0 10px', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}
            >
              <dt data-why-label style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>
                {s.label} / {s.unit}
              </dt>
              <dd className="flex tabular-nums" style={{ gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{formatValue(s.key, s.value)}</span>
                <span data-why-rank style={{ minWidth: 28, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>
                  {Number.isFinite(s.rank) ? rankText(s.rank, s.isTied) : '—'}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
