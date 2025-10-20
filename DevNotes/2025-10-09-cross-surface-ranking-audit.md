# Cross-Surface Ranking Audit - Dev Note

**Date**: 2025-10-09  
**Type**: Audit (no code changes)  
**Scope**: Desktop vs Mobile ranking conformance analysis  
**Status**: ✅ Audit complete, diffs proposed

---

## 📋 Context

### Why We Audited

Following the mobile UI transformation and Floating UI migration, we needed to verify that **ranking computation, tie detection, and display formatting** are consistent across desktop and mobile surfaces. This audit ensures we have a single source of truth (SOT) for:

1. **Value derivation** (per-game vs total)
2. **Ranking + ties** (precision/epsilon/ordering)
3. **Rank label formatting** (T-13th, etc.)
4. **Team option policy** (no "Avg Team", keep "Avg Tm/G" pinned)

### Audit Approach

Per `@parescript.txt` specification:
- **Read-only audit** (no code changes yet)
- Map all SOT utilities, hooks, and components
- Create comprehensive file map with call graphs
- Document desktop vs mobile conformance
- Identify redundancy and drift with file:line pointers
- Propose minimal, surgical diffs

### Links to CLAUDE.md

- **Ranking System**: [CLAUDE.md:219-232](../../CLAUDE.md) - Client-side `useRanking` hook
- **Per-Game Calculations**: [CLAUDE.md:260-267](../../CLAUDE.md) - Smart field detection
- **Data Flow**: [CLAUDE.md:211-232](../../CLAUDE.md) - CSV → API → useRanking pipeline

---

## 🎯 Key Decisions

### 1. Source of Truth Utilities (CONFIRMED)

**Ranking Computation**:
- `lib/useRanking.ts` - Single SOT for all ranking logic
- Both desktop AND mobile use this hook
- No inline ranking logic anywhere ✅

**Value Derivation**:
- `utils/teamDataTransform.ts` - Single SOT for per-game transform
- Both surfaces use same transform functions
- ONE CRITICAL BUG FOUND (see below)

**Display Formatting**:
- `lib/metricsConfig.ts` - `formatMetricValue()` utility
- Applied AFTER ranking (correct)
- Minor inline duplication in mobile (cosmetic)

**Team Filtering**:
- `utils/teamHelpers.ts` - Special team identification
- Both surfaces use same utilities
- Perfect conformance ✅

### 2. Tie Badge Styling (INTENTIONAL DIFFERENCE)

**Desktop**:
- Main badge: Amber color + 🔸 emoji for ties
- Dropdown list: Amber background for ties

**Mobile**:
- Main badge: Purple (no special styling) - **per user request**
- Dropdown list: Amber background for ties (same as desktop)

**Decision**: This is **intentional**, not a bug. Mobile uses subtle approach (no special styling on main badge), but dropdown uses amber for visual distinction in list.

### 3. Secondary Sort (DRIFT IDENTIFIED)

**Desktop**: Ranks dropdowns sort by rank only (no alphabetical tiebreaker)  
**Mobile**: Ranks dropdowns sort by rank + alphabetical tiebreaker

**Decision**: ⚠️ **DRIFT** - Should unify. Recommend adding alphabetical sort to desktop (deterministic order is better UX).

---

## 🔍 Implementation Notes

### Audit Artifacts Created

1. **`docs/audits/2025-10-cross-surface-ranking/file-map.md`**
   - Complete SOT utilities inventory (6 sections)
   - Desktop component paths (5 files)
   - Mobile component paths (5 files)
   - Call graph diagrams (4 flows)
   - Summary table: SOT usage by surface

2. **`docs/audits/2025-10-cross-surface-ranking/findings.md`**
   - Conformance tables (6 stages)
   - Violation details (3 issues with file:line)
   - Redundancy detection (toFixed, Math.round, .sort searches)
   - Precision/epsilon documentation (epsilon=0.001)
   - Badge policy analysis (colors, labels, styling)
   - Behavioral parity tests (4 scenarios)
   - Root-cause hypotheses (3 confirmed)
   - Proposed minimal diffs (3 surgical changes)
   - Conformance scorecard (84% overall)
   - PASS/FAIL checklist

### Violations Found (3 Total)

#### VIOLATION 1: Rounding Before Ranking (CRITICAL) 🔴

**File**: `utils/teamDataTransform.ts:54`  
**Severity**: Critical (breaks tie detection)  
**Affects**: Both desktop AND mobile, per-game mode only

**Problem**:
```typescript
// CURRENT (WRONG):
transformedData[key] = (numericValue / games).toFixed(1);  // ← Rounds to string BEFORE ranking

// Result:
Vikings: 38.888 → "38.9" → Ranked as 38.9
Team Y:  38.777 → "38.8" → Ranked as 38.8
// Tie is broken by rounding!
```

**Fix**:
```typescript
// PROPOSED (CORRECT):
transformedData[key] = numericValue / games;  // Store full precision

// Display components already use formatMetricValue() which applies .toFixed(1) for display
```

**Impact**: Fixes Vikings "15th" vs "T-13th" discrepancy

**Effort**: 1 line change

---

#### VIOLATION 2: Mobile Secondary Sort (MINOR) ⚠️

**File**: `components/mobile/CompactRankingDropdown.tsx:165-169`  
**Severity**: Minor (cosmetic only)  
**Affects**: Mobile dropdown display order only

**Problem**:
```typescript
// MOBILE (has extra sort):
.sort((a, b) => {
  const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
  if (rankDiff !== 0) return rankDiff;
  return a.team.team.localeCompare(b.team.team);  // ← EXTRA
});

// DESKTOP (no secondary sort):
.sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999));
```

**Fix Option A** (Match desktop - remove mobile sort):
```typescript
// components/mobile/CompactRankingDropdown.tsx:165
.sort((a, b) => (a.ranking?.rank || 999) - (b.ranking?.rank || 999));
```

**Fix Option B** (Match mobile - add desktop sort) - **RECOMMENDED**:
```typescript
// components/RankingDropdown.tsx:105
.sort((a, b) => {
  const rankDiff = (a.ranking?.rank || 999) - (b.ranking?.rank || 999);
  if (rankDiff !== 0) return rankDiff;
  return a.team.team.localeCompare(b.team.team);
});
```

**Rationale**: Alphabetical tiebreaker provides deterministic order, prevents jitter, better UX

**Effort**: 4 lines added to desktop (or 3 lines removed from mobile)

---

#### VIOLATION 3: Format Rank Duplication (MINOR) ⚠️

**File**: `lib/useRanking.ts:131-138, 210-217`  
**Severity**: Minor (duplication within same file)  
**Affects**: Maintenance only

**Problem**: Same `formatRank()` function defined twice (once in `useRanking()`, once in `calculateBulkRanking()`)

**Fix** (Optional - extract to utility):
```typescript
// NEW FILE: lib/ranking/formatRank.ts
export function formatRank(rankNum: number, tied: boolean): string {
  const prefix = tied ? 'T-' : '';
  if (rankNum === 1) return `${prefix}1st`;
  if (rankNum === 2) return `${prefix}2nd`;
  if (rankNum === 3) return `${prefix}3rd`;
  return `${prefix}${rankNum}th`;
}

// THEN: lib/useRanking.ts
import { formatRank } from './ranking/formatRank';
// Remove inline definitions (lines 131-138, 210-217)
```

**Effort**: New file + 2 imports + remove 2 definitions (~20 lines)

---

### Conformance Summary

**Perfect Conformance** ✅:
- Data fetch (`useNflStats`)
- Rank computation (`useRanking`, `calculateBulkRanking`)
- Tie detection (`areValuesEqual`, epsilon=0.001)
- Label formatting ("T-{n}th")
- Special teams filtering (`teamHelpers` utilities)

**Shared Bug** ❌:
- Rounding before ranking (affects both surfaces equally in per-game mode)

**Minor Drift** ⚠️:
- Mobile has alphabetical secondary sort (desktop doesn't)
- Minor inline formatting duplication (mobile)
- Tie badge styling differs (intentional)

**Overall Score**: **84%** (Good, with 1 critical fix needed)

---

## 🧪 Testing

### Manual Parity Tests (NOT PERFORMED YET)

Per audit spec, these are documented for future verification:

1. **Desktop Per-Game vs Mobile Per-Game** (Same metric, same teams)
   - Expected: Identical ranks and tie labels
   - Currently: Affected by VIOLATION 1 (both surfaces)

2. **Desktop Total vs Mobile Total** (Same metric, same teams)
   - Expected: Identical ranks and tie labels
   - Currently: ✅ Works correctly (no rounding in total mode)

3. **Mobile Per-Game ↔ Total Toggle** (Same metric)
   - Expected: Ranks change due to value scale only
   - Currently: ⚠️ Broken by VIOLATION 1 (unexpected rank changes)

4. **Dropdown List Order** (Tied teams)
   - Expected: Consistent order across surfaces
   - Currently: ❌ Different (VIOLATION 2)

**Post-Fix Testing**:
- After fixing VIOLATION 1, verify Vikings show "T-13th" on mobile per-game
- After fixing VIOLATION 2, verify tied teams appear in alphabetical order on both surfaces
- Run full parity test matrix: 2 surfaces × 2 modes × 3 metrics = 12 test cases

---

## 🔄 Performance

**No performance implications** - This is an audit-only pass with proposed minimal diffs.

**Estimated Performance Impact of Fixes**:
- **Fix 1**: ✅ **Faster** (no string conversion/re-parsing)
- **Fix 2**: ⚠️ **Negligible** (alphabetical sort on already-sorted list)
- **Fix 3**: ⚠️ **Negligible** (utility extraction has zero runtime cost)

---

## 📝 Follow-ups

### Immediate (Required)

1. **Apply Fix 1** (VIOLATION 1 - Critical)
   - Remove `.toFixed(1)` from `teamDataTransform.ts:54`
   - Test Vikings rank on mobile per-game
   - Verify all ties work correctly in per-game mode

### Short-term (Recommended)

2. **Apply Fix 2 Option B** (VIOLATION 2 - Add desktop secondary sort)
   - Add alphabetical tiebreaker to `RankingDropdown.tsx:105`
   - Verify tied teams appear in same order on desktop/mobile
   - Document as intentional design decision

### Optional (Nice-to-have)

3. **Apply Fix 3** (Extract `formatRank` utility)
   - Create `lib/ranking/formatRank.ts`
   - Update imports in `useRanking.ts`
   - Reduces duplication, improves maintainability

4. **Comprehensive Parity Testing**
   - Run 12-test matrix (2 surfaces × 2 modes × 3 metrics)
   - Document results in `docs/audits/2025-10-cross-surface-ranking/TESTING.md`
   - Screenshot comparisons for visual verification

### Long-term (Monitoring)

5. **Add Automated Parity Tests**
   - Create `__tests__/cross-surface-parity.test.ts`
   - Test rank computation for same data on desktop/mobile paths
   - Run in CI to prevent drift

6. **Style Guide for Tie Badges**
   - Document desktop vs mobile tie styling as intentional
   - Add to `CLAUDE.md` or create `docs/STYLE_GUIDE.md`
   - Clarify when to use amber vs purple, emoji vs no emoji

---

## 🔗 Cross-Links

### Audit Documents
- **File Map**: `docs/audits/2025-10-cross-surface-ranking/file-map.md`
- **Findings**: `docs/audits/2025-10-cross-surface-ranking/findings.md`
- **This Dev Note**: `docs/devnotes/2025-10-09-cross-surface-ranking-audit.md`

### Related Dev Notes
- **Mobile UI Transformation**: `docs/devnotes/2025-10-09-session-summary.md`
- **Floating UI Migration**: `docs/devnotes/2025-10-09-floating-ui-migration.md`
- **Avg Team Support**: `docs/devnotes/2025-10-08-avg-team-support.md`

### CLAUDE.md Sections
- **Ranking System**: [CLAUDE.md:219-232](../../CLAUDE.md)
- **Data Flow**: [CLAUDE.md:211-232](../../CLAUDE.md)
- **Per-Game Transform**: [CLAUDE.md:260-267](../../CLAUDE.md)

### Previous Audits
- **Vikings Rank Audit**: `C:/tmp/mobile-pergame-vs-total-rank-audit.md` (focused audit)
- **Mobile Ties Audit**: `docs/audits/2025-10-mobile-ties/findings.md` (tie styling)
- **Avg Team Audit**: `docs/audits/2025-10-avg-team-and-ties/findings.md` (filtering)

---

## 🎓 Lessons Learned

### What Worked Well

1. **Comprehensive File Mapping**
   - Complete inventory of SOT utilities made analysis straightforward
   - Call graph diagrams revealed data flow clearly
   - Line number precision enabled quick verification

2. **Systematic Conformance Tables**
   - Stage-by-stage analysis caught all drift
   - Percentages made severity obvious
   - Desktop vs Mobile columns showed differences at a glance

3. **Automated Searches**
   - `grep` for `.toFixed(`, `Math.round(`, `.sort(` found all potential violations
   - Quick filtering of false positives (debug logs, display formatting)
   - High confidence in completeness

4. **No-Code Audit Approach**
   - Separating analysis from implementation kept audit objective
   - Proposed diffs are minimal and surgical
   - Ready for quick implementation with clear acceptance criteria

### Challenges

1. **Rounding Before Ranking**
   - Subtle bug that only manifests in per-game mode
   - Affects both surfaces identically (not a desktop/mobile difference)
   - Required cross-referencing Vikings audit to confirm root cause

2. **Tie Styling Intentionality**
   - Initially unclear if desktop/mobile differences were bugs or intentional
   - Required user confirmation ("keep mobile dropdown amber")
   - Documented as intentional design decision

3. **Secondary Sort Ambiguity**
   - Mobile has alphabetical sort, desktop doesn't
   - Not a bug (doesn't affect ranking), just cosmetic drift
   - Decision needed: which surface is "correct"?

### Design Decisions

1. **Rounding Location**
   - **Decision**: Rounding should happen in display layer, not data transform
   - **Rationale**: Preserves precision for ranking, formats only for display
   - **Precedent**: `formatMetricValue()` already exists for this purpose

2. **Secondary Sort**
   - **Decision**: Add alphabetical tiebreaker to desktop (Option B)
   - **Rationale**: Deterministic order is better UX, prevents jitter
   - **Alternative**: Could remove from mobile (Option A), but worse UX

3. **Tie Badge Styling**
   - **Decision**: Keep current state (intentional difference)
   - **Rationale**: User confirmed, mobile uses subtle approach
   - **Documentation**: Note in CLAUDE.md or style guide

---

## 📊 Audit Completeness Checklist

### Deliverables
- [x] File map with paths + line ranges
- [x] Call graph diagrams (4 flows)
- [x] Conformance tables (6 stages)
- [x] Violations list with file:line pointers
- [x] Redundancy detection (toFixed, Math.round, .sort)
- [x] Precision/epsilon documentation
- [x] Badge policy analysis
- [x] Root-cause hypotheses
- [x] Behavioral parity test plan
- [x] Proposed minimal diffs (3 fixes)
- [x] Conformance scorecard
- [x] This dev note

### Audit Quality
- [x] No code changes made (audit-only)
- [x] All recommendations route to SOT
- [x] Diffs are minimal and surgical
- [x] Evidence provided for all violations (file:line)
- [x] No speculation - only documented facts
- [x] Cross-links to CLAUDE.md and related docs

### Ready for Implementation
- [x] Critical fix identified (VIOLATION 1)
- [x] Clear acceptance criteria (Vikings "T-13th")
- [x] Minimal code changes (1 line for Fix 1)
- [x] Testing plan documented

---

## ✅ Acceptance Criteria (Audit Pass)

Per `parescript.txt`:

- [x] **File map created** with accurate paths + line ranges
- [x] **Findings include conformance table** + violations list
- [x] **Dev note created** under `docs/devnotes/YYYY-MM-DD-cross-surface-ranking-audit.md`
- [x] **All recommendations route to SOT** (no mobile-only ranking logic)
- [x] **Output PASS/FAIL checklist** (in findings.md)

**Status**: ✅ **AUDIT COMPLETE** - Ready for implementation

---

## 🚀 Next Steps

1. **Review with user** - Confirm Fix 1 is critical, Fixes 2-3 are optional
2. **Implement Fix 1** - Remove `.toFixed(1)` from teamDataTransform.ts:54
3. **Test Vikings rank** - Verify "T-13th" on mobile per-game after fix
4. **Update CHANGELOG** - Document fix under `[Unreleased]`
5. **Optional**: Implement Fixes 2-3 if approved
6. **Optional**: Run comprehensive parity test matrix

---

**Last Updated**: 2025-10-09  
**Graduated to CLAUDE**: Not yet (implementation pending)  
**Status**: ✅ Audit complete, awaiting user approval for implementation

