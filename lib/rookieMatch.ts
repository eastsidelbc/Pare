/**
 * Rookie matching between Sleeper (who's a rookie) and ESPN (the stats).
 *
 * Sleeper flags rookies (`years_exp === 0`) but usually hasn't filled in their
 * ESPN id yet (2026-10-06: 476 rookies, only 5 with an `espn_id`). So we also
 * match on a normalized NAME + TEAM key that both feeds can build.
 * Plain module (no server-only) so it can be unit-tested.
 */
import { normalizeTeamAbbr } from './teams';

/** Name suffixes one feed may include and the other may drop ("Kenneth Walker III"). */
const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

/** "Amon-Ra St. Brown Jr." → "amon ra st brown" (accents, punctuation and suffixes removed). */
export function normalizePlayerName(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/['’.]/g, '') // "D'Andre" → "dandre", "St." → "st"
    .replace(/[^a-z0-9]+/g, ' ') // hyphens etc. → space
    .trim()
    .split(' ')
    .filter(Boolean);
  while (words.length > 1 && SUFFIXES.has(words[words.length - 1])) words.pop();
  return words.join(' ');
}

/** Match key for one player: normalized name + our registry's team abbreviation. */
export function rookieKey(name: string, teamAbbr: string): string {
  return `${normalizePlayerName(name)}|${normalizeTeamAbbr(teamAbbr)}`;
}

/** Everything needed to recognise a rookie on an ESPN row. */
export interface RookieIndex {
  /** ESPN athlete ids (only the few Sleeper has filled in). */
  espnIds: Set<string>;
  /** `rookieKey(name, team)` for every rookie on a team. */
  nameTeam: Set<string>;
}

export function isRookieRow(index: RookieIndex, row: { athleteId: string; name: string; teamAbbr: string }): boolean {
  return index.espnIds.has(row.athleteId) || index.nameTeam.has(rookieKey(row.name, row.teamAbbr));
}
