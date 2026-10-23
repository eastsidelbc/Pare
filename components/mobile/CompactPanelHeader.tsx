/**
 * Compact Panel Header — slim section bar inside a neon-frame card (Round 5 "R").
 *
 *   OFFENSE                      STATS  PG | L4 | TOT   (STATS = metric picker, when the host allows)
 *
 * Team identity moved up to <MatchupHero> (wordmarks), so this is just the
 * section label + the per-game / last-4-average / total toggle. ~28px tall so
 * Offense AND Defense fit on one iPhone 14 Pro screen.
 */

'use client';

import { Fragment } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { DisplayMode } from '@/lib/useDisplayMode';

interface CompactPanelHeaderProps {
  type: 'offense' | 'defense';
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  /** Opens the metric picker (Wave B3); no button when the host can't change metrics. */
  onEditMetrics?: () => void;
}

const OPTIONS: ReadonlyArray<{ mode: DisplayMode; label: string; aria: string }> = [
  { mode: 'per-game', label: 'PG', aria: 'Switch to per-game' },
  { mode: 'last4', label: 'L4', aria: 'Switch to last 4 games average' },
  { mode: 'total', label: 'TOT', aria: 'Switch to total' },
];

export default function CompactPanelHeader({ type, displayMode, onDisplayModeChange, onEditMetrics }: CompactPanelHeaderProps) {
  return (
    <div className="flex h-[28px] items-center justify-between pl-3 pr-1.5">
      <h2 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text)' }}>
        {type}
      </h2>
      <div className="flex items-center">
        {onEditMetrics && (
          <button
            type="button"
            onClick={onEditMetrics}
            className="pare-hit44 touch-optimized flex items-center active:opacity-70"
            style={{ gap: 4, marginRight: 6, padding: '4px 6px', fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'var(--subtext)' }}
            aria-label={`Choose ${type} stats`}
          >
            <SlidersHorizontal size={12} strokeWidth={2.4} aria-hidden />
            STATS
          </button>
        )}
        {OPTIONS.map(({ mode, label, aria }, i) => {
          const active = displayMode === mode;
          return (
            <Fragment key={mode}>
              {i > 0 && <span aria-hidden="true" style={{ color: 'var(--border)', fontSize: 9 }}>|</span>}
              <button
                type="button"
                onClick={() => !active && onDisplayModeChange(mode)}
                className="touch-optimized px-1.5 py-1"
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  color: active ? 'var(--gold-bright)' : 'var(--muted)',
                  transition: 'color .15s',
                }}
                aria-label={aria}
                aria-pressed={active}
              >
                {label}
              </button>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
