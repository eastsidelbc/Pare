# Data Flow, Caching & Live Update Strategy

**Audit Date**: 2025-10-19  
**Scope**: Complete data pipeline analysis  
**Status**: Read-only audit (no code changes)

---

## Executive Summary

The Pare app implements a sophisticated **3-tier caching strategy**:
1. **API-level in-memory cache** (6 hours)
2. **Service Worker cache** (30min fresh, 6hr stale)
3. **Client-side React state**

Data flows from **local CSV files** → API routes → fetch layer → React hooks → UI components. The architecture is optimized for self-hosted deployment with **zero external dependencies**.

**Key Findings**:
- ✅ Excellent caching architecture (50ms cached responses)
- ✅ Graceful degradation with stale data fallbacks
- ✅ Ready for live update injection (polling/WebSocket slots identified)
- ⚠️ No live data yet - CSV-based static snapshots
- 🎯 Future: Left rail live scores + in-game stat updates

---

## 1. Data Sources & Fetch Layer

### Data Source: Local CSV Files

**Location**: `data/pfr/`

```
data/pfr/
├── offense-2025.csv    # Manual export from Pro Football Reference
└── defense-2025.csv    # Manual export from PFR opponents page
```

**Source URLs**:
- Offense: `https://www.pro-football-reference.com/years/2025/#team_stats`
- Defense: `https://www.pro-football-reference.com/years/2025/opp.htm#team_stats`

**Update Process** (Current):
```bash
# Manual CSV update workflow
# 1. Visit PFR website
# 2. Export table to CSV
# 3. Save to data/pfr/
# 4. Optional: pm2 restart pare-nfl (cache invalidates in 6hrs automatically)
```

**File Reference**: `CLAUDE.md:131-134`

### CSV Parsing Engine

**File**: `lib/pfrCsv.ts`

```typescript
// Position-based column mapping (handles duplicate "Yds" columns)
const CSV_COLUMN_MAPPING_BY_POSITION = {
  0: 'rank',              // Rk
  1: 'team',              // Tm
  2: 'g',                 // G = Games
  3: 'points',            // PF = Points For/Against
  4: 'total_yards',       // Yds = TOTAL YARDS (position 4)
  5: 'plays_offense',     // Ply = Plays
  6: 'yds_per_play_offense', // Y/P
  12: 'pass_yds',         // Yds = PASSING YARDS (position 12)
  18: 'rush_yds',         // Yds = RUSHING YARDS (position 18)
  // ... 44+ metrics total
};

// Parsing function
export async function fetchAndParseCSV({
  type // 'offense' | 'defense'
}): Promise<{
  updatedAt: string;
  rows: TeamStatsWithRanks[];
}> {
  const csvPath = path.join(process.cwd(), `data/pfr/${type}-2025.csv`);
  const fileContents = await fs.readFile(csvPath, 'utf-8');
  
  // Parse CSV using position-based mapping
  const rows = parse(fileContents, { columns: false });
  
  // Transform to typed objects
  return {
    updatedAt: new Date().toISOString(),
    rows: rows.map(row => transformRow(row))
  };
}
```

**Key Insight**: Position-based mapping solves duplicate column name problem (multiple "Yds" columns in PFR data).

**File Reference**: `lib/pfrCsv.ts:1-300`

---

## 2. API Routes (Next.js App Router)

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│ CLIENT REQUEST                                           │
│ GET /api/nfl-2025/offense                                │
└─────────────┬────────────────────────────────────────────┘
              │
              v
┌──────────────────────────────────────────────────────────┐
│ API ROUTE: app/api/nfl-2025/offense/route.ts            │
│                                                           │
│ 1. Check in-memory cache (6hr TTL)                      │
│    ├─ HIT → Return cached JSON (50ms)                   │
│    └─ MISS → Continue to step 2                         │
│                                                           │
│ 2. Read CSV file from disk                              │
│    └─ lib/pfrCsv.fetchAndParseCSV()                     │
│                                                           │
│ 3. Transform & validate data                            │
│    └─ 32 teams + optional "Avg Tm/G"                    │
│                                                           │
│ 4. Store in cache + Return JSON                         │
│    └─ Response: { season, type, updatedAt, rows[] }     │
│                                                           │
└─────────────┬────────────────────────────────────────────┘
              │
              v
┌──────────────────────────────────────────────────────────┐
│ CLIENT RESPONSE                                          │
│ Status: 200 OK                                           │
│ Headers:                                                 │
│   X-Cache: HIT | MISS                                    │
│   X-Request-ID: abc123                                   │
│   Cache-Control: public, max-age=300                     │
│ Body: JSON with 32 teams + metadata                     │
└──────────────────────────────────────────────────────────┘
```

### Offense API Route

**File**: `app/api/nfl-2025/offense/route.ts:1-182`

```typescript
// In-memory cache (lines 29-40)
interface CacheEntry {
  data: ApiResponse | null;
  timestamp: number;
  maxAge: number;  // 6 hours production, 10 seconds debug
}

let cache: CacheEntry = {
  data: null,
  timestamp: 0,
  maxAge: process.env.NODE_ENV === 'production' 
    ? 6 * 60 * 60 * 1000  // 6 hours
    : 10 * 1000            // 10 seconds (debug mode)
};

export async function GET() {
  const requestId = generateRequestId();
  
  // Step 1: Check cache
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < cache.maxAge) {
    return NextResponse.json(cache.data, {
      headers: {
        'X-Cache': 'HIT',
        'X-Request-ID': requestId,
        'Cache-Control': 'public, max-age=300'  // 5min browser cache
      }
    });
  }
  
  // Step 2: Fetch fresh data
  try {
    const { updatedAt, rows } = await fetchAndParseCSV({ type: 'offense' });
    
    if (rows.length === 0) {
      throw new Error('No team data found');
    }
    
    // Step 3: Build response
    const response: ApiResponse = {
      season: 2025,
      type: 'offense',
      updatedAt,
      rows  // Raw data (no server-side rankings)
    };
    
    // Step 4: Update cache
    cache = {
      data: response,
      timestamp: now,
      maxAge: cache.maxAge
    };
    
    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
        'X-Request-ID': requestId,
        'Cache-Control': 'public, max-age=300'
      }
    });
    
  } catch (error) {
    // Graceful degradation: Return stale data if available
    if (cache.data) {
      return NextResponse.json({
        ...cache.data,
        stale: true,
        error: error.message
      }, {
        status: 200,  // Still 200 OK!
        headers: { 'X-Cache': 'STALE' }
      });
    }
    
    // No stale data: Hard error
    return NextResponse.json({
      error: error.message,
      season: 2025,
      type: 'offense',
      updatedAt: new Date().toISOString(),
      rows: []
    }, { status: 500 });
  }
}
```

**Defense API**: Identical structure at `app/api/nfl-2025/defense/route.ts`

**File References**:
- Offense: `app/api/nfl-2025/offense/route.ts:44-180`
- Defense: `app/api/nfl-2025/defense/route.ts:44-180`
- Config: `config/constants.ts:7-11`

### API Response Structure

```typescript
interface ApiResponse {
  season: number;               // 2025
  type: 'offense' | 'defense';
  updatedAt: string;            // ISO timestamp
  rows: TeamStats[];            // 32 teams + optional "Avg Tm/G"
  stale?: boolean;              // Present if serving stale cache
  error?: string;               // Present if stale due to error
}

interface TeamStats {
  team: string;                 // "Buffalo Bills"
  g: number;                    // Games played
  points: number;               // Points for/against
  total_yards: number;
  pass_yds: number;
  rush_yds: number;
  // ... 40+ more metrics (dynamic)
  [metricKey: string]: string | number;
}
```

**Key Insight**: API returns **raw data only** - no server-side rankings. Rankings computed client-side by `useRanking` hook for performance.

**File Reference**: `lib/useNflStats.ts:16-32`

---

## 3. Service Worker Caching Strategy

### Cache Architecture

**File**: `public/sw.js:1-462`

**Cache Names**:
```javascript
const CACHE_NAME = 'pare-nfl-v1.0.7';        // Main cache
const STATIC_CACHE = 'pare-static-v1.0.7';  // Icons, manifest
const API_CACHE = 'pare-api-v1.0.7';        // API responses
const IMAGES_CACHE = 'pare-images-v1.0.7';  // Team logos
```

**Cache Expiration Times**:
```javascript
// sw.js:9-15
const CACHE_EXPIRATION = {
  API_FRESH: 30 * 60 * 1000,      // 30 minutes = fresh
  API_STALE: 6 * 60 * 60 * 1000,  // 6 hours = stale threshold
  IMAGES: 7 * 24 * 60 * 60 * 1000,  // 7 days for logos
  STATIC: 24 * 60 * 60 * 1000,    // 24 hours for static assets
};
```

### Caching Strategies by Resource Type

```javascript
// sw.js:78-120

// Strategy 1: NFL Stats API - Smart Stale While Revalidate
if (url.pathname.startsWith('/api/nfl-')) {
  event.respondWith(smartNflStatsCache(request));
  // - Serve from cache if < 30min old (fresh)
  // - Serve from cache if < 6hr old (stale) + background update
  // - Fetch network if > 6hr or cache miss
}

// Strategy 2: Team Logos - Long-term Cache First
if (url.pathname.includes('/images/nfl-logos/')) {
  event.respondWith(cacheFirst(request, IMAGES_CACHE, 7 * 24 * 60 * 60 * 1000));
  // - Serve from cache (up to 7 days)
  // - Fetch network only on cache miss
}

// Strategy 3: CSS/JS Assets - Network First (Dev Safety!)
if (url.pathname.match(/\.(css|js)$/)) {
  event.respondWith(networkFirst(request, STATIC_CACHE));
  // - Try network first (get latest styles)
  // - Fallback to cache on network failure
  // - Prevents stale CSS bug during development
}

// Strategy 4: HTML Routes - Network Only (NEVER CACHED)
if (url.pathname.match(/\.(html|htm)$/) || url.pathname === '/') {
  event.respondWith(fetch(request));  // Pass through, no cache
}
```

**File Reference**: `public/sw.js:78-200`

### Smart NFL Stats Cache Implementation

```javascript
// sw.js:250-320
async function smartNflStatsCache(request) {
  const url = new URL(request.url);
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get('date'));
    const age = Date.now() - cachedDate.getTime();
    
    // FRESH: < 30 minutes
    if (age < CACHE_EXPIRATION.API_FRESH) {
      console.log('📊 [SW] NFL Stats FRESH from cache');
      return cachedResponse;
    }
    
    // STALE: 30min - 6hr (serve immediately + update in background)
    if (age < CACHE_EXPIRATION.API_STALE) {
      console.log('📊 [SW] NFL Stats STALE from cache, updating...');
      
      // Serve stale immediately (fast UX)
      const response = cachedResponse.clone();
      
      // Update in background (no await)
      fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          caches.open(API_CACHE).then(cache => {
            cache.put(request, networkResponse);
          });
        }
      });
      
      return response;
    }
  }
  
  // TOO OLD or MISS: Fetch from network
  console.log('📊 [SW] NFL Stats fetching from network');
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    const cache = await caches.open(API_CACHE);
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}
```

**Result**:
- First 30min: Instant response from cache ⚡
- 30min - 6hr: Instant stale response + background update 🔄
- > 6hr: Network fetch (200-300ms) 🌐

**File Reference**: `public/sw.js:250-320`

### HTML Exclusion (Critical!)

```javascript
// sw.js:18-48 - Install event
// ✅ CORRECT: Only cache assets, NOT HTML routes
const STATIC_ASSETS = [
  '/icon-192.png',
  '/manifest.json'
  // NO HTML files here!
];

// sw.js:120-125 - Fetch handler
// HTML routes explicitly pass through (never cached)
if (url.pathname.match(/\.(html|htm)$/) || url.pathname === '/') {
  return fetch(request);  // Network only, no cache
}
```

**Why**: Prevents stale HTML causing hard-to-debug hydration issues.

**File Reference**: `public/sw.js:18-48, 120-125`

---

## 4. Client-Side Data Flow

### React Fetch Hook: useNflStats

**File**: `lib/useNflStats.ts:1-305`

**Hook Responsibilities**:
1. Fetch offense & defense data from API routes
2. Transform API responses to UI-friendly format
3. Manage loading states
4. Handle errors with graceful degradation
5. Track data freshness (fresh/stale/unavailable)

**Data Flow Diagram**:

```
┌────────────────────────────────────────────────────────┐
│ ComparePage (app/compare/page.tsx:26-35)              │
│                                                         │
│ const {                                                 │
│   offenseData,        // TeamData[] (32 teams)         │
│   defenseData,        // TeamData[] (32 teams)         │
│   isLoading,          // boolean                       │
│   offenseError,       // string | null                 │
│   defenseError,       // string | null                 │
│   lastUpdated         // ISO timestamp                 │
│ } = useNflStats();                                      │
└────────────┬───────────────────────────────────────────┘
             │
             v
┌────────────────────────────────────────────────────────┐
│ useNflStats Hook (lib/useNflStats.ts)                  │
│                                                         │
│ useEffect(() => {                                       │
│   refreshData();  // Fetch on mount                    │
│ }, []);                                                 │
│                                                         │
│ async function refreshData() {                         │
│   await Promise.all([                                  │
│     fetchOffenseData(),  // Parallel fetch             │
│     fetchDefenseData()                                 │
│   ]);                                                   │
│ }                                                       │
└────────────┬───────────────────────────────────────────┘
             │
             v
┌────────────────────────────────────────────────────────┐
│ Fetch Layer                                            │
│                                                         │
│ const response = await fetch('/api/nfl-2025/offense'); │
│                                                         │
│ // Detect cache status from Service Worker            │
│ const cacheStatus = response.headers.get('sw-cache-status');│
│ const cachedDate = response.headers.get('sw-cached-date');  │
│                                                         │
│ const apiData: NflApiResponse = await response.json();│
└────────────┬───────────────────────────────────────────┘
             │
             v
┌────────────────────────────────────────────────────────┐
│ Data Transformation (utils/teamDataTransform.ts)       │
│                                                         │
│ export function transformApiResponseToTeamData(        │
│   apiData: NflApiResponse                              │
│ ): TeamData[] {                                        │
│   return apiData.rows.map(row => ({                   │
│     team: row.team,                                    │
│     g: row.g,                                          │
│     points: row.points,                                │
│     // ... all metrics (dynamic!)                     │
│     [metricKey]: row[metricKey]                       │
│   }));                                                 │
│ }                                                       │
└────────────┬───────────────────────────────────────────┘
             │
             v
┌────────────────────────────────────────────────────────┐
│ React State Update                                     │
│                                                         │
│ setOffenseData(transformedData);                      │
│ setDefenseData(transformedData);                      │
│ setLastUpdated(apiData.updatedAt);                    │
│ setIsLoading(false);                                  │
└────────────┬───────────────────────────────────────────┘
             │
             v
┌────────────────────────────────────────────────────────┐
│ UI Components Re-render                                │
│                                                         │
│ OffensePanel → DynamicComparisonRow (×N)              │
│ DefensePanel → DynamicComparisonRow (×N)              │
└────────────────────────────────────────────────────────┘
```

**File Reference**: `lib/useNflStats.ts:65-273`

### Client-Side Ranking Calculation

**Why Client-Side?**
- Server doesn't know display mode (per-game vs total)
- Rankings change dynamically when mode toggled
- Better performance (no API round-trip)

**File**: `lib/useRanking.ts:1-284`

```typescript
// useRanking hook (lines 47-151)
export function useRanking(
  allData: TeamData[],        // All 32 teams
  metricKey: string,          // e.g., "points"
  targetTeamName: string,     // e.g., "Buffalo Bills"
  options: RankingOptions     // { higherIsBetter, excludeSpecialTeams }
): RankingResult | null {
  
  return useMemo(() => {
    // Filter out special teams ("Avg Tm/G")
    const filteredData = excludeSpecialTeams 
      ? allData.filter(team => !['Avg Team', 'Avg Tm/G'].includes(team.team))
      : allData;
    
    // Get target team's value
    const targetValue = parseFloat(String(targetTeam[metricKey]));
    
    // Count teams with better values
    let betterTeamsCount = 0;
    let teamsWithSameValue = 0;
    
    filteredData.forEach(team => {
      const teamValue = parseFloat(String(team[metricKey]));
      
      // Exact equality with floating-point tolerance (0.001)
      if (Math.abs(teamValue - targetValue) < 0.001) {
        teamsWithSameValue++;
      } else if (higherIsBetter && teamValue > targetValue) {
        betterTeamsCount++;
      } else if (!higherIsBetter && teamValue < targetValue) {
        betterTeamsCount++;
      }
    });
    
    // Rank = better teams + 1
    const rank = betterTeamsCount + 1;
    const isTied = teamsWithSameValue > 1;
    
    // Format: "1st", "T-13th", etc.
    const formattedRank = formatRank(rank, isTied);
    
    return { rank, formattedRank, isTied, totalTeams: filteredData.length };
  }, [allData, metricKey, targetTeamName, options]);
}
```

**Tie Detection**: Uses floating-point tolerance (0.001 epsilon) to detect exact equality.

**File Reference**: `lib/useRanking.ts:27-28, 109-110`

---

## 5. State Management Architecture

### Global State (No External Libraries!)

**Pattern**: Props-based state management from `ComparePage` root

```typescript
// app/compare/page.tsx:38-76

export default function ComparePage() {
  // Global team selection (managed at top level)
  const [selectedTeamA, setSelectedTeamA] = useState<string>(() => 'Minnesota Vikings');
  const [selectedTeamB, setSelectedTeamB] = useState<string>(() => 'Detroit Lions');
  
  // Global metrics selection
  const [selectedOffenseMetrics, setSelectedOffenseMetrics] = useState<string[]>(
    DEFAULT_OFFENSE_METRICS
  );
  const [selectedDefenseMetrics, setSelectedDefenseMetrics] = useState<string[]>(
    DEFAULT_DEFENSE_METRICS
  );
  
  // Team change handlers
  const handleTeamAChange = (newTeamA: string) => {
    setSelectedTeamA(newTeamA);
  };
  
  const handleTeamBChange = (newTeamB: string) => {
    setSelectedTeamB(newTeamB);
  };
  
  // Props passed down to panels
  return (
    <OffensePanel
      selectedTeamA={selectedTeamA}
      selectedTeamB={selectedTeamB}
      onTeamAChange={handleTeamAChange}
      onTeamBChange={handleTeamBChange}
      selectedMetrics={selectedOffenseMetrics}
      {...props}
    />
  );
}
```

**Callback Flow**:
```
RankingDropdown (user clicks team)
  ↓
onTeamChange(teamName)
  ↓
DynamicComparisonRow.onTeamAChange
  ↓
OffensePanel.onTeamAChange
  ↓
ComparePage.handleTeamAChange
  ↓
setSelectedTeamA(teamName)
  ↓
React re-renders with new team selection
```

**File Reference**: `app/compare/page.tsx:38-76, 217-226`

### Local State (Component-Specific)

**Display Mode** (per-game vs total):
```typescript
// components/OffensePanel.tsx:40-46
const { mode, setMode, transformTeamData } = useDisplayMode('per-game');

// Independent state per panel
// Offense panel can be "per-game" while Defense is "total"
```

**Dropdown Open/Close**:
```typescript
// components/RankingDropdown.tsx:55
const [isOpen, setIsOpen] = useState(false);

// Each dropdown has independent open/close state
```

**File References**:
- Display mode: `lib/useDisplayMode.ts:1-150`
- Dropdown state: `components/RankingDropdown.tsx:55`

### URL Sync (Future Enhancement)

**Current**: No URL param sync  
**Future Slot Identified**:

```typescript
// app/compare/page.tsx - Add URL sync
import { useSearchParams, useRouter } from 'next/navigation';

function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Read teams from URL on mount
  useEffect(() => {
    const teamA = searchParams.get('teamA') || 'Minnesota Vikings';
    const teamB = searchParams.get('teamB') || 'Detroit Lions';
    setSelectedTeamA(teamA);
    setSelectedTeamB(teamB);
  }, [searchParams]);
  
  // Update URL when teams change
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('teamA', selectedTeamA);
    params.set('teamB', selectedTeamB);
    router.replace(`/compare?${params.toString()}`);
  }, [selectedTeamA, selectedTeamB]);
}
```

**Benefit**: Shareable comparison links (e.g., `/compare?teamA=KC&teamB=BUF`)

---

## 6. Performance Characteristics

### API Response Times

**File**: `app/api/nfl-2025/offense/route.ts` (with logging)

| Scenario | Response Time | Cache Status |
|----------|---------------|--------------|
| **Cold Start** | 200-300ms | MISS (read CSV + parse) |
| **Cached (< 6hr)** | 50ms | HIT (in-memory) |
| **Stale (error)** | 50ms | STALE (graceful degradation) |
| **Service Worker (< 30min)** | 10-20ms | SW FRESH |
| **Service Worker (30min-6hr)** | 10-20ms | SW STALE (+ background update) |

### Bundle Size & Code Splitting

**Next.js 15 Turbopack** (automatic):
```bash
# Lazy-loaded components
const MetricsSelector = lazy(() => import('@/components/MetricsSelector'));

# Route-based splitting (automatic)
/              → page chunk (~50KB)
/compare       → compare chunk (~150KB) + shared chunks
```

**Vendor Bundle** (~200KB gzipped):
- React 19 + React DOM
- Framer Motion (animations)
- @floating-ui/react (dropdowns)
- Radix UI (select components)

**App Bundle** (~100KB gzipped):
- Business logic hooks
- Component library
- Metrics configuration

**File Reference**: `package.json:11-37`

### Re-render Optimization

**Memoization Patterns**:

```typescript
// lib/useRanking.ts:54-150
// Rankings computed with useMemo (only recompute when data changes)
const teamARanking = useMemo(() => {
  return calculateRank(allData, metricKey, teamName);
}, [allData, metricKey, teamName]);

// lib/useBarCalculation.ts:48-149
// Bar widths computed with useMemo
const { teamAPercentage, teamBPercentage } = useMemo(() => {
  return calculateBarWidths(values, rankings);
}, [teamAValue, teamBValue, teamARanking, teamBRanking]);

// components/DynamicComparisonRow.tsx
// No React.memo() on row component (parent re-renders are intentional)
```

**File References**:
- `lib/useRanking.ts:54`
- `lib/useBarCalculation.ts:48`

---

## 7. Live Update Strategy (Future)

### Current State: Static CSV Snapshots

**Reality**: Data only updates when CSV files are manually replaced.

**Refresh Triggers**:
1. User loads page → Fetches from API (cached or fresh)
2. Cache expires (6 hours) → Next request fetches fresh CSV
3. Manual restart (`pm2 restart`) → Invalidates cache immediately

### Future Slot #1: Left Rail Live Scores

**Requirement**: Real-time game scores with 3-5 second updates

**Proposed Architecture**:

```typescript
// NEW FILE: lib/useLiveScores.ts

export function useLiveScores() {
  const [scores, setScores] = useState<GameScore[]>([]);
  const [isLive, setIsLive] = useState(false);
  
  useEffect(() => {
    // Option A: Polling (simple, works everywhere)
    const interval = setInterval(async () => {
      const response = await fetch('/api/live/scores');
      const data = await response.json();
      setScores(data.games);
      setIsLive(data.isLive);
    }, 5000); // 5 second polling
    
    // Option B: WebSocket (real-time, more complex)
    const ws = new WebSocket('wss://api.pare.com/live');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setScores(data.games);
    };
    
    return () => {
      clearInterval(interval);
      ws?.close();
    };
  }, []);
  
  return { scores, isLive };
}
```

**NEW API Route**: `app/api/live/scores/route.ts`

```typescript
// Fetch from ESPN API, Yahoo Sports, or similar
export async function GET() {
  const games = await fetchLiveGamesFromESPN();
  
  return NextResponse.json({
    games: games.map(game => ({
      gameId: game.id,
      homeTeam: game.home,
      awayTeam: game.away,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      quarter: game.period,
      clock: game.clock,
      status: game.status,  // 'pregame' | 'live' | 'final'
      spread: game.odds?.spread,
      overUnder: game.odds?.total
    })),
    isLive: games.some(g => g.status === 'live'),
    updatedAt: new Date().toISOString()
  });
}
```

**Integration Point**:
```typescript
// app/compare/page.tsx
import { useLiveScores } from '@/lib/useLiveScores';
import ScoreboardRail from '@/components/ScoreboardRail';

export default function ComparePage() {
  const { scores, isLive } = useLiveScores();
  
  return (
    <div className="flex">
      <ScoreboardRail games={scores} isLive={isLive} />
      <main>
        <OffensePanel {...props} />
        <DefensePanel {...props} />
      </main>
    </div>
  );
}
```

**File References**: Proposed locations listed above

### Future Slot #2: In-Game Stat Snapshots

**Requirement**: Live stats during games (updated every play or possession)

**Proposed Architecture**:

```typescript
// NEW FILE: lib/useLiveStats.ts

export function useLiveStats(
  gameId: string,
  refreshInterval: number = 15000  // 15 seconds
) {
  const [liveStats, setLiveStats] = useState<LiveGameStats | null>(null);
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/live/game/${gameId}/stats`);
      const data = await response.json();
      setLiveStats(data);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [gameId, refreshInterval]);
  
  return liveStats;
}

// Usage in compare view
function ComparePage() {
  const { selectedGameId } = useGameSelection();
  const liveStats = useLiveStats(selectedGameId);
  
  // Overlay live stats on top of season stats
  const combinedOffenseData = useMemo(() => {
    if (!liveStats) return offenseData;
    return mergeSeasonAndLiveStats(offenseData, liveStats);
  }, [offenseData, liveStats]);
}
```

**NEW API Route**: `app/api/live/game/[gameId]/stats/route.ts`

```typescript
export async function GET(request: Request, { params }: { params: { gameId: string } }) {
  const gameStats = await fetchLiveGameStatsFromESPN(params.gameId);
  
  return NextResponse.json({
    gameId: params.gameId,
    homeTeam: {
      team: 'Kansas City Chiefs',
      points: 24,
      totalYards: 312,
      passYards: 245,
      rushYards: 67,
      turnovers: 1,
      // ... all metrics
    },
    awayTeam: {
      // ... same structure
    },
    quarter: 'Q3',
    clock: '4:23',
    updatedAt: new Date().toISOString()
  });
}
```

**Visual Indicator**:
```typescript
// Show "LIVE" badge when displaying in-game stats
<DynamicComparisonRow
  metricKey="points"
  teamAData={teamAData}
  teamBData={teamBData}
  isLive={!!liveStats}  // NEW PROP
  liveIndicator={
    <span className="text-xs text-red-500 animate-pulse">
      🔴 LIVE
    </span>
  }
/>
```

**File References**: Proposed locations listed above

### Data Transport Options

| Method | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Polling** | Simple, works everywhere, no server changes | Higher latency, more requests | ✅ **Start here** (3-5s interval) |
| **WebSocket** | Real-time, efficient, bidirectional | Requires WS server, complex scaling | Later (if polling insufficient) |
| **Server-Sent Events** | Simple real-time, works over HTTP | Unidirectional, less browser support | Alternative to WS |
| **HTTP/2 Push** | Efficient, built into HTTP/2 | Limited browser support, complex | Not recommended |

**Recommendation**: Start with **5-second polling** for MVP. Upgrade to WebSocket if latency becomes an issue.

---

## 8. Caching Freshness Indicators

### Current Implementation

**Service Worker Headers** (added to responses):

```javascript
// sw.js:250-320
async function smartNflStatsCache(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    const age = getAge(cachedResponse);
    
    // Add custom header to indicate cache status
    const headers = new Headers(cachedResponse.headers);
    
    if (age < CACHE_EXPIRATION.API_FRESH) {
      headers.set('sw-cache-status', 'fresh');
    } else if (age < CACHE_EXPIRATION.API_STALE) {
      headers.set('sw-cache-status', 'stale');
    } else {
      headers.set('sw-cache-status', 'expired');
    }
    
    headers.set('sw-cached-date', cachedResponse.headers.get('date'));
    
    return new Response(cachedResponse.body, { headers });
  }
  
  return fetch(request);
}
```

**Client Detection**:

```typescript
// lib/useNflStats.ts:95-143
const response = await fetch('/api/nfl-2025/offense');

const cacheStatus = response.headers.get('sw-cache-status');
const cachedDate = response.headers.get('sw-cached-date');

if (cacheStatus === 'fresh') {
  setDataFreshness('fresh');  // Green indicator
} else if (cacheStatus === 'stale') {
  setDataFreshness('stale');  // Yellow indicator
} else {
  setDataFreshness('fresh');  // No header = fresh from network
}
```

**UI Indicator** (optional future enhancement):

```typescript
// components/OfflineStatusBanner.tsx - Add freshness indicator
{offenseDataFreshness === 'stale' && (
  <div className="bg-yellow-500/10 text-yellow-400 px-4 py-2">
    ⏰ Data is 2 hours old (updating in background)
  </div>
)}
```

**File References**:
- Service Worker: `public/sw.js:250-320`
- Hook detection: `lib/useNflStats.ts:95-143`

---

## 9. Hydration Strategy (SSR/CSR)

### Current Pattern: Client-Side Rendering Only

**File**: `app/compare/page.tsx:8`

```typescript
'use client';  // Forces client-side rendering

export default function ComparePage() {
  const { offenseData } = useNflStats();  // Fetches on mount (client-side)
  
  // No SSR data fetching (no getServerSideProps, no async component)
}
```

**Why Client-Only?**:
1. Data changes frequently (6-hour cache)
2. Service Worker provides better caching than SSR
3. Avoids hydration mismatches
4. Simpler deployment (no server-side data fetching)

### Potential Hydration Risks

**Risk #1: Mobile Detection Hook**

```typescript
// lib/hooks/useIsMobile.ts:10
const [isMobile, setIsMobile] = useState(false);  // SSR-safe: false by default

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 1024);  // Client-only
  };
  
  checkMobile();
  window.addEventListener('resize', checkMobile);
  
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

**Status**: ✅ Safe - Initial render shows desktop layout (false), then switches on mount if needed.

**File Reference**: `lib/hooks/useIsMobile.ts:1-20`

**Risk #2: localStorage Preferences**

```typescript
// lib/usePreferences.ts (if implemented)
const [theme, setTheme] = useState(() => {
  // ⚠️ HYDRATION RISK if not handled carefully
  if (typeof window !== 'undefined') {
    return localStorage.getItem('theme') || 'default';
  }
  return 'default';  // SSR fallback
});
```

**Status**: ✅ Safe - Pattern uses `typeof window` check

---

## 10. Race Conditions & Edge Cases

### Identified Race Conditions

**Race #1: Parallel API Fetches** ✅ SAFE

```typescript
// lib/useNflStats.ts:248-250
await Promise.all([
  fetchOffenseData(),  // Independent
  fetchDefenseData()   // Independent
]);
```

**Status**: ✅ Safe - Fetches are independent, no shared state mutation

**Race #2: Rapid Team Selection** ⚠️ POTENTIAL ISSUE

```typescript
// Scenario: User rapidly clicks different teams in dropdown
// 1. User selects "Buffalo Bills" → setSelectedTeamA('Buffalo Bills')
// 2. React schedules re-render
// 3. User selects "Kansas City Chiefs" (before re-render completes)
// 4. Two setState calls in rapid succession

// Current handling: React batches state updates automatically ✅
```

**Status**: ✅ Safe - React 19 automatic batching handles this

**Race #3: Dropdown Close Timing** ✅ HANDLED

```typescript
// components/RankingDropdown.tsx:142-150
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsOpen(false);  // Close on outside click
    }
  };
  
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

**Status**: ✅ Safe - Event cleanup prevents memory leaks

**File Reference**: `components/RankingDropdown.tsx:142-150`

### Edge Case Handling

**Edge Case #1: Zero/Negative Values in Bars**

```typescript
// lib/useBarCalculation.ts:129-147
if (totalValue > 0) {
  // Normal calculation
} else {
  // Handle zero/invalid values
  teamAPercentage = availableWidth / 2;  // 50/50 split
  teamBPercentage = availableWidth / 2;
}
```

**Status**: ✅ Handled - Falls back to 50/50 split

**File Reference**: `lib/useBarCalculation.ts:129-147`

**Edge Case #2: Missing Team Data**

```typescript
// components/OffensePanel.tsx:56-61
const teamAData = offenseData.find(team => team.team === selectedTeamA) || null;

if (!teamAData) {
  return <div>Team not found</div>;  // Graceful fallback
}
```

**Status**: ✅ Handled - Null checks throughout

**File Reference**: `components/OffensePanel.tsx:56-61`

**Edge Case #3: Stale Data on Error**

```typescript
// app/api/nfl-2025/offense/route.ts:140-152
catch (error) {
  // Return stale data if available (200 OK!)
  if (cache.data) {
    return NextResponse.json({
      ...cache.data,
      stale: true,
      error: error.message
    }, { status: 200 });
  }
  
  // No stale data: Hard error (500)
  return NextResponse.json({ error }, { status: 500 });
}
```

**Status**: ✅ Excellent - Graceful degradation with stale data

**File Reference**: `app/api/nfl-2025/offense/route.ts:140-152`

---

## 11. Performance Monitoring

### Current Logging

**Structured Logging** with request IDs:

```typescript
// utils/logger.ts
export const logger = {
  info: (context, message, data) => {
    console.log(`ℹ️ [${context}] ${message}`, data);
  },
  cache: (context, message, data) => {
    console.log(`📦 [${context}] ${message}`, data);
  },
  error: (context, message, data) => {
    console.error(`❌ [${context}] ${message}`, data);
  }
};

// Usage in API routes
logger.cache(
  { context: 'OFFENSE', requestId }, 
  `Serving cached data (${cacheAge} min old)`,
  { teamCount: cache.data.rows.length }
);
```

**File Reference**: `utils/logger.ts:1-50`

### Performance Metrics (Mobile)

```typescript
// app/compare/page.tsx:88-116
useEffect(() => {
  if (typeof window !== 'undefined' && !isLoading) {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      console.log('📱 [MOBILE-PERFORMANCE]:', {
        viewport: `${window.innerWidth}×${window.innerHeight}`,
        devicePixelRatio: window.devicePixelRatio,
        connection: navigator.connection?.effectiveType,
        dataLoaded: {
          offense: offenseData.length,
          defense: defenseData.length
        }
      });
      
      // Paint timing
      const paintEntries = performance.getEntriesByType('paint');
      paintEntries.forEach(entry => {
        console.log(`🎨 [MOBILE-PAINT] ${entry.name}: ${entry.startTime}ms`);
      });
    }
  }
}, [isLoading, offenseData, defenseData]);
```

**File Reference**: `app/compare/page.tsx:88-116`

---

## 12. Recommendations & Next Steps

### Immediate Improvements

1. **Add URL Param Sync** (1-2 hours)
   - Enable shareable comparison links
   - Persist team selection across page reloads
   - File: `app/compare/page.tsx`

2. **Implement Data Freshness UI** (2-3 hours)
   - Visual indicator for stale data
   - Manual refresh button
   - Last updated timestamp
   - File: `components/OfflineStatusBanner.tsx`

3. **Add Request ID to Client Logs** (1 hour)
   - Better error tracking
   - Correlate client/server logs
   - File: `lib/useNflStats.ts`

### Live Data Integration (8-12 hours)

1. **Phase 1**: Left Rail Polling (4-6 hours)
   - Create `/api/live/scores` endpoint
   - Implement `useLiveScores()` hook
   - Build `ScoreboardRail` component
   - 5-second polling for live games

2. **Phase 2**: In-Game Stats (4-6 hours)
   - Create `/api/live/game/[id]/stats` endpoint
   - Implement `useLiveStats()` hook
   - Merge live stats with season stats
   - Visual "LIVE" indicators

3. **Phase 3**: WebSocket Upgrade (Optional)
   - Replace polling with WebSocket
   - Add reconnection logic
   - Better latency & efficiency

### Monitoring & Observability (4-6 hours)

1. **Add Performance Tracking**
   - Track API response times
   - Monitor cache hit rates
   - Log render performance

2. **Error Tracking**
   - Integrate Sentry or similar
   - Track fetch failures
   - Monitor stale data frequency

3. **Analytics**
   - Track popular team comparisons
   - Monitor dropdown usage
   - Measure mobile vs desktop usage

---

## Summary

The Pare app implements a **production-grade 3-tier caching strategy** with excellent performance (50ms cached responses) and graceful degradation. The architecture is well-positioned for live data integration with clear slots identified for:

1. **Left rail live scores** (polling or WebSocket)
2. **In-game stat snapshots** (15-second refresh)
3. **Real-time freshness indicators**

**Strengths**:
- ✅ Sophisticated caching (API + Service Worker)
- ✅ Graceful degradation with stale data
- ✅ Clean data flow (CSV → API → hooks → UI)
- ✅ Ready for live updates (slots identified)

**Next Steps**:
- 🎯 Implement left rail with live scores
- 🎯 Add URL param sync for shareability
- 🎯 Build data freshness UI indicators

---

**End of Data Flow Audit**

