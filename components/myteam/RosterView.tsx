/**
 * Roster list — Starters, Bench, then a collapsed IR / Taxi group. Each row:
 * a ≥44px button (slot · name + injury · team + this week's opponent · chip)
 * that opens the player sheet, then the look-ahead strip under it.
 * SKELETON styling (P3) — neutral tokens; restyled in P5.
 */

'use client';

import { ChevronDown } from 'lucide-react';
import TeamIdentity from '@/components/ui/TeamIdentity';
import { SectionLabel, TeamAbbr } from '@/components/standings/StandingsRow';
import { matchupText, slotLabel, type RosterRow, type RosterView as RosterViewModel } from '@/lib/myteam/viewModel';
import { InjuryTag, MatchupChip } from './MatchupChip';
import LookAheadStrip from './LookAheadStrip';

interface Props {
  vm: RosterViewModel;
  irOpen: boolean;
  onToggleIr: () => void;
  onSelect: (row: RosterRow) => void;
}

export default function RosterView({ vm, irOpen, onToggleIr, onSelect }: Props) {
  return (
    <div data-state="roster">
      <Section title="Starters" rows={vm.starters} onSelect={onSelect} />
      {vm.bench.length > 0 && <Section title="Bench" rows={vm.bench} onSelect={onSelect} />}
      {vm.reserve.length > 0 && (
        <section className="mb-4">
          <button
            type="button"
            aria-expanded={irOpen}
            onClick={onToggleIr}
            className="touch-optimized flex w-full items-center justify-between active:opacity-70"
            style={{ minHeight: 44, color: 'var(--gold-bright)', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}
          >
            IR / Taxi ({vm.reserve.length})
            <ChevronDown size={16} aria-hidden style={{ transition: 'transform .18s ease', transform: irOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {irOpen && (
            <div data-state="ir-open">
              <Rows rows={vm.reserve} onSelect={onSelect} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Section({ title, rows, onSelect }: { title: string; rows: RosterRow[]; onSelect: (row: RosterRow) => void }) {
  return (
    <section className="mb-4">
      <SectionLabel>{title}</SectionLabel>
      <Rows rows={rows} onSelect={onSelect} />
    </section>
  );
}

function Rows({ rows, onSelect }: { rows: RosterRow[]; onSelect: (row: RosterRow) => void }) {
  return (
    <ul className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--frame-mid)', background: 'var(--card-deep-mid)' }}>
      {rows.map((row, i) => (
        <li key={row.player.playerId} className="px-3 py-2" style={{ borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}>
          <RowButton row={row} onSelect={onSelect} />
          <div className="mt-1.5">
            <LookAheadStrip cells={row.strip} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function RowButton({ row, onSelect }: { row: RosterRow; onSelect: (row: RosterRow) => void }) {
  const { player, thisWeek } = row;
  const slot = slotLabel(player.slot) ?? player.position ?? '—';
  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      aria-label={`${player.name}, ${player.position ?? 'player'} — matchup details`}
      className="touch-optimized flex w-full items-center gap-2.5 text-left active:opacity-70"
      style={{ minHeight: 44 }}
    >
      <span className="w-9 flex-none tabular-nums" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--subtext)' }}>
        {slot}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {player.name}
          </span>
          {player.injury && <InjuryTag tag={player.injury} />}
        </span>
        <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: 'var(--subtext)' }}>
          {player.nflTeam ? (
            <TeamIdentity abbr={player.nflTeam} surface="myTeam" size={16} decorative>
              <TeamAbbr abbr={player.nflTeam} size={11} />
            </TeamIdentity>
          ) : (
            <span>FA</span>
          )}
          <span>· {player.position ?? '—'}</span>
          <span>· {matchupText(thisWeek)}</span>
        </span>
      </span>
      <MatchupChip cell={thisWeek} />
    </button>
  );
}
