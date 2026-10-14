/**
 * Leans UI primitives (design-system §9.5). Tokens only.
 *
 *   (LeanPill lives in ./LeanPill.tsx.)
 *   SignalList  the 3 checks: ✓ `--green` (its "win" meaning), ✕ `--muted`, in the
 *               near-black why box (`--nav-bg`, hairline, radius 10, 36px rows).
 *   LeansLabel  D1 gold-rule section label, optional right note ("2 this week").
 *   AddCard     dashed gold-bright add row + neon "+" ring.
 */

import type { CSSProperties, ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { LEAN_CONFIG } from '@/lib/leans/config';
import type { LeanResult, LeanVerdict } from '@/lib/leans/types';

/** 9px label role (`.lab9`): SPREAD, YOUR LINE, MONEYLINE. */
export const LABEL9: CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--subtext)',
};

/** Near-black bordered box for why-stats and the signal list (`.why`). */
export const WHY_BOX: CSSProperties = {
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--hairline)',
  background: 'var(--nav-bg)',
  overflow: 'hidden',
};

/** Renders `**bold**` segments (engine labels) as white 800. */
export function Bolded({ text, strong = { color: 'var(--text)', fontWeight: 800 } }: { text: string; strong?: CSSProperties }) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <b key={i} style={strong}>
            {p}
          </b>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function LeansLabel({ children, note, style }: { children: ReactNode; note?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: 8,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        lineHeight: 1.2,
        color: 'var(--gold-bright)',
        margin: '4px 0 8px',
        ...style,
      }}
    >
      <span className="whitespace-nowrap">{children}</span>
      <span aria-hidden className="h-px flex-1" style={{ background: 'var(--hairline)' }} />
      {note != null && (
        <span className="whitespace-nowrap" style={{ letterSpacing: '0.04em', fontWeight: 700, color: 'var(--subtext)', textTransform: 'none' }}>
          {note}
        </span>
      )}
    </div>
  );
}

const isLean = (v: LeanVerdict) => v === 'over' || v === 'under' || v === 'side';

/** "Why — 3 of 3 signals agree" / "Why no lean — signals split (1 of 3)". */
export function signalsTitle(result: Pick<LeanResult, 'verdict' | 'okCount'>): string {
  const n = LEAN_CONFIG.signalCount;
  if (result.verdict === 'not-enough') return `Not enough games yet — ${result.okCount} of ${n} checks so far`;
  if (isLean(result.verdict)) return `Why — ${result.okCount} of ${n} signals agree`;
  return `Why no lean — signals split (${result.okCount} of ${n})`;
}

/** The three checks, always shown (DECISIONS §6). */
export function SignalList({ result, title = true }: { result: Pick<LeanResult, 'verdict' | 'okCount' | 'signals'>; title?: boolean }) {
  return (
    <div className="flex flex-col" style={{ gap: 6 }}>
      {title && <div style={LABEL9}>{signalsTitle(result)}</div>}
      <ul data-signals style={WHY_BOX}>
        {result.signals.map((s, i) => (
          <li
            key={i}
            data-signal={s.ok ? 'ok' : 'no'}
            className="flex items-center"
            style={{
              gap: 8,
              minHeight: 36,
              padding: '6px 10px',
              borderTop: i > 0 ? '1px solid var(--hairline)' : 'none',
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.35,
              color: 'var(--subtext)',
            }}
          >
            <span aria-hidden className="flex-none text-center" style={{ width: 14, fontWeight: 900, color: s.ok ? 'var(--green)' : 'var(--muted)' }}>
              {s.ok ? '✓' : '✕'}
            </span>
            <span className="sr-only">{s.ok ? 'Yes: ' : 'No: '}</span>
            <span>
              <Bolded text={s.label} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Dashed gold add row (`.add`): "+" ring, title 14/800, sub 11 `--subtext`. */
export function AddCard({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center text-left touch-optimized active:opacity-80"
      style={{
        gap: 12,
        minHeight: 56,
        padding: '0 14px',
        borderRadius: 'var(--radius-lg)',
        border: '1px dashed color-mix(in srgb, var(--gold-bright) 50%, transparent)',
        background: 'color-mix(in srgb, var(--gold-bright) 5%, transparent)',
      }}
    >
      <span
        aria-hidden
        className="flex flex-none items-center justify-center rounded-full"
        style={{
          width: 26,
          height: 26,
          border: '1.5px solid var(--gold-bright)',
          boxShadow: '0 0 10px color-mix(in srgb, var(--gold-bright) 35%, transparent)',
          color: 'var(--gold-bright)',
        }}
      >
        <Plus size={14} strokeWidth={2.6} />
      </span>
      <span style={{ lineHeight: 'normal' }}>
        <span className="block" style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{title}</span>
        <span className="block" style={{ marginTop: 2, fontSize: 11, color: 'var(--subtext)' }}>{sub}</span>
      </span>
    </button>
  );
}
