/**
 * BlankComparePicker — empty state for a blank comparison tab (Neon Frame "R").
 *
 * A blank comparison (no teams — created by the "+" on the compare tab row or a
 * tablet "Add comparison" cell) renders this instead of the panels:
 *
 *   ┌╌╌╌╌╌╌╌╌┐  VS  ┌╌╌╌╌╌╌╌╌┐   empty = dashed gold slot with a "+"
 *   ╎   +    ╎      ╎   +    ╎   filled = team-color frame + TeamMark + wordmark
 *   └╌╌╌╌╌╌╌╌┘      └╌╌╌╌╌╌╌╌┘
 *            WEEK 5
 *   ( IND VS WAS )  ( NE VS BUF )   ← <WeekMatchupPills>: one tap fills both
 *
 * Tapping a slot opens the same anchored <CompactTeamSelector> used everywhere
 * on Compare. Once both slots are filled the parent (<ComparePane>) renders the
 * comparison. Pure UI/flow — no data/ranking/bar math here. No logo artwork.
 */

'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { TeamData } from '@/lib/useNflStats';
import { getTeamByName } from '@/lib/teams';
import { getTeamPalette } from '@/lib/teamColors';
import TeamMark from '@/components/ui/TeamMark';
import CompactTeamSelector from '@/components/mobile/CompactTeamSelector';
import { wordmarkSize } from '@/components/compare/MatchupHero';
import WeekMatchupPills from '@/components/compare/WeekMatchupPills';

interface BlankComparePickerProps {
  teamA: string;
  teamB: string;
  /** Full team list for the dropdown (offense feed carries every team). */
  offenseData: TeamData[];
  onTeamAChange: (team: string) => void;
  onTeamBChange: (team: string) => void;
  /** One-tap matchup preset (this week's games). Omit → pills hidden. */
  onPickMatchup?: (teamA: string, teamB: string) => void;
}

const SLOT_RADIUS = 'var(--radius-xl)';
const SLOT_INNER = 'linear-gradient(160deg, var(--card-deep-a), var(--card-deep-mid) 55%, var(--card-deep-b))';

function Slot({
  team,
  label,
  open,
  onClick,
  slotRef,
}: {
  team: string;
  label: 'A' | 'B';
  open: boolean;
  onClick: () => void;
  slotRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const info = team ? getTeamByName(team) : null;
  const pal = team ? getTeamPalette(team) : null;

  // Filled slot — team-color neon frame (same recipe as the comparison cards).
  if (team) {
    const nickname = (info?.nickname ?? team).toUpperCase();
    const line = pal?.line ?? 'var(--frame-mid)';
    return (
      <button
        ref={slotRef}
        type="button"
        onClick={onClick}
        aria-label={`Change Team ${label} (${team})`}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="touch-optimized active:opacity-70"
        style={{
          padding: 1.5,
          borderRadius: SLOT_RADIUS,
          background: `linear-gradient(160deg, ${line}, var(--frame-mid))`,
          boxShadow: pal ? `0 4px 26px rgba(${pal.rgb}, ${open ? 0.5 : 0.32})` : undefined,
        }}
      >
        <span
          className="flex h-full flex-col items-center justify-center gap-1.5 px-2 py-4"
          style={{ borderRadius: `calc(${SLOT_RADIUS} - 1.5px)`, background: SLOT_INNER }}
        >
          <TeamMark teamName={team} size={20} />
          <span className="block truncate" style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--subtext)' }}>
            {(info?.location ?? '').toUpperCase()}
          </span>
          <span
            className="block whitespace-nowrap"
            style={{
              fontSize: wordmarkSize(nickname, 'sm'),
              fontWeight: 900,
              lineHeight: 1.05,
              color: 'transparent',
              WebkitTextStroke: `1.1px ${line}`,
              textShadow: pal ? `0 0 12px rgba(${pal.rgb}, 0.55)` : undefined,
            }}
          >
            {nickname}
          </span>
        </span>
      </button>
    );
  }

  // Empty slot — dashed gold outline, glows brighter while its picker is open.
  return (
    <button
      ref={slotRef}
      type="button"
      onClick={onClick}
      aria-label={`Pick Team ${label}`}
      aria-expanded={open}
      aria-haspopup="listbox"
      className="flex items-center justify-center px-2 py-6 touch-optimized transition-shadow active:opacity-70"
      style={{
        borderRadius: SLOT_RADIUS,
        background: SLOT_INNER,
        border: `1.5px dashed color-mix(in srgb, var(--gold-bright) ${open ? 85 : 45}%, transparent)`,
        boxShadow: open ? '0 0 22px color-mix(in srgb, var(--gold-bright) 22%, transparent)' : 'none',
      }}
    >
      <AddMark />
    </button>
  );
}

/** Gold neon "+" ring — shared with the tablet "Add comparison" cell. */
export function AddMark({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        border: '1.5px solid var(--gold-bright)',
        color: 'var(--gold-bright)',
        background: 'color-mix(in srgb, var(--gold-bright) 8%, transparent)',
        boxShadow: '0 0 14px color-mix(in srgb, var(--gold-bright) 35%, transparent)',
      }}
    >
      <Plus size={Math.round(size * 0.5)} strokeWidth={2.5} />
    </span>
  );
}

export default function BlankComparePicker({
  teamA,
  teamB,
  offenseData,
  onTeamAChange,
  onTeamBChange,
  onPickMatchup,
}: BlankComparePickerProps) {
  const [open, setOpen] = useState<'A' | 'B' | null>(null);
  const aRef = useRef<HTMLButtonElement>(null);
  const bRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="flex h-full flex-col items-center gap-6 overflow-y-auto overscroll-contain px-5 pt-[clamp(16px,5vh,48px)] pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+12px)]"
      style={{ background: 'var(--bg-deep)' }}
    >
      <div className="grid w-full max-w-sm shrink-0 grid-cols-[1fr_auto_1fr] items-stretch gap-2.5">
        <Slot team={teamA} label="A" open={open === 'A'} slotRef={aRef} onClick={() => setOpen((o) => (o === 'A' ? null : 'A'))} />

        <div
          className="flex items-center justify-center"
          style={{
            fontSize: 12,
            fontWeight: 900,
            fontStyle: 'italic',
            letterSpacing: '0.08em',
            color: 'var(--gold-bright)',
            textShadow: '0 0 10px color-mix(in srgb, var(--gold-bright) 45%, transparent)',
          }}
        >
          VS
        </div>

        <Slot team={teamB} label="B" open={open === 'B'} slotRef={bRef} onClick={() => setOpen((o) => (o === 'B' ? null : 'B'))} />
      </div>

      {onPickMatchup && <WeekMatchupPills onPick={onPickMatchup} />}

      {/* Inline anchored dropdowns (same picker as the wordmarks). */}
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
