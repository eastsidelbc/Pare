/**
 * My Team screen body — league switcher + week, then the roster (or a
 * pre-draft state) and the player sheet. Presentational over a bundle so the
 * live app (MyTeamApp) and the dev sandbox render the exact same markup.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOpenInCompare } from '@/lib/hooks/useOpenInCompare';
import type { LeagueBundle } from '@/lib/myteam/apiTypes';
import type { FantasyLeague, RatingWindow } from '@/lib/myteam/types';
import { buildRosterView, type RosterRow } from '@/lib/myteam/viewModel';
import { MAX_COMPARISONS_NOTICE } from './notice';
import LeagueSwitcher from './LeagueSwitcher';
import Onboarding from './Onboarding';
import PlayerSheet from './PlayerSheet';
import RosterView from './RosterView';

interface Props {
  bundle: LeagueBundle;
  leagues: FantasyLeague[];
  window: RatingWindow;
  irOpen: boolean;
  onToggleIr: () => void;
  onSelectLeague: (leagueId: string) => void;
  onUnlink: () => void;
}

export default function MyTeamScreen({ bundle, leagues, window, irOpen, onToggleIr, onSelectLeague, onUnlink }: Props) {
  const vm = useMemo(() => buildRosterView(bundle, window), [bundle, window]);
  const [selected, setSelected] = useState<RosterRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const openInCompare = useOpenInCompare();

  // Re-point the open sheet at the re-rated row when the window changes.
  useEffect(() => {
    setSelected((cur) => {
      if (!cur) return cur;
      const all = [...vm.starters, ...vm.bench, ...vm.reserve];
      return all.find((r) => r.player.playerId === cur.player.playerId) ?? null;
    });
  }, [vm]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const onOpenCompare = (team: string, opp: string) => {
    const result = openInCompare(team, opp);
    if (result === 'full') setNotice(MAX_COMPARISONS_NOTICE);
    else setSelected(null);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 pb-1">
        <LeagueSwitcher leagues={leagues} activeId={bundle.league.leagueId} onSelect={onSelectLeague} onUnlink={onUnlink} />
        <span className="flex-none tabular-nums" style={{ fontSize: 12, fontWeight: 700, color: 'var(--subtext)' }}>
          Week {bundle.week}
        </span>
      </div>

      {vm.preDraft ? (
        <Onboarding state="predraft" />
      ) : (
        <RosterView vm={vm} irOpen={irOpen} onToggleIr={onToggleIr} onSelect={setSelected} />
      )}

      <PlayerSheet
        row={selected}
        onClose={() => setSelected(null)}
        window={window}
        defenseLog={bundle.defenseLog}
        offenseLog={bundle.offenseLog}
        onOpenCompare={onOpenCompare}
      />

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center"
          style={{ bottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom) + 16px)' }}
        >
          <div
            className="whitespace-nowrap rounded-full"
            style={{
              padding: '10px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text)',
              background: 'var(--card-deep-a)', border: '1px solid var(--frame-mid)', boxShadow: 'var(--shadow-pop)',
            }}
          >
            {notice}
          </div>
        </div>
      )}
    </>
  );
}
