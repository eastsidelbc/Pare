/**
 * Raw Sleeper responses → normalized My Team types (pure, unit-tested).
 * Shapes verified in the P0a spike (docs/devnotes/2026-10-07-my-team-data-spike.md).
 * Only whitelisted fields are kept — Sleeper's user object also carries
 * (null) private-sounding keys like email/phone/token that we never read.
 */

import { normalizeTeamAbbr } from '@/lib/teams';
import {
  isFantasyPosition,
  type FantasyLeague,
  type FantasyUser,
  type LeagueDetail,
  type LeagueStatus,
  type PlayerGameLine,
} from '../types';
import { scoringHash, toScoringRules } from './scoring';
import { starterSlots } from './roster';

export interface SleeperUserRaw {
  user_id?: string;
  username?: string;
  display_name?: string;
}

export interface SleeperLeagueRaw {
  league_id?: string;
  name?: string;
  season?: string;
  status?: string;
  total_rosters?: number;
  roster_positions?: string[] | null;
  scoring_settings?: Record<string, unknown> | null;
  settings?: { playoff_week_start?: number | null } | null;
}

/** api.sleeper.com weekly stat line (only the fields we read). */
export interface SleeperComLineRaw {
  player_id?: string;
  week?: number;
  team?: string | null;
  opponent?: string | null;
  player?: { position?: string | null } | null;
  stats?: Record<string, unknown> | null;
}

const STATUSES: readonly LeagueStatus[] = ['pre_draft', 'drafting', 'in_season', 'complete'];

/** null when the response isn't a usable user (Sleeper answers 200 + `null` for unknown names). */
export function toFantasyUser(raw: SleeperUserRaw | null | undefined): FantasyUser | null {
  if (!raw?.user_id) return null;
  return {
    provider: 'sleeper',
    userId: raw.user_id,
    username: raw.username ?? '',
    displayName: raw.display_name ?? raw.username ?? '',
  };
}

export function toFantasyLeague(raw: SleeperLeagueRaw): FantasyLeague | null {
  if (!raw.league_id) return null;
  const status = (STATUSES as readonly string[]).includes(raw.status ?? '') ? (raw.status as LeagueStatus) : 'in_season';
  return {
    provider: 'sleeper',
    leagueId: raw.league_id,
    name: raw.name ?? 'League',
    season: Number(raw.season) || 0,
    status,
    totalRosters: raw.total_rosters ?? 0,
  };
}

export function toLeagueDetail(raw: SleeperLeagueRaw): LeagueDetail | null {
  const base = toFantasyLeague(raw);
  if (!base) return null;
  const { rules } = toScoringRules(raw.scoring_settings);
  return {
    ...base,
    scoring: rules,
    scoringHash: scoringHash(rules),
    rosterSlots: starterSlots(raw.roster_positions),
    playoffWeekStart: raw.settings?.playoff_week_start ?? null,
  };
}

/** Weekly lines → engine lines: rated positions only, team aliases applied, numeric stats only. */
export function toGameLines(raw: readonly SleeperComLineRaw[] | null | undefined): PlayerGameLine[] {
  const out: PlayerGameLine[] = [];
  for (const l of raw ?? []) {
    const position = l.player?.position;
    if (!isFantasyPosition(position) || !l.player_id || !l.team || !l.opponent || !l.week) continue;
    const stats: Record<string, number> = {};
    for (const [k, v] of Object.entries(l.stats ?? {})) if (typeof v === 'number' && Number.isFinite(v)) stats[k] = v;
    out.push({
      playerId: l.player_id,
      position,
      team: normalizeTeamAbbr(l.team),
      opponent: normalizeTeamAbbr(l.opponent),
      week: l.week,
      stats,
    });
  }
  return out;
}
