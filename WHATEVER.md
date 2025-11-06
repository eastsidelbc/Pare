### Phase 5 Readiness Audit (Mocks → Real Data)

Structured list (File — Role — Lines — Compatibility — Notes/Mapping)

- components/MismatchChips.tsx — mismatch pills UI — 13–24, 26–82 — ⚙️ Minor Adapter Needed — Replace fetch to /api/mock/matchup with real source; expects { chips: string[] }. Map to server-side computed strings or compute client-side from /api/teams metrics.

```13:24:/Users/owner/Documents/Pare/components/MismatchChips.tsx
async function fetchChips(awayAbbr?: string, homeAbbr?: string): Promise<Chip[]> {
  if (!awayAbbr || !homeAbbr) return [];
  try {
    const res = await fetch(`/api/mock/matchup?away=${encodeURIComponent(awayAbbr)}&home=${encodeURIComponent(homeAbbr)}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: { chips: string[] } = await res.json();
    // Stable IDs per selection + chip text
    return (data.chips || []).map((t, i) => ({ id: `${awayAbbr}-${homeAbbr}-${t}`, text: t, severity: i === 0 ? 'high' : 'moderate' }));
  } catch {
    return [];
  }
}
```

- mocks/mockMatchup.ts — mock chips source — 3–12 — ⚙️ Minor Adapter Needed — Delete/replace with real matchup/chips logic or endpoint returning { chips }.

```3:12:/Users/owner/Documents/Pare/mocks/mockMatchup.ts
export function getMockMatchup(awayAbbr: string, homeAbbr: string): MatchupPayload {
  // hard-coded simple examples
  if (awayAbbr === 'KC' && homeAbbr === 'BUF') {
    return { chips: ['Top-5 Pass O vs Bottom-10 Pass D', 'RZ TD%: 68% vs 44%'] };
  }
  if (awayAbbr === 'SF' && homeAbbr === 'SEA') {
    return { chips: ['Elite Rush O vs Weak Rush D', 'Turnover Margin +8 vs -2'] };
  }
  return { chips: ['Balanced matchup', 'Watch 3rd Down %'] };
}
```

- components/ScoreboardRail.tsx — scoreboard rail UI — 30–105 — ⚙️ Minor Adapter Needed — Currently reads from /api/mock/scoreboard via useScoreboardMock; shape is ScoreboardGame (abbr-based). Map to GameSchema fields.

```30:105:/Users/owner/Documents/Pare/components/ScoreboardRail.tsx
export default function ScoreboardRail({ onSelect, className = '' }: ScoreboardRailProps) {
  const { games, showSkeleton } = useScoreboardMock(5000);
  // ...
  const Section: React.FC<{ title: string; games: ScoreboardGame[] }> = ({ title, games }) => (
    <div className="mb-3">
      <div className="px-2 py-1 text-xs tracking-wider text-slate-400/90 uppercase">{title}</div>
      <div className="divide-y divide-slate-800/60">
        {games.map((game) => (
          <button key={game.gameId} onClick={() => { onSelect?.(game); }} className="w-full text-left px-2 py-1 hover:bg-slate-800/50 focus:outline-none focus-ring">
            {/* uses abbrs, spread, total, kickoffIso/status */}
```

- lib/hooks/useScoreboardMock.ts — scoreboard polling — 6–46 — ✅ Fully Compatible — Client polling pattern; just point to real /api/schedule; still returns ScoreboardGame[] locally or adapter inside hook.

- mocks/mockScoreboard.ts — mock scoreboard data — 3–58 — ⚙️ Minor Adapter Needed — Replace once /api/schedule returns canonical games.

```3:18:/Users/owner/Documents/Pare/mocks/mockScoreboard.ts
export const MOCK_SCOREBOARD: ScoreboardGame[] = [
  {
    gameId: 'g1',
    away: { abbr: 'KC', score: 24 },
    home: { abbr: 'BUF', score: 20 },
    status: 'LIVE',
    quarter: 'Q3',
    clock: '04:31',
    spread: -2.5, // BUF is home; negative means home favorite? Standard: negative = favorite → here BUF favored by 2.5
    total: 46.5,
  },
  {
    gameId: 'g2',
    away: { abbr: 'SF', score: 17 },
    home: { abbr: 'SEA', score: 14 },
    status: 'LIVE',
    quarter: 'Q2',
    clock: '08:15',
    spread: -3.0, // SEA home; SEA -3.0
    total: 44.0,
  },
```

- types/matchup.ts — types for scoreboard/matchup — 1–22 — ⚙️ Minor Adapter Needed — Map to canonical GameSchema fields.

```8:18:/Users/owner/Documents/Pare/types/matchup.ts
export interface ScoreboardGame {
  gameId: string;
  away: TeamSide; // { abbr, score }
  home: TeamSide;
  status: GameStatus; // 'LIVE'|'UPCOMING'|'FINAL'
  quarter?: string; clock?: string; kickoffIso?: string;
  spread?: number | 0; total?: number | null;
}
```

- lib/useNflStats.ts — CSV → UI data — 65–304 — ⚙️ Minor Adapter Needed — Output is TeamData dynamic object; canonical TeamSchema suggests { team_id, team_name, season, rankings:{}, metrics:{} }. Add light adapter when wiring /api/teams to maintain existing UI props.

```35:61:/Users/owner/Documents/Pare/lib/useNflStats.ts
export interface UseNflStatsReturn {
  // Data
  offenseData: TeamData[];
  defenseData: TeamData[];
  
  // Loading states
  isLoadingOffense: boolean;
  isLoadingDefense: boolean;
  isLoading: boolean;
  
  // Error states
  offenseError: string | null;
  defenseError: string | null;
  
  // Data freshness indicators
  offenseDataFreshness: 'fresh' | 'stale' | 'unavailable' | 'loading';
  defenseDataFreshness: 'fresh' | 'stale' | 'unavailable' | 'loading';
  
  // Metadata
  lastUpdated: string | null;
  
  // Utility functions
  getTeamOffenseData: (teamName: string) => TeamData | null;
  getTeamDefenseData: (teamName: string) => TeamData | null;
  refreshData: () => Promise<void>;
}
export interface TeamData {
  team: string;
  
  // Dynamic properties - any metric from PFR can be here
  [metricKey: string]: string | number;
}
```

- utils/teamDataTransform.ts — shaping team metrics — 15–31, 38–81 — ✅ Fully Compatible — Can adapt to TeamSchema by lifting metrics into metrics:{} without UI refactor; fast adapter.

- app/compare/page.tsx — selection storage/updates — 54–92, 180–199 — ✅ Fully Compatible — Team selections are local state and updated via onTeamChange; no mock coupling.

- components/CompareHeader.tsx — header uses selection — 28–95 — ✅ Fully Compatible — Reads abbrs/spread/total; once /api/schedule populates context, no refactor needed.

Data flow (metrics)
- CSV-based metrics enter via useNflStats → TeamData (dynamic metrics). Compatible with canonical TeamSchema via adapter (map team → team_id/team_name, season, metrics bucket). Rankings are already computed client-side via hooks.

Dropdown + compare logic
- Team selections are stored in local state in `app/compare/page.tsx` and updated by `TeamDropdown`/`RankingDropdown`; they use TeamData arrays (CSV), not mocks. ✅ Fully Compatible.

Scoreboard rail (mock shape → canonical mapping)
- Current ScoreboardGame vs GameSchema:
  - gameId → game_id
  - away.abbr/home.abbr → away_id/home_id (need abbr→id map; abbrToName exists)
  - status (LIVE/UPCOMING/FINAL) → status
  - quarter (string like "Q3")/clock → quarter:number, clock:string (adapter)
  - kickoffIso → date (ISO already ok)
  - spread (home-based) → spread_home (same numeric, sign semantics match comment)
  - total → total
Compatibility: ⚙️ Minor Adapter Needed (in hook or API).

MismatchChips (mock → real)
- Today chips are strings from `/api/mock/matchup`. For real data:
  - Option A: New `/api/matchup?away_id&home_id` → { chips: string[] } generated server-side. Minimal UI change (URL + ids).
  - Option B: Compute chips client-side from `/api/teams` payload (needs a small helper to derive strings). UI unchanged beyond source data.  
Compatibility: ⚙️ Minor Adapter Needed.

Refresh integration
- Recommended DevRefreshButton placement: `components/CompareHeader.tsx` (right side, next to Swap) or `components/SiteLayoutShell.tsx` (mobile header hidden in prod).
- On click (dev only):
  - fetch('/api/teams?refresh=true', { cache: 'no-store' })
  - fetch('/api/schedule?refresh=true', { cache: 'no-store' })
  - Then: force re-run hooks (page reload or broadcast channel).
- Hooks to re-fetch:
  - useNflStats (add refresh toggle or query)
  - useScoreboardMock (already no-store polling; will pick up new schedule automatically)

Type definitions (Team/Game)
- Team: current TeamData is dynamic; canonical wants nested metrics/rankings. Suggest adapter interface:
  - Map CSV fields into metrics:{}, compute rankings client-side as today.
- Game: map `ScoreboardGame` → `GameSchema` as above; add abbr→id mapping.

Compatibility verdict
- CSV metrics path (hooks/components): ✅ Fully Compatible (with metrics adapter for canonical shape)
- Team selection/compare logic: ✅ Fully Compatible
- Scoreboard rail: ⚙️ Minor Adapter Needed (type/field mapping)
- MismatchChips: ⚙️ Minor Adapter Needed (source endpoint/derivation)

Recommended DevRefreshButton file
- `components/CompareHeader.tsx` (desktop) with NODE_ENV gating.

Additional notes
- abbrToName mapping exists; add abbr→team_id map alongside for schedule integration.
- Keep existing polling cadence (5s) initially; later move to WebSocket if desired.


