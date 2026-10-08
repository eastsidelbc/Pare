/**
 * League switcher (design-system §9.4): a gold league capsule in the header
 * (36px drawn / 44px tap) opens the "Your leagues" bottom sheet — 64px rows
 * (name + format line, gold check on the current league) and a footer with the
 * linked Sleeper username + "Change username" (restarts onboarding).
 */

'use client';

import { Check, ChevronDown } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import type { FantasyLeague } from '@/lib/myteam/types';

export function LeagueCapsule({ name, onOpen }: { name: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`League: ${name}. Change league`}
      onClick={onOpen}
      className="pare-hit44 touch-optimized flex min-w-0 items-center gap-1.5 rounded-full active:opacity-70"
      style={{
        height: 36,
        maxWidth: 200,
        padding: '0 12px 0 14px',
        background: 'var(--nav-bg)',
        border: '1px solid var(--glass-edge)',
        color: 'var(--gold-bright)',
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <span className="truncate">{name}</span>
      <ChevronDown size={14} aria-hidden style={{ flex: 'none' }} />
    </button>
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  leagues: FantasyLeague[];
  activeId: string | null;
  /** Format line per league id (the current league has the richest one). */
  formatLine: (league: FantasyLeague) => string;
  username: string | null;
  onSelect: (leagueId: string) => void;
  onChangeUsername: () => void;
}

export function LeagueSheet({ open, onClose, leagues, activeId, formatLine, username, onSelect, onChangeUsername }: SheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Your leagues"
      closeLabel="Close league list"
      grab="header"
      header={
        <div className="px-4 pb-2 pt-3" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}>
          Your leagues
        </div>
      }
      style={{ maxWidth: 560, maxHeight: 'calc(var(--app-h, 100dvh) * 0.8)', paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
    >
      <ul className="min-h-0 flex-1 overflow-y-auto px-2" style={{ overscrollBehavior: 'contain' }}>
        {leagues.map((l) => {
          const current = l.leagueId === activeId;
          return (
            <li key={l.leagueId}>
              <button
                type="button"
                aria-current={current ? 'true' : undefined}
                onClick={() => {
                  onClose();
                  if (!current) onSelect(l.leagueId);
                }}
                className="touch-optimized flex w-full items-center gap-3 px-2 text-left active:opacity-70"
                style={{ minHeight: 64, borderRadius: 'var(--radius-md)', background: current ? 'var(--leader-tint)' : 'transparent' }}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate" style={{ fontSize: 15, fontWeight: 800, color: current ? 'var(--gold-bright)' : 'var(--text)' }}>
                    {l.name}
                  </span>
                  <span className="truncate" style={{ fontSize: 12, color: 'var(--subtext)' }}>
                    {formatLine(l)}
                  </span>
                </span>
                {current && <Check size={18} aria-label="Current league" style={{ flex: 'none', color: 'var(--gold-bright)' }} />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mx-4 mt-2 flex items-center justify-between gap-3 border-t pt-1" style={{ borderColor: 'var(--hairline)' }}>
        <span className="min-w-0 truncate" style={{ fontSize: 12, color: 'var(--subtext)' }}>
          Sleeper · <span style={{ color: 'var(--text)', fontWeight: 700 }}>{username ?? '—'}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            onClose();
            onChangeUsername();
          }}
          className="touch-optimized flex-none active:opacity-70"
          style={{ minHeight: 44, fontSize: 13, fontWeight: 700, color: 'var(--gold-bright)' }}
        >
          Change username
        </button>
      </div>
    </BottomSheet>
  );
}
