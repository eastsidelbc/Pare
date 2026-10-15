/**
 * "Track a prop line" from the Leans list → pick this week's game first (a prop is
 * always tied to one game). Picking opens that game screen with the add-line sheet
 * up (`?add=1`). BottomSheet recipe, 52px rows: "ATL @ LV" + kickoff.
 */

'use client';

import { ChevronRight } from 'lucide-react';
import BottomSheet from '@/components/ui/BottomSheet';
import { LIST_CARD } from '@/components/myteam/style';
import { TeamAbbr } from '@/components/standings/StandingsRow';
import { formatKickoff, type Matchup } from '@/lib/schedule';
import SheetHeader from './SheetHeader';

export default function GamePickSheet({
  open,
  games,
  onClose,
  onPick,
}: {
  open: boolean;
  games: readonly Matchup[];
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      label="Pick a game"
      grab="header"
      header={<SheetHeader title="Pick a game" onClose={onClose} />}
      style={{ maxHeight: 'calc(var(--app-h, 100dvh) - 80px)' }}
    >
      <div className="overflow-y-auto" style={{ padding: '4px 16px calc(env(safe-area-inset-bottom) + 20px)', overscrollBehavior: 'contain' }}>
        {games.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--subtext)', padding: '8px 0 12px' }}>No games this week.</p>
        ) : (
          <div className="overflow-hidden" style={LIST_CARD}>
            {games.map((m, i) => {
              const { day, time } = formatKickoff(m.kickoff);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPick(m.id)}
                  className="flex w-full items-center text-left touch-optimized active:opacity-80"
                  style={{ gap: 10, minHeight: 52, padding: '0 12px', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none' }}
                >
                  <span className="flex flex-1 items-center" style={{ gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                    <TeamAbbr abbr={m.away.abbr} size={14} />
                    <span style={{ color: 'var(--subtext)', fontWeight: 600 }}>@</span>
                    <TeamAbbr abbr={m.home.abbr} size={14} />
                  </span>
                  <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
                    {day} {time}
                  </span>
                  <ChevronRight size={16} strokeWidth={2.4} aria-hidden style={{ color: 'var(--gold-bright)' }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
