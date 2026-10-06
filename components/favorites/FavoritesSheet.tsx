/**
 * FavoritesSheet — the "Your teams" picker (Setup 2), opened from the star in
 * the Home header. Bottom sheet: all 32 teams by division, tap to star (max 3).
 * "Manage" links to /teams for ordering + the pin / glow switches.
 *
 * Changes apply instantly (the Home list re-pins underneath while it's open),
 * so "Done" just closes — no save step to forget.
 */

'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useFavorites } from '@/components/FavoritesProvider';
import { MAX_FAVORITES } from '@/lib/favorites/store';
import TeamGrid from './TeamGrid';

export default function FavoritesSheet() {
  const { sheetOpen, closeSheet, teams, toggleFavorite } = useFavorites();
  const full = teams.length >= MAX_FAVORITES;

  return (
    <AnimatePresence>
      {sheetOpen && (
        <>
          <motion.button
            key="backdrop"
            type="button"
            aria-label="Close Your teams"
            onClick={closeSheet}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'color-mix(in srgb, var(--bg-deep) 70%, transparent)' }}
          />
          <motion.section
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Your teams"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[600px] flex-col"
            style={{
              maxHeight: 'calc(var(--app-h, 100dvh) * 0.88)',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              background: 'var(--card-deep-mid)',
              borderTop: '1px solid var(--glass-edge)',
              boxShadow: 'var(--shadow-pop)',
            }}
          >
            <div className="mx-auto mt-2.5 h-1 w-9 rounded-full" style={{ background: 'var(--frame-mid)' }} aria-hidden />
            <div className="flex items-center justify-between px-4 pt-3">
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.26em', color: 'var(--gold-bright)' }}>
                  YOUR TEAMS · {teams.length} / {MAX_FAVORITES}
                </div>
                <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>Pick up to {MAX_FAVORITES}</h2>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                className="touch-optimized active:opacity-70"
                style={{
                  height: 44, padding: '0 18px', borderRadius: 999, fontSize: 13, fontWeight: 800,
                  color: 'var(--gold-bright)', border: '1.5px solid var(--gold-bright)', background: 'transparent',
                }}
              >
                Done
              </button>
            </div>
            <p className="px-4 pt-2" style={{ fontSize: 11, color: full ? 'var(--gold-bright)' : 'var(--subtext)' }}>
              {full ? `Max ${MAX_FAVORITES} — tap a starred team to swap it out.` : 'Tap teams to star them. Their games pin to the top of every week.'}
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1">
              <TeamGrid selected={teams} onToggle={toggleFavorite} />
              <Link
                href="/teams"
                onClick={closeSheet}
                className="mt-4 flex items-center justify-between touch-optimized active:opacity-70"
                style={{
                  minHeight: 48, padding: '0 14px', borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--hairline)', fontSize: 13, fontWeight: 700, color: 'var(--text)',
                }}
              >
                Manage order &amp; display
                <ChevronRight size={16} style={{ color: 'var(--subtext)' }} />
              </Link>
              <div style={{ height: 'calc(env(safe-area-inset-bottom) + 20px)' }} />
            </div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
