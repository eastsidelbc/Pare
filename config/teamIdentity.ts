/**
 * Team identity switch — logos vs team-color abbreviations, app-wide.
 *
 * Every team mark on Home, Compare, Standings and Leaders goes through
 * <TeamIdentity> (components/ui/TeamIdentity.tsx), which asks this file which
 * mode its surface is in. 'name' mode renders the surface's original
 * abbreviation markup untouched, so flipping back is a one-word edit.
 *
 * LICENSING: NFL logos are trademarks. `default` MUST be 'name' before any
 * ads / Pro tier (docs/design-system.md §9, rule 4).
 */

export type TeamIdentityMode = 'logo' | 'name';

export type TeamIdentitySurface =
  | 'home'
  | 'compareMenus'
  | 'comparePills'
  | 'compareHero'
  | 'standings'
  | 'leaders'
  | 'teamMenu' // team quick-menu sheet (tap a team on Standings)
  | 'favorites' // Your teams: Home star sheet grid, first launch, /teams (manage order & display)
  | 'myTeam'; // My Team (Sleeper) roster rows, look-ahead strip, player sheet

export interface TeamIdentityConfig {
  default: TeamIdentityMode;
  overrides: Partial<Record<TeamIdentitySurface, TeamIdentityMode>>;
}

// 👇 THE SWITCH. 'logo' = team logos, 'name' = team-color abbreviations.
// Change default to 'name' to turn logos off everywhere.
export const TEAM_IDENTITY = {
  default: 'name',
  overrides: {
    compareHero: 'name', // big wordmarks stay on Compare hero
  },
} as const satisfies TeamIdentityConfig;

/**
 * Logos whose main color is near-black / deep navy and fades into --bg-deep.
 * These get a thin light halo (--logo-halo in app/globals.css). Add or remove
 * a team here after eyeballing it on a phone.
 */
export const DARK_LOGOS: ReadonlySet<string> = new Set([
  // fade out almost completely
  'LV', 'IND', 'NYG', 'JAX', 'WAS',
  // navy body, only partly saved by a light edge
  'CHI', 'HOU', 'DEN', 'DAL', 'LAR', 'GB', 'BUF',
]);

/** Pure resolver (testable with any config): surface override ?? default. */
export function resolveTeamIdentityMode(
  config: TeamIdentityConfig,
  surface: TeamIdentitySurface,
): TeamIdentityMode {
  return config.overrides[surface] ?? config.default;
}

/** Which mode a surface renders in, per TEAM_IDENTITY above. */
export function getTeamIdentityMode(surface: TeamIdentitySurface): TeamIdentityMode {
  return resolveTeamIdentityMode(TEAM_IDENTITY, surface);
}

/** Local SVG path for a full team name ("San Francisco 49ers" → …/san-francisco-49ers.svg). */
export function teamLogoSrc(teamName: string): string {
  return `/images/nfl-logos/${teamName.toLowerCase().replace(/\s+/g, '-')}.svg`;
}
