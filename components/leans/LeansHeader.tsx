/**
 * LeansHeader — the Leans list's fixed top bar (A2-bets-list): Home's "H1 · Inline"
 * header (design-system §9 rule 7) with a gold-bright LEANS label. Right side = the
 * same ★ (Your teams sheet), WeekControl capsule and gear as Home.
 */

'use client';

import { Star } from 'lucide-react';
import WeekControl from '@/components/schedule/WeekControl';
import SettingsGearButton from '@/components/schedule/SettingsGearButton';
import { useFavorites } from '@/components/FavoritesProvider';

interface LeansHeaderProps {
  week: number;
  onStep: (dir: -1 | 1) => void;
  onJump: (week: number) => void;
}

export default function LeansHeader({ week, onStep, onJump }: LeansHeaderProps) {
  const { teams: favTeams, openSheet } = useFavorites();
  return (
    <header
      className="flex-none border-b"
      style={{ background: 'var(--bg-deep)', borderColor: 'var(--hairline)', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-[52px] w-full max-w-[600px] items-center justify-between px-4">
        <h1 className="whitespace-nowrap font-black tracking-tight" style={{ fontSize: '20px', color: 'var(--text)' }}>
          Pare
          <span
            className="ml-1.5 font-bold"
            style={{ fontSize: '9.5px', letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--gold-bright)' }}
          >
            LEANS
          </span>
        </h1>
        <div className="flex items-center" style={{ gap: 2 }}>
          <button
            type="button"
            onClick={openSheet}
            aria-label={favTeams.length ? `Your teams (${favTeams.length})` : 'Pick your teams'}
            className="flex items-center justify-center rounded-full touch-optimized active:opacity-70"
            style={{ width: 44, height: 44 }}
          >
            <Star
              size={20}
              strokeWidth={1.8}
              fill={favTeams.length ? 'currentColor' : 'none'}
              style={{ color: 'var(--gold-bright)' }}
              aria-hidden
            />
          </button>
          <WeekControl activeWeek={week} onStep={onStep} onJump={onJump} />
          <SettingsGearButton />
        </div>
      </div>
    </header>
  );
}
