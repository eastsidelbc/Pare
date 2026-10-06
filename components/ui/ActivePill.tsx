/**
 * ActivePill — the sliding gold neon outline behind the active item of a glass
 * toggle (bottom nav, Standings view, Fantasy TOT/PPG, Leaders jump capsule).
 *
 * One shared element per control (framer-motion `layoutId`), so a switch SLIDES the
 * pill from the old item to the new one. Only `transform` animates; the ring, fill
 * and glow are static and ride along on their own GPU layer (`will-change`).
 *
 * `layoutId` is required and must be unique per control — two controls sharing an id
 * would make the pill fly between them. The bottom nav owns 'nav-active-pill'.
 * Reduced motion → instant swap.
 *
 * Render it as the first child of a `relative` item, only while that item is active;
 * the item's label sits above it (`GlassLabel` / z-index 1).
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';

const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;
const INSTANT = { duration: 0 } as const;

export default function ActivePill({ layoutId }: { layoutId: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      layoutId={layoutId}
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-full"
      style={{
        border: '1.5px solid var(--gold-bright)',
        background: 'color-mix(in srgb, var(--gold-bright) 8%, transparent)',
        boxShadow: '0 0 12px color-mix(in srgb, var(--gold-bright) 35%, transparent)',
        willChange: 'transform',
      }}
      transition={reduceMotion ? INSTANT : SPRING}
    />
  );
}
