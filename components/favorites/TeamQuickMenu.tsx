/**
 * TeamQuickMenu — tap a team row on Standings (Setup 4) → this action sheet:
 *   [ ★ Add to Your teams ]   [ Compare BUF vs… ]   [ Cancel ]
 * A sheet with 52px buttons instead of a tiny star inside the dense 32px
 * Standings row (too small to hit reliably — Apple's floor is 44pt).
 *
 * "Compare vs…" opens a new Compare tab with this team on the left and an empty
 * right slot (the existing blank-slot picker), then navigates there.
 */

'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Star, GitCompareArrows } from 'lucide-react';
import { useFavorites } from '@/components/FavoritesProvider';
import { useComparisons } from '@/components/ComparisonsProvider';
import { getTeamByAbbr, type NflTeam } from '@/lib/teams';
import { getTeamPalette, type BarPalette } from '@/lib/teamColors';
import { MAX_FAVORITES } from '@/lib/favorites/store';
import TeamIdentity from '@/components/ui/TeamIdentity';
import BottomSheet from '@/components/ui/BottomSheet';
import { getTeamIdentityMode } from '@/config/teamIdentity';

const ACTION = {
  height: 52,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--frame-mid)',
  background: 'var(--card-deep-a)',
  fontSize: 14,
  fontWeight: 800,
  color: 'var(--text)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
} as const;

export default function TeamQuickMenu() {
  const router = useRouter();
  const { quickTeam, closeQuickMenu, isFavorite, toggleFavorite, teams } = useFavorites();
  const { addComparison } = useComparisons();

  const live = getTeamByAbbr(quickTeam);
  // Keep the last team while the sheet slides out (quickTeam is already null by then).
  const last = useRef(live);
  if (live) last.current = live;
  const team = live ?? last.current;
  const open = live != null;
  const pal = team ? getTeamPalette(team.name) : null;
  const on = team ? isFavorite(team.abbr) : false;
  const full = !on && teams.length >= MAX_FAVORITES;
  // Logo mode: logo left of the city + nickname header. Name mode: header markup unchanged.
  const withLogo = getTeamIdentityMode('teamMenu') === 'logo';

  const compare = () => {
    if (!team) return;
    addComparison(team.name, ''); // blank right slot → pick the opponent on Compare
    closeQuickMenu();
    router.push('/compare');
  };

  if (!team) return null; // never opened yet

  return (
    <BottomSheet
      open={open}
      onClose={closeQuickMenu}
      label={team.name}
      closeLabel="Close menu"
      className="gap-2.5 px-4 pt-2.5"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)' }}
    >
      {withLogo ? (
        <div className="flex items-center gap-3">
          <TeamIdentity abbr={team.abbr} surface="teamMenu" size={44} decorative>{null}</TeamIdentity>
          <SheetTitle team={team} pal={pal} />
        </div>
      ) : (
        <SheetTitle team={team} pal={pal} />
      )}
      <button
        type="button"
        onClick={() => toggleFavorite(team.abbr)}
        aria-pressed={on}
        disabled={full}
        className="touch-optimized active:opacity-70"
        style={{
          ...ACTION,
          color: on && pal ? pal.line : full ? 'var(--muted)' : 'var(--text)',
          borderColor: on && pal ? pal.line : 'var(--frame-mid)',
          boxShadow: on && pal ? `0 0 18px -6px rgba(${pal.rgb}, 0.8)` : 'none',
        }}
      >
        <Star size={18} fill={on ? 'currentColor' : 'none'} strokeWidth={1.8} aria-hidden />
        {on ? 'In Your teams · tap to remove' : full ? `Your teams is full (${MAX_FAVORITES})` : 'Add to Your teams'}
      </button>
      <button type="button" onClick={compare} className="touch-optimized active:opacity-70" style={ACTION}>
        <GitCompareArrows size={17} aria-hidden />
        Compare {team.abbr} vs…
      </button>
      <button
        type="button"
        onClick={closeQuickMenu}
        className="touch-optimized active:opacity-70"
        style={{ ...ACTION, background: 'transparent', border: '1px solid transparent', color: 'var(--subtext)' }}
      >
        Cancel
      </button>
    </BottomSheet>
  );
}

/** Sheet title: city small caps over the outlined nickname wordmark. */
function SheetTitle({ team, pal }: { team: NflTeam; pal: BarPalette | null }) {
  return (
    <div className="px-0.5 pb-1 pt-1">
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--subtext)' }}>
        {team.location}
      </div>
      <div
        style={{
          fontSize: 30, fontWeight: 900, lineHeight: 1.05, textTransform: 'uppercase', color: 'transparent',
          WebkitTextStroke: `1.4px ${pal?.line ?? 'var(--text)'}`,
          textShadow: pal ? `0 0 16px rgba(${pal.rgb}, 0.55)` : undefined,
        }}
      >
        {team.nickname}
      </div>
    </div>
  );
}
