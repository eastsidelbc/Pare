/**
 * Leans sheet header (`.sh-h`): gold-bright 11/800 small-caps title + a 44px ✕.
 * Sits in BottomSheet's drag zone (grab="header").
 */

import { X } from 'lucide-react';

export default function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between" style={{ minHeight: 44, marginTop: 8, padding: '0 16px' }}>
      <h2 style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: 'var(--gold-bright)', textTransform: 'uppercase' }}>{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex h-11 w-11 items-center justify-center touch-optimized active:opacity-60"
        style={{ color: 'var(--subtext)' }}
      >
        <X size={20} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
