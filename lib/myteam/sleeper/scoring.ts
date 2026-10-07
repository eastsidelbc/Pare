/**
 * Sleeper `scoring_settings` → normalized ScoringRules (pure).
 *
 * Sleeper's scoring keys ARE its stat keys (verified P0a: 123/133 keys seen
 * in weekly lines; the rest are rare events not yet recorded), so the mapping
 * is 1:1. Zero weights are dropped; non-numeric values are reported, never
 * silently zeroed. Keys never seen in stat lines are reported by
 * `findUnseenScoringKeys` so P2 can log them.
 */

import type { ScoringRules } from '../types';

export interface ScoringMapResult {
  rules: ScoringRules;
  /** Keys whose value wasn't a finite number (reported, not scored). */
  invalid: string[];
}

export function toScoringRules(settings: Readonly<Record<string, unknown>> | null | undefined): ScoringMapResult {
  const rules: Record<string, number> = {};
  const invalid: string[] = [];
  for (const [key, raw] of Object.entries(settings ?? {})) {
    const weight = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
    if (!Number.isFinite(weight)) {
      invalid.push(key);
      continue;
    }
    if (weight !== 0) rules[key] = weight;
  }
  return { rules, invalid };
}

/** Weighted scoring keys that never appear in the observed stat keys. */
export function findUnseenScoringKeys(rules: ScoringRules, observedStatKeys: ReadonlySet<string>): string[] {
  return Object.keys(rules).filter((key) => !observedStatKeys.has(key)).sort();
}

/** "ppr" / "half" / "std" label from the reception weight (display only). */
export function receptionFormat(rules: ScoringRules): 'ppr' | 'half' | 'std' | 'custom' {
  const rec = rules.rec ?? 0;
  if (rec === 1) return 'ppr';
  if (rec === 0.5) return 'half';
  if (rec === 0) return 'std';
  return 'custom';
}

/** Stable FNV-1a hash of the rules (key order independent) — FPA cache key. */
export function scoringHash(rules: ScoringRules): string {
  const text = Object.keys(rules)
    .sort()
    .map((key) => `${key}=${rules[key]}`)
    .join(';');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
