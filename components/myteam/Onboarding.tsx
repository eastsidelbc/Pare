/**
 * Inline onboarding (design-system §9.4): a setup card where the roster goes,
 * above 4 ghost rows. Every state lives in the same card:
 *   entry · notfound · loading · pickleague · noleagues · predraft · error
 * Bad characters are caught here (inline red line + red field edge) before any
 * request. The Continue button stays visible above the keyboard
 * (visualViewport resize → scroll it into view).
 */

'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { isValidUsername } from '@/lib/myteam/store';
import type { FantasyLeague } from '@/lib/myteam/types';
import { GOLD_RING_BUTTON, LIST_CARD } from './style';

export type OnboardingState = 'entry' | 'notfound' | 'loading' | 'pickleague' | 'noleagues' | 'predraft' | 'error';

interface Props {
  state: OnboardingState;
  /** Username of the last lookup (notfound / noleagues). */
  username?: string | null;
  season?: number | null;
  /** pickleague */
  leagues?: FantasyLeague[];
  onPickLeague?: (leagueId: string) => void;
  /** predraft */
  leagueName?: string;
  /** error */
  message?: string | null;
  busy?: boolean;
  onSubmit?: (username: string) => void;
  /** Check again / Try again. */
  onRetry?: () => void;
  /** Use another username. */
  onReset?: () => void;
}

const BAD_CHARS = 'Sleeper usernames use letters, numbers and _ only.';

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="touch-optimized active:opacity-70"
      style={{ minHeight: 44, fontSize: 13, fontWeight: 700, color: 'var(--subtext)' }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, type = 'button', disabled, btnRef }: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  btnRef?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={btnRef}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="touch-optimized w-full rounded-full active:opacity-70"
      style={{ ...GOLD_RING_BUTTON, height: 48, fontSize: 15, opacity: disabled ? 0.55 : 1 }}
    >
      {children}
    </button>
  );
}

function Shimmer({ width, height = 12 }: { width: number | string; height?: number }) {
  return <span aria-hidden className="pare-shimmer block" style={{ width, height, borderRadius: 'var(--radius-sm)' }} />;
}

export default function Onboarding(props: Props) {
  const { state, username, season, leagues = [], onPickLeague, leagueName, message, busy = false, onSubmit, onRetry, onReset } = props;
  const [value, setValue] = useState(state === 'notfound' ? (username ?? '') : '');
  const [badChars, setBadChars] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const showForm = state === 'entry' || state === 'notfound';

  // Keep Continue visible above the on-screen keyboard.
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv || !showForm) return;
    const onResize = () => {
      if (document.activeElement === inputRef.current) continueRef.current?.scrollIntoView({ block: 'nearest' });
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [showForm]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = value.trim();
    if (!name || busy) return;
    if (!isValidUsername(name)) {
      setBadChars(true);
      return;
    }
    onSubmit?.(name);
  };

  const error = badChars ? BAD_CHARS : state === 'notfound' ? `No Sleeper user named "${username ?? ''}". Check the spelling.` : null;

  return (
    <section data-state={`onboarding-${state}`} className="mx-auto mt-3 w-full max-w-[560px] p-4" style={LIST_CARD}>
      {showForm && (
        <form onSubmit={submit} noValidate className="flex flex-col gap-3">
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Link your fantasy league</h2>
            <p className="mt-1" style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--subtext)' }}>
              See how tough each player&apos;s matchup is this week and the next five — the part your league app doesn&apos;t show.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="myteam-username" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
              Sleeper username
            </label>
            <input
              ref={inputRef}
              id="myteam-username"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setBadChars(false);
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
              maxLength={20}
              enterKeyHint="go"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'myteam-username-error' : undefined}
              className="w-full px-3"
              // 16px font: iOS Safari won't zoom the page on focus.
              style={{
                height: 48,
                fontSize: 16,
                color: 'var(--text)',
                background: 'var(--nav-bg)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${error ? 'var(--red)' : 'var(--seed-edge)'}`,
              }}
            />
            {error && (
              <p id="myteam-username-error" role="alert" style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>
                {error}
              </p>
            )}
          </div>
          <PrimaryButton type="submit" disabled={busy || value.trim() === ''} btnRef={continueRef}>
            {busy ? 'Finding your leagues…' : 'Continue'}
          </PrimaryButton>
          <p className="flex items-start gap-1.5" style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--subtext)' }}>
            <Lock size={12} aria-hidden style={{ flex: 'none', marginTop: 2 }} />
            Read-only — Pare can&apos;t change your lineup. Your username is saved on this device and only used to load your leagues.
          </p>
        </form>
      )}

      {state === 'loading' && (
        <div role="status" aria-label="Loading your league" className="flex flex-col gap-3">
          <Shimmer width="55%" height={16} />
          <Shimmer width="85%" />
          <Shimmer width="70%" />
          <Shimmer width="100%" height={48} />
        </div>
      )}

      {state === 'pickleague' && (
        <div className="flex flex-col gap-2">
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Pick a league</h2>
          <ul className="divide-y divide-[var(--hairline)]">
            {leagues.map((l) => (
              <li key={l.leagueId}>
                <button
                  type="button"
                  onClick={() => onPickLeague?.(l.leagueId)}
                  className="touch-optimized flex w-full items-center gap-3 text-left active:opacity-70"
                  style={{ minHeight: 64 }}
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>
                      {l.name}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--subtext)' }}>{l.totalRosters} teams</span>
                  </span>
                  {l.status === 'in_season' && (
                    <span
                      className="flex-none"
                      style={{ fontSize: 10, fontWeight: 800, color: 'var(--gold-bright)', border: '1px solid var(--gold-bright)', borderRadius: 999, padding: '2px 8px' }}
                    >
                      In season
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <SecondaryButton onClick={onReset}>Use another username</SecondaryButton>
        </div>
      )}

      {state === 'noleagues' && (
        <div className="flex flex-col gap-3">
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>No leagues found</h2>
          <p style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--subtext)' }}>
            <strong style={{ color: 'var(--text)' }}>{username}</strong> has no {season ?? ''} NFL leagues on Sleeper yet.
          </p>
          <PrimaryButton onClick={onRetry}>Check again</PrimaryButton>
          <SecondaryButton onClick={onReset}>Use another username</SecondaryButton>
        </div>
      )}

      {state === 'predraft' && (
        <div className="flex flex-col gap-3">
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>{leagueName ?? 'Your league'} hasn&apos;t drafted yet</h2>
          <p style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--subtext)' }}>
            Matchups show up here once your league drafts. Switch leagues from the header, or check back after the draft.
          </p>
          <PrimaryButton onClick={onRetry}>Check again</PrimaryButton>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col gap-3">
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text)' }}>Can&apos;t reach Sleeper</h2>
          <p role="alert" style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--subtext)' }}>
            {message ?? 'Something went wrong loading your league.'}
          </p>
          <PrimaryButton onClick={onRetry}>Try again</PrimaryButton>
          {onReset && <SecondaryButton onClick={onReset}>Use another username</SecondaryButton>}
        </div>
      )}
    </section>
  );
}

/** Ghost roster under the setup card — shows where the roster will appear. */
export function GhostRows() {
  return (
    <div aria-hidden className="mt-4" style={{ opacity: 0.55 }}>
      <ul className="divide-y divide-[var(--hairline)] overflow-hidden" style={LIST_CARD}>
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex items-center gap-2.5 px-3" style={{ minHeight: 62 }}>
            <span className="flex-none rounded-full" style={{ width: 38, height: 38, background: 'var(--hairline)' }} />
            <span className="flex flex-1 flex-col gap-1.5">
              <span className="block" style={{ width: `${60 - i * 8}%`, height: 10, borderRadius: 4, background: 'var(--hairline)' }} />
              <span className="block" style={{ width: `${40 - i * 4}%`, height: 8, borderRadius: 4, background: 'var(--hairline)' }} />
            </span>
            <span className="flex items-end gap-[2px]">
              {[6, 8, 10, 12, 14].map((h) => (
                <span key={h} style={{ width: 4, height: h, borderRadius: 1.5, background: 'var(--hairline)' }} />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-center" style={{ fontSize: 12, color: 'var(--subtext)' }}>
        Your starters, bench and IR / Taxi show up here.
      </p>
    </div>
  );
}
