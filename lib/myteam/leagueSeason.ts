/**
 * "Your season" in a fantasy league (Wave A3) — pure. Record + points from Sleeper's roster
 * settings, plus the all-play record: each week, your score against EVERY other team's.
 * Luck = actual wins − all-play expected wins (+2 = you won ~2 more than your scores earned).
 * Bench left = max possible lineup points (`ppts`) − points scored (`fpts`).
 */

export interface RosterSeasonRaw {
  roster_id: number;
  settings?: {
    wins?: number;
    losses?: number;
    ties?: number;
    fpts?: number;
    fpts_decimal?: number;
    ppts?: number;
    ppts_decimal?: number;
  } | null;
}

export interface WeekScore {
  roster_id: number;
  points?: number | null;
}

export interface LeagueSeason {
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  /** #1 = most points for; ties share a rank. */
  pointsRank: number;
  teams: number;
  /** Max-lineup points − points scored; null when Sleeper hasn't computed max points. */
  benchLeft: number | null;
  allPlay: { wins: number; losses: number; ties: number };
  expectedWins: number;
  luck: number;
  /** Weeks counted in the all-play record. */
  weeks: number;
}

/** Sleeper splits points into an integer + hundredths (`fpts` 380, `fpts_decimal` 54 → 380.54). */
export function sleeperPoints(whole: number | undefined, decimal: number | undefined): number | null {
  if (typeof whole !== 'number') return null;
  return whole + (typeof decimal === 'number' ? decimal / 100 : 0);
}

/** One week counts once every team has a score (a future / unplayed week is all zeros). */
const playedWeek = (week: readonly WeekScore[]) => week.some((m) => (m.points ?? 0) > 0);

export function allPlayRecord(weeks: ReadonlyArray<readonly WeekScore[]>, myRosterId: number): { wins: number; losses: number; ties: number; expectedWins: number; weeks: number } {
  let wins = 0;
  let losses = 0;
  let ties = 0;
  let expectedWins = 0;
  let counted = 0;
  for (const week of weeks) {
    if (!playedWeek(week)) continue;
    const mine = week.find((m) => m.roster_id === myRosterId);
    if (!mine) continue;
    const me = mine.points ?? 0;
    const others = week.filter((m) => m.roster_id !== myRosterId).map((m) => m.points ?? 0);
    if (others.length === 0) continue;
    const w = others.filter((p) => me > p).length;
    const l = others.filter((p) => me < p).length;
    const t = others.length - w - l;
    wins += w;
    losses += l;
    ties += t;
    expectedWins += (w + t / 2) / others.length;
    counted += 1;
  }
  return { wins, losses, ties, expectedWins, weeks: counted };
}

export function buildLeagueSeason(rosters: readonly RosterSeasonRaw[], myRosterId: number, weeks: ReadonlyArray<readonly WeekScore[]>): LeagueSeason | null {
  const mine = rosters.find((r) => r.roster_id === myRosterId);
  const s = mine?.settings;
  if (!mine || !s) return null;
  const pf = sleeperPoints(s.fpts, s.fpts_decimal) ?? 0;
  const max = sleeperPoints(s.ppts, s.ppts_decimal);
  const all = rosters.map((r) => sleeperPoints(r.settings?.fpts, r.settings?.fpts_decimal) ?? 0);
  const ap = allPlayRecord(weeks, myRosterId);
  const wins = s.wins ?? 0;
  const ties = s.ties ?? 0;
  return {
    wins,
    losses: s.losses ?? 0,
    ties,
    pointsFor: pf,
    pointsRank: all.filter((p) => p > pf).length + 1,
    teams: rosters.length,
    benchLeft: max !== null && max > 0 ? Math.max(0, max - pf) : null,
    allPlay: { wins: ap.wins, losses: ap.losses, ties: ap.ties },
    expectedWins: ap.expectedWins,
    luck: wins + ties / 2 - ap.expectedWins,
    weeks: ap.weeks,
  };
}
