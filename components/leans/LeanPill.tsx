/**
 * LeanPill — the lean verdict chip (design-system §9.5): `--gold` (emphasis) outline
 * + 12% fill, radius 10, 26px ("Data leans OVER", arrow icon); big = 32px / 13px.
 * "No lean" / "Not enough games yet" = slate outline + `--subtext`. `--gold-bright`
 * stays for things you tap, so a lean never looks like a button.
 */

import { ArrowDown, ArrowUp } from 'lucide-react';
import type { LeanVerdict } from '@/lib/leans/types';

const isLean = (v: LeanVerdict) => v === 'over' || v === 'under' || v === 'side';

/** `text` is the full label. */
export default function LeanPill({ verdict, text, big = false }: { verdict: LeanVerdict; text: string; big?: boolean }) {
  const lean = isLean(verdict);
  const Icon = verdict === 'over' ? ArrowUp : verdict === 'under' ? ArrowDown : null;
  return (
    <span
      data-lean={verdict}
      className="inline-flex flex-none items-center whitespace-nowrap"
      style={{
        gap: 5,
        height: big ? 32 : 26,
        padding: big ? '0 12px' : '0 9px',
        borderRadius: 'var(--radius-md)',
        fontSize: big ? 13 : 11.5,
        fontWeight: lean ? 800 : 700,
        color: lean ? 'var(--gold)' : 'var(--subtext)',
        border: `1px solid color-mix(in srgb, ${lean ? 'var(--gold)' : 'var(--subtext)'} ${lean ? 60 : 35}%, transparent)`,
        background: lean ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
      }}
    >
      {Icon && <Icon size={big ? 14 : 13} strokeWidth={2.8} aria-hidden />}
      {text}
    </span>
  );
}
