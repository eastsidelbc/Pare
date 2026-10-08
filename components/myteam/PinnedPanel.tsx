/**
 * iPad PINNED panel (design-system §9.4 "QE") — the right column at md+.
 * Pins stack in the order they were pinned. A pinned card starts short (name,
 * meter, next 5) and opens on a tap anywhere (down-arrow hint) to show pts/g,
 * why-stats and Open in Compare; ✕ unpins; "Clear all" empties the panel.
 */

'use client';

import { ChevronDown, GitCompareArrows, X } from 'lucide-react';
import type { RosterRow } from '@/lib/myteam/viewModel';
import MatchupDetails, { type DetailContext } from './MatchupDetails';
import { MatchupMeter, NextFiveBar } from './MatchupMeter';
import PositionCircle from './PositionCircle';
import { SectionHeading } from './RosterView';
import { ACTION_BUTTON, LIST_CARD } from './style';

interface Props {
  rows: RosterRow[];
  open: ReadonlySet<string>;
  onToggle: (playerId: string) => void;
  onUnpin: (playerId: string) => void;
  onClear: () => void;
  ctx: DetailContext;
  onOpenCompare: (teamAbbr: string, oppAbbr: string) => void;
}

export default function PinnedPanel({ rows, open, onToggle, onUnpin, onClear, ctx, onOpenCompare }: Props) {
  return (
    <aside aria-label="Pinned players" data-state="pinned" className="hidden md:block">
      <div className="sticky top-14">
        <SectionHeading
          right={
            rows.length > 0 ? (
              <button
                type="button"
                onClick={onClear}
                className="touch-optimized active:opacity-70"
                style={{ minHeight: 44, minWidth: 44, fontSize: 12, fontWeight: 700, letterSpacing: 0, textTransform: 'none', color: 'var(--subtext)' }}
              >
                Clear all
              </button>
            ) : null
          }
        >
          Pinned
        </SectionHeading>

        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center" style={{ ...LIST_CARD, fontSize: 12, lineHeight: 1.5, color: 'var(--subtext)' }}>
            Open a player and tap <strong style={{ color: 'var(--text)' }}>Pin to side</strong> to keep their matchup in view.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 'calc(var(--app-h, 100dvh) - 52px - var(--nav-h) - 120px)' }}>
            {rows.map((row) => {
              const isOpen = open.has(row.player.playerId);
              const opp = row.thisWeek.kind === 'game' ? row.thisWeek.opp : null;
              return (
                <li key={row.player.playerId} data-pinned={row.player.playerId} className="relative" style={LIST_CARD}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => onToggle(row.player.playerId)}
                    className="touch-optimized flex w-full items-center gap-2.5 py-2.5 pl-3 pr-12 text-left active:opacity-80"
                    style={{ minHeight: 62 }}
                  >
                    <PositionCircle player={row.player} size={34} />
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                        {row.player.name}
                      </span>
                      <span className="flex items-center gap-2.5">
                        <MatchupMeter cell={row.thisWeek} />
                        <NextFiveBar cells={row.strip} />
                      </span>
                    </span>
                    <ChevronDown
                      size={16}
                      aria-hidden
                      style={{ flex: 'none', color: 'var(--subtext)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
                    />
                  </button>
                  <button
                    type="button"
                    aria-label={`Unpin ${row.player.name}`}
                    onClick={() => onUnpin(row.player.playerId)}
                    className="touch-optimized absolute right-0 top-0 flex items-center justify-center active:opacity-70"
                    style={{ width: 44, height: 44, color: 'var(--subtext)' }}
                  >
                    <X size={16} aria-hidden />
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-3 px-3 pb-3">
                      <MatchupDetails row={row} ctx={ctx} />
                      <button
                        type="button"
                        disabled={!(row.player.nflTeam && opp)}
                        onClick={() => row.player.nflTeam && opp && onOpenCompare(row.player.nflTeam, opp)}
                        className="touch-optimized flex items-center justify-center gap-2 active:opacity-70"
                        style={ACTION_BUTTON}
                      >
                        <GitCompareArrows size={16} aria-hidden />
                        Open in Compare{row.player.nflTeam && opp ? ` · ${row.player.nflTeam} vs ${opp}` : ''}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
