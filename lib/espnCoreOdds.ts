/**
 * ESPN Core `/events/{id}/competitions/{id}/odds` — which book to read (pure, client-safe).
 * Shared by Home's closing-line fallback (lib/schedule.ts) and Leans market facts
 * (lib/leans/market.ts). Traps (docs/data-catalog.md "Traps"): the books listed change per
 * game; an "… Live Odds" book carries IN-GAME prices (a final shows the end-of-game line);
 * on old finals the first book can carry only a total.
 */

interface EspnPrice {
  american?: string;
}
export interface EspnTeamOdds {
  moneyLine?: number;
  open?: { pointSpread?: EspnPrice; moneyLine?: EspnPrice };
  current?: { pointSpread?: EspnPrice; moneyLine?: EspnPrice };
}
export interface EspnCoreOddsItem {
  provider?: { name?: string };
  details?: string;
  overUnder?: number;
  homeTeamOdds?: EspnTeamOdds;
  awayTeamOdds?: EspnTeamOdds;
  open?: { total?: EspnPrice };
  current?: { total?: EspnPrice };
}
export interface EspnCoreOdds {
  items?: EspnCoreOddsItem[];
}

/** In-game books carry live prices — never a pregame line. */
export const isLiveBook = (o: EspnCoreOddsItem) => /live/i.test(o.provider?.name ?? '');

/** The first pregame book with a spread (`details`); else the first with only a total; else null. */
export function pregameBook(odds: EspnCoreOdds | null | undefined): EspnCoreOddsItem | null {
  const pregame = (odds?.items ?? []).filter((o) => !isLiveBook(o));
  return pregame.find((o) => o.details) ?? pregame.find((o) => typeof o.overUnder === 'number') ?? null;
}
