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
  const showClose = comparisons.length > 1;

  return (
    <div
      className="flex-none flex items-center gap-1.5 overflow-x-auto px-2 py-1 no-scrollbar"
      style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
      role="tablist"
      aria-label="Comparisons"
    >
      {comparisons.map((c) => {
        const isActive = c.id === activeId;
        return (
          <div
            key={c.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(c.id)}
            className="group flex items-center gap-1 rounded-full pl-2.5 pr-1 py-1 text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors select-none"
            style={{
              background: isActive ? 'var(--gold)' : 'rgba(255,255,255,.05)',
              color: isActive ? '#0a0e1a' : 'var(--subtext)',
              border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
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
                className="grid place-items-center rounded-full transition-opacity hover:opacity-100"
                style={{
                  width: 16,
                  height: 16,
                  opacity: 0.7,
                  color: isActive ? '#0a0e1a' : 'var(--subtext)',
                }}
              >
                <X size={11} strokeWidth={2.5} />
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
          className="flex-none ml-auto grid place-items-center rounded-full touch-optimized transition-opacity active:opacity-70"
          style={{
            width: 34,
            height: 34,
            background: canAdd ? 'rgba(245,200,66,0.15)' : 'rgba(255,255,255,.05)',
            border: `1px solid ${canAdd ? 'transparent' : 'var(--border)'}`,
            color: canAdd ? 'var(--gold)' : 'var(--muted)',
            opacity: canAdd ? 1 : 0.4,
            cursor: canAdd ? 'pointer' : 'not-allowed',
          }}
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
