/**
 * ExpandRow — a tap-to-open row that reveals content in place (prop screen dropdowns,
 * 2026-10-23). Same 48px card row as the player screen's "See prop lines" link, with a
 * gold-bright chevron that turns when open. The content renders only while open.
 */

'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export interface ExpandRowProps {
  title: ReactNode;
  /** Short grey note on the right ("player vs defense", "team compare"). */
  note?: string;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
  /** data-attribute for tests. */
  id: string;
}

export default function ExpandRow({ title, note, open, onToggle, children, id }: ExpandRowProps) {
  return (
    <section data-expand={id} className="flex flex-col" style={{ gap: 8 }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center touch-optimized active:opacity-80"
        style={{
          gap: 8,
          minHeight: 48,
          padding: '0 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--frame-mid)',
          background: 'var(--card-deep-a)',
          color: 'var(--text)',
          fontSize: 14,
          fontWeight: 800,
          textAlign: 'left',
        }}
      >
        <span className="min-w-0 flex-1 truncate">{title}</span>
        {note && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>{note}</span>}
        <ChevronDown
          size={16}
          strokeWidth={2.4}
          aria-hidden
          style={{ flex: 'none', color: 'var(--gold-bright)', transition: 'transform .18s ease', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && children}
    </section>
  );
}
