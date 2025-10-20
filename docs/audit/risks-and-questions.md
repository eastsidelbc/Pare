---
source_of_truth: PROJECT_PLAN.md
rules_reference: CLAUDE.md
branch: docs-refactor
last_moved: 2025-10-19
---

> _This document is maintained under `/docs-refactor` branch and aligns with CLAUDE.md and PROJECT_PLAN.md._

# Risk Register & Questions

**Audit Date**: 2025-10-19  
**Purpose**: Document open risks and decision points  
**Status**: Active risk tracking

---

## Executive Summary

This document catalogs **identified risks** with severity ratings and **open questions** requiring product owner input. All risks include file/line references for traceability.

**Risk Summary**:
- 🟢 **Low**: 5 risks
- 🟡 **Medium**: 4 risks
- 🔴 **High**: 2 risks
- 🚨 **Critical**: 0 risks

**Open Questions**: 12 requiring product owner decisions

---

## PART 1: Risk Register

### 🔴 HIGH SEVERITY

#### Risk H-1: No Live Scoreboard (Feature Gap)

**Description**: No left rail scoreboard for live game scores  
**Impact**: Users can't discover other games in progress  
**Probability**: N/A (known gap)  
**Owner**: Product/Engineering  
**Timeline**: 4-6 weeks to implement

**Technical Details**:
- **Missing Component**: `ScoreboardRail.tsx`
- **Missing API**: `/api/live/scores`
- **Missing Hook**: `useLiveScores()`
- **Mount Point**: `app/compare/page.tsx:192` (desktop), `components/mobile/MobileCompareLayout.tsx:58` (mobile)

**Proposed Solution**:
1. Create `/api/live/scores` endpoint (fetch from ESPN API)
2. Implement `useLiveScores()` hook with 5-second polling
3. Build `ScoreboardRail` component (desktop) + `GameDrawer` component (mobile)
4. Add click handler to replace compare teams

**File References**:
- Desktop mounting slot: `app/compare/page.tsx:192`
- Mobile mounting slot: `components/mobile/MobileCompareLayout.tsx:58`
- Related doc: `docs/audit/layout-map.md:183-236`

---

#### Risk H-2: Hydration Mismatch Potential (Mobile Detection)

**Description**: `isMobile` hook uses `window.innerWidth` (client-only)  
**Impact**: Potential SSR/CSR mismatch, layout flash on load  
**Probability**: Low (mitigated by SSR-safe initialization)  
**Severity**: High (if it occurs, breaks entire page)  
**Owner**: Engineering

**Technical Details**:
- **File**: `lib/hooks/useIsMobile.ts:10`
- **Pattern**: `useState(false)` initial state (SSR-safe)
- **Behavior**: 
  1. SSR renders desktop layout (isMobile = false)
  2. Client hydrates, runs useEffect
  3. Sets isMobile = true if < 1024px
  4. React re-renders with mobile layout

**Current Mitigation**: ✅ Safe pattern with false default

**Potential Issue**: Brief flash of desktop layout on mobile devices (1 frame)

**Proposed Solution**:
```typescript
// Option 1: Use CSS media queries for initial render
<div className="hidden lg:block">Desktop</div>
<div className="block lg:hidden">Mobile</div>

// Option 2: User-Agent detection on server
export async function getServerSideProps({ req }) {
  const userAgent = req.headers['user-agent'];
  const isMobile = /mobile/i.test(userAgent);
  return { props: { isMobile } };
}
```

**Recommendation**: Monitor for hydration warnings, implement fix if user complaints arise

**File References**:
- Hook: `lib/hooks/useIsMobile.ts:1-20`
- Usage: `app/compare/page.tsx:24`
- Related doc: `docs/audit/data-flow.md:518-540`

---

### 🟡 MEDIUM SEVERITY

#### Risk M-1: Service Worker Stale CSS (Resolved, Monitor)

**Description**: CSS changes not applying on normal refresh  
**Impact**: Developers see stale styles, require hard reload  
**Probability**: Low (fixed in v1.0.6)  
**Severity**: Medium (dev experience issue)  
**Owner**: Engineering  
**Status**: ✅ FIXED (network-first CSS caching)

**Historical Issue**:
- **Problem**: Service worker cached CSS with cache-first strategy
- **Symptom**: Tailwind class changes not visible after refresh
- **Fix**: Changed CSS to network-first strategy (line 102-108)

**Current Monitoring**:
- Service worker version: `v1.0.7`
- CSS cache strategy: Network-first with fallback
- Dev script: `npm run dev:clean` to clear cache

**File References**:
- Service worker: `public/sw.js:102-108`
- Fix documented: `docs/devnotes/2025-10-08-sw-css-cache-fix.md`
- Dev script: `package.json:7`

---

#### Risk M-2: Race Condition in Bulk Ranking (Low Impact)

**Description**: Dropdown computes rankings in render path  
**Impact**: Potential performance issue with large datasets  
**Probability**: Low (32 teams is small dataset)  
**Severity**: Medium (if it causes lag)  
**Owner**: Engineering

**Technical Details**:
- **File**: `components/RankingDropdown.tsx:66-82`
- **Pattern**: `useMemo(() => calculateBulkRanking(...), [deps])`
- **Current**: Recomputes when allData/metricKey changes
- **Performance**: ~1ms for 32 teams (acceptable)

**Potential Issue**: If team count grows to 100+ teams, may cause dropdown lag

**Proposed Solution** (if needed):
```typescript
// Move to global context (one calculation per page load)
const RankingsContext = React.createContext();

function ComparePage() {
  const allRankings = useMemo(() => 
    calculateAllMetricRankings(offenseData, defenseData),
    [offenseData, defenseData]
  );
  
  return (
    <RankingsContext.Provider value={allRankings}>
      <OffensePanel {...} />
      <DefensePanel {...} />
    </RankingsContext.Provider>
  );
}
```

**Recommendation**: Monitor dropdown open time, optimize if > 50ms

**File References**:
- Current implementation: `components/RankingDropdown.tsx:66-82`
- Hook: `lib/useRanking.ts:157-229`
- Related doc: `docs/audit/data-flow.md:541-570`

---

#### Risk M-3: No URL Param Sync (Feature Gap)

**Description**: Team selection not reflected in URL  
**Impact**: Can't share specific matchups via link  
**Probability**: N/A (known gap)  
**Severity**: Medium (usability issue)  
**Owner**: Product/Engineering

**Current Behavior**:
- URL always: `/compare` (no params)
- Team selection: Stored only in React state
- On refresh: Reverts to default teams (Vikings vs Lions)

**Desired Behavior**:
- URL format: `/compare?teamA=BUF&teamB=KC`
- Share link → Opens with exact teams
- Refresh → Preserves team selection

**Proposed Solution**:
```typescript
// app/compare/page.tsx
import { useSearchParams, useRouter } from 'next/navigation';

function ComparePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Read from URL on mount
  const teamA = searchParams.get('teamA') || 'Minnesota Vikings';
  const teamB = searchParams.get('teamB') || 'Detroit Lions';
  
  // Update URL when teams change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('teamA', selectedTeamA);
    params.set('teamB', selectedTeamB);
    router.replace(`/compare?${params.toString()}`, { scroll: false });
  }, [selectedTeamA, selectedTeamB]);
}
```

**Recommendation**: Implement in next sprint (2-3 hours)

**File References**:
- Implementation location: `app/compare/page.tsx:38-76`
- Related doc: `docs/audit/data-flow.md:389-409`

---

#### Risk M-4: Dropdown Truncation on Soft Reload (Investigated)

**Description**: Potential `.slice(0,4)` bug limiting visible teams  
**Impact**: Users can't see all teams in dropdown  
**Probability**: None (verified clean)  
**Severity**: Medium (if it existed)  
**Owner**: Engineering  
**Status**: ✅ VERIFIED CLEAN

**Investigation Results**:
- **Search**: Grepped codebase for `.slice(0,` patterns
- **Finding**: No truncation bugs found
- **Current**: All dropdowns show full 32 teams + average
- **Sorting**: Rank-sorted (1st → 32nd) with average last

**File References**:
- Ranking dropdown: `components/RankingDropdown.tsx:85-121`
- Team dropdown: `components/TeamDropdown.tsx:40-80`
- Mobile dropdown: `components/mobile/CompactRankingDropdown.tsx:120-160`
- Related doc: `docs/audit/layout-map.md:293-348`

---

### 🟢 LOW SEVERITY

#### Risk L-1: No Keyboard Navigation (Accessibility Gap)

**Description**: Dropdowns require mouse/touch only  
**Impact**: Keyboard-only users can't navigate efficiently  
**Probability**: N/A (known gap)  
**Severity**: Low (accessibility issue)  
**Owner**: Product/Engineering

**Missing Features**:
- Arrow keys (↑/↓) to navigate dropdown list
- Enter to select highlighted item
- Escape to close dropdown
- Home/End to jump to first/last
- Type-ahead search

**Proposed Solution**:
```typescript
// components/RankingDropdown.tsx
function RankingDropdown() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          setSelectedIndex(i => Math.min(i + 1, teams.length - 1));
          break;
        case 'ArrowUp':
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          handleSelectTeam(teams[selectedIndex]);
          setIsOpen(false);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex]);
}
```

**Recommendation**: Implement in accessibility sprint (4-6 hours)

**File References**:
- Desktop dropdown: `components/RankingDropdown.tsx:1-341`
- Mobile dropdown: `components/mobile/CompactRankingDropdown.tsx:1-280`
- Related spec: `docs/specs/ui-compact-spec.md:1088-1106`

---

#### Risk L-2: No Monospace Font for Numbers (Visual Inconsistency)

**Description**: Numeric values not aligned vertically  
**Impact**: Slightly harder to scan comparison values  
**Probability**: N/A (known gap)  
**Severity**: Low (visual polish)  
**Owner**: Design/Engineering

**Current Behavior**:
- Font: Inter (variable-width sans-serif)
- Digit "1" narrower than "8" → misalignment
- Example: 
  ```
  245  (Team A)
  38.9 (Team B)
  ```
  Digits don't align vertically

**Proposed Solution**:
```css
.metric-value {
  font-family: 'SF Mono', 'Roboto Mono', 'Courier New', monospace;
  font-feature-settings: 'tnum';  /* Tabular numbers */
  letter-spacing: -0.02em;
}
```

**Recommendation**: Add to design polish sprint (1 hour)

**File References**:
- Desktop values: `components/DynamicComparisonRow.tsx:132-179`
- Mobile values: `components/mobile/CompactComparisonRow.tsx:132-178`
- Related doc: `docs/specs/ui-compact-spec.md:485-520`

---

#### Risk L-3: Stale Data No Visual Indicator (UX Gap)

**Description**: No UI indication when serving stale cached data  
**Impact**: Users don't know data freshness  
**Probability**: Medium (30min-6hr cache window)  
**Severity**: Low (data still accurate)  
**Owner**: Product/Engineering

**Current Behavior**:
- API serves stale data with `stale: true` flag
- Hook sets `dataFreshness` state
- No UI component displays freshness

**Proposed Solution**:
```tsx
// components/OfflineStatusBanner.tsx
{offenseDataFreshness === 'stale' && (
  <div className="bg-yellow-500/10 text-yellow-400 px-4 py-2 text-sm flex items-center gap-2">
    <span>⏰</span>
    <span>Data is 2 hours old (updating in background)</span>
    <button onClick={refreshData} className="underline">Refresh now</button>
  </div>
)}
```

**Recommendation**: Add to next UX iteration (2 hours)

**File References**:
- Data freshness hook: `lib/useNflStats.ts:95-143`
- Banner component: `components/OfflineStatusBanner.tsx:1-40`
- Related doc: `docs/audit/data-flow.md:603-640`

---

#### Risk L-4: No Error Tracking/Monitoring (Observability Gap)

**Description**: No production error logging (Sentry, etc.)  
**Impact**: Can't diagnose user-reported issues  
**Probability**: N/A (known gap)  
**Severity**: Low (dev tools exist for debugging)  
**Owner**: DevOps/Engineering

**Current Monitoring**:
- Console logs only (structured with request IDs)
- No centralized error tracking
- No performance metrics aggregation

**Proposed Solution**:
```typescript
// Add Sentry
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
  beforeSend(event, hint) {
    // Filter out noisy errors
    if (event.exception?.values?.[0]?.type === 'NetworkError') {
      return null;
    }
    return event;
  }
});

// Usage in hooks
try {
  const response = await fetch('/api/nfl-2025/offense');
} catch (error) {
  Sentry.captureException(error, {
    tags: { context: 'useNflStats', endpoint: 'offense' }
  });
  throw error;
}
```

**Recommendation**: Add before production launch (4-6 hours)

**File References**:
- Error handling: `lib/useNflStats.ts:151-162, 231-242`
- Logger utility: `utils/logger.ts:1-50`

---

#### Risk L-5: PM2 Single Instance (Deployment Risk)

**Description**: Self-hosted on single M1 Mac with PM2  
**Impact**: No redundancy, single point of failure  
**Probability**: Medium (hardware failure, power loss)  
**Severity**: Low (can restart quickly)  
**Owner**: DevOps

**Current Setup**:
- Single M1 Mac server
- PM2 process manager (24/7 uptime)
- 6-hour in-memory cache (lost on restart)
- No load balancer, no failover

**Proposed Solution** (for scale):
1. **Option A**: Deploy to Vercel (zero-config, auto-scaling)
2. **Option B**: Multi-instance PM2 cluster mode
   ```bash
   pm2 start npm --name pare-nfl -i 2 -- start  # 2 instances
   ```
3. **Option C**: Docker + Kubernetes (overkill for current scale)

**Recommendation**: Monitor uptime, migrate to Vercel if needed

**File References**:
- Deployment commands: `CLAUDE.md:113-128`
- Cache implementation: `app/api/nfl-2025/offense/route.ts:29-40`

---

## PART 2: Open Questions for Product Owner

### Category: Live Data & Real-Time Features

#### Q-1: Live Score Update Cadence

**Question**: What's the acceptable latency for live score updates?

**Options**:
- **A**: 3-5 seconds (polling, simple)
- **B**: 1-2 seconds (WebSocket, complex)
- **C**: 30 seconds (low frequency, battery-friendly)

**Trade-offs**:
| Option | Latency | Server Load | Battery Impact | Complexity |
|--------|---------|-------------|----------------|------------|
| A (5s) | Medium | Low | Medium | Low ✅ |
| B (1s) | Low | Medium | High | High |
| C (30s) | High | Very Low | Low | Low |

**Recommendation**: Start with **Option A** (5-second polling), upgrade to WebSocket if users complain

**Impact**:
- Development time: A (1 day), B (3 days), C (1 day)
- User experience: A (good), B (excellent), C (poor)

**File References**:
- Proposed implementation: `docs/audit/data-flow.md:409-485`
- Related spec: `docs/specs/ui-compact-spec.md:48-95`

---

#### Q-2: In-Game Stats vs Season Stats Display

**Question**: When user selects a LIVE game, show in-game stats or season stats?

**Options**:
- **A**: Season stats only (consistent)
- **B**: In-game stats only (real-time)
- **C**: Both (overlay in-game on top of season)

**Example** (Option C):
```
Points: 24 (season: 245) vs 20 (season: 198)  🔴 LIVE
```

**Recommendation**: **Option C** with visual indicator for in-game values

**File References**:
- Proposed hook: `docs/audit/data-flow.md:487-560`

---

### Category: User Interface & Experience

#### Q-3: Mismatch Chips - Thresholds & Rules

**Question**: What constitutes a "mismatch" worth highlighting?

**Example Rules** (proposed):
- Elite offense (Top 5) vs Poor defense (Bottom 10)
- Red zone efficiency gap > 20%
- Turnover margin difference > 8

**Question A**: Are these thresholds appropriate?  
**Question B**: Should we show ALL mismatches or max 2-3?  
**Question C**: Color-code by severity (red=extreme, yellow=moderate)?

**Recommendation**: Start with 5 deterministic rules, add more based on feedback

**File References**:
- Proposed rules: `docs/specs/ui-compact-spec.md:125-215`

---

#### Q-4: Keyboard Shortcuts Priority

**Question**: How important is keyboard navigation?

**Context**: Current implementation is touch/mouse only

**Options**:
- **A**: Not needed (mobile-first app)
- **B**: Nice to have (add in V2)
- **C**: Required for accessibility (add now)

**Impact**:
- Development time: 4-6 hours
- Accessibility compliance: Required for WCAG 2.1 AA

**Recommendation**: **Option C** - add before production launch

**File References**:
- Proposed implementation: `docs/specs/ui-compact-spec.md:1088-1106`

---

#### Q-5: Default Teams on First Visit

**Question**: Which teams should be selected by default?

**Current**: `Vikings vs Lions` (hardcoded)

**Options**:
- **A**: Keep current (Vikings vs Lions)
- **B**: Top 2 ranked teams by points
- **C**: User's local team + #1 ranked team (geo-detection)
- **D**: Last week's best game (highest combined score)

**Recommendation**: **Option A** for consistency, **Option C** for personalization

**File References**:
- Current default: `app/compare/page.tsx:42-46`

---

### Category: Mobile & React Native

#### Q-6: Minimum iOS Version Target

**Question**: What's the minimum iOS version for React Native app?

**Options**:
- **A**: iOS 16+ (latest features, smaller user base)
- **B**: iOS 17+ (current, ~70% of users)
- **C**: iOS 15+ (wider reach, more compatibility work)

**Trade-offs**:
| Option | User Coverage | Features Available | Support Burden |
|--------|---------------|-------------------|----------------|
| iOS 16+ | ~85% | Full feature set | Low |
| iOS 17+ | ~70% | Latest APIs | Very Low ✅ |
| iOS 15+ | ~95% | Limited | High |

**Recommendation**: **iOS 17+** (reduces testing matrix, modern APIs)

**File References**:
- Phase 1 checklist: `CLAUDE.md:54-57`
- Related doc: `docs/port/port-to-react-native.md:851-870`

---

#### Q-7: Dark Mode Support (RN)

**Question**: Support both light + dark modes, or dark only?

**Current Web**: Dark mode only

**Options**:
- **A**: Dark only (consistent with web)
- **B**: Both light + dark (system preference)
- **C**: Dark default, light optional (user choice)

**Trade-offs**:
| Option | Development Time | Design Work | User Flexibility |
|--------|------------------|-------------|------------------|
| A | None | None | Low |
| B | +2 weeks | High | High |
| C | +1 week | Medium | Medium |

**Recommendation**: **Option A** (dark only), add light mode in V2 if requested

**File References**:
- Phase 1 checklist: `CLAUDE.md:56`

---

#### Q-8: Haptic Feedback Aggressiveness

**Question**: How much haptic feedback on team selection?

**Options**:
- **A**: None (silent)
- **B**: Light tap on team change
- **C**: Medium tap on team change + light tap on rank badge press
- **D**: Heavy tap on team change + medium tap on dropdown open

**iOS Guidelines**: Use light/medium for most interactions

**Recommendation**: **Option C** (balanced, not annoying)

**File References**:
- Phase 2 checklist: `CLAUDE.md:64-67`

---

### Category: Data & Performance

#### Q-9: Cache Time-to-Live (TTL)

**Question**: Current cache is 6 hours. Is this appropriate?

**Current**:
- API in-memory cache: 6 hours
- Service Worker cache: 30min fresh, 6hr stale
- React state: Session only

**Options**:
- **A**: Keep 6 hours (current)
- **B**: Reduce to 1 hour (more current data, more API calls)
- **C**: Increase to 12 hours (less API calls, staler data)

**Trade-offs**:
| Option | Data Freshness | API Calls/Day | Server Load |
|--------|----------------|---------------|-------------|
| 1 hour | High | ~24 | High |
| 6 hours ✅ | Medium | ~4 | Low |
| 12 hours | Low | ~2 | Very Low |

**Recommendation**: **Keep 6 hours** (good balance)

**File References**:
- Cache config: `config/constants.ts:8-11`
- API implementation: `app/api/nfl-2025/offense/route.ts:36-40`

---

#### Q-10: Manual Refresh Button

**Question**: Should users be able to manually refresh data?

**Current**: No refresh button, only automatic cache expiration

**Options**:
- **A**: No manual refresh (keep current)
- **B**: Refresh button in header (always visible)
- **C**: Pull-to-refresh on mobile only
- **D**: Both B + C (desktop + mobile)

**Recommendation**: **Option D** (best UX)

**Implementation**:
```tsx
// Desktop: Button in TopBar
<button onClick={refreshData}>
  <RefreshIcon /> Refresh
</button>

// Mobile: Pull-to-refresh gesture
<RefreshControl
  refreshing={isRefreshing}
  onRefresh={async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
  }}
/>
```

**File References**:
- Refresh function: `lib/useNflStats.ts:248-250`

---

#### Q-11: CSV Update Workflow Automation

**Question**: Automate CSV updates or keep manual?

**Current**: Manual export from Pro Football Reference website

**Options**:
- **A**: Keep manual (current, reliable)
- **B**: Automated scraper (daily cron job)
- **C**: Fetch directly from PFR API (if exists)

**Trade-offs**:
| Option | Reliability | Maintenance | Freshness |
|--------|-------------|-------------|-----------|
| Manual | High | Low | Weekly |
| Scraper | Medium | High | Daily |
| API | High | Low | Hourly |

**Question**: Does Pro Football Reference have an official API?

**Recommendation**: Keep **manual** until PFR API access confirmed

**File References**:
- CSV parsing: `lib/pfrCsv.ts:1-300`
- Update workflow: `CLAUDE.md:131-134`

---

### Category: Deployment & Monitoring

#### Q-12: Move to Vercel or Stay Self-Hosted?

**Question**: Continue self-hosting on M1 Mac or migrate to Vercel?

**Current**: Self-hosted M1 Mac + PM2

**Options**:
- **A**: Keep self-hosted (current)
- **B**: Migrate to Vercel (zero-config, auto-scaling, HTTPS)
- **C**: Migrate to AWS/GCP (full control, overkill)

**Trade-offs**:
| Option | Cost | Maintenance | Scalability | HTTPS |
|--------|------|-------------|-------------|-------|
| Self-hosted | $0/mo | High | Limited | Manual |
| Vercel | $20-50/mo | None | Auto | Automatic ✅ |
| AWS | $50-200/mo | High | Manual | Manual |

**Recommendation**: **Option B** (Vercel) - enables HTTPS for iOS, zero maintenance

**iOS Requirement**: HTTPS required for App Transport Security (ATS)

**File References**:
- iOS Phase 0: `CLAUDE.md:43-46`
- Deployment: `docs/mobile/AUDIT_iOS_FOUNDATION.md:100-150`

---

## PART 3: Decision Matrix

### Priority Grid

| Decision | Urgency | Impact | Complexity | Recommendation |
|----------|---------|--------|------------|----------------|
| **Q-1: Live score cadence** | High | High | Low | 5-second polling |
| **Q-2: In-game vs season stats** | Medium | Medium | Medium | Show both (overlay) |
| **Q-3: Mismatch chip rules** | Low | Low | Low | Start with 5 rules |
| **Q-4: Keyboard navigation** | High | Low | Low | Add for accessibility |
| **Q-5: Default teams** | Low | Low | Low | Keep Vikings vs Lions |
| **Q-6: Min iOS version** | High | Medium | Low | iOS 17+ |
| **Q-7: Dark mode only?** | Medium | Low | High | Dark only (V1) |
| **Q-8: Haptic feedback** | Low | Low | Low | Light + medium |
| **Q-9: Cache TTL** | Low | Low | Low | Keep 6 hours |
| **Q-10: Manual refresh** | Medium | Low | Low | Add button + pull-to-refresh |
| **Q-11: CSV automation** | Low | Medium | High | Keep manual (for now) |
| **Q-12: Vercel migration** | High | High | Low | Migrate for iOS HTTPS |

**Top 3 Critical Decisions**:
1. ✅ **Q-12**: Migrate to Vercel (required for iOS ATS)
2. ✅ **Q-1**: 5-second polling for live scores
3. ✅ **Q-6**: iOS 17+ minimum version

---

## PART 4: Risk Mitigation Action Items

### Immediate Actions (Next Sprint)

- [ ] **H-2**: Add monitoring for hydration warnings in console
- [ ] **M-3**: Implement URL param sync for shareability (2-3 hours)
- [ ] **L-3**: Add data freshness UI indicator (2 hours)
- [ ] **Q-12**: Migrate to Vercel for HTTPS + auto-scaling (1 day)

### Short-Term Actions (Next Month)

- [ ] **H-1**: Implement left rail scoreboard (4-6 weeks)
- [ ] **M-2**: Profile dropdown performance, optimize if > 50ms (4 hours)
- [ ] **L-1**: Add keyboard navigation to dropdowns (4-6 hours)
- [ ] **L-4**: Add Sentry error tracking (4-6 hours)

### Long-Term Actions (Next Quarter)

- [ ] **M-1**: Monitor CSS cache strategy effectiveness
- [ ] **L-2**: Add monospace font for numeric values (1 hour)
- [ ] **L-5**: Evaluate multi-instance deployment (if scale requires)

---

## Summary

**Total Risks Identified**: 11  
**Critical Decisions Needed**: 12  
**High Priority Actions**: 4  
**Estimated Mitigation Time**: 2-3 weeks

**Key Recommendations**:
1. ✅ Migrate to Vercel (required for iOS)
2. ✅ Implement URL param sync (better UX)
3. ✅ Add keyboard navigation (accessibility)
4. ✅ Start with 5-second polling for live scores

All risks are **manageable** with clear mitigation paths. No critical blockers identified.

---

**End of Risk Register**

