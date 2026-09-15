/**
 * PostGameBox — post-game box score for a FINISHED matchup, shown at the top of
 * the expanded accordion (above the season comparison).
 *
 * Players are laid out in a 2-column GRID paired by row (away[i] beside home[i])
 * so each row's height is the taller of the two cells — when one player's line
 * wraps (e.g. a QB who also ran), BOTH sides' next row drops together and stays
 * aligned. A continuous divider runs down the center. Each player shows a gold
 * full-PPR figure; the recap headline sits in italics below.
 *
 * Fetched lazily + cached by useGameSummary; renders nothing until a finished
 * game's row is opened, and nothing at all if the game has no data.
 */

'use client';

import { Fragment } from 'react';
import { useGameSummary, type PlayerLine, type TeamBox } from '@/lib/hooks/useGameSummary';
import type { Matchup } from '@/lib/schedule';

function PlayerCell({ line, align }: { line: PlayerLine | undefined; align: 'left' | 'right' }) {
  if (!line) return <div />;
  const right = align === 'right';
  return (
    <div className={right ? 'text-right' : 'text-left'}>
      <div className={`flex items-baseline gap-2 ${right ? 'flex-row-reverse' : ''}`}>
        <span className="min-w-0 flex-1 truncate" style={{ fontSize: '11.5px', color: 'var(--text)', fontWeight: 600 }}>
          <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{line.role}</span> {line.name}
        </span>
        <span className="flex-none tabular-nums" style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 700 }}>
          {line.ppr.toFixed(1)}
        </span>
      </div>
      <div className="tabular-nums" style={{ fontSize: '10px', color: 'var(--subtext)', lineHeight: 1.35 }}>
        {line.stat}
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="flex gap-3 p-3">
      {[0, 1].map((col) => (
        <div key={col} className="min-w-0 flex-1 space-y-2">
          <div className="skeleton rounded" style={{ width: 40, height: 13 }} />
          {[0, 1, 2].map((r) => (
            <div key={r} className="space-y-1">
              <div className="skeleton rounded" style={{ width: '70%', height: 11 }} />
              <div className="skeleton rounded" style={{ width: '50%', height: 9 }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function PostGameBox({ matchup }: { matchup: Matchup }) {
  const { data, loading, error } = useGameSummary(matchup.espnEventId);

  if (!matchup.espnEventId) return null;

  if (loading && !data) {
    return (
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <LoadingRows />
      </div>
    );
  }

  if (error || !data) return null;
  const away: TeamBox | undefined = data.byAbbr[matchup.away.abbr];
  const home: TeamBox | undefined = data.byAbbr[matchup.home.abbr];
  if (!away && !home && !data.headline) return null;

  const rowCount = Math.max(away?.lines.length ?? 0, home?.lines.length ?? 0);
  const rows = Array.from({ length: rowCount }, (_, i) => i);

  return (
    <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
      {/* Row-paired grid: away[i] and home[i] share a grid row → equal height →
          they stay aligned even when one side's line wraps. Continuous center
          divider sits in the middle of the column gap. */}
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-0"
          style={{ left: '50%', width: 1, background: 'var(--border)', transform: 'translateX(-0.5px)' }}
        />
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: '24px', rowGap: '8px' }}>
          {rows.map((i) => (
            <Fragment key={i}>
              <PlayerCell line={away?.lines[i]} align="left" />
              <PlayerCell line={home?.lines[i]} align="right" />
            </Fragment>
          ))}
        </div>
      </div>

      {data.headline && (
        <>
          <div className="mt-3 mb-2 h-px" style={{ background: 'var(--border)' }} />
          <p className="text-center italic" style={{ fontSize: '11px', lineHeight: 1.4, color: 'var(--subtext)' }}>
            {data.headline}
          </p>
        </>
      )}
    </div>
  );
}
