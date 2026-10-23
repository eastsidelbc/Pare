/**
 * League moves (Wave C3) — pure. Recent completed adds / drops / trades in a Sleeper league,
 * newest first, with each team's display name. Source: `/league/{id}/transactions/{week}`
 * (+ `/league/{id}/users` for names, `/rosters` for roster → owner).
 */

export interface TransactionRaw {
  transaction_id?: string;
  type?: string;
  status?: string;
  /** Epoch ms. */
  created?: number;
  /** player id → roster id that added him. */
  adds?: Record<string, number> | null;
  /** player id → roster id that dropped him. */
  drops?: Record<string, number> | null;
  roster_ids?: number[] | null;
}

export interface LeagueUserRaw {
  user_id?: string;
  display_name?: string;
  metadata?: { team_name?: string } | null;
}

export interface RosterOwnerRaw {
  roster_id: number;
  owner_id: string | null;
}

export interface LeagueMove {
  id: string;
  kind: 'trade' | 'waiver' | 'free_agent';
  /** Epoch ms. */
  at: number;
  /** One entry per team involved: what it added / dropped. */
  sides: Array<{ team: string; mine: boolean; adds: string[]; drops: string[] }>;
}

/** Moves shown. */
export const MOVES_SHOWN = 6;

export function buildLeagueMoves(
  txs: readonly TransactionRaw[],
  rosters: readonly RosterOwnerRaw[],
  users: readonly LeagueUserRaw[],
  playerName: (id: string) => string | null,
  myRosterId: number | null,
  shown = MOVES_SHOWN,
): LeagueMove[] {
  const userById = new Map(users.map((u) => [u.user_id ?? '', u]));
  const teamName = (rosterId: number) => {
    const owner = rosters.find((r) => r.roster_id === rosterId)?.owner_id ?? '';
    const u = userById.get(owner);
    return u?.metadata?.team_name?.trim() || u?.display_name || `Team ${rosterId}`;
  };
  const moves: LeagueMove[] = [];
  for (const t of txs) {
    if (t.status !== 'complete' || !t.transaction_id || typeof t.created !== 'number') continue;
    const kind = t.type === 'trade' ? 'trade' : t.type === 'waiver' ? 'waiver' : t.type === 'free_agent' ? 'free_agent' : null;
    if (!kind) continue;
    const ids = new Set<number>([...(t.roster_ids ?? []), ...Object.values(t.adds ?? {}), ...Object.values(t.drops ?? {})]);
    const sides = [...ids].map((rid) => ({
      team: teamName(rid),
      mine: rid === myRosterId,
      adds: Object.entries(t.adds ?? {}).filter(([, r]) => r === rid).map(([p]) => playerName(p) ?? `Player ${p}`),
      drops: Object.entries(t.drops ?? {}).filter(([, r]) => r === rid).map(([p]) => playerName(p) ?? `Player ${p}`),
    })).filter((s) => s.adds.length + s.drops.length > 0);
    if (sides.length > 0) moves.push({ id: t.transaction_id, kind, at: t.created, sides });
  }
  return moves.sort((a, b) => b.at - a.at).slice(0, shown);
}

/** "5m ago" / "3h ago" / "2d ago". */
export function agoText(at: number, now: number): string {
  const min = Math.max(0, Math.round((now - at) / 60_000));
  if (min < 60) return `${min}m ago`;
  const h = Math.round(min / 60);
  return h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}
