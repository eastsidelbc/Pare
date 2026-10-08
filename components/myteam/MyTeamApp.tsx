/**
 * /myteam — picks what to show from the provider's phase. Onboarding is inline
 * (design-system §9.4): the week bar stays, the setup card sits where the
 * roster goes, ghost rows below. Ready → MyTeamScreen. The header's league
 * capsule opens the "Your leagues" sheet.
 */

'use client';

import { useMemo, useState } from 'react';
import { useSchedule } from '@/components/schedule/ScheduleProvider';
import { useMyTeamLive } from '@/lib/hooks/useMyTeamLive';
import type { FantasyLeague } from '@/lib/myteam/types';
import { LeagueCapsule, LeagueSheet } from './LeagueSwitcher';
import type { LiveView } from './LivePoints';
import MyTeamScreen from './MyTeamScreen';
import MyTeamShell from './MyTeamShell';
import Onboarding, { GhostRows, type OnboardingState } from './Onboarding';
import { useMyTeam } from './MyTeamProvider';
import { leagueFormatLine, leagueListLine } from './style';
import WeekBar from './WeekBar';

export default function MyTeamApp() {
  const t = useMyTeam();
  const { currentNflWeek } = useSchedule();
  const [sheetOpen, setSheetOpen] = useState(false);
  const ready = t.phase === 'ready' && t.bundle;
  const activeLeague = t.leagues.find((l) => l.leagueId === (t.switching ?? t.prefs.leagueId)) ?? null;
  const switchingName = t.switching ? (t.leagues.find((l) => l.leagueId === t.switching)?.name ?? 'league') : null;

  // Game day (P6): polls only while one of my games is live, the tab is visible and this route is mounted.
  const teams = useMemo(
    () => new Set((t.bundle?.roster.players ?? []).map((p) => p.nflTeam).filter((x): x is string => !!x)),
    [t.bundle],
  );
  const { games, started, polling, allFinal, state: liveState } = useMyTeamLive({
    leagueId: ready && t.bundle ? t.bundle.league.leagueId : null,
    userId: t.prefs.userId,
    week: t.bundle?.week ?? currentNflWeek,
    teams,
  });
  const live = useMemo<LiveView>(() => {
    const gameByTeam = new Map<string, { state: (typeof games)[number]['state']; clock: string }>();
    for (const g of games) {
      gameByTeam.set(g.away.abbr, { state: g.state, clock: g.statusDetail });
      gameByTeam.set(g.home.abbr, { state: g.state, clock: g.statusDetail });
    }
    return { on: started || liveState.points !== null, polling, allFinal, state: liveState, gameByTeam };
  }, [games, started, polling, allFinal, liveState]);

  const formatLine = (l: FantasyLeague) =>
    t.bundle && l.leagueId === t.bundle.league.leagueId ? leagueFormatLine(t.bundle.league) : leagueListLine(l);

  const onboarding: OnboardingState | null =
    t.phase === 'entry' || t.phase === 'lookup' ? 'entry'
      : t.phase === 'notfound' ? 'notfound'
        : t.phase === 'noleagues' ? 'noleagues'
          : t.phase === 'pickleague' ? 'pickleague'
            : t.phase === 'loading' ? 'loading'
              : t.phase === 'error' ? 'error'
                : null;

  return (
    <MyTeamShell
      headerRight={
        t.leagues.length > 0 && activeLeague && t.phase !== 'pickleague' ? (
          <LeagueCapsule name={activeLeague.name} onOpen={() => setSheetOpen(true)} />
        ) : null
      }
    >
      {ready && t.bundle ? (
        <MyTeamScreen
          bundle={t.bundle}
          window={t.prefs.window}
          onWindowChange={t.setWindow}
          switchingName={switchingName}
          onRetry={t.retry}
          live={live}
        />
      ) : (
        <>
          <WeekBar week={currentNflWeek || null} dateRange={null} window={t.prefs.window} onWindowChange={t.setWindow} />
          {onboarding && (
            <Onboarding
              key={onboarding === 'notfound' ? `notfound-${t.lookedUp ?? ''}` : onboarding}
              state={onboarding}
              username={t.lookedUp}
              season={t.season}
              leagues={t.leagues}
              onPickLeague={t.selectLeague}
              message={t.error}
              busy={t.phase === 'lookup'}
              onSubmit={t.submitUsername}
              onRetry={t.retry}
              onReset={t.unlink}
            />
          )}
          <GhostRows />
        </>
      )}

      <LeagueSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        leagues={t.leagues}
        activeId={t.prefs.leagueId}
        formatLine={formatLine}
        username={t.prefs.username}
        onSelect={t.selectLeague}
        onChangeUsername={t.unlink}
      />
    </MyTeamShell>
  );
}
