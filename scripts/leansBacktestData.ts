/**
 * Leans backtest data — the cached loaders shared by scripts/leans-backtest.ts (v1 report)
 * and scripts/leans-backtest-v2.ts (prop engine v2 tune / grade). Every response is cached
 * under .cache/leans-backtest/<season>/ (gitignored), so a rerun makes zero network calls.
 * ESPN: 4 at a time, back-off on 429. Run from Kobe's machines.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join as joinPath } from 'node:path';
import { mapEspnScoreboard, parseAmericanOdds, parseSpreadDetails, type EspnScoreboard } from '@/lib/espnScoreboard';
import { buildAthleteIndex, matchAthlete, type AthleteIndex } from '@/lib/leans/athleteMatch';
import { lineupCapSet, pickMainLine, type BacktestGame, type BacktestProp, type PlayerSeason, type PropOffer } from '@/lib/leans/backtest';
import { playedGame, toPlayerGame } from '@/lib/leans/players';
import { PROP_TYPES } from '@/lib/leans/propLines';
import type { PropPosition, PropStat, TeamGame } from '@/lib/leans/types';
import { toGameLines, type SleeperComLineRaw } from '@/lib/myteam/sleeper/map';
import type { PlayerGameLine } from '@/lib/myteam/types';

export const WEEKS = 18;
const SITE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl';
const CORE = 'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl';
const SLEEPER_COM = 'https://api.sleeper.com';
const SLEEPER_APP = 'https://api.sleeper.app/v1';

export const PROP_POSITIONS: readonly PropPosition[] = ['QB', 'RB', 'WR', 'TE'];

export interface SeasonData {
  season: number;
  games: BacktestGame[];
  teamLog: TeamGame[];
  propBooks: Map<string, string>;
  lines: PlayerGameLine[];
  props: BacktestProp[];
  join: { byId: number; byName: number; unmatched: number };
  players: Map<string, PlayerSeason>;
  calls: number;
}

export interface LoadOptions {
  /** Only weeks 1…maxWeek (a season in progress: every game of those weeks final). */
  maxWeek?: number;
  /** Accept unpriced lines (2026 feed: one line per player, no prices) — graded at −110. */
  unpriced?: boolean;
}

export async function loadSeason(SEASON: number, REFRESH = false, opts: LoadOptions = {}): Promise<SeasonData> {
  const WEEK_COUNT = opts.maxWeek ?? WEEKS;
  const ROOT = joinPath(process.cwd(), '.cache', 'leans-backtest', String(SEASON));
  // ── cached fetch ────────────────────────────────────────────────────────

  let calls = 0;
  let active = 0;
  const queue: Array<() => void> = [];
  const MAX_ACTIVE = 4;

  async function slot<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= MAX_ACTIVE) await new Promise<void>((r) => queue.push(r));
    active += 1;
    try {
      return await fn();
    } finally {
      active -= 1;
      queue.shift()?.();
    }
  }

  async function getJson<T>(url: string, cacheKey: string): Promise<T | null> {
    const file = joinPath(ROOT, `${cacheKey}.json`);
    if (!REFRESH && existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as T;
    const data = await slot(async () => {
      for (let attempt = 0; attempt < 5; attempt++) {
        calls += 1;
        const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
          continue;
        }
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        return (await res.json()) as T;
      }
      throw new Error(`gave up after retries: ${url}`);
    });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(data));
    return data;
  }

  const https = (ref: string) => ref.replace(/^http:/, 'https:');

  // ── ESPN shapes (only what we read) ─────────────────────────────────────

  interface EspnPrice {
    american?: string;
  }
  interface EspnOpenValue {
    american?: string;
  }
  interface EspnOddsItem {
    provider?: { id?: string; name?: string };
    details?: string;
    overUnder?: number;
    /** Opening total, e.g. { american: "43.5" }. */
    open?: { total?: EspnOpenValue };
    /** Opening home spread lives at homeTeamOdds.open.pointSpread ({ american: "-4.5" }). */
    homeTeamOdds?: { moneyLine?: number; open?: { pointSpread?: EspnOpenValue } };
    awayTeamOdds?: { moneyLine?: number };
    propBets?: { $ref?: string };
  }
  interface EspnPaged<T> {
    items?: T[];
    pageCount?: number;
  }
  interface EspnPropSide {
    target?: { value?: number };
    over?: EspnPrice;
    under?: EspnPrice;
  }
  interface EspnPropBet {
    athlete?: { $ref?: string };
    type?: { id?: string };
    /**
     * `open` = the pregame opening line. On a finished game `current` keeps moving after kickoff
     * (in-game) — e.g. Dak W1 rush yds open 7.5 → "current" 3.5 at +130, updated hours after the
     * final — so grading against it would leak the result. Always grade on `open`.
     */
    open?: EspnPropSide;
  }
  interface SleeperPlayer {
    espn_id?: string | number | null;
    position?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  }
  interface EspnAthleteRaw {
    fullName?: string;
    position?: { abbreviation?: string };
  }

  const numOrNull = (v: string | undefined) => {
    const n = Number(v);
    return v !== undefined && v !== '' && Number.isFinite(n) ? n : null;
  };

  /** In-game books carry live prices (a final game shows the end-of-game line) — never a pregame line. */
  const isLiveBook = (o: EspnOddsItem) => /live/i.test(o.provider?.name ?? '');

  // ── load ────────────────────────────────────────────────────────────────

  async function loadGames(): Promise<{ games: BacktestGame[]; teamLog: TeamGame[]; propBooks: Map<string, string> }> {
    const games: BacktestGame[] = [];
    const teamLog: TeamGame[] = [];
    const propBooks = new Map<string, string>();
    const boards = await Promise.all(
      Array.from({ length: WEEK_COUNT }, (_, i) =>
        getJson<EspnScoreboard>(`${SITE}/scoreboard?seasontype=2&week=${i + 1}&dates=${SEASON}`, `scoreboard/w${i + 1}`),
      ),
    );
    const finals = boards.flatMap((b, i) => (b ? mapEspnScoreboard(b, i + 1) : [])).filter((m) => m.completed && m.espnEventId && m.awayScore !== null && m.homeScore !== null);
    await Promise.all(
      finals.map(async (m) => {
        const id = m.espnEventId as string;
        const odds = await getJson<EspnPaged<EspnOddsItem>>(`${CORE}/events/${id}/competitions/${id}/odds`, `odds/${id}`);
        const pregame = (odds?.items ?? []).filter((o) => !isLiveBook(o));
        const book = pregame.find((o) => o.details) ?? null;
        const propBook = pregame.find((o) => o.propBets?.$ref);
        if (propBook?.propBets?.$ref) propBooks.set(id, https(propBook.propBets.$ref));
        const home = book?.homeTeamOdds?.moneyLine ?? null;
        const away = book?.awayTeamOdds?.moneyLine ?? null;
        games.push({
          eventId: id,
          week: m.week,
          away: m.away.abbr,
          home: m.home.abbr,
          awayScore: m.awayScore as number,
          homeScore: m.homeScore as number,
          spreadLine: parseSpreadDetails(book?.details),
          hasSpread: !!book?.details,
          total: book?.overUnder ?? null,
          moneyline: home === null && away === null ? null : { away, home },
          openHomeLine: numOrNull(book?.homeTeamOdds?.open?.pointSpread?.american),
          openTotal: numOrNull(book?.open?.total?.american),
        });
        teamLog.push(
          { team: m.away.abbr, opp: m.home.abbr, week: m.week, points: m.awayScore as number, pointsAllowed: m.homeScore as number },
          { team: m.home.abbr, opp: m.away.abbr, week: m.week, points: m.homeScore as number, pointsAllowed: m.awayScore as number },
        );
      }),
    );
    games.sort((a, b) => a.week - b.week || a.eventId.localeCompare(b.eventId));
    return { games, teamLog, propBooks };
  }

  async function loadLines(): Promise<PlayerGameLine[]> {
    const qs = PROP_POSITIONS.map((p) => `position[]=${p}`).join('&');
    const weeks = await Promise.all(
      Array.from({ length: WEEK_COUNT }, (_, i) =>
        getJson<SleeperComLineRaw[]>(`${SLEEPER_COM}/stats/nfl/${SEASON}/${i + 1}?season_type=regular&${qs}`, `sleeper/w${i + 1}`),
      ),
    );
    return weeks.flatMap((w) => toGameLines(w));
  }

  /** Prop lines joined to Sleeper players; `join` counts how each join was made (report). */
  async function loadProps(
    games: readonly BacktestGame[],
    propBooks: ReadonlyMap<string, string>,
    lines: readonly PlayerGameLine[],
  ): Promise<{ props: BacktestProp[]; join: { byId: number; byName: number; unmatched: number } }> {
    const map = (await getJson<Record<string, SleeperPlayer>>(`${SLEEPER_APP}/players/nfl`, 'sleeper/players')) ?? {};
    const nameOf = (p: SleeperPlayer | undefined) => p?.full_name ?? `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim();
    const espnOf = (id: string) => (map[id]?.espn_id != null ? String(map[id]?.espn_id) : undefined);
    // The old id-only join (today's map) — fallback for a player with no row that week.
    const byEspn = new Map<string, string>();
    for (const [id, p] of Object.entries(map)) if (p.espn_id != null && (PROP_POSITIONS as readonly string[]).includes(p.position ?? '')) byEspn.set(String(p.espn_id), id);
    // Per-week index from that week's rows: team-at-week (trades) + position-at-week.
    const weekIdx = new Map<number, AthleteIndex>();
    const idxFor = (week: number) => {
      let idx = weekIdx.get(week);
      if (!idx) {
        idx = buildAthleteIndex(
          lines
            .filter((l) => l.week === week && (PROP_POSITIONS as readonly string[]).includes(l.position))
            .map((l) => ({ id: l.playerId, name: nameOf(map[l.playerId]), position: l.position, team: l.team, espnId: espnOf(l.playerId) })),
        );
        weekIdx.set(week, idx);
      }
      return idx;
    };
    const lineOf = new Map(lines.map((l) => [`${l.playerId}|${l.week}`, l] as const));
    const join = { byId: 0, byName: 0, unmatched: 0 };
    const out: BacktestProp[] = [];
    await Promise.all(
      games.map(async (g) => {
        const ref = propBooks.get(g.eventId);
        if (!ref) return;
        const base = `${ref}${ref.includes('?') ? '&' : '?'}limit=1000`;
        const first = await getJson<EspnPaged<EspnPropBet>>(`${base}&page=1`, `props/${g.eventId}-p1`);
        const pages = [first];
        for (let p = 2; p <= (first?.pageCount ?? 1); p++) pages.push(await getJson<EspnPaged<EspnPropBet>>(`${base}&page=${p}`, `props/${g.eventId}-p${p}`));
        const offers = new Map<string, PropOffer[]>();
        for (const item of pages.flatMap((pg) => pg?.items ?? [])) {
          const stat = PROP_TYPES[item.type?.id ?? ''];
          const athlete = /athletes\/(\d+)/.exec(item.athlete?.$ref ?? '')?.[1];
          const target = item.open?.target?.value;
          if (!stat || !athlete || typeof target !== 'number') continue;
          const key = `${athlete}|${stat}`;
          const list = offers.get(key) ?? [];
          list.push({ target, over: parseAmericanOdds(item.open?.over?.american), under: parseAmericanOdds(item.open?.under?.american) });
          offers.set(key, list);
        }
        const idx = idxFor(g.week);
        const teams = [g.away, g.home];
        for (const [key, list] of offers) {
          const [athlete, stat] = key.split('|') as [string, PropStat];
          const main = pickMainLine(list, { unpriced: opts.unpriced ?? false });
          if (!main) continue;
          let playerId = idx.byEspn.get(athlete) ?? byEspn.get(athlete) ?? null;
          if (playerId) join.byId += 1;
          else {
            const a = await getJson<EspnAthleteRaw>(`${CORE}/seasons/${SEASON}/athletes/${athlete}`, `athletes/${athlete}`);
            playerId = matchAthlete(idx, { espnId: athlete, name: a?.fullName, position: a?.position?.abbreviation, teams });
            if (!playerId) {
              join.unmatched += 1;
              continue;
            }
            join.byName += 1;
          }
          const played = lineOf.get(`${playerId}|${g.week}`);
          const position = played?.position ?? map[playerId]?.position ?? '';
          if (!(PROP_POSITIONS as readonly string[]).includes(position)) continue;
          out.push({
            eventId: g.eventId,
            week: g.week,
            playerId,
            position: position as PropPosition,
            opp: played?.opponent ?? '',
            stat,
            line: main.target,
            overPrice: main.over,
            underPrice: main.under,
          });
        }
      }),
    );
    const cap = lineupCapSet(lines);
    for (const p of out) p.capped = cap.has(`${p.playerId}|${p.week}`);
    return { props: out, join };
  }

  function playerSeasons(lines: readonly PlayerGameLine[]): Map<string, PlayerSeason> {
    const out = new Map<string, PlayerSeason>();
    for (const l of [...lines].sort((a, b) => a.week - b.week)) {
      if (!(PROP_POSITIONS as readonly string[]).includes(l.position) || !playedGame(l)) continue;
      const s = out.get(l.playerId) ?? { playerId: l.playerId, position: l.position as PropPosition, games: [] };
      s.games.push(toPlayerGame(l));
      out.set(l.playerId, s);
    }
    return out;
  }


  const { games, teamLog, propBooks } = await loadGames();
  const lines = await loadLines();
  const { props, join } = await loadProps(games, propBooks, lines);
  return { season: SEASON, games, teamLog, propBooks, lines, props, join, players: playerSeasons(lines), calls };
}
