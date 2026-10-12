/**
 * My Team — provider interface. Sleeper is the only v1 implementation
 * (lib/myteam/sleeper/*, server-only, P2); ESPN/Yahoo slot in here later
 * without touching the UI, which only sees the normalized types.
 *
 * League/roster data (FantasyProvider) is separate from weekly stat lines
 * (StatLineSource) so a non-Sleeper league provider still reuses the FPA
 * engine fed by Sleeper's weekly lines.
 */

import type {
  FantasyLeague,
  FantasyRoster,
  FantasyUser,
  LeagueDetail,
  LivePoints,
  PlayerGameLine,
  ProviderId,
} from './types';

export interface FantasyProvider {
  readonly id: ProviderId;
  /** null = no such user (Sleeper answers 200 + `null`, not 404). */
  resolveUser(username: string): Promise<FantasyUser | null>;
  listLeagues(userId: string, season: number): Promise<FantasyLeague[]>;
  getLeague(leagueId: string): Promise<LeagueDetail>;
  /** null = the user owns/co-owns no roster in this league. */
  getRoster(leagueId: string, userId: string): Promise<FantasyRoster | null>;
  getLivePoints(leagueId: string, userId: string, week: number): Promise<LivePoints | null>;
}

export interface StatLineSource {
  /** Every rated-position stat line for one completed (or in-progress) week. */
  getWeekLines(season: number, week: number): Promise<PlayerGameLine[]>;
}

const providers = new Map<ProviderId, FantasyProvider>();

export function registerProvider(provider: FantasyProvider): void {
  providers.set(provider.id, provider);
}

export function getProvider(id: ProviderId): FantasyProvider {
  const provider = providers.get(id);
  if (!provider) throw new Error(`My Team: no provider registered for "${id}"`);
  return provider;
}
