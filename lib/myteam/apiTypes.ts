/**
 * Response shapes of /api/myteam/* — pure types shared by the server
 * (lib/myteam/bundle.ts, server-only) and the client screen, so client code
 * never imports a server-only module.
 */

import type { DefenseGame, OffenseGame } from './defenseProfile';
import type { FpaTable } from './fpa';
import type { TeamSchedule } from './schedule';
import type { FantasyLeague, FantasyRoster, FantasyUser, LeagueDetail } from './types';

/** GET /api/myteam/user */
export interface UserLookupResponse {
  user: FantasyUser;
  season: number;
  leagues: FantasyLeague[];
}

/** GET /api/myteam/league — raw per-week values; the client windows + ranks them. */
export interface LeagueBundle {
  season: number;
  /** Current NFL week (ESPN). */
  week: number;
  completedWeeks: number[];
  league: Omit<LeagueDetail, 'scoring'> & { format: 'ppr' | 'half' | 'std' | 'custom' };
  roster: FantasyRoster;
  /** My players' NFL teams only. */
  schedule: TeamSchedule;
  fpa: FpaTable;
  defenseLog: DefenseGame[];
  offenseLog: OffenseGame[];
  /** Where injury tags come from (decided by rule in P0a). */
  injurySource: 'sleeper';
  generatedAt: string;
}
