/**
 * Week bar (design-system §9.4): "WEEK n" + date range · Season | Last 4 glass
 * toggle + ⓘ (44px) that opens a one-line note explaining the windows.
 */

'use client';

import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import type { RatingWindow } from '@/lib/myteam/types';
import WindowToggle from './WindowToggle';

interface Props {
  week: number | null;
  dateRange: string | null;
  window: RatingWindow;
  onWindowChange: (w: RatingWindow) => void;
}

export default function WeekBar({ week, dateRange, window, onWindowChange }: Props) {
  const [noteOpen, setNoteOpen] = useState(false);
  const noteId = useId();
  return (
    <div className="pt-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="whitespace-nowrap tabular-nums" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.14em', color: 'var(--text)' }}>
            {week ? `WEEK ${week}` : 'THIS WEEK'}
          </span>
          {dateRange && (
            <span className="truncate" style={{ fontSize: 11, fontWeight: 600, color: 'var(--subtext)' }}>
              {dateRange}
            </span>
          )}
        </div>
        <div className="flex flex-none items-center">
          <WindowToggle value={window} onChange={onWindowChange} />
          <button
            type="button"
            aria-label="About Season and Last 4"
            aria-expanded={noteOpen}
            aria-controls={noteId}
            onClick={() => setNoteOpen((v) => !v)}
            className="touch-optimized flex items-center justify-center active:opacity-70"
            style={{ width: 44, height: 44, color: noteOpen ? 'var(--gold-bright)' : 'var(--subtext)' }}
          >
            <Info size={17} aria-hidden />
          </button>
        </div>
      </div>
      {noteOpen && (
        <p id={noteId} data-state="window-note" className="pb-1" style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--subtext)' }}>
          Season = every game this defense has played. Last 4 = its last 4 games played (byes skipped). Ranks and colors
          switch with it.
        </p>
      )}
    </div>
  );
}
