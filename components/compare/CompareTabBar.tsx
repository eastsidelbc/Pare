/**
 * CompareTabBar — compact Sleeper-style tab/dot indicator for the Compare
 * workspace. Shows one chip per comparison (teamA·teamB abbreviations), marks
 * the active one, tapping a chip calls onSelect, the × calls onClose.
 *
 * Presentational only — all state lives in the comparisons store. An optional
 * `onAdd` renders the "+" affordance (create flow is Vision Step 3; when no
 * handler is passed, no button shows but the layout is already prepared for it).
 */

'use client';

import { X, Plus } from 'lucide-react';
import { teamNameToAbbr } from '@/lib/teams';
import { getMatchupPalettes } from '@/lib/teamColors';

interface TabItem {
  id: string;
  teamA: string;
  teamB: string;
}

interface CompareTabBarProps {
  comparisons: TabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  /** When provided, renders the "+" add affordance (Vision Step 3). */
  onAdd?: () => void;
  /** Disable "+" once the cap is hit. */
  canAdd?: boolean;
}

function shortLabel(teamA: string, teamB: string): string {
  const a = teamNameToAbbr(teamA);
  const b = teamNameToAbbr(teamB);
  if (!a && !b) return 'New'; // blank comparison (just created via "+")
  return `${a ?? '—'} · ${b ?? '—'}`;
}

export default function CompareTabBar({
  comparisons,
  activeId,
  onSelect,
  onClose,
  onAdd,
  canAdd = true,
}: CompareTabBarProps) {
  // Every tab can close — closing the last one leaves a blank "pick 2 teams"
  // tab. Only a lone blank tab hides its × (closing it would change nothing).
  const loneBlank = comparisons.length === 1 && !(comparisons[0].teamA && comparisons[0].teamB);
  const showClose = !loneBlank;

  return (
    <div
      className="flex-none flex items-center gap-1 overflow-x-auto px-2 py-1 no-scrollbar"
      style={{ background: 'var(--bg-deep)' }}
      role="tablist"
      aria-label="Comparisons"
    >
      {comparisons.map((c) => {
        const isActive = c.id === activeId;
        // Every pill is washed in its two teams' colors (Round 5 "R"): bright when
        // active, dimmed when inactive so you can still tell matchups apart.
        const pal = c.teamA && c.teamB ? getMatchupPalettes(c.teamA, c.teamB) : null;
        const wash = (alpha: number) =>
          pal ? `linear-gradient(90deg, rgba(${pal.a.rgb}, ${alpha}), rgba(${pal.b.rgb}, ${alpha}))` : 'transparent';
        const activeBg = pal ? wash(0.22) : 'color-mix(in srgb, var(--text) 8%, transparent)';
        const inactiveBg = wash(0.14);
        return (
          <div
            key={c.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(c.id)}
            className="group flex items-center gap-1 rounded-full pl-2.5 pr-1 py-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors select-none"
            style={{
              background: isActive ? activeBg : inactiveBg,
              color: isActive ? 'var(--text)' : 'var(--muted)',
              border: `1px solid ${isActive ? 'color-mix(in srgb, var(--text) 28%, transparent)' : 'color-mix(in srgb, var(--text) 10%, transparent)'}`,
            }}
          >
            <span className="tabular-nums">{shortLabel(c.teamA, c.teamB)}</span>
            {showClose && (
              <button
                type="button"
                aria-label={`Close ${shortLabel(c.teamA, c.teamB)} comparison`}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(c.id);
                }}
                className="grid place-items-center rounded-full transition-opacity hover:opacity-100 active:opacity-60"
                style={{
                  width: 14,
                  height: 14,
                  // Soft gold — visible, but quieter than the gold "+" (Neon Frame).
                  color: `color-mix(in srgb, var(--gold-bright) ${isActive ? 70 : 50}%, transparent)`,
                }}
              >
                <X size={10} strokeWidth={2.5} />
              </button>
            )}
          </div>
        );
      })}

      {onAdd && (
        <button
          type="button"
          aria-label={canAdd ? 'Add comparison' : 'Maximum comparisons reached'}
          title={canAdd ? 'New comparison' : 'Max comparisons reached'}
          disabled={!canAdd}
          onClick={onAdd}
          className="flex-none grid place-items-center rounded-full touch-optimized transition-opacity active:opacity-70"
          style={{
            width: 24,
            height: 24,
            background: canAdd ? 'color-mix(in srgb, var(--gold-bright) 8%, transparent)' : 'transparent',
            border: `1px solid ${canAdd ? 'color-mix(in srgb, var(--gold-bright) 55%, transparent)' : 'var(--border)'}`,
            color: canAdd ? 'var(--gold-bright)' : 'var(--muted)',
            opacity: canAdd ? 1 : 0.4,
            cursor: canAdd ? 'pointer' : 'not-allowed',
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
