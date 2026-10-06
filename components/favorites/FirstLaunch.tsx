/**
 * FirstLaunch — one-time "Who do you root for?" screen (Setup 1).
 *
 * Shows on Home only, once: after localStorage is read (so returning users who
 * already finished never see a flash) and while `onboarded` is false. Continue
 * or Skip both mark it done; picks apply live through the favorites store.
 * AFC / NFC tabs keep the grid to 16 big tiles so nothing needs scrolling far.
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useFavorites } from '@/components/FavoritesProvider';
import { MAX_FAVORITES } from '@/lib/favorites/store';
import type { Conference } from '@/lib/teams';
import TeamGrid from './TeamGrid';

export default function FirstLaunch() {
  const pathname = usePathname() ?? '/';
  const { hydrated, onboarded, teams, toggleFavorite, finishOnboarding } = useFavorites();
  const [conf, setConf] = useState<Conference>('NFC');
  const show = hydrated && !onboarded && pathname === '/';
  const n = teams.length;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="first-launch"
          role="dialog"
          aria-modal="true"
          aria-label="Pick your teams"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex flex-col"
          style={{
            height: 'var(--app-h, 100dvh)',
            background: 'radial-gradient(120% 60% at 50% 0%, var(--card-deep-b) 0%, var(--bg-deep) 60%)',
          }}
        >
          <div className="mx-auto w-full max-w-[600px] flex-none px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 32px)' }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.26em', color: 'var(--gold-bright)' }}>WELCOME TO PARE</div>
            <h1 style={{ margin: '8px 0 6px', fontSize: 28, lineHeight: 1.1, fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text)' }}>
              Who do you root for?
            </h1>
            <p style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--subtext)' }}>
              Pick up to {MAX_FAVORITES}. Their games pin to the top of every week.
            </p>
            <div
              role="group"
              aria-label="Conference"
              className="mt-3.5 flex gap-1 rounded-full p-[3px]"
              style={{ background: 'var(--nav-bg)', border: '1px solid var(--glass-edge)' }}
            >
              {(['AFC', 'NFC'] as const).map((c) => {
                const on = c === conf;
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setConf(c)}
                    className="flex-1 rounded-full touch-optimized"
                    style={{
                      height: 38, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
                      color: on ? 'var(--gold-bright)' : 'var(--subtext)',
                      border: `1px solid ${on ? 'var(--gold-bright)' : 'transparent'}`,
                      background: 'transparent',
                    }}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mx-auto min-h-0 w-full max-w-[600px] flex-1 overflow-y-auto overscroll-contain px-5 pb-40 pt-1">
            <TeamGrid selected={teams} onToggle={toggleFavorite} conference={conf} variant="tile" />
          </div>

          <div
            className="absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-[600px] flex-col gap-1.5 px-5 pt-4"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 18px)',
              background: 'linear-gradient(180deg, transparent, var(--bg-deep) 35%)',
            }}
          >
            <button
              type="button"
              onClick={finishOnboarding}
              className="touch-optimized active:opacity-80"
              style={{
                height: 52, borderRadius: 999, fontSize: 15, fontWeight: 900,
                background: n ? 'var(--gold-bright)' : 'var(--hairline)',
                color: n ? 'var(--badge-gold-text)' : 'var(--subtext)',
              }}
            >
              {n ? `Continue · ${n} picked` : 'Continue'}
            </button>
            <button
              type="button"
              onClick={finishOnboarding}
              className="touch-optimized active:opacity-70"
              style={{ height: 44, fontSize: 12, fontWeight: 700, color: 'var(--subtext)', background: 'transparent' }}
            >
              Skip for now
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
