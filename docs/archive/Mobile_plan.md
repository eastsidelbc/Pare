📍 Roadmap: Pare → Native iOS (SwiftUI) → App Store
Phase 0 — Foundations (Repo + Runtime)

Goal: Clean, reproducible environment + stable API endpoints for iOS.

Repo hygiene

Remove stray lockfiles; ensure single package-lock.json.

Add MOBILE_NOTES.md and ios/README.md.

Add SECURITY.md (scope, no secrets in app).

API readiness

Confirm public HTTPS base URL for Next.js API routes (ATS requires HTTPS).

Add /health endpoint returning {ok:true, version}.

Versioning

Adopt CalVer or SemVer: 1.0.0 for iOS 1.0.

Deliverables

Green npm run build, green lint, green typecheck.

MOBILE_NOTES.md documents endpoints used by iOS.

Gate Qs for you

Are we using Cloudflare in front of your API for HTTPS?

SemVer or CalVer?

Phase 1 — iOS Project Bootstrap

Goal: Create SwiftUI app skeleton that compiles, runs, and talks to API (no real UI polish yet).

Xcode project

Targets iOS 17+ (or 16+ if you prefer).

PrivacyInfo.xcprivacy added (no tracking).

AppIcon placeholders, Launch Screen.

Networking layer

StatsAPI.swift with async/await, URLCache configured.

Base URL in Config.xcconfig (no secrets).

Domain models

Swift structs mirror API responses (Team, Metric, CompareResult).

Basic screen

CompareView: team pickers (static list for now), fetch on load, render list of MetricRowViews.

Deliverables

App boots on device/simulator, fetches live data via HTTPS.

Gate Qs

Minimum iOS version you want to support? (16 or 17)

Do you want dark mode only or both light/dark?

Phase 2 — Core UX Mechanics

Goal: Native UX parity with web app for the Compare flow.

Team selection UX

Real team list (from API or bundled JSON).

Persist last selection (AppStorage).

Inward bars

MetricRowView with ratio-based opposing bars, smooth animation on change.

Haptics on significant deltas (optional).

Caching & offline

URLCache baseline; define cache TTLs per endpoint.

Offline banner if last fetch > TTL and no network.

Errors & retries

Friendly empty/error states; retry button; exponential backoff.

Deliverables

Smooth compare experience, stat bars animate, offline-tolerant.

Gate Qs

Should we show value labels on bars (e.g., “48.1%”) always or on tap?

Aggressive caching for week-old data, or conservative?

Phase 3 — Native System Integrations (Lite)

Goal: The “nice native” features you asked for — without Live Activities.

Share Sheet

Share deep link to web /compare?home=X&away=Y.

Add universal link handling (open app when tapping shared link on iOS).

Siri Shortcut (optional)

“Compare [TEAM] and [TEAM]” → opens prefilled screen.

Settings screen

Default teams, data refresh policy, theme toggle (if we allow light/dark).

Deliverables

ShareLink working; deep links open app to correct matchup; basic settings.

Gate Qs

Do you want Siri Shortcut v1 now or later?

Any default favorite teams to seed?

Phase 4 — Polish & Performance

Goal: App Store-quality fit and finish.

Design pass

Spacing, tap target audit (44×44pt), typography hierarchy.

Accessibility: VoiceOver labels, Dynamic Type sizing.

Perf pass

Cold start profiling; pare down any oversized images.

Reduce network chatter; add ETags/If-None-Match if easy.

QA matrix

iPhone 12/13/14/15, iOS 17–latest; airplane mode; bad network; server down.

Deliverables

Accessibility pass, perf notes, QA results in ios/QA.md.

Gate Qs

Support both orientations or portrait only?

Any animation preferences (reduced motion default for accessibility)?

Phase 5 — Distribution

Goal: TestFlight → App Store with clean metadata.

App Store Connect

App name, subtitle, keywords, support URL, privacy policy link.

Screenshots (6.7” + 5.5”), short description of value prop.

Build & upload

Increment version/build.

Archive → Distribute → TestFlight internal → external.

Review compliance

Ensure app isn’t “just a website” (native screens, share sheet, settings, deep link).

Deliverables

Live TestFlight; submission to review; tracking in ios/RELEASE_NOTES.md.

Gate Qs

App name/subtitle finalized?

Do you want a beta feedback prompt inside Settings?

Phase 6 — Optional Enhancements (Next Sprint)

Pick any/all after 1.0 is live

Widgets: small/medium widgets for favorite matchup snapshot.

Push Notifications: “New week’s stats are live.” (Requires server key + APNs)

In-App Purchases: Pro tier with historical stats, saved matchups.

Deeper Native Animations: springy bar transitions, haptics on compare flips.

Gate Qs

Which post-1.0 enhancement should we line up first?

Monetization now or after traction?

Definition of Done (for v1.0)

Clean builds (Xcode + Next.js), green lint, TS, and CI.

iOS app loads compare view, works offline after first fetch.

Share → deep link returns to correct teams.

Accessibility & performance passes documented.

TestFlight tested on at least 3 devices.

Submitted with complete metadata & screenshots.

🧠 Agent IDE Prompt (paste this)

Role: Senior iOS engineer + tech lead pairing with the user (“vibe coder”).
Goal: Deliver Pare as a SwiftUI native app to the App Store, following the phased plan below, asking the user for decisions at each gate, and proposing best-practice defaults if they don’t decide.

Plan & Rules (execute in order):

Phase 0 — Foundations

Audit repo hygiene (single lockfile, remove cruft), verify HTTPS API base, add /health.

Create/Update: MOBILE_NOTES.md, ios/README.md, SECURITY.md.

Output: list of changes + any blockers.

Ask user: “Do we use Cloudflare HTTPS? SemVer or CalVer?”

Phase 1 — iOS Project Bootstrap

Scaffold SwiftUI app (iOS 17+ default unless user chooses 16+).

Add PrivacyInfo.xcprivacy, AppIcon stubs, Launch screen.

Implement StatsAPI.swift with URLCache, Config.xcconfig for base URL.

Create Models (Team, Metric, CompareResult), basic CompareView.

Ask user: “Target iOS 16 or 17? Light+Dark or Dark only?”

Phase 2 — Core UX Mechanics

Implement TeamPicker, persist selections, MetricRowView inward bars with smooth animations.

Add offline banner, retry logic, error states, cache TTLs.

Ask user: “Show numeric labels always vs on-tap? Aggressive vs conservative cache TTLs?”

Phase 3 — Native System Integrations (Lite)

Add Share Sheet with deep links. Implement universal link handling.

Add Settings (defaults, theme, refresh policy). Siri Shortcut optional.

Ask user: “Add Siri Shortcut now? Any default favorite teams?”

Phase 4 — Polish & Performance

Run accessibility pass (VoiceOver, Dynamic Type, contrast).

Run performance pass (cold start, image sizing, network).

Build ios/QA.md test matrix and results.

Ask user: “Portrait only vs both orientations? Reduced motion default?”

Phase 5 — Distribution

Prepare App Store metadata; generate screenshots (6.7” & 5.5”).

Archive, upload to TestFlight; guide through external testing → App Review.

Ask user: “Finalize app name/subtitle? Include beta feedback prompt?”

Phase 6 — Optional Enhancements (post-1.0)

Offer roadmap for: Widgets, Push, In-App Purchases, Deep animations.

Ask user: “Which enhancement to prioritize after 1.0? Monetization now or later?”

Operating Principles:

Default to best practice if the user doesn’t choose, but always ask first at each gate.

Keep changes small and reviewable (PR-sized); summarize diffs clearly.

Maintain docs continuously (MOBILE_NOTES.md, ios/README.md, ios/QA.md, ios/RELEASE_NOTES.md).

Never commit secrets. Use xcconfig for env/base URL.

Treat the web app’s API as the source of truth; do not duplicate business logic on device.

Deliverables after each step:

A short status block: what changed, what’s next, any decisions needed.

Where code is created/edited, provide full file content or unified diffs.

Update the checklist with ✅ and open TODOs with ☐.

First message to user:

“I’m ready to start Phase 0. Do you want SemVer (1.0.0) or CalVer, and are we fronting your API with Cloudflare HTTPS right now?”

Quick recommendations (defaults I’d pick if you don’t answer)

iOS 17+, Dark + Light (follow system).

SemVer (1.0.0 for iOS 1.0).

Conservative caching (fresh on open; fallback offline).

Numeric labels on bars (always visible, compact).

Portrait only for 1.0 (less QA surface).

Skip Siri Shortcut for 1.0; add later.