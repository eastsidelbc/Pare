/**
 * Standings views — pure helpers that turn the division-grouped standings from
 * `lib/standings.ts` into the three Standings tab views (Division / Conference /
 * Playoffs). No fetching, no React, no re-ranking: seeds come straight from
 * ESPN (`playoffSeed`), so the NFL tiebreakers are ESPN's, not ours.
 *
 * Unit-tested in lib/__tests__/standingsViews.test.ts.
 */
import type { ConferenceStandings, TeamStanding } from './standings';

/** Seeds 1–7 make the playoffs; 1–4 are division winners, 5–7 wild cards. */
export const PLAYOFF_SEEDS = 7;
export const DIVISION_WINNER_SEEDS = 4;

export type SeedKind = 'division' | 'wildcard' | 'out' | 'none';

export function seedKind(seed: number | null): SeedKind {
  if (seed == null) return 'none';
  if (seed <= DIVISION_WINNER_SEEDS) return 'division';
  if (seed <= PLAYOFF_SEEDS) return 'wildcard';
  return 'out';
}

/**
 * T column rule (design-system §9.2, "T2"): show it on EVERY card as soon as any
 * team in the league has a tie — never per card, so all cards keep the same columns.
 */
export function leagueHasTies(conferences: readonly ConferenceStandings[]): boolean {
  return conferences.some((c) => c.divisions.some((d) => d.teams.some((t) => t.ties > 0)));
}

/**
 * One conference as a single list in seed order (1 → 16). Teams without a seed
 * keep ESPN's order at the end. Stable: never reorders teams with equal seeds.
 */
export function conferenceBySeed(conf: ConferenceStandings): TeamStanding[] {
  const all = conf.divisions.flatMap((d) => d.teams);
  return all
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (a.t.seed ?? 99) - (b.t.seed ?? 99) || a.i - b.i)
    .map(({ t }) => t);
}

export interface PlayoffPicture {
  /** Seeds 1–7 in order (may be shorter if ESPN hasn't seeded yet). */
  seeds: TeamStanding[];
  /** Wild Card round: [away (lower seed), home (higher seed)] — 7@2, 6@3, 5@4. #1 has the bye. */
  wildCard: Array<[TeamStanding, TeamStanding]>;
  /** First teams out (seeds 8–10). */
  hunt: TeamStanding[];
}

/** "If the season ended today" — built only from ESPN seeds. */
export function playoffPicture(conf: ConferenceStandings, huntSize = 3): PlayoffPicture {
  const ordered = conferenceBySeed(conf).filter((t) => t.seed != null);
  const bySeed = new Map(ordered.map((t) => [t.seed as number, t]));
  const seeds = ordered.filter((t) => (t.seed as number) <= PLAYOFF_SEEDS);
  const wildCard: Array<[TeamStanding, TeamStanding]> = [];
  for (const [away, home] of [[7, 2], [6, 3], [5, 4]] as const) {
    const a = bySeed.get(away);
    const h = bySeed.get(home);
    if (a && h) wildCard.push([a, h]);
  }
  const hunt = ordered.filter((t) => (t.seed as number) > PLAYOFF_SEEDS).slice(0, huntSize);
  return { seeds, wildCard, hunt };
}
