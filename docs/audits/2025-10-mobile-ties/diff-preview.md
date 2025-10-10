# Mobile Tie Badge - UI-Only Changes Preview

**Date**: 2025-10-09  
**Spec**: results.txt - minimal UI change, no math changes  
**Status**: Documenting current state vs required state

---

## 🎯 **Required Changes (Per results.txt)**

Remove special styling for ties. Use **same** badge colors as non-tied ranks.

---

## 📝 **File 1: `components/mobile/CompactRankingDropdown.tsx`**

### Change 1: Rank Badge (Lines 214-220)

**Current** (WRONG per results.txt):
```typescript
// Desktop pattern: Show amber color for ties
const textColor = ranking.isTied ? 'rgb(251, 191, 36)' : 'rgb(196, 181, 253)';

return (
  <span className="text-[11px] font-medium" style={{ color: textColor }}>
    {ranking.isTied && '🔸 '}({ranking.formattedRank})
  </span>
);
```

**Required** (results.txt spec):
```typescript
// Same color for all ranks - no special styling
return (
  <span className="text-[11px] font-medium" style={{ color: 'rgb(196, 181, 253)' }}>
    ({ranking.formattedRank})  // "T-5th" or "5th" - text only
  </span>
);
```

**What Changed**:
- ❌ Remove amber color (`rgb(251, 191, 36)`)
- ❌ Remove diamond emoji (`🔸`)
- ✅ Keep purple color for all badges
- ✅ Keep text format ("T-5th")

---

### Change 2: Dropdown List Badge (Lines 295-311)

**Current** (WRONG per results.txt):
```typescript
<div 
  className="w-8 h-8 rounded flex items-center justify-center font-bold text-[11px] flex-shrink-0"
  style={{
    background: isAverage 
      ? 'rgba(139, 92, 246, 0.3)' 
      : isTied 
        ? 'rgba(251, 191, 36, 0.2)'  // ← AMBER background
        : 'rgba(100, 116, 139, 0.3)',
    color: isAverage 
      ? 'rgb(196, 181, 253)' 
      : isTied 
        ? 'rgb(251, 191, 36)'  // ← AMBER text
        : 'rgb(148, 163, 184)'
  }}
>
  {isAverage ? emoji : (isTied ? '🔸' : item.ranking?.rank)}  // ← EMOJI
</div>
```

**Required** (results.txt spec):
```typescript
<div 
  className="w-8 h-8 rounded flex items-center justify-center font-bold text-[11px] flex-shrink-0"
  style={{
    background: isAverage 
      ? 'rgba(139, 92, 246, 0.3)' 
      : 'rgba(100, 116, 139, 0.3)',  // ← Same for all
    color: isAverage 
      ? 'rgb(196, 181, 253)' 
      : 'rgb(148, 163, 184)'  // ← Same for all
  }}
>
  {isAverage ? emoji : item.ranking?.rank}  // ← Always show number
</div>
```

**What Changed**:
- ❌ Remove `isTied` conditional for background
- ❌ Remove `isTied` conditional for text color
- ❌ Remove diamond emoji (`🔸`) - show rank number instead
- ✅ Same styling for all non-average teams

---

## 📊 **Visual Comparison**

### Main Screen Badge

**Before** (current):
```
(5th)          ← Purple, regular
🔸 (T-5th)     ← Amber, with emoji ❌
(8th)          ← Purple, regular
```

**After** (results.txt spec):
```
(5th)          ← Purple, regular
(T-5th)        ← Purple, no emoji ✅
(8th)          ← Purple, regular
```

---

### Dropdown List

**Before** (current):
```
┌─────┬────────────────────┐
│  5  │ Buffalo Bills      │ ← Gray background
│ 🔸  │ Dallas Cowboys     │ ← Amber background, emoji ❌
│ 🔸  │ Miami Dolphins     │ ← Amber background, emoji ❌
│  8  │ Seattle Seahawks   │ ← Gray background
└─────┴────────────────────┘
```

**After** (results.txt spec):
```
┌─────┬────────────────────┐
│  5  │ Buffalo Bills      │ ← Gray background
│  5  │ Dallas Cowboys     │ ← Gray background, no emoji ✅
│  5  │ Miami Dolphins     │ ← Gray background, no emoji ✅
│  8  │ Seattle Seahawks   │ ← Gray background
└─────┴────────────────────┘
```

---

## 🎨 **Typography**

**No changes** - same font, size, weight as before:
- Font size: `text-[11px]` (badge), `text-[11px]` (dropdown)
- Font weight: `font-medium` (badge), `font-bold` (dropdown)
- Text format: "T-5th" (with tie), "5th" (without tie)

---

## 🔧 **Implementation Summary**

### Files Modified: 1
- `components/mobile/CompactRankingDropdown.tsx`

### Lines Changed: ~20
- Lines 214-220 (badge rendering)
- Lines 295-311 (dropdown list item)

### Changes:
- ❌ Remove amber color conditionals
- ❌ Remove emoji rendering
- ✅ Use standard badge colors for all ranks
- ✅ Keep text format ("T-5th")

### Not Changed:
- ✅ Rank computation (lib/useRanking.ts)
- ✅ Tie detection logic
- ✅ Desktop components
- ✅ Precision/epsilon
- ✅ Secondary sort (will review separately)

---

## ✅ **Compliance with results.txt**

| Requirement | Status |
|-------------|--------|
| Same background color as regular badges | ✅ Will fix |
| No special gold/amber color | ✅ Will remove |
| No tie emoji/symbol | ✅ Will remove |
| Text format "T{rank}th" or "T{rank}" | ✅ Already correct |
| Same typography | ✅ Already correct |
| Don't change rank math | ⚠️ Already changed (needs review) |
| Desktop visuals unchanged | ✅ Not touched |

---

## 📋 **Testing Checklist**

After applying changes:
- [ ] Main screen badge shows `(T-13th)` in **purple**
- [ ] Main screen badge has **same** background as non-tied badges
- [ ] Dropdown list shows **rank number** (not emoji)
- [ ] Dropdown items have **gray** background (not amber)
- [ ] Text still shows "T-" prefix for ties
- [ ] Desktop looks unchanged

---

**Last Updated**: 2025-10-09  
**Status**: Documentation complete, changes not yet applied  
**Next**: Apply minimal UI changes (remove amber + emoji)

