/**
 * iPad PINNED panel (design-system §9.4 "QE", P4 FinalPad / FinalPadL) — the
 * right column at md+ (340px portrait / 440px landscape). Header: pin icon +
 * PINNED + count + "Clear all". Empty: dashed gold card. Each pinned card has a
 * gold edge and starts short (circle, name, line 2, meter, ✕, next-5 cells with
 * the week inside); a tap anywhere opens pts/g, why-stats and Open in Compare
 * (chevron hint at the bottom).
 */

'use client';

import { ChevronDown, GitCompareArrows, Pin, X } from 'lucide-react';
import TeamIdentity from '@/components/ui/TeamIdentity';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { matchupText, slotLabel, type RosterRow } from '@/lib/myteam/viewModel';
import MatchupDetails, { type DetailContext } from './MatchupDetails';
import { MatchupMeter, WeekCell } from './MatchupMeter';
import PositionCircle from './PositionCircle';
import { ACTION_BUTTON, kickoffText } from './style';

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
    <aside aria-label="Pinned players" data-state="pinned" className="hidden md:block" style={{ paddingTop: 12 }}>
      <div className="sticky top-14">
        <div className="flex items-center" style={{ gap: 10, paddingBottom: 8, minHeight: 44 }}>
          <Pin size={16} aria-hidden style={{ color: 'var(--gold-bright)' }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: 'var(--gold-bright)' }}>PINNED</span>
          {rows.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>{rows.length}</span>}
          <span className="flex-1" />
          {rows.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="touch-optimized active:opacity-70"
              style={{ height: 44, minWidth: 44, padding: '0 2px', fontSize: 12, fontWeight: 700, color: 'var(--subtext)' }}
            >
              Clear all
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{
              gap: 8, minHeight: 180, padding: 20, borderRadius: 'var(--radius-lg)',
              border: '1.5px dashed color-mix(in srgb, var(--gold-bright) 45%, transparent)',
            }}
          >
            <Pin size={16} aria-hidden style={{ color: 'var(--gold-bright)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Pin players to keep them here</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>Open a player, then Pin to side. Tap a pinned card to open it.</span>
          </div>
        ) : (
          <ul className="flex flex-col overflow-y-auto" style={{ gap: 10, maxHeight: 'calc(var(--app-h, 100dvh) - 52px - var(--nav-h) - 120px)' }}>
            {rows.map((row) => {
              const { player, thisWeek } = row;
              const isOpen = open.has(player.playerId);
              const opp = thisWeek.kind === 'game' ? thisWeek.opp : null;
              const flex = slotLabel(player.slot) !== null;
              return (
                <li
                  key={player.playerId}
                  data-pinned={player.playerId}
                  className="relative"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: `1px solid color-mix(in srgb, var(--gold-bright) ${isOpen ? 60 : 35}%, transparent)`,
                    background: 'linear-gradient(160deg, var(--card-deep-a), var(--card-deep-mid))',
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Show less for' : 'Show more for'} ${player.name}`}
                    onClick={() => onToggle(player.playerId)}
                    className="touch-optimized flex w-full flex-col text-left active:opacity-80"
                    style={{ gap: 10, padding: '12px 12px 0' }}
                  >
                    <span className="flex w-full items-center" style={{ gap: 10, paddingRight: 36 }}>
                      <PositionCircle player={player} size={34} />
                      <span className="flex min-w-0 flex-1 flex-col" style={{ gap: 2 }}>
                        <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                          {player.name}
                        </span>
                        <span className="flex min-w-0 items-center overflow-hidden whitespace-nowrap" style={{ gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
                          {flex && player.position && <span>{player.position} ·</span>}
                          {player.nflTeam && (
                            <TeamIdentity abbr={player.nflTeam} surface="myTeam" size={14} decorative>
                              <TeamAbbr abbr={player.nflTeam} size={11} />
                            </TeamIdentity>
                          )}
                          <span className="truncate">
                            · {matchupText(thisWeek)}
                            {thisWeek.kickoff ? ` · ${kickoffText(thisWeek.kickoff)}` : ''}
                          </span>
                        </span>
                      </span>
                      <MatchupMeter cell={thisWeek} width={64} />
                    </span>
                    <span className="grid w-full" style={{ gap: 4, gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
                      {row.strip.slice(0, 5).map((c) => (
                        <WeekCell key={c.week} cell={c} height={34} weekInside />
                      ))}
                    </span>
                    <span className="flex w-full items-center justify-center" style={{ height: 22, color: 'var(--subtext)' }} aria-hidden>
                      <ChevronDown size={18} strokeWidth={2.4} style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Unpin ${player.name}`}
                    onClick={() => onUnpin(player.playerId)}
                    className="touch-optimized absolute flex items-center justify-center rounded-full active:opacity-70"
                    style={{ top: 4, right: 4, width: 44, height: 44, color: 'var(--subtext)' }}
                  >
                    <X size={16} strokeWidth={2.4} aria-hidden />
                  </button>
                  {isOpen && (
                    <div className="flex flex-col" style={{ gap: 10, padding: '0 12px 12px' }}>
                      <MatchupDetails row={row} ctx={ctx} compact />
                      <button
                        type="button"
                        disabled={!(player.nflTeam && opp)}
                        onClick={() => player.nflTeam && opp && onOpenCompare(player.nflTeam, opp)}
                        className="touch-optimized flex items-center justify-center active:opacity-70"
                        style={{ ...ACTION_BUTTON, height: 44, gap: 8, fontSize: 13 }}
                      >
                        <GitCompareArrows size={17} aria-hidden />
                        Open in Compare
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
