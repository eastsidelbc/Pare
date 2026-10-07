/**
 * League switcher — capsule button + Neon Frame dropdown (same look as the Home
 * WeekControl menu). One league at a time; the last row unlinks the account.
 * SKELETON styling (P3) — final style picked at the P4 mockup gate.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MENU_ROW_H, menuHeader, menuRowStyle, menuSurface } from '@/components/ui/neonMenu';
import type { FantasyLeague } from '@/lib/myteam/types';

interface Props {
  leagues: FantasyLeague[];
  activeId: string | null;
  onSelect: (leagueId: string) => void;
  onUnlink: () => void;
}

export default function LeagueSwitcher({ leagues, activeId, onSelect, onUnlink }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = leagues.find((l) => l.leagueId === activeId) ?? null;

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

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="touch-optimized flex max-w-full items-center gap-1.5 rounded-full px-3 active:opacity-70"
        style={{ height: 44, background: 'var(--nav-bg)', border: '1px solid var(--glass-edge)', color: 'var(--gold-bright)', fontSize: 13, fontWeight: 700 }}
      >
        <span className="truncate">{active?.name ?? 'Choose a league'}</span>
        <ChevronDown size={13} aria-hidden style={{ flex: 'none', transition: 'transform .18s ease', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose a league"
          className="absolute left-0 z-50 overflow-y-auto"
          style={{
            ...menuSurface,
            top: 'calc(100% + 6px)',
            width: 260,
            maxHeight: MENU_ROW_H * 8 + 30,
            borderRadius: 'var(--radius-md)',
            overscrollBehavior: 'contain',
          }}
        >
          <div className="px-3 pb-1.5 pt-2.5" style={menuHeader}>League</div>
          {leagues.map((l, i) => {
            const isActive = l.leagueId === activeId;
            return (
              <button
                key={l.leagueId}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setOpen(false);
                  if (!isActive) onSelect(l.leagueId);
                }}
                className="flex w-full flex-col items-start justify-center px-3 text-left touch-optimized active:opacity-70"
                style={{ ...menuRowStyle(i, isActive), height: 44 }}
              >
                <span className="w-full truncate" style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--gold-bright)' : 'var(--text)' }}>
                  {l.name}
                </span>
                <span style={{ fontSize: 9, color: 'var(--subtext)' }}>
                  {l.totalRosters} teams · {l.status.replace('_', ' ')}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onUnlink();
            }}
            className="flex w-full items-center px-3 text-left touch-optimized active:opacity-70"
            style={{ ...menuRowStyle(leagues.length, false), height: 44, fontSize: 12, fontWeight: 700, color: 'var(--subtext)' }}
          >
            Use a different Sleeper username
          </button>
        </div>
      )}
    </div>
  );
}
