/**
 * /myteam — picks what to show from the provider's phase. Onboarding is inline
 * (design-system §9.4): the week bar stays, the setup card sits where the
 * roster goes, ghost rows below. Ready → MyTeamScreen. The header's league
 * capsule opens the "Your leagues" sheet.
 */

'use client';

import { useState } from 'react';
import { useSchedule } from '@/components/schedule/ScheduleProvider';
import type { FantasyLeague } from '@/lib/myteam/types';
import { LeagueCapsule, LeagueSheet } from './LeagueSwitcher';
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
