/**
 * /my-team — picks what to show from the provider's phase:
 * onboarding → loading → roster (MyTeamScreen), with error/retry.
 * Reachable by URL only until the P5 design pass adds the nav tab.
 */

'use client';

import MyTeamShell from './MyTeamShell';
import MyTeamScreen from './MyTeamScreen';
import Onboarding from './Onboarding';
import WindowToggle from './WindowToggle';
import { useMyTeam } from './MyTeamProvider';

function Status({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="py-8 text-center" style={{ fontSize: 13, color: 'var(--subtext)' }}>
      {children}
    </p>
  );
}

export default function MyTeamApp() {
  const t = useMyTeam();
  const ready = t.phase === 'ready' && t.bundle;

  return (
    <MyTeamShell headerRight={ready ? <WindowToggle value={t.prefs.window} onChange={t.setWindow} /> : null}>
      {t.phase === 'boot' && <Status>Loading…</Status>}
      {t.phase === 'entry' && <Onboarding state="entry" onSubmit={t.submitUsername} />}
      {t.phase === 'lookup' && <Onboarding state="entry" busy onSubmit={t.submitUsername} />}
      {t.phase === 'notfound' && <Onboarding key={t.lookedUp} state="notfound" username={t.lookedUp} onSubmit={t.submitUsername} />}
      {t.phase === 'noleagues' && <Onboarding state="noleagues" username={t.lookedUp} season={t.season ?? undefined} onReset={t.unlink} />}
      {t.phase === 'loading' && <Status>Loading your league…</Status>}
      {t.phase === 'error' && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Status>{t.error ?? 'Something went wrong.'}</Status>
          <button
            type="button"
            onClick={t.retry}
            className="touch-optimized rounded-lg px-5 active:opacity-70"
            style={{ height: 44, border: '1px solid var(--frame-mid)', background: 'var(--card-deep-a)', fontSize: 14, fontWeight: 800, color: 'var(--text)' }}
          >
            Try again
          </button>
          <button type="button" onClick={t.unlink} className="touch-optimized active:opacity-70" style={{ minHeight: 44, fontSize: 12, color: 'var(--subtext)' }}>
            Use a different username
          </button>
        </div>
      )}
      {ready && t.bundle && (
        <MyTeamScreen
          bundle={t.bundle}
          leagues={t.leagues}
          window={t.prefs.window}
          irOpen={t.prefs.irOpen}
          onToggleIr={() => t.setIrOpen(!t.prefs.irOpen)}
          onSelectLeague={t.selectLeague}
          onUnlink={t.unlink}
        />
      )}
    </MyTeamShell>
  );
}
