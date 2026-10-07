/**
 * My Team empty / onboarding states — presentational.
 *   entry      → enter a Sleeper username
 *   notfound   → same form + "no such user"
 *   noleagues  → user found, but no leagues this season
 *   predraft   → league hasn't drafted yet
 * SKELETON styling (P3) — final copy/layout picked at the P4 mockup gate.
 */

'use client';

import { useState, type FormEvent } from 'react';
import { isValidUsername } from '@/lib/myteam/store';

export type OnboardingState = 'entry' | 'notfound' | 'noleagues' | 'predraft';

interface Props {
  state: OnboardingState;
  /** The username that was looked up (notfound / noleagues). */
  username?: string | null;
  season?: number;
  busy?: boolean;
  onSubmit?: (username: string) => void;
  /** "Use a different username" (noleagues / predraft). */
  onReset?: () => void;
}

const TITLE: Record<OnboardingState, string> = {
  entry: 'Link your Sleeper league',
  notfound: 'Sleeper user not found',
  noleagues: 'No leagues found',
  predraft: "Your league hasn't drafted yet",
};

const BUTTON = {
  height: 48,
  borderRadius: 'var(--radius-lg)',
  border: '1px solid var(--frame-mid)',
  background: 'var(--card-deep-a)',
  fontSize: 14,
  fontWeight: 800,
  color: 'var(--text)',
} as const;

export default function Onboarding({ state, username, season, busy = false, onSubmit, onReset }: Props) {
  const [value, setValue] = useState(state === 'notfound' ? (username ?? '') : '');
  const valid = isValidUsername(value.trim());
  const showForm = state === 'entry' || state === 'notfound';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (valid && !busy) onSubmit?.(value.trim());
  };

  return (
    <section data-state={`onboarding-${state}`} className="flex flex-col gap-3 py-4">
      <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>{TITLE[state]}</h2>

      {state === 'entry' && (
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--subtext)' }}>
          Enter your Sleeper username to see each player&apos;s matchup this week and the weeks ahead. Read-only — no password,
          and your username stays on this device.
        </p>
      )}
      {state === 'notfound' && (
        <p role="alert" style={{ fontSize: 13, color: 'var(--subtext)' }}>
          No Sleeper account named <strong style={{ color: 'var(--text)' }}>{username}</strong>. Check the spelling and try again.
        </p>
      )}
      {state === 'noleagues' && (
        <p style={{ fontSize: 13, color: 'var(--subtext)' }}>
          <strong style={{ color: 'var(--text)' }}>{username}</strong> has no {season ?? ''} NFL leagues on Sleeper.
        </p>
      )}
      {state === 'predraft' && (
        <p style={{ fontSize: 13, color: 'var(--subtext)' }}>
          Matchups show up here once your league drafts. Switch leagues above, or check back after the draft.
        </p>
      )}

      {showForm ? (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor="myteam-username" style={{ fontSize: 11, fontWeight: 700, color: 'var(--subtext)' }}>
            Sleeper username
          </label>
          <input
            id="myteam-username"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            maxLength={20}
            enterKeyHint="go"
            className="rounded-lg px-3"
            // 16px font: iOS Safari won't zoom the page on focus.
            style={{ height: 48, fontSize: 16, color: 'var(--text)', background: 'var(--card-deep-mid)', border: '1px solid var(--frame-mid)' }}
          />
          <button type="submit" disabled={!valid || busy} className="touch-optimized active:opacity-70" style={{ ...BUTTON, opacity: !valid || busy ? 0.5 : 1 }}>
            {busy ? 'Finding your leagues…' : 'Find my leagues'}
          </button>
        </form>
      ) : (
        onReset && (
          <button type="button" onClick={onReset} className="touch-optimized active:opacity-70" style={BUTTON}>
            Use a different username
          </button>
        )
      )}
    </section>
  );
}
