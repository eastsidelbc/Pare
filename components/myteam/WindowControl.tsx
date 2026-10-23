/**
 * Season | Last 4 glass toggle + ⓘ (44px), pinned right in the sticky filter
 * row so it stays in reach while scrolling the roster (design-system §9.4).
 * ⓘ opens a small note card under it, one idea per line.
 */

'use client';

import { useId, useState } from 'react';
import { Info } from 'lucide-react';
import type { RatingWindow } from '@/lib/myteam/types';
import WindowToggle from './WindowToggle';

interface Props {
  window: RatingWindow;
  onWindowChange: (w: RatingWindow) => void;
}

export default function WindowControl({ window, onWindowChange }: Props) {
  const [noteOpen, setNoteOpen] = useState(false);
  const noteId = useId();
  return (
    <div data-window-control className="relative flex flex-none items-center" style={{ gap: 4 }}>
      <WindowToggle value={window} onChange={onWindowChange} />
      <button
        type="button"
        aria-label="What do Season and Last 4 mean?"
        aria-expanded={noteOpen}
        aria-controls={noteId}
        onClick={() => setNoteOpen((v) => !v)}
        className="touch-optimized flex flex-none items-center justify-center active:opacity-70"
        style={{ width: 44, height: 44, margin: '-7px -10px -7px -6px', color: noteOpen ? 'var(--gold-bright)' : 'var(--subtext)' }}
      >
        <Info size={18} strokeWidth={2.2} aria-hidden />
      </button>
      {noteOpen && (
        <div
          id={noteId}
          role="note"
          data-state="window-note"
          className="absolute right-0 z-[35]"
          style={{
            top: 'calc(100% + 8px)',
            width: 260,
            maxWidth: 'calc(100vw - 32px)',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--frame-mid)',
            background: 'linear-gradient(160deg, var(--card-deep-a), var(--card-deep-mid))',
            boxShadow: 'var(--shadow-pop)',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1.45,
            color: 'var(--text)',
          }}
        >
          <p>
            <b style={{ fontWeight: 800 }}>Season</b> = every game this defense has played.
          </p>
          <p>
            <b style={{ fontWeight: 800 }}>Last 4</b> = its last 4 games played (byes skipped).
          </p>
          <p style={{ marginTop: 4 }}>Ranks and colors switch with it.</p>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--subtext)' }}>
            Showing: <b style={{ color: 'var(--gold-bright)' }}>{window === 'season' ? 'Season' : 'Last 4'}</b>
          </div>
        </div>
      )}
    </div>
  );
}
