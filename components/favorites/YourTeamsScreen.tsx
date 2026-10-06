/**
 * YourTeamsScreen — /teams (Setup 5): manage "Your teams".
 *   • reorder (↑ ↓ = pin order on Home), remove (×)
 *   • search to add (city, nickname or abbreviation)
 *   • display switches: pin to top of Home · team-color glow
 * Reached from "Manage order & display" in the Home star sheet.
 * Shell rule: fixed header, the main area is the only scroll region.
 */

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronLeft, Plus, X } from 'lucide-react';
import { useFavorites } from '@/components/FavoritesProvider';
import { MAX_FAVORITES } from '@/lib/favorites/store';
import { NFL_TEAMS, getTeamByAbbr } from '@/lib/teams';
import { getTeamPalette } from '@/lib/teamColors';
import TeamIdentity from '@/components/ui/TeamIdentity';

const SECTION = { fontSize: 9.5, fontWeight: 800, letterSpacing: '0.26em', color: 'var(--gold-bright)' } as const;
const PANEL = {
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--hairline)',
  background: 'var(--card-deep-mid)',
  overflow: 'hidden',
} as const;

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-11 shrink-0 items-center justify-center touch-optimized active:opacity-60 disabled:opacity-25"
      style={{ color: 'var(--subtext)' }}
    >
      {children}
    </button>
  );
}

function Switch({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5" style={{ minHeight: 60 }}>
      <span>
        <span className="block" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
        <span className="block" style={{ marginTop: 2, fontSize: 11, color: 'var(--subtext)' }}>{hint}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className="flex shrink-0 rounded-full p-[3px] touch-optimized"
        style={{ width: 50, height: 30, background: on ? 'var(--gold-bright)' : 'var(--border)', transition: 'background .2s' }}
      >
        <span
          className="block rounded-full"
          style={{ width: 24, height: 24, background: 'var(--text)', transform: `translateX(${on ? 20 : 0}px)`, transition: 'transform .2s' }}
        />
      </button>
    </div>
  );
}

export default function YourTeamsScreen() {
  const { teams, toggleFavorite, moveFavorite, pin, setPin, glow, setGlow } = useFavorites();
  const [query, setQuery] = useState('');
  const canAdd = teams.length < MAX_FAVORITES;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = NFL_TEAMS.filter((t) => !teams.includes(t.abbr));
    if (!q) return [];
    return pool
      .filter((t) => t.name.toLowerCase().includes(q) || t.abbr.toLowerCase() === q)
      .slice(0, 6);
  }, [query, teams]);

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'var(--app-h, 100dvh)', background: 'var(--bg-deep)' }}>
      <header
        className="flex-none border-b"
        style={{ borderColor: 'var(--hairline)', paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-[52px] w-full max-w-[600px] items-center px-1.5">
          <Link href="/" aria-label="Back to Home" className="flex h-11 w-11 items-center justify-center touch-optimized active:opacity-60">
            <ChevronLeft size={22} style={{ color: 'var(--text)' }} />
          </Link>
          <h1 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text)' }}>Your teams</h1>
        </div>
      </header>

      <main
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ overscrollBehavior: 'contain', paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 24px)' }}
      >
        <div className="mx-auto flex w-full max-w-[600px] flex-col gap-2.5 px-4 pt-4">
          <div className="flex items-center justify-between">
            <span style={SECTION}>FAVORITES · {teams.length} / {MAX_FAVORITES}</span>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>Order = pin order on Home</span>
          </div>

          {teams.length === 0 && (
            <div
              className="flex items-center justify-center"
              style={{ height: 60, borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)', fontSize: 12, color: 'var(--subtext)' }}
            >
              No teams yet — search below to add one
            </div>
          )}

          {teams.map((abbr, i) => {
            const t = getTeamByAbbr(abbr);
            if (!t) return null;
            const pal = getTeamPalette(t.name);
            return (
              <div
                key={abbr}
                className="flex items-center"
                style={{
                  height: 60, paddingLeft: 14, gap: 6,
                  borderRadius: 'var(--radius-lg)',
                  border: `1.5px solid ${pal?.line ?? 'var(--frame-mid)'}`,
                  background: 'linear-gradient(90deg, var(--card-deep-a), var(--card-deep-mid) 60%, var(--card-deep-b))',
                  boxShadow: pal ? `-10px 0 24px -8px rgba(${pal.rgb}, 0.6)` : undefined,
                }}
              >
                <span className="tabular-nums" style={{ width: 14, fontSize: 11, fontWeight: 800, color: 'var(--muted)' }}>{i + 1}</span>
                <TeamIdentity abbr={abbr} surface="favorites" size={34} slot={50} decorative>
                  <span style={{ width: 50, fontSize: 20, fontWeight: 900, color: pal?.line ?? 'var(--text)' }}>{abbr}</span>
                </TeamIdentity>
                <span className="min-w-0 flex-1 truncate" style={{ fontSize: 12, fontWeight: 600, color: 'var(--subtext)' }}>{t.name}</span>
                <IconButton label={`Move ${t.name} up`} onClick={() => moveFavorite(abbr, -1)} disabled={i === 0}>
                  <ArrowUp size={17} />
                </IconButton>
                <IconButton label={`Move ${t.name} down`} onClick={() => moveFavorite(abbr, 1)} disabled={i === teams.length - 1}>
                  <ArrowDown size={17} />
                </IconButton>
                <IconButton label={`Remove ${t.name}`} onClick={() => toggleFavorite(abbr)}>
                  <X size={18} />
                </IconButton>
              </div>
            );
          })}

          {canAdd && (
            <div style={PANEL}>
              <label className="flex items-center gap-2.5 px-3.5" style={{ height: 48 }}>
                <Plus size={18} style={{ color: 'var(--gold-bright)', flex: 'none' }} aria-hidden />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Add a team — city or nickname"
                  aria-label="Search teams to add"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  // 16px stops iOS from zooming into the field on focus.
                  style={{ height: 44, fontSize: 16, color: 'var(--text)' }}
                />
              </label>
              {results.map((t) => {
                const pal = getTeamPalette(t.name);
                return (
                  <button
                    key={t.abbr}
                    type="button"
                    onClick={() => {
                      toggleFavorite(t.abbr);
                      setQuery('');
                    }}
                    aria-label={`Add ${t.name}`}
                    className="flex w-full items-center gap-2.5 px-3.5 text-left touch-optimized active:opacity-60"
                    style={{ height: 44, borderTop: '1px solid var(--hairline)' }}
                  >
                    <TeamIdentity abbr={t.abbr} surface="favorites" size={24} slot={40} decorative>
                      <span style={{ width: 40, fontSize: 14, fontWeight: 900, color: pal?.line ?? 'var(--text)' }}>{t.abbr}</span>
                    </TeamIdentity>
                    <span className="flex-1" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{t.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--gold-bright)' }}>ADD</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-3.5" style={SECTION}>DISPLAY</div>
          <div style={PANEL}>
            <Switch label="Pin to top of Home" hint="“Your teams” section above each week" on={pin} onChange={setPin} />
            <div style={{ height: 1, background: 'var(--hairline)' }} />
            <Switch label="Team-color glow" hint="Outer aura on your teams’ game cards" on={glow} onChange={setGlow} />
          </div>
          <p style={{ margin: '6px 2px 0', fontSize: 11, lineHeight: 1.45, color: 'var(--muted)' }}>
            Saved on this device. Syncs to your account once sign-in lands.
          </p>
        </div>
      </main>
    </div>
  );
}
