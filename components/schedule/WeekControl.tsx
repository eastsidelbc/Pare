/**
 * WeekControl — the week selector that lives in the top title bar (right side).
 *
 *   ‹  Week 3 ▾  ›
 *
 * Three ways to move, all driven by ScheduleScreen (which owns the scroller):
 *   • ‹ ›            step one week (disabled at 1 / 18)
 *   • tap "Week N"   opens a scrollable dropdown of all 18 weeks → jump anywhere
 *   • (scrolling)    the "N" is fed from the active week and updates on its own
 *
 * Presentational + local open/close only; no data or scroll logic here.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { MIN_WEEK, MAX_WEEK, WEEK_DATE_RANGES } from '@/lib/schedule';

interface WeekControlProps {
  activeWeek: number;
  onStep: (dir: -1 | 1) => void;
  onJump: (week: number) => void;
}

const ALL_WEEKS = Array.from({ length: MAX_WEEK - MIN_WEEK + 1 }, (_, i) => MIN_WEEK + i);

export default function WeekControl({ activeWeek, onStep, onJump }: WeekControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const atMin = activeWeek <= MIN_WEEK;
  const atMax = activeWeek >= MAX_WEEK;

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // When opening, bring the current week into view in the menu.
  useEffect(() => {
    if (open) activeItemRef.current?.scrollIntoView({ block: 'center' });
  }, [open]);

  const pick = (w: number) => {
    setOpen(false);
    onJump(w);
  };

  return (
    <div ref={rootRef} className="relative flex flex-none items-center">
      <div
        className="flex items-center"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
      >
        <StepButton label="Previous week" disabled={atMin} onClick={() => onStep(-1)}>
          <ChevronLeft size={17} />
        </StepButton>

        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 items-center gap-1 px-2 font-bold tabular-nums touch-optimized active:opacity-70"
          style={{ fontSize: '13px', color: 'var(--gold)' }}
        >
          Week {activeWeek}
          <ChevronDown
            size={13}
            style={{ transition: 'transform .18s ease', transform: open ? 'rotate(180deg)' : 'none' }}
          />
        </button>

        <StepButton label="Next week" disabled={atMax} onClick={() => onStep(1)}>
          <ChevronRight size={17} />
        </StepButton>
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-50 overflow-y-auto"
          style={{
            top: 'calc(100% + 6px)',
            width: 150,
            maxHeight: 264,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-pop)',
            padding: 4,
            overscrollBehavior: 'contain',
          }}
        >
          {ALL_WEEKS.map((w) => {
            const isActive = w === activeWeek;
            return (
              <button
                key={w}
                ref={isActive ? activeItemRef : undefined}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => pick(w)}
                className="flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left touch-optimized active:opacity-70"
                style={{ background: isActive ? 'rgba(212,168,67,0.14)' : 'transparent' }}
              >
                <span
                  className="font-semibold tabular-nums"
                  style={{ fontSize: '13px', color: isActive ? 'var(--gold)' : 'var(--text)' }}
                >
                  Week {w}
                </span>
                {WEEK_DATE_RANGES[w] && (
                  <span className="tabular-nums" style={{ fontSize: '9px', color: 'var(--muted)' }}>
                    {WEEK_DATE_RANGES[w]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`flex h-9 w-9 items-center justify-center touch-optimized ${disabled ? '' : 'active:opacity-60'}`}
      style={{
        color: disabled ? 'var(--muted)' : 'var(--text)',
        opacity: disabled ? 0.35 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {children}
    </button>
  );
}
