/**
 * One roster row (design-system §9.4, P4 final mockup). The row is a ≥62px
 * button: position circle · name column (name + reserve tag, line 2 "KC · @ LV ·
 * Sun 3:25 PM", next-5 micro-bar under it) · 60px meter column (bars over
 * "Good #27"). Tap expands it in place (several can be open) into a bordered
 * box: hero, why-stats, next-5 week cells, then actions.
 *
 * Actions by width (CSS only): phone = "Start / Sit" above "Open in Compare ·
 * KC vs LV"; the button area SLIDES to the Start / Sit panel (`.pare-slide`,
 * none under reduced motion). iPad (md+) = "Pin to side" + "Compare".
 */

'use client';

import { useEffect, useState } from 'react';
import { ArrowUpDown, ChevronRight, GitCompareArrows, Pin } from 'lucide-react';
import TeamIdentity from '@/components/ui/TeamIdentity';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { likelySwap, startSitCandidates } from '@/lib/myteam/startSit';
import { matchupText, slotLabel, type RosterRow } from '@/lib/myteam/viewModel';
import MatchupDetails, { type DetailContext } from './MatchupDetails';
import { MatchupMeter, NextFiveBar, WeekCells } from './MatchupMeter';
import PositionCircle from './PositionCircle';
import StartSitPanel from './StartSitPanel';
import { ACTION_BUTTON, kickoffText, startSitHint } from './style';

const SLIDE_MS = 340;

export interface RowActions {
  onOpenCompare: (teamAbbr: string, oppAbbr: string) => void;
  onTogglePin: (playerId: string) => void;
  isPinned: (playerId: string) => boolean;
}

interface Props {
  row: RosterRow;
  /** Every roster row (Start / Sit candidates come from here). */
  allRows: readonly RosterRow[];
  expanded: boolean;
  onToggle: (playerId: string) => void;
  ctx: DetailContext;
  actions: RowActions;
  /** Sandbox: open with the Start / Sit panel showing. */
  initialStartSit?: boolean;
}

/** Reserve tag next to the name in the IR / TAXI section (mockup: 18px, radius 5→6, `--seed-edge` outline). */
function ReserveTag({ group }: { group: RosterRow['player']['group'] }) {
  if (group !== 'ir' && group !== 'taxi') return null;
  return (
    <span
      className="inline-flex flex-none items-center"
      style={{
        height: 18, padding: '0 6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--seed-edge)',
        color: 'var(--subtext)', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em',
      }}
    >
      {group === 'ir' ? 'IR' : 'TAXI'}
    </span>
  );
}

/** Circle · name column · meter — shared by the row button (and its look in pinned cards). */
export function RowSummary({ row, pinned = false, meterWidth = 60 }: { row: RosterRow; pinned?: boolean; meterWidth?: number }) {
  const { player, thisWeek } = row;
  const flex = slotLabel(player.slot) !== null;
  return (
    <>
      <PositionCircle player={player} />
      <span data-namecol className="flex min-w-0 flex-1 flex-col" style={{ gap: 3 }}>
        <span className="flex min-w-0 items-center" style={{ gap: 6 }}>
          <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {player.name}
          </span>
          <ReserveTag group={player.group} />
          {pinned && <Pin size={16} aria-label="Pinned" style={{ flex: 'none', color: 'var(--gold-bright)' }} />}
        </span>
        <span data-line2 className="flex min-w-0 items-center overflow-hidden whitespace-nowrap" style={{ gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
          <span className="flex min-w-0 items-center overflow-hidden text-ellipsis" style={{ gap: 4 }}>
            {flex && player.position && <span>{player.position} ·</span>}
            {player.nflTeam ? (
              <TeamIdentity abbr={player.nflTeam} surface="myTeam" size={14} decorative>
                <TeamAbbr abbr={player.nflTeam} size={11} />
              </TeamIdentity>
            ) : (
              <span>FA</span>
            )}
            <span>· {matchupText(thisWeek)}{thisWeek.kickoff ? ' ·' : ''}</span>
          </span>
          {thisWeek.kickoff && <span className="flex-none">{kickoffText(thisWeek.kickoff)}</span>}
        </span>
        <NextFiveBar cells={row.strip.slice(0, 5)} />
      </span>
      <MatchupMeter cell={thisWeek} width={meterWidth} />
    </>
  );
}

export default function RosterRowItem({ row, allRows, expanded, onToggle, ctx, actions, initialStartSit = false }: Props) {
  const { player, thisWeek } = row;
  const candidates = startSitCandidates(row, allRows);
  const [view, setView] = useState<'actions' | 'startsit'>(initialStartSit ? 'startsit' : 'actions');
  // The panel we slid away from stays laid out until the slide ends, then collapses.
  const [settled, setSettled] = useState(view);
  const [pickId, setPickId] = useState<string | null>(() => likelySwap(row, allRows)?.player.playerId ?? null);

  useEffect(() => {
    if (settled === view) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setSettled(view), reduce ? 0 : SLIDE_MS);
    return () => clearTimeout(t);
  }, [view, settled]);

  // Collapsing the card resets it to the action buttons.
  useEffect(() => {
    if (!expanded) {
      setView('actions');
      setSettled('actions');
    }
  }, [expanded]);

  const opp = thisWeek.kind === 'game' ? thisWeek.opp : null;
  const canCompare = !!(player.nflTeam && opp);
  const compareText = canCompare ? `${player.nflTeam} vs ${opp}` : null;
  const pinned = actions.isPinned(player.playerId);
  const showActions = view === 'actions' || settled === 'actions';
  const showStartSit = view === 'startsit' || settled === 'startsit';
  const collapsed = { height: 0, overflow: 'hidden', visibility: 'hidden' } as const;

  return (
    <li data-player={player.playerId}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => onToggle(player.playerId)}
        className="touch-optimized flex w-full items-center text-left active:opacity-80"
        style={{
          gap: 10,
          minHeight: 62,
          padding: '8px 12px',
          background: expanded ? 'color-mix(in srgb, var(--gold-bright) 5%, transparent)' : 'transparent',
        }}
      >
        <RowSummary row={row} pinned={pinned} />
      </button>

      {expanded && (
        <div
          data-state="expanded"
          className="flex flex-col"
          style={{ gap: 12, margin: '0 12px 14px', padding: 12, borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)' }}
        >
          <MatchupDetails row={row} ctx={ctx} />
          <WeekCells cells={row.strip.slice(0, 5)} />

          {/* Phone: Start / Sit + Open in Compare, sliding to the Start / Sit panel. */}
          <div className="overflow-hidden md:hidden">
            <div className="pare-slide flex items-start" style={{ width: '200%', transform: view === 'startsit' ? 'translateX(-50%)' : 'none' }}>
              <div className="flex flex-col" style={{ gap: 8, width: '50%', ...(showActions ? null : collapsed) }} inert={view !== 'actions'}>
                {candidates.length > 0 && player.position && (
                  <button
                    type="button"
                    onClick={() => setView('startsit')}
                    className="touch-optimized flex items-center active:opacity-70"
                    style={{ ...ACTION_BUTTON, gap: 8, padding: '0 12px' }}
                  >
                    <ArrowUpDown data-swap-icon size={18} strokeWidth={2.2} aria-hidden />
                    <span>Start / Sit</span>
                    <span data-ss-hint className="ml-auto" style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>
                      {startSitHint(player.position, candidates.length)}
                    </span>
                    <ChevronRight size={16} strokeWidth={2.4} aria-hidden style={{ color: 'var(--gold-bright)' }} />
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canCompare}
                  onClick={() => player.nflTeam && opp && actions.onOpenCompare(player.nflTeam, opp)}
                  className="touch-optimized flex items-center justify-center active:opacity-70"
                  style={{ ...ACTION_BUTTON, gap: 8, color: canCompare ? 'var(--text)' : 'var(--subtext)' }}
                >
                  <GitCompareArrows size={17} aria-hidden />
                  Open in Compare{compareText ? ` · ${compareText}` : ''}
                </button>
              </div>
              <div style={{ width: '50%', ...(showStartSit ? null : collapsed) }} inert={view !== 'startsit'}>
                {showStartSit && (
                  <StartSitPanel
                    row={row}
                    candidates={candidates}
                    pickId={pickId}
                    onPick={setPickId}
                    onBack={() => setView('actions')}
                    format={ctx.format}
                  />
                )}
              </div>
            </div>
          </div>

          {/* iPad: Pin to side + Compare. */}
          <div className="hidden md:flex" style={{ gap: 8 }}>
            <button
              type="button"
              aria-pressed={pinned}
              onClick={() => actions.onTogglePin(player.playerId)}
              className="touch-optimized flex flex-1 items-center justify-center active:opacity-70"
              style={{
                ...ACTION_BUTTON,
                gap: 8,
                ...(pinned
                  ? { border: '1.5px solid var(--gold-bright)', background: 'color-mix(in srgb, var(--gold-bright) 8%, var(--nav-bg))', color: 'var(--gold-bright)' }
                  : null),
              }}
            >
              <Pin size={16} aria-hidden />
              {pinned ? 'Unpin' : 'Pin to side'}
            </button>
            <button
              type="button"
              disabled={!canCompare}
              onClick={() => player.nflTeam && opp && actions.onOpenCompare(player.nflTeam, opp)}
              className="touch-optimized flex flex-1 items-center justify-center active:opacity-70"
              style={{ ...ACTION_BUTTON, gap: 8, color: canCompare ? 'var(--text)' : 'var(--subtext)' }}
              aria-label={compareText ? `Compare ${compareText}` : 'Compare'}
            >
              <GitCompareArrows size={17} aria-hidden />
              Compare
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
