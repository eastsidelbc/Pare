# Plan: Faster live scores (server 10s, phone 5s, gzip)

Branch `feat/live-freshness` · plan date 2026-10-12 · status: proposed · follow-up to `docs/plans/2026-10-12-live-scores-proxy.md` (ADR `docs/adr/2026-10-12-live-scores-proxy.md`)

## Context

During a live game, two things set how far Pare trails ESPN. The phone polls `/api/live/scoreboard` every 15s (`POLL_MS`, `lib/hooks/useLiveScores.ts`). The server keeps its copy for 15s (`LIVE_TTL_MS`, `lib/liveWindow.ts`). Those two waits add up, so a score shown on the phone is on average ~15s old and at worst ~30s old. Kobe watched MNF and saw 1:11 on Pare while the real clock read 0:37.

**Target:** at most ~15s behind ESPN, ~7.5s on average, with ESPN calls still low. ESPN itself is not the bottleneck: the P0 capture of the proxy plan measured ESPN's scoreboard at `Cache-Control: max-age=1`. That also means the old hook comment ("ESPN refreshes ~every 15–20s; faster is wasted") is wrong.

**Kobe's decisions (fixed, do not re-ask):**
1. Server live TTL goes from 15s to 10s (`LIVE_TTL_MS`). That's about 6 ESPN calls/min per live week. Budgets stay the same (120/min overall, 60/min for summaries).
2. Phone live poll goes from 15s to 5s, **only** inside the existing live window (`shouldPollLive`). Idle behavior is unchanged: no polling outside the window, the 60s window re-check stays, polling pauses when the tab is hidden, and refocus fires one tick.
3. Product rule, enforced by a test: `LIVE_POLL_MS + LIVE_TTL_MS ≤ 15_000`.
4. We gzip `/api/live/*` responses ourselves, because `next start` sends them uncompressed (proxy P4: 8,280 B per poll even though `next.config.ts` has `compress: true`). The scoreboard is compressed at most once per upstream fetch for each variant (fresh or stale), never per request.
5. Everything else stays as it is:
   - the kickoff-safe idle TTL (`scoreboardTtlMs` cap)
   - the 6s upstream timeout, single-flight, and last-good STALE with backoff
   - no timers, no UI changes, unchanged hook signatures
   - Sleeper PPR on summaries
   - no browser fallback to ESPN
6. (Asked during planning) **The summary is gzipped only when its body is ≥ 1 KB.** Real summary bodies today are 849–896 B (`docs/plans/2026-10-12-home-sleeper-ppr/p3-smoke.json`), so today they go out plain. The smoke test expects summary gzip *if and only if* the raw size is ≥ 1,024 B. Unit tests force a body over 1 KB to prove the gzip path works.

## Before / after

**Lag behind ESPN.** A displayed score is "server copy age + time since the last phone poll". With continuous viewers, each part is spread evenly between 0 and its interval.

| | Server TTL | Phone poll | Average behind ESPN | Worst case |
|---|---|---|---|---|
| Before | 15s | 15s | ~15s | ~30s |
| After | 10s | 5s | **~7.5s** | **~15s** |

On top of that: one ESPN round-trip (~0.2–0.5s) and the time ESPN's own feed trails the broadcast, which we can't control.

**ESPN calls/min** (single-flight, so they don't depend on viewer count): ~4/min per live week before → **~6/min** after. Idle stays at ≤1 per 5 min, capped at the next kickoff window. No viewers or no games → 0. Summaries: ~1 call per final game per 6h, unchanged.

**Load on the Mac.** One request per viewer per poll while live. Cloudflare does not cache `/api/*`.

| Viewers | Before: req/s | Before: Mbps (plain 8,280 B) | After: req/s | After: Mbps (gzip ≈1,657 B, estimated from the fixture) |
|---|---|---|---|---|
| 100 | 6.7 | 0.44 | 20 | 0.27 |
| 1,000 | 66.7 | 4.42 | 200 | 2.65 |
| 10,000 | 666.7 | 44.16 | 2,000 | 26.5 |

Mbps = viewers / poll s × wire bytes × 8 / 1e6. The F3 smoke replaces the estimate with measured wire bytes (table in F3).

## What exists (reuse, don't rebuild)

| Piece | Where | Use |
|---|---|---|
| `LIVE_TTL_MS`, `scoreboardTtlMs`, `shouldPollLive` | `lib/liveWindow.ts` | Change the TTL value and add `LIVE_POLL_MS`. The logic stays the same. |
| `createLiveCache` | `lib/apiCache.ts` | Unchanged. `value` is the same object for every HIT and STALE result of one upstream fetch, and `updatedAt` is that fetch's time. So per-variant bytes can be memoized on the entry. |
| `ScoreboardEntry.matchupsJson`, `scoreboardBody` | `lib/espnLive.ts` | Same "once per fetch" idea; gzip is added next to it. |
| `liveOk` / `liveFail` | `lib/espnLive.ts` | `liveOk` gains a `req` parameter. `liveFail` is unchanged. |
| Gate helpers (`portFree`, `build` = port check → clean → build, `sh`, `vitestJson`, `check`, `has`, `lacks`, `signature`, `changedVsMain`) | `scripts/live-proxy-gates.mjs` | Copied into the new gate script, which is the existing practice (`home-ppr-gates.mjs` does the same). The old gate scripts aren't touched. |
| `diffRouteTables` | `scripts/route-table-diff.mjs` | Imported as-is. |
| Smoke harness (`startServer`, `waitHealthy`, `measure`, `fillPlan`) | `scripts/live-proxy-smoke.mjs` | Extended in F3. |

## Design

**F1, timing (`lib/liveWindow.ts`, `lib/hooks/useLiveScores.ts`)**
```ts
/** Server cache TTL for a scoreboard while any game is watch-worthy. */
export const LIVE_TTL_MS = 10_000;
/** Phone poll interval inside the live window (the one source for useLiveScores). LIVE_POLL_MS + LIVE_TTL_MS ≤ 15s = worst case behind ESPN. */
export const LIVE_POLL_MS = 5_000;
```
Hook: `POLL_MS` is deleted, and `setInterval(tick, LIVE_POLL_MS)` is used instead. Add an in-flight guard inside the effect closure:
```ts
let inFlight = false;
const tick = async () => {
  if (inFlight) return;                       // 5s poll vs 8s timeout: never stack requests
  if (typeof document !== 'undefined' && document.hidden) return;
  inFlight = true;
  … (unchanged fetch / revive / patch) …
  } finally { clearTimeout(timer); inFlight = false; }
};
```
- **One request at a time.** There is at most one request per effect, so a newer response can never be overwritten by an older one.
- **Old effects can't patch.** A previous effect (week change, or polling turned off) is still blocked by the existing `cancelled` flag.
- **Refocus.** A refocus tick during a request is skipped; the next interval tick picks it up.
- **Header comment.** Rewritten: 5s poll; server shares one copy per 10s; ≤15s behind ESPN worst case; requests never overlap. The "faster is wasted" line goes.
- **Unchanged:** the signature, `WINDOW_CHECK_MS`, `FETCH_TIMEOUT_MS`, and the visibility logic.

**F2, gzip (`lib/espnLive.ts`, both routes)**
- `acceptsGzip(header: string | null): boolean` is exported and pure. It is true only when a `gzip` token exists with q > 0. These are false: `null`/`''`, `br`, `identity`, `gzip;q=0`.
- `interface WireBody { text: string; gz: Uint8Array | null }`: the plain text, plus its gzip filled in lazily.
- `ScoreboardEntry` gains `wire: { fresh?: WireBody; stale?: WireBody }`. It is created empty in `fetchScoreboard`.
- `scoreboardWire(result)` returns `result.value.wire[variant] ??= { text: scoreboardBody(result), gz: null }`, where variant = `STALE ? 'stale' : 'fresh'`. A bonus: hot HITs no longer even concatenate strings. This is correct because HIT and MISS give the same text for one entry (same `updatedAt`, `stale:false`).
- `liveOk(req, body: string | WireBody, result)`:
  - **No gzip:** if `acceptsGzip(req.headers.get('accept-encoding'))` is false, or the body is a plain string under `GZIP_MIN_BYTES = 1024`, the body goes out exactly as today.
  - **WireBody:** `body.gz ??= gzipSync(body.text)`. The gzip runs once per variant per fetch.
  - **String ≥ 1 KB** (summary): `gzipSync` runs per response, because Sleeper points are attached per response.
  - **Gzipped headers:** `Content-Encoding: gzip` plus `Content-Length: <gz.byteLength>`.
  - **All 200s:** `Vary: Accept-Encoding`, so a shared cache can never hand gzip to a client that didn't ask for it.
  - **Unchanged:** `Content-Type`, `Cache-Control` and `X-Pare-Cache` stay exactly as they are now.
- `import { gzipSync } from 'node:zlib'`. There are no new dependencies. Measured on the fixture body: 8,279 → 1,657 B in ~39 µs, so sync is fine.
  - *Type note:* if `tsc` rejects a `Buffer` as the response body, store `new Uint8Array(gz)` once at compress time, never per request.
- Routes: `liveOk(req, scoreboardWire(result), result)` and `liveOk(req, JSON.stringify(…), result)`. `liveFail` and the error paths are unchanged.
- `next.config.ts` is not touched. If a future Next release starts compressing these routes, the `compression` middleware skips responses that already carry `Content-Encoding`. The F3 smoke's "decoded JSON = plain JSON" check would also catch double encoding.

## Gate tooling (written in F0, so the goalposts are fixed before any app code changes)

- **`scripts/live-fresh-gates.mjs <f0|f1|f2|f3|all>`, plus `build <name>`.**
  - Prints a PASS/FAIL table and exits 1 on any failure.
  - It uses the helpers copied from `live-proxy-gates.mjs`, so every build is port 4000 free check → `npm run clean` → `npm run build`. A busy port fails with "stop npm run dev first".
  - It imports `diffRouteTables`.
- **Artifacts** go in `docs/plans/2026-10-12-live-freshness/`: `build-f0.txt` and `f3-smoke.json`.
- **Placeholder.** `TBD-F3` must be gone for F3 to pass. Mentions of it inside backticks are ignored.
- **Every phase ends the same way:** the gate exits 0, then a commit with the listed message, then `git status --porcelain -uno` is empty.

---

## F0: Gate tooling + baseline (no app code changes)

**Files**
- `scripts/live-fresh-gates.mjs` (new).
- `docs/plans/2026-10-12-live-freshness/build-f0.txt` (via `node scripts/live-fresh-gates.mjs build f0`).

**Why:** this pins the route table and proves the existing live tests are green on main before anything moves.

**Gate `f0`:**
- `build-f0.txt` exists and contains `/standings`, `/leaderboards`, `/`.
- `diffRouteTables(build-f0, build-f0)` has 0 failures, which proves `/api/live/scoreboard` and `/api/live/summary` are present as `ƒ`.
- `vitestJson` on `liveWindow`, `liveCache`, `liveRoutes`, `liveParity`, `liveClient` reports 0 failed and ≥ 30 passed.
- `git diff --name-only main -- app components lib next.config.ts package.json package-lock.json` is empty.
- `npm run check` and `npm run test:run` pass.

```
/goal F0 of docs/plans/2026-10-12-live-freshness.md — write scripts/live-fresh-gates.mjs (f0|f1|f2|f3|all + build <name>, helpers copied from live-proxy-gates.mjs, diffRouteTables imported), save the baseline with `node scripts/live-fresh-gates.mjs build f0`. Done when `node scripts/live-fresh-gates.mjs f0` exits 0, then commit "test(live): freshness gate script + baseline build" and `git status --porcelain -uno` prints nothing.
```

## F1: Timing (server 10s, phone 5s, in-flight guard)

**Files**
- `lib/liveWindow.ts`: `LIVE_TTL_MS = 10_000`, new `LIVE_POLL_MS = 5_000`, and comments. `shouldPollLive` and `scoreboardTtlMs` keep their logic.
- `lib/hooks/useLiveScores.ts`: uses `LIVE_POLL_MS`, adds the in-flight guard, and gets a new header comment.
- Stale "15s" comments only: `lib/espnLive.ts` header + the `liveOk` doc ("a HIT at 9s of 10s"), `lib/apiCache.ts:266`, `lib/espnScoreboard.ts:7`, `lib/scheduleRefresh.ts:15`, `app/api/live/scoreboard/route.ts` header.

**Tests**
- `lib/__tests__/liveWindow.test.ts`:
  - `live ttl` now expects `10_000`.
  - New `freshness budget: LIVE_POLL_MS + LIVE_TTL_MS ≤ 15s` (`expect(LIVE_POLL_MS + LIVE_TTL_MS).toBeLessThanOrEqual(15_000)`, and `LIVE_POLL_MS === 5_000`).
- `lib/__tests__/liveRoutes.test.ts`: the live clock now gives `s-maxage ≤ 10`, and idle gives `> 10` and `≤ 300`; the test is renamed to match. The `+16_000` STALE tests stay valid because they're past a 10s TTL.
- The kickoff-cap tests are **not edited**.

**Why:** decisions 1–3. The guard is required because the 5s poll is now shorter than the 8s client timeout.

**Gate `f1`:**
- `vitestJson` on `liveWindow` + `liveRoutes`: 0 failed, and a test name contains `freshness budget`.
- `lib/liveWindow.ts` contains `LIVE_TTL_MS = 10_000` and `export const LIVE_POLL_MS = 5_000`.
- `lib/hooks/useLiveScores.ts`:
  - imports `LIVE_POLL_MS` from `@/lib/liveWindow`
  - contains `setInterval(tick, LIVE_POLL_MS)`
  - has no `POLL_MS =` declaration and no `\b(15_?000|5_?000)\b`
  - contains `inFlight` ≥ 3 times (check, set, reset)
- `useLiveScores` signature text equals `git show main:lib/hooks/useLiveScores.ts` (`signature()` helper).
- The `it(…)` blocks named `kickoff cap`, `kickoff cap never goes below 1s`, `stale when window opens` and `kickoff not delayed` are byte-identical to main.
- `shouldPollLive` and `scoreboardTtlMs` function bodies, with the `LIVE_TTL_MS` constant line excluded, are identical to main.
- No `15s` and no `15_000` in `lib/hooks/useLiveScores.ts`, `lib/espnLive.ts`, `lib/liveWindow.ts`, `lib/apiCache.ts`, `lib/espnScoreboard.ts`, `lib/scheduleRefresh.ts`, `app/api/live/scoreboard/route.ts`.
- `git diff --exit-code main -- components` passes.
- Changed files ⊆ the F1 file list + F0 files + this plan.
- `npm run check` and `npm run test:run` pass.

```
/goal F1 of docs/plans/2026-10-12-live-freshness.md — LIVE_TTL_MS 10s + exported LIVE_POLL_MS 5s in lib/liveWindow.ts; useLiveScores uses LIVE_POLL_MS with an in-flight guard (no stacked requests, no older-after-newer), new header comment; fix stale 15s comments; tests: live ttl 10s, s-maxage ≤10 live, new "freshness budget" test; kickoff-cap tests untouched. Done when `node scripts/live-fresh-gates.mjs f1` exits 0, then commit "perf(live): server TTL 10s, phone poll 5s, in-flight guard" and `git status --porcelain -uno` prints nothing.
```

## F2: gzip `/api/live/*`

**Files**
- `lib/espnLive.ts`: `acceptsGzip`, `WireBody`, `ScoreboardEntry.wire`, `scoreboardWire`, `GZIP_MIN_BYTES = 1024`, and `liveOk(req, body, result)` (design above).
- `app/api/live/scoreboard/route.ts` and `app/api/live/summary/route.ts`: pass `req` (and `scoreboardWire`).
- `lib/__tests__/liveRoutes.test.ts`, new cases:
  - **Spy setup.** Add `vi.mock('node:zlib', async (orig) => ({ ...real, gzipSync: counted wrapper }))`, with the counter in `vi.hoisted`.
  - **Gzip request helper.** `new Request(url, { headers: { 'accept-encoding': 'gzip, deflate, br' } })`.
  1. `gzip scoreboard`: the gzipped response has `content-encoding: gzip`, `vary` contains `Accept-Encoding`, `content-length` equals the body byteLength, and `gunzipSync(body).toString()` equals the plain response text, byte for byte. `X-Pare-Cache` and `Cache-Control` match the existing regex.
  2. `no accept-encoding → plain`: no `content-encoding`, the body is the same text as today, `vary` is present. Also `gzip;q=0` → plain.
  3. `gzip once per fetch`: 1 MISS + 100 HITs with gzip → `gzipSync` called exactly 1 time.
  4. `stale variant gzipped separately`:
     - MISS with gzip (1 call).
     - Then the clock goes past the TTL and upstream returns 500 → a STALE gzip whose decoded JSON has `stale:true` and equals the plain STALE body (2 calls).
     - A second STALE gzip still makes 2 calls.
  5. `summary under 1 KB stays plain` (the real fixture, ~0.9 KB): no `content-encoding`, `vary` present.
  6. `summary ≥ 1 KB gzipped per response`: a summary fixture copy with a 2,000-char headline gives a gzip whose decoded body equals the plain one. Two requests → 2 `gzipSync` calls (by design: per response).
  7. `acceptsGzip` unit cases (above).
  8. Errors unchanged: 400 and 502 have no `content-encoding` and no `vary`, and `cache-control: no-store`.
- Existing tests (parity, Cache-Control, X-Pare-Cache, budgets) pass unchanged.

**Why:** decision 4, and decision 6 for the summary threshold.

**Gate `f2`:**
- `vitestJson` on `liveRoutes` + `liveParity`: 0 failed, with test names containing `gzip once per fetch`, `stale variant gzipped separately`, `summary under 1 KB stays plain`, `summary ≥ 1 KB gzipped per response`.
- `lib/espnLive.ts`:
  - matches `/import \{[^}]*gzipSync[^}]*\} from 'node:zlib'/`
  - contains `Vary`, `Content-Encoding`, `Content-Length`
  - still contains `'X-Pare-Cache': result.status` and the `public, s-maxage=` template
- Both routes contain `liveOk(req,`.
- `git diff --exit-code main -- package.json package-lock.json next.config.ts components` passes.
- The ESPN fixtures and parity snapshots are not rewritten: `git status --porcelain -- lib/__fixtures__/espn` is empty.
- `npm run check` and `npm run test:run` pass.

```
/goal F2 of docs/plans/2026-10-12-live-freshness.md — gzip /api/live/* in lib/espnLive.ts via node:zlib gzipSync: honor Accept-Encoding (q>0), Content-Encoding + Content-Length + Vary: Accept-Encoding on 200s, scoreboard compressed lazily once per upstream fetch per fresh/stale variant (stored on the entry), summary per response only when ≥1 KB, X-Pare-Cache/Cache-Control/errors unchanged; routes pass req; liveRoutes gzip tests with a gzipSync call counter. Done when `node scripts/live-fresh-gates.mjs f2` exits 0, then commit "perf(api): gzip /api/live/* responses (scoreboard once per fetch)" and `git status --porcelain -uno` prints nothing.
```

## F3: Smoke + docs

**Files**
- `scripts/live-proxy-smoke.mjs`. All existing checks are kept. Changes:
  - `OUT` → `docs/plans/2026-10-12-live-freshness/f3-smoke.json`, and `fillPlan` → this plan (the `**F3 results — our responses**` line plus the rows below).
  - The proxy plan's P4 table and `p4-smoke.json` stay as the historical record.
  - The load math uses `POLL_S = 5`, with a comment `= LIVE_POLL_MS`. The ESPN label is `~6`.
  - `measure(path, { gzip })` returns status, raw bytes, wire bytes, `content-encoding`, `content-length`, `vary`, and the decoded JSON.
  - New checks:
    - (a) scoreboard with `accept-encoding: gzip`: `content-encoding: gzip`, `content-length === wire`, `wire < raw / 3`
    - (b) scoreboard without it: no `content-encoding`, `vary` contains `Accept-Encoding`
    - (c) gzipped decoded JSON deep-equals the plain JSON (`util.isDeepStrictEqual`) for both routes
    - (d) summary: `content-encoding` is gzip **iff** raw ≥ 1,024 B
  - It still makes ≤ 6 ESPN calls, and the header comment is updated.
- Docs:
  - `CLAUDE.md`:
    - Freshness table live row: browser polls every **5s**; server memory cache **10s** live / ≤5 min idle; responses **gzip**ped; lag **~5–15s**.
    - Key facts "Data freshness": live ~5–15s.
    - Data bullet "Schedule + live scores": mention gzip.
  - `DATA_SOURCES.md` §6:
    - Scoreboard TTL is **10s** while live, and the phone polls **5s**.
    - New **gzip** bullet: Accept-Encoding, scoreboard once per fetch, summary ≥ 1 KB, `Vary`.
    - The sizes line gets the F3 wire sizes, and "`next start` does not gzip" is replaced by "we gzip ourselves".
    - `_Last verified_` gets the date.
  - `docs/adr/2026-10-12-live-scores-proxy.md`: a new `## Amendment — 2026-10-12: live freshness` section with decisions 1–4 and the why (Kobe's ≤15s worst-case target; the MNF 1:11 vs 0:37 report). Its "Decision 2 (15s) and the 15s TTL are superseded" note sits inside the amendment, and the Revisit triggers get one line for 2,000 req/s at 10k viewers → Cloudflare Cache Rule. The original text is left as written.
  - `docs/devnotes/2026-10-12-live-scores-proxy.md`:
    - Measurements: a "5s poll + gzip follow-up" line linking the new load table.
    - The "`next start` doesn't gzip" gotcha: "fixed 2026-10-12 (live-freshness)".
  - `CHANGELOG.md` `[Unreleased]`: a new `### Changed` section with one bullet. It says live scores are ≤15s behind ESPN (was ~30s) and covers the phone 5s / server 10s / gzip changes, with the date, the branch `feat/live-freshness`, and a `See:` link to the devnote.
  - `docs/devnotes/2026-10-12-live-freshness.md`: why, what changed (key files), how it was verified (gates + smoke numbers), and open risks. It links this plan and the ADR amendment.

**F3 results: our responses** (filled by the run: 2026-10-13T02:16:03.246Z, week 5; source `f3-smoke.json`)

| Route | Raw bytes | Wire bytes (gzip) | content-encoding |
|---|---|---|---|
| /api/live/scoreboard?week=W | 8,281 | 1,657 | gzip |
| /api/live/summary?event=… | 896 | 896 | none |

**Load table, 5s poll + gzip** (measured scoreboard wire size; one request per viewer per 5s while live; Cloudflare not caching)

| Viewers | Req/s to the Mac | Upload from the Mac (Mbps) | ESPN calls/min |
|---|---|---|---|
| 100 | 20.0 | 0.27 | ~6 (scoreboard, current week) |
| 1,000 | 200.0 | 2.65 | ~6 |
| 10,000 | 2000.0 | 26.51 | ~6 |
| nobody watching / no games | 0 | 0 | 0 |

**Gate `f3`:**
- Port 4000 free → clean + build (log to temp) → `diffRouteTables(build-f0, this build)` has 0 failures.
- `node scripts/live-proxy-smoke.mjs` exits 0.
- `f3-smoke.json` has `pass: true`, `sizes.scoreboard.contentEncoding === 'gzip'`, and `sizes.scoreboard.wire * 3 < sizes.scoreboard.raw`.
- Port 4000 is free afterward.
- The plan has no `TBD-F3`.
- Docs:
  - `CLAUDE.md` and `DATA_SOURCES.md` each contain `5s`, `10s` and `gzip`.
  - The ADR contains `Amendment — 2026-10-12: live freshness`.
  - `CHANGELOG.md` contains `feat/live-freshness` and `gzip`.
  - `docs/devnotes/2026-10-12-live-freshness.md` exists.
  - The proxy devnote changed vs main.
- `npm run check` and `npm run test:run` pass.

```
/goal F3 of docs/plans/2026-10-12-live-freshness.md — extend scripts/live-proxy-smoke.mjs (gzip vs plain on both routes, wire < raw/3 for the scoreboard, decoded = plain, summary gzip iff ≥1 KB; output → f3-smoke.json + this plan's F3/load tables at a 5s poll), run it on a clean local prod build, then update CLAUDE.md, DATA_SOURCES.md §6, ADR amendment, proxy devnote, CHANGELOG [Unreleased] and docs/devnotes/2026-10-12-live-freshness.md. Done when `node scripts/live-fresh-gates.mjs f3` exits 0, then commit "docs(live): freshness smoke, load table, ADR amendment + devnote" and `git status --porcelain -uno` prints nothing.
```

## Run all

```
/goal run F0→F3 of docs/plans/2026-10-12-live-freshness.md in order on branch feat/live-freshness: for each phase do its Files, run `node scripts/live-fresh-gates.mjs fN`, and commit with the phase's message; stop at the first gate that exits non-zero and report its FAIL rows. Done when `node scripts/live-fresh-gates.mjs all` exits 0 (all static checks + check/test/build once + route-table diff vs build-f0.txt + f3-smoke.json pass:true), HEAD is the F3 commit, and nothing was pushed.
```

`all` skips checks that are only valid at one phase (for example F0's "app code unchanged"). Its build output goes to the OS temp dir, so it never rewrites tracked files.

---

## Risks + handling

| Risk | Handling |
|---|---|
| 3× more requests to the Mac during games | gzip cuts bytes ~5×, so upload *drops* (44 → 26.5 Mbps at 10k viewers). Req/s rises (667 → 2,000 at 10k); the ADR revisit trigger is a Cloudflare Cache Rule on `/api/live/*` (headers already correct, `Vary` included). |
| Overlapping polls (5s poll < 8s client timeout) | In-flight guard: at most one request per effect; old effects are blocked by `cancelled`. Gate-checked. |
| gzip CPU | Scoreboard: ~39 µs, once per fetch per variant (≈6/min). Summary: only bodies ≥ 1 KB, per response (none today). |
| Double compression if Next ever compresses route handlers | The `compression` middleware skips responses that already carry `Content-Encoding`. The smoke's "decoded = plain" check fails on double encoding. |
| Phone battery / radio | More wake-ups only while a game is live **and** the tab is visible. Hidden → no ticks (unchanged). Responses are ~1.7 KB. |
| ESPN lags the broadcast | Outside our control. ESPN's CDN is `max-age=1`, so our 10s + 5s is the dominant, bounded part. |
| ESPN 403/429 at 6 calls/min | Budget 120/min unchanged; last-good + backoff unchanged. Watch `pm2 logs pare`. |
| Cloudflare re-encodes (br) to browsers | Expected and fine: our gzip shrinks the Mac → tunnel leg. The browser may show `content-encoding: br`. |
| Windows `.next` ENOENT (OneDrive) | Gates run `npm run clean` first; on ENOENT, rerun the phase gate once. |

## After deploy (optional, not a gate)

During a live game on pare.gg, the DevTools Network panel shows `/api/live/scoreboard?week=N` every ~5s, with `content-encoding: gzip` (or `br` if Cloudflare re-encodes), and the clock trails ESPN's site by ≤15s. From PowerShell:
```
curl.exe -s -D - -o NUL -H "Accept-Encoding: gzip" "https://pare.gg/api/live/scoreboard?week=N"
```
This shows `content-encoding`, `vary: Accept-Encoding`, `x-pare-cache`, and `s-maxage ≤ 10`.

## Final report after the run

- Files per phase.
- The before/after lag table and the load table (measured).
- The key snippet (in-flight guard + `wire[variant] ??=`), with a micro-learning and an analogy.
- **PowerShell box**, one command per line, no `&&`:
  ```
  git push -u origin feat/live-freshness
  git switch main
  git pull
  git merge --no-ff feat/live-freshness
  git push origin main
  ```
- **Mac deploy box:**
  ```
  cd ~/Pare
  git restore package-lock.json
  git pull
  npm install
  npm run clean
  npm run build
  pm2 restart pare
  pm2 logs pare --lines 30 --nostream
  ```

## This /plan run (after approval)

1. `git status --porcelain -uno` must be empty and `main == origin/main`. Both were true at planning time (`30c7a90`).
2. `git switch -c feat/live-freshness`
3. `git mv`/rename this file → `docs/plans/2026-10-12-live-freshness.md` (it's untracked, so a plain move).
4. `git add docs/plans/2026-10-12-live-freshness.md`, then `git commit -m "docs(plans): live freshness plan"` with the Co-Authored-By line. Local only, no push; then stop.
5. No changelog or dev note for this commit: it's plan-only, and the changelog + devnote land in F3 with the code.
