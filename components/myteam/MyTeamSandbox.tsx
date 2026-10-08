/**
 * /sandbox/myteam (dev-only) — every My Team state on one page from the
 * synthetic bundle (lib/myteam/sandboxBundle.ts), server-rendered for checks
 * and screenshots. The roster is the real MyTeamScreen with rows pre-opened
 * (one on Start / Sit) and pins on the iPad panel; only the data is fake.
 * State roots carry ASCII `data-state` / `data-tier` / `data-injury` /
 * `data-bye` attributes.
 */

'use client';

import { useMemo, useState } from 'react';
import { buildSandboxBundle, SANDBOX_LEAGUES } from '@/lib/myteam/sandboxBundle';
import type { RatingWindow } from '@/lib/myteam/types';
import { LeagueCapsule } from './LeagueSwitcher';
import MyTeamScreen from './MyTeamScreen';
import MyTeamShell from './MyTeamShell';
import Onboarding, { GhostRows } from './Onboarding';
import { SectionHeading } from './RosterView';

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <SectionHeading>{title}</SectionHeading>
      <div className="px-3 pb-3" style={{ border: '1px dashed var(--frame-mid)', borderRadius: 'var(--radius-lg)' }}>
        {children}
      </div>
    </section>
  );
}

export default function MyTeamSandbox() {
  const bundle = useMemo(() => buildSandboxBundle(), []);
  const [window, setWindow] = useState<RatingWindow>('season');
  const noop = () => {};

  return (
    <MyTeamShell headerRight={<LeagueCapsule name={SANDBOX_LEAGUES[0].name} onOpen={noop} />}>
      <p className="pt-2" style={{ fontSize: 11, color: 'var(--subtext)' }}>
        Sandbox — synthetic data, dev only (404 in production).
      </p>

      <Frame title="Roster (rows open, Start / Sit, pins on iPad)">
        <MyTeamScreen
          bundle={bundle}
          window={window}
          onWindowChange={setWindow}
          initialExpanded={['sb2', 'sb3']}
          startSitIds={['sb2']}
          initialPins={['sb1', 'sb6']}
          initialPinnedOpen={['sb1']}
        />
      </Frame>

      <Frame title="Onboarding · entry">
        <Onboarding state="entry" onSubmit={noop} />
        <GhostRows />
      </Frame>
      <Frame title="Onboarding · not found">
        <Onboarding state="notfound" username="no_such_user" onSubmit={noop} />
      </Frame>
      <Frame title="Onboarding · loading">
        <Onboarding state="loading" />
      </Frame>
      <Frame title="Onboarding · pick a league">
        <Onboarding state="pickleague" leagues={SANDBOX_LEAGUES} onPickLeague={noop} onReset={noop} />
      </Frame>
      <Frame title="Onboarding · no leagues">
        <Onboarding state="noleagues" username="user_1" season={bundle.season} onRetry={noop} onReset={noop} />
      </Frame>
      <Frame title="Onboarding · pre-draft">
        <Onboarding state="predraft" leagueName={SANDBOX_LEAGUES[1].name} onRetry={noop} />
      </Frame>
      <Frame title="Onboarding · can't reach Sleeper">
        <Onboarding state="error" message="Couldn't load your league from Sleeper." onRetry={noop} onReset={noop} />
      </Frame>
    </MyTeamShell>
  );
}
