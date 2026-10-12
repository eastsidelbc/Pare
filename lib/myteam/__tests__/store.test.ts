import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  DEFAULT_MY_TEAM, isValidId, isValidUsername, loadMyTeam, sanitizeMyTeam, saveMyTeam, SCHEMA_VERSION, STORAGE_KEY, unlinkAccount,
} from '../store';

function stubStorage(initial: Record<string, string> = {}, opts: { throwOnSet?: boolean } = {}) {
  const data = new Map(Object.entries(initial));
  const localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (opts.throwOnSet) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
  };
  vi.stubGlobal('window', { localStorage });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

const linked = { ...DEFAULT_MY_TEAM, username: 'user_1', userId: '100000000000000003', leagueId: '100000000000001001' };

describe('validation', () => {
  it('usernames: letters, digits, underscore, 1–20 chars', () => {
    expect(isValidUsername('user_1')).toBe(true);
    expect(['', 'bad name', 'x'.repeat(21), 'a;b', 42].map(isValidUsername)).toEqual([false, false, false, false, false]);
  });
  it('ids are numeric strings', () => {
    expect(isValidId('100000000000001001')).toBe(true);
    expect(isValidId('12a')).toBe(false);
  });
  it('sanitize drops ids without a username and defaults bad fields', () => {
    expect(sanitizeMyTeam({ userId: '1', leagueId: '2', window: 'week', irOpen: 'yes' })).toEqual(DEFAULT_MY_TEAM);
    expect(sanitizeMyTeam({ ...linked, window: 'last4', irOpen: true })).toEqual({ ...linked, window: 'last4', irOpen: true });
    expect(sanitizeMyTeam(null)).toEqual(DEFAULT_MY_TEAM);
  });
});

describe('load / save', () => {
  it('SSR (no window) → null, save is a no-op', () => {
    expect(loadMyTeam()).toBeNull();
    expect(() => saveMyTeam(linked)).not.toThrow();
  });
  it('round-trips with a version stamp under pare:myteam', () => {
    const data = stubStorage();
    saveMyTeam(linked);
    expect(JSON.parse(data.get(STORAGE_KEY) ?? '{}').version).toBe(SCHEMA_VERSION);
    expect(loadMyTeam()).toEqual(linked);
  });
  it('rejects other versions and corrupt JSON', () => {
    stubStorage({ [STORAGE_KEY]: JSON.stringify({ version: 99, ...linked }) });
    expect(loadMyTeam()).toBeNull();
    stubStorage({ [STORAGE_KEY]: '{not json' });
    expect(loadMyTeam()).toBeNull();
    stubStorage();
    expect(loadMyTeam()).toBeNull();
  });
  it('quota / privacy-mode errors never throw', () => {
    stubStorage({}, { throwOnSet: true });
    expect(() => saveMyTeam(linked)).not.toThrow();
  });
});

describe('unlinkAccount', () => {
  it('forgets the account but keeps view prefs', () => {
    expect(unlinkAccount({ ...linked, window: 'last4', irOpen: true })).toEqual({ ...DEFAULT_MY_TEAM, window: 'last4', irOpen: true });
  });
});
