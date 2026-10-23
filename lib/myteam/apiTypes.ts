/**
 * Response shapes of /api/myteam/* — pure types shared by the server
 * (lib/myteam/bundle.ts, server-only) and the client screen, so client code
 * never imports a server-only module.
 */

import type { DefenseGame, OffenseGame } from './defenseProfile';
import type { FpaTable } from './fpa';
import type { TeamSchedule } from './schedule';
import type { UsageMap } from './usage';
import type { LeagueSeason } from './leagueSeason';
import type { WaiverPlayer } from './waiver';
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
  /** My players' raw usage weeks (lib/myteam/usage.ts); absent on older bundles + the sandbox. */
  usage?: UsageMap;
  /** "Your season": record, points rank, all-play luck, bench left; null when Sleeper failed (best-effort). */
  leagueSeason?: LeagueSeason | null;
  /** Trending adds still available in this league (best-effort; null on failure). */
  waiver?: WaiverPlayer[] | null;
  defenseLog: DefenseGame[];
  offenseLog: OffenseGame[];
  /** Where injury tags come from (decided by rule in P0a). */
  injurySource: 'sleeper';
  generatedAt: string;
}
