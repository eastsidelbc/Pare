/**
 * BlankComparePicker — empty state for a blank comparison tab.
 *
 * A blank comparison (no teams — created by the "+" on the compare tab row)
 * renders this instead of the panels: two tappable slots where the team
 * names/logos normally go. Tapping a slot opens a COMPACT INLINE DROPDOWN
 * anchored at that slot (reuses <CompactTeamSelector> — the same Floating-UI
 * team list used inside the panel headers, NOT a bottom sheet). Once both slots
 * are filled the parent (<ComparePane>) renders the comparison normally.
 *
 * Pure UI/flow — no data/ranking/bar math here.
 */

'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { TeamData } from '@/lib/useNflStats';
import TeamLogo from '@/components/TeamLogo';
import CompactTeamSelector from '@/components/mobile/CompactTeamSelector';

interface BlankComparePickerProps {
  teamA: string;
  teamB: string;
  /** Full team list for the dropdown (offense feed carries every team). */
  offenseData: TeamData[];
  onTeamAChange: (team: string) => void;
  onTeamBChange: (team: string) => void;
}

export default function BlankComparePicker({
  teamA,
  teamB,
  offenseData,
  onTeamAChange,
  onTeamBChange,
}: BlankComparePickerProps) {
  const [open, setOpen] = useState<'A' | 'B' | null>(null);
  const aRef = useRef<HTMLButtonElement>(null);
  const bRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-white">
      <p
        style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)' }}
      >
        New comparison
      </p>
      <p className="mt-1.5 mb-6 text-center" style={{ fontSize: '13px', color: 'var(--subtext)' }}>
        Pick two teams to compare
      </p>

      <div className="grid w-full max-w-sm grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        {/* Slot A */}
        <button
          ref={aRef}
          type="button"
          onClick={() => setOpen((o) => (o === 'A' ? null : 'A'))}
          aria-label={teamA ? `Change Team A (${teamA})` : 'Pick Team A'}
          className="flex flex-col items-center justify-center gap-2 rounded-xl px-3 py-5 touch-optimized transition-colors active:opacity-70"
          style={{
            background: 'var(--card)',
            border: `1px solid ${open === 'A' ? 'var(--gold)' : 'var(--border)'}`,
          }}
        >
          {teamA ? (
            <>
              <TeamLogo teamName={teamA} size="48" />
              <span className="text-center" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                {teamA}
              </span>
            </>
          ) : (
            <>
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: 'rgba(245,200,66,0.12)', color: 'var(--gold)' }}
              >
                <Plus size={22} strokeWidth={2.5} />
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--subtext)' }}>Pick team</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)' }}>
          vs
        </div>

        {/* Slot B */}
        <button
          ref={bRef}
          type="button"
          onClick={() => setOpen((o) => (o === 'B' ? null : 'B'))}
          aria-label={teamB ? `Change Team B (${teamB})` : 'Pick Team B'}
          className="flex flex-col items-center justify-center gap-2 rounded-xl px-3 py-5 touch-optimized transition-colors active:opacity-70"
          style={{
            background: 'var(--card)',
            border: `1px solid ${open === 'B' ? 'var(--gold)' : 'var(--border)'}`,
          }}
        >
          {teamB ? (
            <>
              <TeamLogo teamName={teamB} size="48" />
              <span className="text-center" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                {teamB}
              </span>
            </>
          ) : (
            <>
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: 'rgba(245,200,66,0.12)', color: 'var(--gold)' }}
              >
                <Plus size={22} strokeWidth={2.5} />
              </span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--subtext)' }}>Pick team</span>
            </>
          )}
        </button>
      </div>

      {/* Inline anchored dropdowns (reused from the panel headers). */}
      {open === 'A' && (
        <CompactTeamSelector
          allTeams={offenseData}
          currentTeam={teamA}
          onTeamChange={(t) => onTeamAChange(t)}
          isOpen
          onToggle={() => setOpen(null)}
          triggerElement={aRef.current}
        />
      )}
      {open === 'B' && (
        <CompactTeamSelector
          allTeams={offenseData}
          currentTeam={teamB}
          onTeamChange={(t) => onTeamBChange(t)}
          isOpen
          onToggle={() => setOpen(null)}
          triggerElement={bRef.current}
        />
      )}
    </div>
  );
}
