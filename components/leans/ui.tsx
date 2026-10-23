/**
 * Leans UI primitives (design-system §9.5). Tokens only.
 *
 *   (LeanPill lives in ./LeanPill.tsx.)
 *   SignalList  the 3 checks: ✓ `--green` (its "win" meaning), ✕ `--muted`, in the
 *               near-black why box (`--nav-bg`, hairline, radius 10, 36px rows).
 *   LeansLabel  D1 gold-rule section label, optional right note ("2 this week").
 */

import type { CSSProperties, ReactNode } from 'react';
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
export interface WhyListRow {
  /** `**bold**` allowed. */
  label: string;
  /** Optional right-hand value (13/800), before the rank. */
  value?: string;
  rank: string;
}

/** Why-stats box (My Team §9.4 recipe): 36px rows, label left, [value] + rank right. */
export function WhyList({ rows }: { rows: readonly WhyListRow[] }) {
  if (rows.length === 0) return null;
  return (
    <dl data-why style={WHY_BOX}>
      {rows.map((w, i) => (
        <div
          key={w.label}
          className="flex items-center justify-between"
          style={{ gap: 10, minHeight: 36, padding: '0 10px', borderTop: i > 0 ? '1px solid var(--hairline)' : 'none', lineHeight: 'normal' }}
        >
          <dt style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>
            <Bolded text={w.label} />
          </dt>
          <dd className="flex flex-none items-center tabular-nums" style={{ gap: 10 }}>
            {w.value != null && <b style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{w.value}</b>}
            <span style={{ minWidth: 28, textAlign: 'right', fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>{w.rank}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
