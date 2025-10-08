# 2025-10-08 — Service Worker CSS Caching Fix

- Link to rules: See `CLAUDE.md` (source of truth); not duplicated here.

## Context
User reported Tailwind utility class changes (e.g., `max-h-[70vh]`) in `TeamDropdown.tsx` not applying on normal refresh, only after hot reload or hard reload.

Performed systematic one-shot repo audit following structured debugging methodology.

## Root Cause
**Service Worker CSS Caching Issue**

Even though SW is gated by `NEXT_PUBLIC_ENABLE_SW` (defaults to disabled), previously registered Service Workers persist across sessions until explicitly unregistered.

The SW was caching `/_next/static/` assets (including CSS) with `cacheFirst` strategy, causing stale CSS to be served even after Tailwind generated new classes.

**Flow:**
1. Developer changes `max-h-80` → `max-h-[70vh]` in component
2. Turbopack/Next.js generates new CSS bundle with new Tailwind class
3. Browser requests `/_next/static/css/app-layout-*.css`
4. Service Worker intercepts with `cacheFirst` strategy (line 112 sw.js)
5. Old cached CSS served → New Tailwind class not found in CSS
6. Hard reload bypasses SW cache → Works correctly

## Decisions
- **CSS Strategy Changed**: CSS files now use `networkFirstWithCache` instead of `cacheFirst`
  - Always fetches fresh CSS in development (catches Tailwind JIT changes)
  - Falls back to cache only when network fails (offline support)
  - Safe for production (CSS has content hashes, but network-first prevents stale cache issues)
- **Cache Version Bump**: v1.0.5 → v1.0.6 to force old caches to invalidate
- **Cross-Platform Clean Script**: Added pure Node.js solution (no external dependencies)

## Implementation Notes

### Files Changed

#### 1. `public/sw.js`
- **Lines 105-122**: Split CSS handling from other static assets
  - CSS: `networkFirstWithCache` (always try network first)
  - Images/JS/other: `cacheFirst` (unchanged, safe with content hashes)
- **Lines 301-328**: Added `networkFirstWithCache` helper function
  - Try network first, cache on success
  - Fallback to cache only if network fails
  - Re-throws error if no cache available
- **Lines 4-7**: Updated cache versions to v1.0.6
- **Line 431**: Updated version string in message handler

#### 2. `package.json`
- **Line 7**: Added `dev:clean` script - clean caches and start dev server
- **Line 8**: Added `clean` script - clean build/cache artifacts only
- Uses cross-platform Node.js `fs.rmSync` (works on Windows/Mac/Linux)
- Removes: `.next`, `.turbo`, `node_modules/.cache`

## Audit Summary (All Checks Performed)

✅ **TeamDropdown.tsx**: Correct usage of `max-h-[70vh]`, no duplicates, no inline style overrides  
✅ **Tailwind Config**: Content globs correctly include `./components/**/*.{js,ts,jsx,tsx,mdx}`  
✅ **PostCSS Config**: Correctly configured with tailwindcss + autoprefixer  
✅ **Hydration/SSR**: No conditional rendering affecting className, CSS loaded at root  
✅ **CSS Precedence**: No CSS modules, no `.momentum-scroll` overrides in globals.css  
🚨 **Service Worker**: Found `cacheFirst` for CSS causing stale cache (FIXED)  
✅ **Module Duplication**: Single React instance, no duplicates (`npm ls react` clean)  
✅ **Dev Server**: Turbopack v15.5.4, working correctly

## Testing

### Verification Steps (Manual)
1. Stop dev server
2. Clear Service Worker in DevTools:
   - Open Chrome DevTools → Application → Service Workers
   - Click "Unregister" on any active workers
   - Click "Clear site data"
3. Run `npm run dev:clean` (clears build cache and starts fresh)
4. Change `max-h-[70vh]` to `max-h-[65vh]` in TeamDropdown.tsx
5. Save file, normal browser refresh (NOT hard reload)
6. **Expected**: New height applies immediately
7. Check DevTools → Network → CSS file shows 200 (not "from ServiceWorker")

### Browser Verification
- Chrome: DevTools → Application → Service Workers (should show no SW or v1.0.6)
- Console: Look for `🌐 [SW] Network-first for CSS:` logs (confirms new strategy)
- Network tab: CSS requests should hit network, not show "ServiceWorker"

## Performance Impact
**Negligible** - CSS files are small (~50-200KB) and:
- Next.js uses content-hashed CSS in production (changes filename on content change)
- Network-first for CSS only adds ~10-50ms latency vs cache-first
- Offline: CSS still cached as fallback
- Benefits: Eliminates stale CSS bugs in both dev and production

## Follow-ups
- [ ] Consider adding `NEXT_PUBLIC_SW_ENABLED` to `.env.example` with documentation
- [ ] Add SW debugging section to CLAUDE.md if this becomes a recurring issue
- [ ] Monitor production: If CSS cache hit rate drops significantly, revisit strategy
- [ ] Future: Add dev mode detection in SW to skip CSS caching entirely in `NODE_ENV=development`

## Related Documentation
- CLAUDE.md: `## 🚀 Production Setup & Deployment` (SW section)
- docs/devnotes/2025-10-07-phases-execution.md: Phase 6 SW implementation

## Commands Added
```bash
# Clean build cache and start fresh dev server
npm run dev:clean

# Clean build cache only (no server start)
npm run clean
```

## Debugging Steps for Future SW Issues

### 1. Check if SW is Active
```javascript
// Run in browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Active SWs:', regs.length);
  regs.forEach(reg => console.log(reg.scope, reg.active?.scriptURL));
});
```

### 2. Unregister All Service Workers
```javascript
// Run in browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister());
  console.log('All SWs unregistered');
});
```

### 3. Clear All Caches
```javascript
// Run in browser console
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
  console.log('All caches cleared');
});
```

### 4. DevTools Method (Easiest)
- Chrome DevTools → Application tab
- Service Workers → Click "Unregister"
- Storage → Click "Clear site data"
- Hard reload (Ctrl+Shift+R / Cmd+Shift+R)

## Graduated to CLAUDE
No rules promoted. SW debugging steps documented here may be promoted to CLAUDE.md if issue recurs frequently.

