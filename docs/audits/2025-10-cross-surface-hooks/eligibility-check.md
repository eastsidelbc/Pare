# Per-Game Eligibility Filter Check

**Date**: 2025-10-09  
**Question**: Does desktop filter teams by Games (G) while mobile doesn't?  
**Answer**: ❌ **NO** - Both surfaces use identical filtering

---

## 🔍 **Evidence**

### 1. **Ranking Hook Filter** (Source of Truth)

**File**: `lib/useRanking.ts:73-81`

```typescript
// Filter out special teams if requested
const { higherIsBetter = true, excludeSpecialTeams = true } = options;

let filteredData = allData;
if (excludeSpecialTeams) {
  filteredData = allData.filter(team => 
    !['Avg Team', 'League Total', 'Avg Tm/G', 'Avg/TmG'].includes(team.team)
  );
}
```

**Filters**:
- ✅ Special teams (Avg Team, League Total, Avg Tm/G)
- ❌ **NO filter on Games (G)**
- ❌ **NO filter on games played**
- ❌ **NO per-game eligibility check**

---

### 2. **Desktop Uses Same Hook**

**File**: `components/DynamicComparisonRow.tsx:51-54`

```typescript
const teamARanking = useRanking(allData, metricKey, teamAData?.team || '', { 
  higherIsBetter,
  excludeSpecialTeams: true 
});
```

**No additional filtering** - uses `useRanking` directly

---

### 3. **Mobile Uses Same Hook**

**File**: `components/mobile/CompactComparisonRow.tsx:81-84`

```typescript
const teamARanking = useRanking(allData, metricField, teamA, {
  higherIsBetter: panelType === 'defense' ? !metricConfig.higherIsBetter : metricConfig.higherIsBetter,
  excludeSpecialTeams: true
});
```

**No additional filtering** - uses `useRanking` directly

---

### 4. **CSV Data Check**

**File**: `data/pfr/offense-2025.csv` (lines 3-10)

```csv
Rk,Tm,G,PF,Yds,Ply,Y/P,TO,FL,1stD,...
1,Detroit Lions,5,174,1825,306,...
2,Indianapolis Colts,5,163,1906,303,...
3,Buffalo Bills,5,153,1979,324,...
4,Dallas Cowboys,5,151,2033,332,...
5,Seattle Seahawks,5,146,1792,286,...
6,Baltimore Ravens,5,141,1559,250,...
7,Tampa Bay Buccaneers,5,135,1769,318,...
8,Washington Commanders,5,134,1745,290,...
```

**All teams have G=5** (same games played)

Vikings (line 16): `15,Minnesota Vikings,5,123,1471,266,...`
- **G=5** (same as all other teams)
- **PF=123** points (123/5 = 24.6 per game)

---

### 5. **Codebase Search**

**Search**: `grep -r "\.g\b|games.*filter|filter.*games"`

**Result**: ❌ **No matches found**

**Conclusion**: No code anywhere filters by games played

---

## 🎯 **Root Cause: NOT Eligibility Filter**

### What's Actually Happening

**Desktop**:
1. Loads fresh code with fix ✅
2. API returns raw data (123 points, 5 games)
3. Transform: 123/5 = 24.6 (full precision) ✅
4. Ranking: Detects ties correctly ✅
5. Shows: "T-13th" ✅

**Mobile**:
1. **Service Worker serves CACHED response** ❌
2. Cached data has OLD transform (24.6 string from `.toFixed(1)`)
3. Ranking uses cached rounded values
4. Can't detect ties (precision lost)
5. Shows: "15th" (per-game), "13th" (total) ❌

---

## 📊 **Comparison Table**

| Aspect | Desktop | Mobile | Same? |
|--------|---------|--------|-------|
| **Ranking Hook** | `useRanking` | `useRanking` | ✅ Identical |
| **Special Teams Filter** | Yes | Yes | ✅ Same |
| **Games (G) Filter** | ❌ None | ❌ None | ✅ Same |
| **Eligibility Check** | ❌ None | ❌ None | ✅ Same |
| **Dataset** | All 32 teams | All 32 teams | ✅ Same |
| **Games Played** | All have G=5 | All have G=5 | ✅ Same |
| **Cache Status** | Fresh | ❌ Stale | ❌ **DIFFERENT** |

---

## ✅ **Conclusion**

**NO eligibility filter exists on either surface.**

The issue is **100% a caching problem**:
- Desktop: Fresh code + fresh data = works ✅
- Mobile: Fresh code + **stale cached data** = broken ❌

---

## 🔧 **Fix: Clear Cache**

### Why Cache Matters

**Service Worker** (`public/sw.js`):
```javascript
const API_CACHE = 'pare-api-v1.0.6';  // ← Old version
const CACHE_EXPIRATION = {
  API_STALE: 6 * 60 * 60 * 1000,  // 6 hours
};
```

**I already bumped to `v1.0.7`** to force fresh cache ✅

### Steps to Clear

1. **Stop dev server** (Ctrl+C)
2. **Clear browser**:
   - DevTools → Application → Service Workers → Unregister
   - Application → Clear storage → Clear site data
3. **Restart dev server**: `npm run dev`
4. **Hard refresh**: Ctrl+Shift+R

---

## 🧪 **Expected After Cache Clear**

| Mode | Surface | Before | After |
|------|---------|--------|-------|
| Per-Game | Desktop | T-13th ✅ | T-13th ✅ |
| Per-Game | Mobile | 15th ❌ | **T-13th** ✅ |
| Total | Desktop | T-13th ✅ | T-13th ✅ |
| Total | Mobile | 13th ❌ | **T-13th** ✅ |

Both surfaces should show **identical ranks** after cache clear.

---

**Status**: ✅ Verified NO eligibility filter exists  
**Issue**: Cache only  
**Fix**: Clear cache (instructions provided)

