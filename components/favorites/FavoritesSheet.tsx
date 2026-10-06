/**
 * FavoritesSheet — the "Your teams" picker (Setup 2), opened from the star in
 * the Home header. Bottom sheet: all 32 teams by division, tap to star (max 3).
 * "Manage order & display" (top, under the title) links to /teams for ordering +
 * the pin / glow switches. Swipe the top area down (or tap outside) to close.
 *
 * Changes apply instantly (the Home list re-pins underneath while it's open),
 * so "Done" just closes — no save step to forget.
 */

'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useFavorites } from '@/components/FavoritesProvider';
import { MAX_FAVORITES } from '@/lib/favorites/store';
import BottomSheet from '@/components/ui/BottomSheet';
import TeamGrid from './TeamGrid';

export default function FavoritesSheet() {
  const { sheetOpen, closeSheet, teams, toggleFavorite } = useFavorites();
  const full = teams.length >= MAX_FAVORITES;

  return (
    <BottomSheet
      open={sheetOpen}
      onClose={closeSheet}
      label="Your teams"
      closeLabel="Close Your teams"
      grab="header"
      style={{ maxHeight: 'calc(var(--app-h, 100dvh) * 0.88)' }}
      header={
        <>
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
          <Link
            href="/teams"
            onClick={closeSheet}
            className="mx-4 mt-3 flex items-center justify-between touch-optimized active:opacity-70"
            style={{
              minHeight: 48, padding: '0 14px', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--hairline)', fontSize: 13, fontWeight: 700, color: 'var(--text)',
            }}
          >
            Manage order &amp; display
            <ChevronRight size={16} style={{ color: 'var(--subtext)' }} />
          </Link>
          <p className="px-4 pt-2" style={{ fontSize: 11, color: full ? 'var(--gold-bright)' : 'var(--subtext)' }}>
            {full ? `Max ${MAX_FAVORITES} — tap a starred team to swap it out.` : 'Tap teams to star them. Their games pin to the top of every week.'}
          </p>
        </>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1">
        <TeamGrid selected={teams} onToggle={toggleFavorite} />
        <div style={{ height: 'calc(env(safe-area-inset-bottom) + 20px)' }} />
      </div>
    </BottomSheet>
  );
}
