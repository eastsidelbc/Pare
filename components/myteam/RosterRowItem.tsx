/**
 * One roster row (design-system §9.4). The row itself is a ≥62px button that
 * expands the card in place (several can be open — no sheet, no long-press,
 * no swipe). Expanded: matchup details, the next 5 week cells, then actions.
 *
 * Actions by width (CSS only): phone = "Start / Sit ›" above "Open in Compare";
 * the button area SLIDES to the Start / Sit panel (`.pare-slide`, none under
 * reduced motion). iPad (md+) = "Pin to side" + "Compare".
 */

'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, GitCompareArrows, Pin, PinOff } from 'lucide-react';
import TeamIdentity from '@/components/ui/TeamIdentity';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { likelySwap, startSitCandidates } from '@/lib/myteam/startSit';
import { matchupText, slotLabel, type RosterRow } from '@/lib/myteam/viewModel';
import MatchupDetails, { type DetailContext } from './MatchupDetails';
import { MatchupMeter, NextFiveBar, WeekCells } from './MatchupMeter';
import PositionCircle from './PositionCircle';
import StartSitPanel from './StartSitPanel';
import { ACTION_BUTTON, kickoffText, POSITION_PLURAL } from './style';

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

/** Reserve tag shown next to the name in the IR / TAXI section. */
function ReserveTag({ group }: { group: RosterRow['player']['group'] }) {
  if (group !== 'ir' && group !== 'taxi') return null;
  return (
    <span
      className="flex-none"
      style={{
        fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--subtext)',
        border: '1px solid var(--frame-mid)', borderRadius: 'var(--radius-sm)', padding: '1px 4px',
      }}
    >
      {group === 'ir' ? 'IR' : 'TAXI'}
    </span>
  );
}

export function RowSummary({ row }: { row: RosterRow }) {
  const { player, thisWeek } = row;
  const flex = slotLabel(player.slot) !== null;
  return (
    <>
      <PositionCircle player={player} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {player.name}
          </span>
          <ReserveTag group={player.group} />
        </span>
        <span className="flex min-w-0 items-center gap-1 whitespace-nowrap" style={{ fontSize: 11, color: 'var(--subtext)' }}>
          {flex && player.position && <span>{player.position} ·</span>}
          {player.nflTeam ? (
            <TeamIdentity abbr={player.nflTeam} surface="myTeam" size={14} decorative>
              <TeamAbbr abbr={player.nflTeam} size={11} />
            </TeamIdentity>
          ) : (
            <span>FA</span>
          )}
          <span>· {matchupText(thisWeek)}</span>
          {thisWeek.kickoff && <span className="truncate">· {kickoffText(thisWeek.kickoff)}</span>}
        </span>
      </span>
      <span className="flex flex-none flex-col items-end gap-1.5">
        <MatchupMeter cell={thisWeek} />
        <NextFiveBar cells={row.strip} />
      </span>
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
        className="touch-optimized flex w-full items-center gap-2.5 px-3 text-left active:opacity-80"
        style={{ minHeight: 62, paddingTop: 10, paddingBottom: 10 }}
      >
        <RowSummary row={row} />
      </button>

      {expanded && (
        <div data-state="expanded" className="flex flex-col gap-3 px-3 pb-3">
          <MatchupDetails row={row} ctx={ctx} />
          <WeekCells cells={row.strip} />

          {/* Phone: Start / Sit + Open in Compare, sliding to the Start / Sit panel. */}
          <div className="overflow-hidden md:hidden">
            <div className="pare-slide flex items-start" style={{ width: '200%', transform: view === 'startsit' ? 'translateX(-50%)' : 'none' }}>
              <div className="flex flex-col gap-2" style={{ width: '50%', ...(showActions ? null : collapsed) }} inert={view !== 'actions'}>
                {candidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setView('startsit')}
                    className="touch-optimized flex items-center justify-between px-3.5 active:opacity-70"
                    style={ACTION_BUTTON}
                  >
                    <span>Start / Sit</span>
                    <span className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>
                      vs {candidates.length} other {player.position ? POSITION_PLURAL[player.position] : 'players'}
                      <ChevronRight size={17} aria-hidden style={{ color: 'var(--gold-bright)' }} />
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={!canCompare}
                  onClick={() => player.nflTeam && opp && actions.onOpenCompare(player.nflTeam, opp)}
                  className="touch-optimized flex items-center justify-center gap-2 active:opacity-70"
                  style={{ ...ACTION_BUTTON, color: canCompare ? 'var(--text)' : 'var(--subtext)' }}
                >
                  <GitCompareArrows size={16} aria-hidden />
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
          <div className="hidden gap-2 md:grid md:grid-cols-2">
            <button
              type="button"
              aria-pressed={pinned}
              onClick={() => actions.onTogglePin(player.playerId)}
              className="touch-optimized flex items-center justify-center gap-2 active:opacity-70"
              style={{ ...ACTION_BUTTON, color: pinned ? 'var(--gold-bright)' : 'var(--text)' }}
            >
              {pinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
              {pinned ? 'Unpin' : 'Pin to side'}
            </button>
            <button
              type="button"
              disabled={!canCompare}
              onClick={() => player.nflTeam && opp && actions.onOpenCompare(player.nflTeam, opp)}
              className="touch-optimized flex items-center justify-center gap-2 active:opacity-70"
              style={{ ...ACTION_BUTTON, color: canCompare ? 'var(--text)' : 'var(--subtext)' }}
              aria-label={compareText ? `Compare ${compareText}` : 'Compare'}
            >
              <GitCompareArrows size={16} aria-hidden />
              Compare
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
