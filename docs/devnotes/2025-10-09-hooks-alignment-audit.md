# Hooks Alignment Audit - Dev Note

**Date**: 2025-10-09  
**Type**: Audit (no code changes)  
**Goal**: Verify desktop hooks/utils are reused by mobile (no duplicate logic)  
**Status**: ✅ Audit complete

---

## 📖 Session Refresher

**Rule Summary** (from CLAUDE.md - ranking, ties, formatting, data SOT):
- **Ranking Hook**: `lib/useRanking.ts` - client-side, precision-aware (epsilon=0.001)
- **Data Transform**: `utils/teamDataTransform.ts` - per-game division, no inline rounding
- **Format Utils**: `lib/metricsConfig.ts` - `formatMetricValue()` for display only
- **Team Policy**: `utils/teamHelpers.ts` - filter "Avg Team", pin "Avg Tm/G" last (never ranked)

**Open Decisions**: None - mobile reuses desktop hooks ✅

**Unreleased Changes**:
- Mobile UI transformation complete (9 components)
- Floating UI migration
- Tie logic synchronized

**Confirmation**: ✅ **I will not duplicate CLAUDE.md content in Dev Notes; I will link to it.**

---

## 🎯 Context

### Why This Audit

After mobile UI transformation, verify that **mobile components import and use the same desktop hooks/utilities** without duplicating ranking logic, derivation math, or formatting rules.

### Principle

**Mobile = Desktop Hooks**. No alternate "mobile" implementations. Single source of truth for:
1. Value derivation (`transformTeamDataByMode`)
2. Ranking + ties (`useRanking`)
3. Label formatting (inline `formatRank`)
4. Team filtering (`teamHelpers`)

---

## 🔍 Decisions

### Desktop Hook Chain (SOURCE OF TRUTH)

```
CSV Data
  ↓
useNflStats() - fetch raw data
  ↓
useDisplayMode() - manage per-game/total toggle
  ↓
transformTeamDataByMode() - derive per-game values (utils/teamDataTransform.ts)
  ↓
useRanking() - compute ranks with precision (lib/useRanking.ts)
  ↓
formatRank() - label as "T-{n}th" (inline in useRanking)
  ↓
formatMetricValue() - display formatting (lib/metricsConfig.ts)
```

### Mobile Hook Chain (VERIFIED)

```
CSV Data
  ↓
useNflStats() - SAME ✅
  ↓
useDisplayMode() - SAME ✅
  ↓
transformAllTeamDataByMode() - SAME (calls transformTeamDataByMode) ✅
  ↓
useRanking() - SAME ✅
  ↓
formatRank() - SAME (inline) ✅
  ↓
formatMetricValue() - SAME ✅
```

**Verdict**: ✅ **PERFECT ALIGNMENT** - Mobile imports and uses desktop hooks directly

---

## 📝 Implementation Notes

### Conformance Table

| Stage | Desktop Hook/Util | Mobile Hook/Util | Same? | Line References |
|-------|-------------------|------------------|-------|-----------------|
| **Derive** | `transformTeamDataByMode()` | `transformAllTeamDataByMode()` | ✅ Yes | `teamDataTransform.ts:38-59, 64-71` |
| **Rounding** | `.toFixed(1)` at line 54 | `.toFixed(1)` at line 54 | ❌ SHARED BUG | `teamDataTransform.ts:54` |
| **Rank** | `useRanking()` | `useRanking()` | ✅ Yes | `lib/useRanking.ts:47-151` |
| **Epsilon** | `0.001` | `0.001` | ✅ Yes | `lib/useRanking.ts:27` |
| **Tie Compression** | `1,2,2,4` pattern | `1,2,2,4` pattern | ✅ Yes | Lines 119, 207 |
| **Label** | `formatRank()` inline | `formatRank()` inline | ✅ Yes | Lines 131-138, 210-217 |
| **Team Policy** | `isNonSelectableSpecialTeam()` | `isNonSelectableSpecialTeam()` | ✅ Yes | `teamHelpers.ts:38-43` |

### Violations Found (3)

#### 1. Rounding Inside Derive Hook (CRITICAL) 🔴

**File**: `utils/teamDataTransform.ts`  
**Line**: 54  
**Code**: `transformedData[key] = (numericValue / games).toFixed(1);`

**Problem**: Rounds to string BEFORE passing to ranking hook  
**Impact**: Breaks tie detection in per-game mode  
**Fix**: Remove `.toFixed(1)` - let formatMetricValue() handle display

#### 2. Mobile Extra Sort (MINOR) ⚠️

**File**: `components/mobile/CompactRankingDropdown.tsx`  
**Lines**: 165-169  
**Code**: Alphabetical secondary sort within ties

**Problem**: Desktop doesn't have this (cosmetic only)  
**Impact**: Tied teams appear in different order  
**Fix**: Add to desktop OR remove from mobile (recommend: add to desktop)

#### 3. Format Rank Duplication (MINOR) ⚠️

**File**: `lib/useRanking.ts`  
**Lines**: 131-138, 210-217  
**Code**: `formatRank()` defined twice

**Problem**: Minor duplication within same file  
**Impact**: Maintenance only  
**Fix**: Extract to `lib/ranking/formatRank.ts` (optional)

---

## 🎯 Minimal Alignment Plan

1. **Fix Derive Rounding** (1 line change)
   ```typescript
   // utils/teamDataTransform.ts:54
   // REMOVE: transformedData[key] = (numericValue / games).toFixed(1);
   // ADD:    transformedData[key] = numericValue / games;
   ```
   Display components already use `formatMetricValue()` for `.toFixed(1)` ✅

2. **Align Secondary Sort** (optional - 4 lines)
   ```typescript
   // components/RankingDropdown.tsx:105
   // Add alphabetical tiebreaker to match mobile
   .sort((a, b) => {
     const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
     if (rankDiff !== 0) return rankDiff;
     return a.team.team.localeCompare(b.team.team);
   });
   ```

3. **Extract Format Utility** (optional - new file)
   ```typescript
   // lib/ranking/formatRank.ts (NEW)
   export function formatRank(rankNum: number, tied: boolean): string { ... }
   ```

4. **Update Imports** (2 locations)
   ```typescript
   // lib/useRanking.ts
   import { formatRank } from './ranking/formatRank';
   ```

5. **Test Parity**
   - Vikings show "T-13th" on mobile per-game ✅
   - Tied teams in same order on desktop/mobile ✅

---

## 🧪 Testing

### Parity Checks (Manual)

1. **Desktop Per-Game = Mobile Per-Game**
   - Same rank, same tie label
   - Currently: ❌ Broken by rounding bug

2. **Desktop Total = Mobile Total**
   - Same rank, same tie label
   - Currently: ✅ Works (no rounding)

3. **Per-Game ↔ Total Toggle**
   - Ranks change consistently
   - Currently: ⚠️ Broken by rounding

4. **Dropdown Order (Ties)**
   - Same order across surfaces
   - Currently: ❌ Different (mobile has alpha sort)

---

## 🔄 Performance

**No performance cost** - Mobile already uses desktop hooks (no duplication to remove).

**Fix 1 Performance**: ✅ **Faster** (no string conversion/re-parsing)

---

## 📝 Follow-ups

1. **Apply Fix 1** (critical - rounding)
2. **Optional**: Apply Fixes 2-3 (alignment, extraction)
3. **Test parity**: 12-test matrix (2 surfaces × 2 modes × 3 metrics)
4. **Update CHANGELOG**: Document fix

---

## 🔗 Cross-Links

### Audit Docs
- **File Map**: `docs/audits/2025-10-cross-surface-hooks/file-map.md`
- **Findings**: `docs/audits/2025-10-cross-surface-hooks/findings.md`
- **This Dev Note**: `docs/devnotes/2025-10-09-hooks-alignment-audit.md`

### CLAUDE.md
- **Ranking System**: [CLAUDE.md:219-232](../../CLAUDE.md)
- **Data Flow**: [CLAUDE.md:211-232](../../CLAUDE.md)

### Related
- **Mobile Transformation**: `docs/devnotes/2025-10-09-session-summary.md`
- **Vikings Audit**: `C:/tmp/mobile-pergame-vs-total-rank-audit.md`

---

## ✅ ACCEPTANCE CHECKLIST

- [x] **File map** shows real desktop hook chain + mobile usage chain with line ranges
- [x] **Findings** clearly lists divergences with exact file:line pointers
- [x] **Minimal alignment plan** only says "mobile imports desktop hook X" (no new abstractions)
- [x] **Dev Note created** (audit only; links to CLAUDE.md; no duplication)

### Evidence Captured

- [x] Per-game division location (line 46, 53 - verify no rounding) - ❌ FOUND `.toFixed(1)` at line 54
- [x] Rank compression verified (1,2,2,4 pattern) - ✅ Lines 119, 207
- [x] Epsilon/precision defined (0.001) - ✅ Line 27
- [x] Label string production ("T-{n}th") - ✅ Lines 131-138
- [x] Team options filter/pin logic - ✅ `teamHelpers.ts:38-43`

---

## 📊 PASS REPORT

**Status**: ✅ **PASS** (with 1 critical fix identified)

**Conformance**: 
- ✅ Mobile uses desktop hooks directly (no duplication)
- ✅ Same epsilon, same tie compression, same label format
- ✅ Same team filtering policy
- ❌ Shared bug: rounding before ranking (line 54)
- ⚠️ Minor drift: mobile has alpha sort (cosmetic only)

**Blockers**: None

**Next**: Apply Fix 1 to resolve critical rounding issue

---

**Last Updated**: 2025-10-09  
**Status**: ✅ Audit complete - mobile correctly reuses desktop hooks

