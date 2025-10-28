# Clear Cache Instructions

**Issue**: Desktop shows T-13th but mobile shows 15th (stale cache)

---

## 🔧 **Quick Fix (Do All 3)**

### 1. **Stop Dev Server** (if running)
```bash
# Press Ctrl+C in terminal
# Or close the terminal window
```

### 2. **Clear Browser Cache**

**Option A: Hard Refresh (Quick)**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**Option B: Full Clear (Thorough)**
- Open DevTools (F12)
- Right-click refresh button → "Empty Cache and Hard Reload"

**Option C: Service Worker Clear**
```
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Service Workers" (left sidebar)
4. Click "Unregister" for localhost
5. Click "Clear storage" → "Clear site data"
```

### 3. **Restart Dev Server**
```bash
npm run dev
```

---

## 🧪 **Test After Cache Clear**

1. Open in **mobile viewport** (DevTools)
2. Select **Vikings** team
3. Toggle **Per Game** mode
4. Check rank badge

**Expected**: `(T-13th)` ✅  
**If still broken**: `(15th)` ❌ → Next steps below

---

## 🔍 **If Still Broken After Cache Clear**

### Check 1: Verify Transform is Applied

Open DevTools Console and run:
```javascript
// Check transformed values
const data = document.querySelector('[data-team="Minnesota Vikings"]');
console.log('Vikings data:', data);
```

### Check 2: Check API Response

1. Open DevTools → Network tab
2. Filter: `nfl-2025`
3. Refresh page
4. Click on offense/defense request
5. Check "Response" tab
6. Find Vikings row - verify raw values

### Check 3: Force Clear Service Worker Cache

In DevTools Console:
```javascript
// Force clear all caches
caches.keys().then(names => names.forEach(name => caches.delete(name)));
location.reload();
```

---

## 📝 **Technical Details**

**What Changed**:
```typescript
// utils/teamDataTransform.ts:54
// BEFORE:
transformedData[key] = (numericValue / games).toFixed(1);  // ← String "24.6"

// AFTER:
transformedData[key] = numericValue / games;  // ← Number 24.6
```

**Why Cache Matters**:
- Service Worker (`public/sw.js`) caches API responses
- Browser caches transformed data
- Hot Module Reload might not clear old values
- Mobile viewport might have separate cache

---

## ✅ **After Fix Works**

Both should show:
- Desktop: `(T-13th)` ✅
- Mobile: `(T-13th)` ✅

Display values still formatted:
- Points: `24.6` (not `24.643...`) ✅

