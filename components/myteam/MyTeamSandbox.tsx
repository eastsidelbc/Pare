/**
 * /sandbox/my-team (dev-only) — every My Team state on one page from the
 * synthetic bundle (lib/myteam/sandboxBundle.ts), server-rendered for checks
 * and screenshots. The roster/sheet are the real components; only the data is
 * fake. Each state root carries an ASCII `data-state` / `data-tier` /
 * `data-injury` / `data-bye` attribute (plan P3).
 */

'use client';

import { useMemo, useState } from 'react';
import { SectionLabel } from '@/components/standings/StandingsRow';
import { useOpenInCompare } from '@/lib/hooks/useOpenInCompare';
import { buildSandboxBundle, SANDBOX_LEAGUES } from '@/lib/myteam/sandboxBundle';
import type { RatingWindow } from '@/lib/myteam/types';
import { buildRosterView } from '@/lib/myteam/viewModel';
import MyTeamShell from './MyTeamShell';
import MyTeamScreen from './MyTeamScreen';
import Onboarding from './Onboarding';
import { PlayerSheetBody } from './PlayerSheet';
import WindowToggle from './WindowToggle';

function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <SectionLabel>{title}</SectionLabel>
      <div className="rounded-lg px-3" style={{ border: '1px dashed var(--frame-mid)' }}>
        {children}
      </div>
    </section>
  );
}

export default function MyTeamSandbox() {
  const bundle = useMemo(() => buildSandboxBundle(), []);
  const [window, setWindow] = useState<RatingWindow>('season');
  const [irOpen, setIrOpen] = useState(true);
  const openInCompare = useOpenInCompare();
  const sheetRow = useMemo(() => buildRosterView(bundle, window).starters[1], [bundle, window]);

  return (
    <MyTeamShell headerRight={<WindowToggle value={window} onChange={setWindow} />}>
      <p className="pb-2" style={{ fontSize: 11, color: 'var(--subtext)' }}>
        Sandbox — synthetic data, dev only (404 in production).
      </p>

      <Frame title="Roster (IR / Taxi open)">
        <div className="py-2">
          <MyTeamScreen
            bundle={bundle}
            leagues={SANDBOX_LEAGUES}
            window={window}
            irOpen={irOpen}
            onToggleIr={() => setIrOpen((v) => !v)}
            onSelectLeague={() => {}}
            onUnlink={() => {}}
          />
        </div>
      </Frame>

      <Frame title="Player sheet (static)">
        <div className="py-3">
          <PlayerSheetBody
            row={sheetRow}
            window={window}
            defenseLog={bundle.defenseLog}
            offenseLog={bundle.offenseLog}
            onOpenCompare={(team, opp) => void openInCompare(team, opp)}
          />
        </div>
      </Frame>

      <Frame title="Onboarding · entry">
        <Onboarding state="entry" onSubmit={() => {}} />
      </Frame>
      <Frame title="Onboarding · not found">
        <Onboarding state="notfound" username="no_such_user" onSubmit={() => {}} />
      </Frame>
      <Frame title="Onboarding · no leagues">
        <Onboarding state="noleagues" username="user_1" season={bundle.season} onReset={() => {}} />
      </Frame>
      <Frame title="Onboarding · pre-draft">
        <Onboarding state="predraft" />
      </Frame>
    </MyTeamShell>
  );
}
