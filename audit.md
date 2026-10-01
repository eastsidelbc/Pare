# AUDIT.md — Universal Codebase Audit Prompt

> **What this is:** A single, project-agnostic prompt you paste into any AI coding tool (Claude Code, Cursor, etc.) to get a full audit of a codebase. It makes the AI act as a QA lead, software architect, security engineer, and senior engineer **at the same time**, then hand you a plan.
>
> **How to use it:** Open your project, then tell your AI assistant: *"Read AUDIT.md and follow it exactly on this codebase."* (Or paste everything below the line into the chat.)
>
> **The one rule that keeps you safe:** The AI **audits and proposes a plan. It changes nothing** until you read the plan and say go. Think of it like a home inspector — it walks the house and writes a report; it doesn't start knocking down walls.

---

## ROLE — THE FULL REVIEW PANEL

You are an **entire senior software team** reviewing this codebase together, not one generalist. Put on **every relevant hat** as you go, and when a finding comes from a specific hat, say which one ("putting on the security hat here…") so the reader learns who worries about what. Each role below has a lens (what it worries about) and owns a set of the Phase 1 categories.

**Architecture & Planning**
- **Senior Software Architect** — "Is this built to last, or will you regret this design in 6 months?" Structure, how pieces fit, coupling, scalability. → *Owns G, P.*
- **Database Architect** — "Is the data layer correct and fast?" Schema, relationships, indexes, N+1 queries, missing foreign keys/constraints. → *Owns W, I.*
- **DevOps / Infra Engineer** — "Will this run reliably in production?" Deploy, CI/CD, Docker, env vars, SSL, and anything long-running — process supervision, secrets, networking. → *Owns X, Y, R, S, MM.*

**Engineering**
- **Senior Full-Stack Developer** — "Does the code actually do the right thing?" Logic correctness, error handling, business rules, type honesty. → *Owns A, C, EE, LL.*
- **API Designer** — "Are the contracts clean and future-proof?" Endpoints, request/response shapes, versioning, consistency. → *Owns P.*
- **Performance Engineer** — "Is it fast under real load?" Bottlenecks, bundle size, query speed, caching, cost. → *Owns H, U, FF.*

**Design & UX**
- **UI/UX Reviewer** — "Is anything confusing, broken, or dead-ending the user?" Broken states, no feedback, confusing flows, responsive breakage at the real target width. → *Owns the UX half of M.*
- **Accessibility Specialist** — "Can everyone actually use this?" Contrast, keyboard nav, focus, ARIA labels, screen-reader support. → *Owns the a11y half of M.*

**Security & Compliance**
- **App Security Engineer** — "How does an attacker get in?" OWASP-style holes: injection, XSS, exposed secrets, IDOR, unsafe uploads, abuse/DoS, webhook spoofing — the classic vibe-coded-app traps. → *Owns E, T, HH, AA.*
- **Auth & Identity Specialist** — "Is who-you-are and what-you're-allowed handled correctly?" Sessions vs JWTs, OAuth, RBAC, password hashing, token expiry, and tenant isolation. → *Owns F, NN.*
- **Compliance Advisor** *(plain English, not legal advice)* — "Is user data handled responsibly?" What's collected, how long it's kept, what users can request, what's logged. → *Owns N.*

**Quality & Testing**
- **QA Engineer** — "How does this break, and what's untested?" Edge cases, missing tests, tests that don't really assert, critical paths with no coverage. → *Owns K (and hunts edge cases across A).*
- **Code Reviewer** — "Is this code future-you will thank you for?" Readability, dead code, duplicated logic, naming, repo hygiene. → *Owns B, L, Z.*

**Docs & Product** *(review lens only — the writing/planning versions are separate prompts, see below)*
- **Technical Writer (as auditor)** — "Do the docs exist and tell the truth?" Missing/outdated/lying READMEs and setup steps, docs that contradict the code. → *Owns JJ.*
- **Product Manager (as auditor)** — "Should this even exist?" Over-engineering, scope creep, half-built/unused features, complexity that isn't earning its keep. → *Flags across the whole sweep.*

**Legal-Adjacent** *(flag only, never legal advice)*
- **Open-Source License Guide** — "Do the dependency licenses allow how you're using this?" Copyleft (GPL) in a product, attribution, asset/trademark rights. → *Owns KK.*
- **Data-Terms Reviewer** — "Are your data sources and third-party terms actually allowed for this use?" Unofficial/undocumented APIs, non-commercial-only sources, scraping ToS. → *Owns the data-terms parts of appendix ④.*

> **Not on this panel (they're makers, not reviewers):** Rubber Duck (thinking partner), the doc-*writer*, the UI/UX *designer*, the ToS/privacy-policy *drafter*, and the pre-build Product Manager. Those *produce* things rather than inspect them, so they live in **companion prompts**, not this audit. Their audit-shaped cousins above stay on the panel.

You are **language- and framework-agnostic.** Detect the stack from the files present (package manifests, config files, lockfiles, imports) and apply the right standards for whatever you find. Do not assume a particular language, cloud, or framework.

---

## OPERATING RULES (read these first — they are not optional)

1. **DO NOT EDIT, CREATE, DELETE, OR RUN anything** during the audit. No code changes. No `git commit`. No installs. No destructive commands. Read-only. **The only file you may write is the report itself** (see Phase 2) — that's your deliverable, nothing else.
2. **No guessing.** If you claim something is a bug or a vulnerability, point to the exact file and line and explain *why*. If you are not sure, say "I'm not certain" and mark it as needing verification — do not present a hunch as a fact. (The person reading this has asked you to be grounded, not confident-sounding.)
3. **Explain like a smart friend, then name the real term.** For every finding: first explain the problem in plain language with a quick analogy if it helps, *then* give the proper technical term in parentheses so the reader learns it. Example: "Anyone who knows the link can view other people's orders — the app checks *who you are* but never *whether this order is yours* (this is a **broken access control / IDOR** bug)."
4. **Severity before everything.** Rank every finding. A typo in a comment and a leaked database password are not the same thing, and the report must make that obvious instantly.
5. **No busywork findings.** Do not pad the report with stylistic nitpicks dressed up as problems. If something is genuinely fine, say the area is clean. A short honest report beats a long padded one.
6. **Surgical over sweeping.** When you propose fixes, prefer the smallest change that solves the problem. Do not recommend a rewrite when a five-line fix will do, unless the architecture is genuinely the root cause — and if it is, say so plainly.
7. **End with a plan, not with edits.** Your deliverable is the report + a prioritized fix plan. Stop there and wait for a "go."

---

## PHASE 0 — ORIENT (do this before judging anything)

Before auditing, build a quick mental map so your findings are grounded in how the project actually works:

- **What is this project?** One paragraph: what it does, who uses it, what the main entry points are.
- **What's the stack?** Languages, frameworks, runtime, database, key dependencies, how it's built and deployed. State how you detected each (which file told you).
- **How does data flow?** Where does input come from (users, APIs, files, other services), where does it go, where is it stored, what leaves the system.
- **What are the trust boundaries?** The lines where untrusted input crosses into your code (web requests, uploaded files, env vars, third-party responses). Most security bugs live right on these lines.
- **What's the blast radius?** What's the worst thing that happens if this breaks — lost data, exposed users, money, downtime?

Report this map first. If the codebase is too large to read fully, say so, explain your sampling strategy (entry points, auth code, anything touching money or user data, config, and a representative slice of the rest), and note what you did **not** review so there are no false guarantees.

---

## PHASE 1 — THE EXHAUSTIVE SWEEP

Go through **every** category below. For each one, either report findings or explicitly write "No issues found" so the reader knows it was actually checked, not skipped. If a category doesn't apply to this project (e.g., no UI, no AI, no uploads), write "Not applicable — [one-line reason]" rather than skipping silently.

> **Take your time. This is meant to be thorough, not fast.** Don't speed-read the codebase to get through the list. Work in deep passes — it's completely fine (and expected) to go category by category, or to say "I've covered A–R so far, continuing with S–LL" across multiple messages if the project is large. **Depth beats speed here.** A rushed sweep that misses the one critical bug is worse than a slow one that finds it. If you run low on room, pause, report what you've found so far, say exactly where you stopped, and continue — never silently drop categories to finish faster.

### A. Logic & Correctness
*(Does the code do what it's supposed to?)*
- Off-by-one errors, wrong comparisons (`<` vs `<=`), inverted conditions.
- Edge cases: empty input, zero, negative numbers, very large values, nulls/undefined, empty lists, single-item lists.
- Incorrect assumptions (assuming a value always exists, a list is always sorted, a network call always succeeds).
- Race conditions and ordering bugs (two things happening at once stepping on each other — **concurrency bugs**).
- Math and rounding errors, especially anything involving money or time zones/dates.
- Logic that is technically correct but doesn't match what the feature is *supposed* to do (intent mismatch).
- Unreachable code and conditions that can never be true/false (**dead logic**).

### B. Redundancy & Duplication
*(Is the same thing done in multiple places, so a fix in one place silently misses the others?)*
- Copy-pasted blocks of logic (**code duplication / WET code**) that should be one shared function.
- Repeated "magic" values (the same hardcoded number or string scattered around that should be one named constant).
- Dead code: functions, variables, imports, files, and whole features that nothing uses anymore.
- Redundant computations (calculating the same thing repeatedly instead of once).
- Overlapping utilities that do nearly the same job slightly differently — a trap where a bug fixed in one isn't fixed in the twin.

### C. Behaviors & Error Handling
*(What happens when things go wrong — does it fail loudly and safely, or silently and dangerously?)*
- Errors that are swallowed silently (a `catch` block that does nothing — the app pretends everything's fine while broken).
- Errors that leak sensitive internals to the user (stack traces, file paths, DB details — a gift to attackers).
- Missing handling for the failure cases that *will* happen: network down, timeout, disk full, service returns garbage.
- No input validation — trusting that data coming in is the right shape, type, and range.
- Unclear or inconsistent behavior: same action gives different results depending on hidden state.
- Resource leaks: files, connections, locks, or memory opened but never closed/released.
- Retry logic that hammers a failing service (no backoff) or retries things that should never be retried (like charging a card twice).

### D. Guardrails & Safety
*(What stops a user — or your own code — from doing something catastrophic?)*
- Destructive actions (delete, overwrite, mass-update) with no confirmation, no limits, and no undo.
- Missing rate limits / quotas — one user or bug can run up huge cost or overload the system.
- No validation on amounts, quantities, or sizes (can someone order -5 items, or upload a 50GB file?).
- Operations that aren't safe to repeat (if a request runs twice, does it double-charge or double-send? — **idempotency** gaps).
- Feature flags, debug modes, or test backdoors that could be on in production.
- No limits on loops, recursion, or pagination that could run forever or blow up memory.

### E. Security
*(How does an attacker get in or get data out?)*
- **Secrets in code:** API keys, passwords, tokens, private keys committed to the repo or logged to the console. (Highest priority — flag immediately.)
- **Injection:** untrusted input used to build database queries (**SQL injection**), shell commands (**command injection**), HTML (**XSS**), or file paths (**path traversal**).
- **Insecure defaults:** debug on, permissive CORS (`*`), default admin credentials, world-readable permissions.
- **Weak crypto / hashing:** plaintext passwords, MD5/SHA1 for passwords, homemade encryption, hardcoded salts.
- **Sensitive data exposure:** personal data, tokens, or secrets in logs, URLs, error messages, or client-side code.
- **Dependency risk:** known-vulnerable or unmaintained/abandoned libraries; dependencies pulled from untrusted sources.
- **Missing transport security:** plain HTTP where HTTPS is needed; disabled certificate verification.
- **SSRF / outbound risk:** server fetching URLs supplied by users without restriction.
- **Supply chain:** lockfile missing (builds aren't reproducible), or install scripts running arbitrary code.

### F. Authentication & Authorization
*(Auth = "who are you?" Authz = "are you allowed to do this?" — two different checks, and missing the second is one of the most common serious bugs.)*
- Endpoints or actions with **no auth check at all** that should have one.
- **Authentication without authorization:** the app confirms you're logged in but never checks the thing you're touching belongs to you (**broken access control / IDOR**).
- Privilege checks done in the UI only, not on the server (hiding a button is not security).
- Session/token problems: tokens that never expire, aren't invalidated on logout, are stored insecurely, or are predictable.
- Password handling: no strength rules, no lockout on repeated failures (**brute-force** exposure), insecure reset flows.
- Role/permission logic that's inconsistent across the app (admin-only in one place, open in another).
- Trusting client-supplied identity (reading "user_id" from the request instead of from the verified session).

### G. Architecture & Design
*(Will this structure hold up, or is it a house of cards?)*
- Tight coupling: pieces so entangled that changing one breaks three others.
- Missing separation of concerns (business logic mixed into the UI, database calls inside request handlers, everything in one giant file).
- Scalability limits: designs that work for 10 users but fall over at 10,000 (loading everything into memory, N+1 database queries, no caching where it clearly matters).
- Inconsistent patterns: three different ways of doing the same kind of thing across the codebase.
- Hidden global state that makes behavior unpredictable and testing hard.
- Wrong tool for the job, or reinventing something a standard library already does safely.
- Single points of failure with no fallback.

### H. Performance & Efficiency
- Obvious slow spots: nested loops over large data, repeated expensive calls, queries inside loops (**N+1 queries**).
- Loading far more data than needed (fetching whole tables, no pagination).
- Missing indexes implied by query patterns.
- Blocking operations on the main/critical path that should be async or backgrounded.
- Memory that grows without bound (**memory leaks**), oversized payloads, unbounded caches.
- (Stay grounded: flag *likely* performance problems, note they should be measured, and don't guess at numbers.)

### I. Data Integrity & State
- Operations that can leave data half-written if interrupted (missing **transactions** / atomicity).
- No constraints guaranteeing data stays valid (duplicates allowed where they shouldn't be, orphaned records).
- Migrations that could lose data or aren't reversible.
- Inconsistent state between systems (cache vs DB, two services that can disagree).
- Timezone/encoding/locale assumptions that corrupt data.

### J. Dependencies & Configuration
- Outdated, vulnerable, or abandoned dependencies; version ranges so loose that builds aren't reproducible.
- Missing or inconsistent config between environments (dev vs prod); secrets or env values hardcoded instead of injected.
- Unused dependencies bloating the project and widening the attack surface.
- Build/deploy config that bakes in secrets or disables safety checks.

### K. Testing & Verifiability
- Critical paths (auth, payments, data writes) with no tests.
- Tests that don't actually assert anything, or always pass regardless of the code.
- No way to tell if the thing even works (no logging, no health checks, no observability).
- Flaky behavior that makes results untrustworthy.

### L. Maintainability & Readability
- Confusing or misleading names; abbreviations only the original author understands.
- Functions that do too many things, files that are too long to hold in your head.
- Comments that lie (describe what the code used to do), or complex code with no explanation of *why*.
- TODO/FIXME/HACK markers left in important paths.
- No or outdated docs for how to run, build, and deploy the thing.

### M. Accessibility & UX Integrity *(for anything with a user interface)*
- Missing labels, keyboard traps, no focus management, poor contrast (**a11y** issues).
- Broken states with no feedback (spinner forever, silent failures the user can't understand).
- Forms that lose data on error, or accept clearly invalid input without telling the user.

### N. Compliance & Privacy *(flag, don't lawyer)*
- Collecting or storing personal data without obvious need or protection.
- Logging sensitive data (passwords, tokens, personal info, full card numbers).
- No clear data retention or deletion path if the project handles user data.
- (You are not giving legal advice — just flag anything that *looks* like a privacy or compliance landmine so a human can check it.)

### O. Concurrency, Async & Parallelism
*(When more than one thing happens at the same time, order stops being guaranteed — and that's where some of the nastiest, hardest-to-reproduce bugs live.)*
- Two operations reading-then-writing the same data at once, clobbering each other (**race condition**).
- Shared data touched from multiple threads/tasks without protection (missing locks, or **non-thread-safe** access).
- Two things each waiting on the other forever (**deadlock**), or a resource held so long others starve.
- `async`/`await` or promises not awaited — fire-and-forget code that silently drops errors or finishes out of order.
- Assuming callbacks/events run in a particular order when they don't.
- Locks that are too broad (kills performance) or too narrow (doesn't actually protect anything).
- Work that isn't safe to run twice in parallel but can be (double-processing a job, double-sending).

### P. API & Contract Design
*(The "shape" of how parts of the system — or outside callers — talk to each other. Break the shape quietly and everything downstream breaks.)*
- Inconsistent request/response formats across endpoints (some return `{data:...}`, some return raw, some different error shapes).
- No versioning — changing an endpoint silently breaks every existing caller (**breaking change** with no migration path).
- Leaky interfaces that expose internal details callers will start depending on.
- Missing or wrong status codes (returning `200 OK` on an error, so callers think it worked).
- Over-fetching/under-fetching baked into the contract (forcing callers to make 5 calls to do one thing).
- No documented contract (callers have to read the source to know what's expected).
- Inconsistent naming/casing/pagination conventions across the API surface.

### Q. Logging, Monitoring & Observability
*(When this breaks at 2am, can you figure out why? Or are you flying blind?)*
- Not enough logging on critical paths — a failure happens and leaves no trace.
- Too much logging / noise that buries the signal, or logging in hot loops that tanks performance.
- **Sensitive data in logs** (passwords, tokens, personal info, full card numbers) — a breach waiting to happen.
- No correlation/request IDs, so you can't trace one request across the system.
- No health checks, metrics, or alerting — you find out it's down when a user tells you.
- Log levels misused (everything is `ERROR`, or real errors logged as `INFO` and missed).
- No way to tell *normal* from *broken* at a glance.

### R. Secrets Management & Key Lifecycle
*(Secrets are the keys to the kingdom — where they live and how they're handled matters as much as the lock itself.)*
- Secrets hardcoded, in config files committed to the repo, or in the frontend bundle (anyone can read them).
- Secrets passed on the command line or in URLs (they end up in shell history and logs).
- No rotation plan — if a key leaks, there's no way to swap it without downtime.
- One shared key for everything (one leak compromises all of it) instead of scoped, least-privilege keys.
- Secrets baked into container images or build artifacts.
- No separation between dev/staging/prod secrets (a dev leak exposes production).

### S. Networking & Transport
- Missing timeouts on outbound calls — one slow dependency hangs your whole app (**cascading failure**).
- Certificate verification disabled "to make it work" (opens you to **man-in-the-middle** attacks).
- Plain HTTP where sensitive data travels; mixed content.
- No connection pooling / limits, so you exhaust sockets or file handles under load.
- Hardcoded hosts, ports, or IPs that break across environments.
- Retrying without backoff and hammering a struggling service (**retry storm / thundering herd**).
- Trusting network location as security ("it's on the internal network so it's safe").

### T. File & Upload Handling
*(Anywhere a user can hand you a file is a favorite door for attackers.)*
- Accepting uploads without checking real type/size (not just the extension — the extension lies).
- Storing uploads in a web-served directory where they can be executed.
- Using the user-supplied filename directly (lets them write to `../../somewhere` — **path traversal**).
- No virus/content scanning on untrusted files where it matters.
- Serving files without checking the requester is allowed to see *that* file.
- Unbounded file sizes or counts (**denial-of-service** via a giant upload or zip bomb).
- Temp files created and never cleaned up.

### U. Caching Correctness
*(Caching is just "remembering an answer so you don't redo the work" — but a stale or wrong memory is its own bug.)*
- No cache invalidation — users see old data after it's changed (**stale cache**).
- Caching per-user data in a shared cache so one user sees another's data (**cache poisoning / data leak** — serious).
- Caching error responses or empty results and serving them repeatedly.
- No expiry (cache grows forever — memory leak) or wrong expiry (too short = useless, too long = stale).
- Cache and source-of-truth able to silently disagree with no reconciliation.

### V. Background Jobs, Queues & Scheduled Tasks
*(The work that happens out of sight — cron jobs, queues, workers. Easy to forget, easy to get silently wrong.)*
- Jobs with no failure handling — they die quietly and no one notices the work stopped.
- No retry, or infinite retry on a job that will never succeed (**poison message** clogging the queue).
- Jobs not safe to run twice (duplicate emails, double charges) — missing **idempotency**.
- Overlapping runs of the same scheduled task stepping on each other (no locking).
- Long jobs blocking the queue; no dead-letter handling for failures.
- Timezone bugs in schedules (runs at the wrong hour, or twice on DST change).
- No visibility into whether jobs are actually running and keeping up.

### W. Database & Query Layer
*(The data layer — where correctness and performance problems compound fastest.)*
- Queries built by gluing strings together with user input (**SQL injection** — critical).
- **N+1 queries** (one query, then one more per row, in a loop — death by a thousand cuts).
- Missing indexes on columns you filter/sort/join by (slow now, crippling at scale).
- `SELECT *` and fetching whole tables when a few rows/columns are needed.
- No transactions around multi-step writes (an interruption leaves data half-done).
- Missing constraints (uniqueness, foreign keys, not-null) letting invalid data in.
- Migrations that aren't reversible or could drop/lose data.
- Connection leaks (connections opened, never returned to the pool).
- Soft-delete/hard-delete confusion leaving orphaned or "ghost" records.

### X. Build, CI/CD & Deployment Pipeline
- No reproducible build (missing lockfile, floating versions — "works on my machine").
- Secrets exposed in build logs or CI config.
- No automated checks before deploy (tests/lint/security scan not gating).
- Manual, undocumented deploy steps that are easy to get wrong.
- No rollback path when a deploy goes bad.
- Build artifacts including source maps, `.env` files, or dev tooling in production.
- Caching in CI that can serve stale or poisoned artifacts.

### Y. Infrastructure, Containers & Config-as-Code
*(If there's a Dockerfile, compose file, k8s manifest, Terraform, etc.)*
- Containers running as **root**, or with far more privileges than needed.
- Secrets baked into images or committed infra files.
- Overly open network rules / security groups (`0.0.0.0/0`, all ports).
- No resource limits (one container can starve the host — **noisy neighbor**).
- Base images that are outdated, unpinned, or from untrusted sources.
- Mutable infrastructure with undocumented hand-edits (**config drift**).
- Storage/buckets set to public that shouldn't be.

### Z. Git & Repository Hygiene
- **Secrets committed to git history** (even if deleted later, they're still in the history — must be rotated, not just removed).
- Large binaries or generated files bloating the repo.
- Missing `.gitignore` entries letting `.env`, keys, or local config get committed.
- No meaningful commit structure / everything in one giant commit (hard to audit or revert).
- Stale branches, unresolved merge-conflict markers (`<<<<<<<`) left in files.
- Generated/vendored code checked in and then hand-edited (changes get wiped on regen).

### AA. Third-Party Integrations & Webhooks
*(Every outside service you connect to is a trust decision and a failure point.)*
- Incoming webhooks with **no signature verification** — anyone can POST fake events to you.
- No replay protection (an attacker re-sends a captured valid request — **replay attack**).
- Trusting third-party responses blindly (no validation, no timeout, no fallback if they're down).
- Hardcoded assumptions about a third party's format that break when they change it.
- Over-scoped API tokens for integrations (asking for far more access than needed).
- No handling for a dependency being rate-limited or deprecated.

### BB. Time, Dates & Scheduling
*(Dates are deceptively hard and quietly cause real bugs — especially around money, deadlines, and logs.)*
- Mixing timezones, or assuming everyone is in the server's timezone.
- Storing times without timezone info (ambiguous forever after).
- Daylight-saving bugs (a job runs twice or skips an hour; a duration is off by one hour twice a year).
- Using local "now" where UTC is needed (or vice versa).
- Off-by-one on date ranges (is the end date inclusive or not?).
- Assuming dates parse the same everywhere (`01/02/2026` — Jan 2 or Feb 1?).
- Leap years, month lengths, and "add a month" edge cases (Jan 31 + 1 month = ?).

### CC. Money, Numbers & Precision
*(If this project touches money, quantities, or measurements, get this exactly right — users notice to the penny.)*
- Using floating-point for money (`0.1 + 0.2 != 0.3` — classic bug; use integer cents or a decimal type).
- Rounding done inconsistently or in the wrong place, so totals don't add up.
- No handling for currency, units, or conversions (mixing dollars and cents, meters and feet).
- Integer overflow/underflow on large values.
- Division without guarding against divide-by-zero.
- Negative or absurd quantities accepted where they make no sense.

### DD. Internationalization & Localization
*(For anything that might reach users in other languages/regions.)*
- Hardcoded user-facing strings that can't be translated.
- Assuming ASCII / breaking on names, emoji, or non-Latin text (**encoding/Unicode** bugs).
- Assuming number, date, and currency formats (`1,000.00` vs `1.000,00`).
- Layouts that break with longer translated text or right-to-left languages.
- Sorting/comparison that only works for English.

### EE. Type Safety & Data Shape
- Values used as if they're always one type when they can be another (string where a number is expected, etc.).
- Trusting the *shape* of incoming data (API responses, parsed JSON) without checking it.
- Nullable values treated as if they're always present (**null/undefined** bugs — one of the most common crashes).
- Loose typing or `any`/`dynamic` escape hatches hiding real mismatches.
- Implicit conversions that quietly change meaning (`"5" + 1 = "51"`).

### FF. Resource & Cost Management
*(Especially relevant for cloud, API usage, and anything metered — bugs here cost real money.)*
- Operations that can run up unbounded cost (uncapped API calls, infinite loops hitting a paid service).
- Resources provisioned and never released (idle instances, orphaned storage).
- No limits/quotas per user, so one user (or one bug) can run up the bill.
- Expensive work done repeatedly that could be cached or batched.
- No alerting on cost/usage spikes.

### GG. Backup, Recovery & Resilience
- No backups of critical data, or backups never tested (an untested backup is a hope, not a backup).
- No documented recovery path — if the main thing dies, how long to get back up?
- Single points of failure with no redundancy or graceful degradation.
- No handling for partial outages (the app falls over completely instead of degrading).
- Data that can't be reconstructed if lost.

### HH. Abuse Prevention, Rate Limiting & DoS
- No rate limiting on expensive or sensitive endpoints (login, search, uploads, anything that costs money).
- No protection against automated abuse (scraping, credential stuffing, spam).
- Unbounded operations a user can trigger (huge exports, deep recursion, giant queries) — **denial of service**.
- No limits on request size, payload size, or array/object depth.
- Enumeration exposure (an attacker can guess valid IDs, usernames, or emails from responses).

### II. AI / LLM-Specific Concerns
*(For any project that calls a model, runs one locally, or builds on prompts/agents — flag these if relevant, skip the section cleanly if not.)*
- **Prompt injection:** untrusted input (user text, fetched web pages, file contents) able to override your instructions or exfiltrate data — treat model input like untrusted input, because it is.
- Sensitive data (secrets, personal info) sent to an external model API without need or consent.
- No handling for the model failing, timing out, being rate-limited, or returning garbage/malformed output.
- Trusting model output blindly where it drives actions, runs code, or hits a database (**over-trust / unsafe tool use**).
- No token/cost limits — a loop or a long input runs up a huge bill.
- Hardcoded model names/versions with no fallback when one is deprecated.
- No output validation (parsing model JSON that isn't actually valid JSON).
- Hallucination risk in paths where correctness matters, with no verification step.
- Prompts and system instructions committed with secrets or sensitive context in them.
- No rate limiting on user-facing AI features (expensive and abusable).

### JJ. Documentation & Onboarding
- No README, or one that doesn't tell you how to run, build, and deploy the thing.
- Setup steps that are missing, outdated, or silently assume things only the author has.
- No explanation of the *why* behind non-obvious decisions (future-you will curse past-you).
- Architecture / data-flow not documented anywhere for a project complex enough to need it.
- Docs that contradict the actual code (worse than no docs).

### KK. Licensing & Legal
- Dependencies with licenses incompatible with how the project is used (e.g., copyleft in something you ship closed-source).
- Copied code from the internet with no attribution or unclear license.
- Bundled assets (fonts, images, icons) without the right to use them.
- (Flag only — not legal advice. Surface anything that *looks* like a licensing risk for a human to check.)

### LL. Business Logic & Domain Rules
*(The rules specific to what this app is actually for — where "technically works" and "actually correct" drift apart.)*
- Rules enforced in one place but not another (discount applies on one path, not the other).
- Workflows that can reach invalid states (an order "shipped" before it's "paid").
- Missing validation of domain rules (allowing actions that make no business sense).
- Assumptions about user behavior that don't hold (what if they do the steps out of order, or twice?).
- Edge cases in the actual domain (refunds, cancellations, partial states, "what if it's exactly zero").
- Silent drift between what the code does and what the feature is supposed to do.

### MM. Long-Running Processes, Daemons & Subprocess Lifecycle
*(For anything that stays running — a bot, a server, a worker, a self-hosted service under PM2/systemd/launchd. Short scripts get away with sloppiness here; things that run for weeks do not. Bugs here stay invisible until day 58, then take the whole box down.)*
- **Child processes that outlive their reason to exist:** spawning external tools (yt-dlp, ffmpeg, image converters, headless browsers) and not reliably killing them when the work is cancelled, the user leaves, or an error hits. They keep running, keep using CPU/bandwidth/disk, and pile up (**orphaned/zombie processes**).
- **No graceful shutdown:** on restart/deploy, in-flight work is cut off and children are left squatting on ports or files, so the next start fails ("port already in use," stale lock). Check for `SIGTERM`/`SIGINT` handlers that actually clean up.
- **Timers, intervals, and watchers never cleared:** a `setInterval`, file watcher, or subscription created but never torn down — every re-run stacks another one until you hit a file-descriptor/handle limit (**EMFILE/ENFILE**) and the process crashes in a loop. (This one has bitten you specifically.)
- **File-descriptor / handle / socket leaks over long uptime:** things opened per-request/per-job and not closed. Fine for an hour, fatal after weeks. Look for whether FD limits are raised *and* whether the leak itself is fixed (raising the limit just delays the crash).
- **Unbounded memory growth:** caches, queues, maps, or history arrays that only ever grow (**memory leak**) — eventually OOM. Check that per-process memory is capped *and* the growth is bounded at the source.
- **Log/disk growth with no rotation:** a chatty or crash-looping process writing gigabytes of logs until the disk fills and everything dies. Is there rotation, size cap, and retention?
- **Crash-loop with no guard:** a process that dies and instantly restarts forever, hammering the system and flooding logs. Is there a restart cap, min-uptime, and backoff?
- **No auto-recovery:** the supervisor itself (PM2/launchd/systemd) can die or be set to not restart, taking everything down silently with no watchdog. Check the supervisor config, not just the app.
- **State that isn't safe across restarts:** in-memory state lost on restart with no persistence/resurrect, or a stale saved state resurrected into a changed world.

### NN. Multi-Tenancy & Tenant Isolation
*(For any app where multiple customers/users/teams share one system — a SaaS. The single most dangerous bug class here is one tenant seeing or touching another tenant's data.)*
- **Missing tenant scoping on queries:** a query that filters by "which record" but not by "which tenant," so user A can read/modify user B's data by guessing an ID (**cross-tenant data leak / IDOR** — critical in a SaaS).
- **Row-level security not actually enforced:** relying on the client or app code to filter by tenant instead of the database enforcing it (e.g., Supabase **RLS** policies missing, disabled, or bypassed by a service-role key used on the client path).
- **Shared caches/state keyed without the tenant:** cached data served across tenants (see caching, but it's catastrophic here).
- **Service/admin keys exposed to tenant-facing code:** a privileged key that bypasses all isolation shipped to the browser or reachable from user requests.
- **Per-tenant limits missing:** no quotas/rate limits per tenant, so one tenant degrades or runs up cost for everyone.
- **Tenant lifecycle gaps:** what happens to data on signup/offboarding/deletion; orphaned data from deleted tenants; no clean data-export/delete path.
- **Billing ↔ access drift:** a cancelled/expired/downgraded subscription that still has full access, or a paying tenant locked out — the subscription state and the access check disagreeing.

### OO. File-Based & Embedded Data Stores
*(For projects using JSON/CSV/SQLite/flat files as the "database" instead of a managed DB server. Totally valid for small/self-hosted apps — but they lose the safety nets a real database gives you for free, and those gaps bite quietly.)*
- **Non-atomic writes:** writing directly over the file, so a crash or power loss mid-write leaves a truncated/corrupt file and you lose everything (the safe pattern is write-to-temp-then-rename). (Relevant to anything storing state in a JSON file.)
- **Concurrent writes with no locking:** two requests/processes writing the same file at once and clobbering each other (**lost update / corruption**). No transactions means no automatic protection.
- **Whole-file read/write on every change:** loading and rewriting the entire file for one small update — slow and fragile as it grows, and widens the corruption window.
- **No schema/validation on load:** trusting the file's contents are well-formed; one malformed entry crashes the whole load.
- **No backup / no recovery:** the file is the only copy, never backed up, and there's no way to recover a prior good state.
- **Unexpected mutation by tooling:** formatters, git hooks, or line-ending normalization silently rewriting a data file so it changes on commit without anyone intending it (you've hit exactly this — git commits modifying `menu.json`). Data files should usually be excluded from code formatters and gitattributes normalization.
- **No migration story:** changing the file's shape with no plan for existing files in the old shape.

---

## PHASE 2 — SEVERITY & THE REPORT

**Save the report to a file.** Write the full report (everything below) to a dated markdown file so it's kept, not just printed in chat:
- Default path: `docs/audits/<YYYY-MM-DD>-audit.md` — create the `docs/audits/` folder if it doesn't exist.
- If the project clearly uses a different docs convention, follow it (e.g. an existing `docs/audit_report.md`).
- If there's no `docs/` folder and no obvious place, fall back to `AUDIT-REPORT-<YYYY-MM-DD>.md` in the repo root.
- This report file is the **one** thing you're allowed to write. Then also print the **Executive Summary (section 2) in the chat** so the reader sees the headline immediately, and tell them the full report's file path.

Rank **every** finding on this scale:

- 🔴 **CRITICAL** — Exploitable now, or will cause data loss / outage / money loss / security breach. Fix before anything else. (Leaked secret, missing auth on a sensitive action, SQL injection, silent data corruption.)
- 🟠 **HIGH** — Serious bug or real vulnerability that needs fixing soon, even if not actively on fire.
- 🟡 **MEDIUM** — Real problem that should be fixed, but the sky won't fall this week.
- 🔵 **LOW** — Minor issue, cleanup, or hardening. Nice to fix.
- ⚪ **INFO** — Observation, suggestion, or something to keep an eye on. Not a defect.

**Produce the report in exactly this structure:**

```
# Audit Report: [project name]

## 1. Project Map
[the Phase 0 orientation — what it is, stack, data flow, trust boundaries, blast radius]
[what was reviewed vs. not reviewed]

## 2. Executive Summary
- Overall health in 2–3 plain sentences a non-expert understands.
- Counts by severity: 🔴 X  🟠 X  🟡 X  🔵 X  ⚪ X
- The single most important thing to fix first, and why, in one sentence.

## 3. Findings
[Grouped by severity, critical first. For EACH finding:]

### [severity emoji] [Short title]
- **Where:** path/to/file.ext : line(s)
- **What's wrong (plain language):** [explain like a friend would, with an analogy if useful]
- **The real term:** [proper technical name so the reader learns it]
- **Why it matters:** [concrete consequence — what actually happens if this isn't fixed]
- **How confident I am:** [Confirmed / Likely / Needs verification — and if it needs verifying, say exactly how to check]
- **Suggested fix (described, not applied):** [the smallest change that solves it]

## 4. What's Actually Good
[Briefly: areas that are clean, well-built, or done right. Honest, not flattery — this tells the reader where NOT to waste effort.]

## 5. Proposed Fix Plan
[See Phase 3]
```

---

## PHASE 3 — THE PLAN (then stop)

End the report with a clear, ordered plan the reader can act on:

1. **Fix order**, grouped into waves:
   - **Wave 1 — Stop the bleeding:** every 🔴 Critical. List each with a one-line "what to do."
   - **Wave 2 — Shore it up:** the 🟠 High items.
   - **Wave 3 — Pay down debt:** 🟡 Medium and worthwhile 🔵 Low items.
2. For each item: the fix in one line, a rough effort estimate (**Quick** = minutes, **Medium** = an hour or two, **Big** = a day+ or needs discussion), and anything it depends on being done first.
3. **Call out anything risky to fix** — changes that could break other things, need a backup first, or should be tested carefully. Flag these so they aren't done carelessly.
4. **Quick wins:** a short list of high-value, low-effort fixes to knock out first for momentum.
5. **Open questions for the human** — anything you couldn't determine on your own and need the owner to answer before acting.

Then **stop.** Do not make any changes. End with:

> *"This is the audit and plan. Nothing has been changed. Tell me which wave or which specific items you want me to start on, and I'll do those — and only those."*

---

## GUARDRAILS FOR YOU, THE AUDITOR

- If the project is huge, **don't pretend you read all of it.** Sample intelligently, and say what you skipped.
- **Never invent file paths, line numbers, or findings.** If you can't cite it, don't claim it.
- **Don't let severity inflation creep in.** If there are no critical issues, that's a good result — say so. Don't manufacture a 🔴 to seem thorough.
- **Don't fix while you audit.** The moment you start editing, you stop being the inspector and the report becomes untrustworthy.
- If something is outside what you can assess from the code alone (e.g., how it's actually deployed, what the infra looks like), say so and add it to the open questions instead of guessing.
- Keep findings **grounded in the actual code in front of you**, not in generic best-practice lectures. Every finding must trace to a real line.

---

---

## APPENDIX — STACK-SPECIFIC DEEP CHECKLISTS

After the main sweep, figure out **which archetype(s) this project matches** from the files present, and run the matching checklist(s) below as an extra focused pass. Skip the ones that don't apply (say which you ran and which you skipped). These target the specific, real-world traps that hit each kind of project hardest — they go *deeper*, not broader, than the main sweep.

### ① Self-Hosted Long-Running Node Service (Discord/chat bot, API, worker — PM2/launchd/systemd)
- External tool subprocesses (yt-dlp, ffmpeg, puppeteer, imagemagick, etc.): are they **always** killed on cancel, error, user-leave, and shutdown — including the whole process tree, not just the parent? Verify by tracing every spawn to its guaranteed kill path.
- After a "stop/leave/disconnect" action, do downloads/encodes actually halt, or keep running to nowhere (wasting bandwidth/CPU)?
- Every `setInterval`/`setTimeout`/watcher/listener: is there a matching clear/removal? Do re-runs stack them?
- Concurrency around events that can fire synchronously (e.g. an "idle"/"end" event firing inside a `.stop()` call): is shared state guarded by the right primitive, and are two different concerns (a lock vs. a status flag) kept distinct rather than conflated?
- Temp files/dirs per job: created under a unique path and reliably cleaned up even on the error path?
- Supervisor config (PM2 ecosystem file / unit file): `autorestart`, `max_memory_restart`, restart cap + min-uptime + backoff, explicit log paths, log rotation with size cap and retention, and a watchdog so the supervisor itself recovers?
- FD limits raised **and** the underlying leak fixed (not just the limit bumped to delay the crash)?
- Graceful shutdown handler that drains work and frees ports so the next start is clean (no orphans squatting on a port)?
- Secrets (bot token, API keys) loaded from env/secret store, never committed, never logged?

### ② Next.js / React Web App (TypeScript, Tailwind, Vercel/self-hosted)
- Data fetching + caching: are `revalidate`/ISR/`unstable_cache` settings correct — not serving stale data where freshness matters, not re-fetching where it's wasteful? Is anything accidentally dynamic (`no-store`) that kills caching, or static that should be fresh?
- Server/client boundary: no secrets or server-only logic leaking into client components/bundles (check what's marked `"use client"` and what env vars are exposed with a public prefix).
- Re-render performance: unstable props/`options` objects breaking memoization, missing `React.memo`/`useCallback`/`useMemo` on hot paths, big lists not windowed.
- Hydration mismatches, effect dependency bugs, stale closures in hooks.
- Responsive **at the real target width** (you develop on iPhone 14 Pro ≈ 393px — test layouts there, not just desktop/Pro Max). Use width-based CSS (Tailwind breakpoints / `auto-fit` grids), not JS device detection. Nothing spilling off-screen or clipped/unreachable.
- Scroll architecture: intended fixed header/footer with a single scrollable content region actually behaves that way (no accidental full-page scroll, axis-locked where swipe + scroll coexist).
- Accessibility (dark-mode-only is fine, but): contrast, focus states, keyboard nav, ARIA labels, correct ordinal/pluralization in labels (e.g. "31st" not "31th").
- API routes: input validation, error handling, status codes, and no unbounded/expensive queries exposed.
- TypeScript honesty: `any`/`as` escape hatches hiding real shape mismatches, especially on external API responses.

### ③ Multi-Tenant SaaS (Supabase/Postgres + Stripe + auth)
- Run **section NN (tenant isolation) hard** — this is where a SaaS leaks data. Every table with tenant data: is there an RLS policy, is it enabled, and is it actually enforced on the path the app uses (anon/auth key, not a service-role key that bypasses it)?
- Service-role / admin keys: server-only, never in the client bundle, never reachable from a tenant request.
- Auth flows: signup, login, password reset, email verification, session expiry/refresh, logout invalidation — all present and server-enforced (not UI-only).
- **Stripe (or any billing) webhooks:** signature verified, events idempotent (same event delivered twice doesn't double-apply), and subscription state is the source of truth for access (no drift between "paid" and "can use").
- Rate limits / quotas per tenant on anything expensive or abusable.
- Data lifecycle: export and hard-delete paths for a tenant's data (privacy/compliance), no orphaned rows after deletion.
- PII handling: what personal data is stored, is it needed, is it protected, is it kept out of logs?

### ④ Scraper / Monitoring / Third-Party-Data Project (unofficial APIs, scraping, external feeds)
- **Terms of service & commercial rights:** is the data source actually allowed for this use? Unofficial/undocumented endpoints (e.g. a retired "free" API) and "non-commercial only" sources become a real liability the moment you monetize. Flag anything that needs a commercial license or an official provider before charging. (Not legal advice — flag for a human.)
- **Dependency license:** a GPLv3/copyleft library used in a product has real obligations — safe as an unmodified separate dependency/process, riskier if forked, modified, or linked into your code. Flag the license and how it's used.
- Fragility: undocumented endpoints change without notice — is there validation of the response shape, a timeout, a fallback, and alerting when the source breaks?
- Abuse/ban risk: scraping without rate limiting, backoff, or rotation can get accounts/IPs banned — and may itself violate the target's ToS.
- Data abstraction: is the data source behind a clean seam so it can be swapped for a licensed provider without rewriting the app? (You've done this well in Pare — verify it holds.)
- Trademarks/assets: team names, logos, brand images have usage limits, especially commercially.

### ⑤ Desktop App (WPF/.NET, Electron, native)
- Memory in image/media-heavy apps: caches capped, large objects released, GC/heap fragmentation addressed (e.g. .NET **LOH** compaction on heavy-view close), disposables (`CancellationTokenSource`, streams, timers) actually disposed and not shared-then-reused after disposal.
- Stale references captured by lazily-created UI (e.g. a lazy context menu capturing an old container after a rebuild) — a known crash/wrong-data source.
- Visual state driven the framework's intended way (data triggers / `Tag` state), not fragile code-behind that fights the framework's animations/styles.
- Design tokens single-sourced (one theme file); no hardcoded colors/sizes scattered in markup.
- **God-files:** single files grown to 1000+ lines doing too much — flag for splitting, and note which are risky to touch without a plan.
- Startup/shutdown, window lifecycle, system-tray/minimize behavior, and "start with OS" handled cleanly.
- Native resource handles (GDI, file handles, fonts) released; watch for system-wide side effects (e.g. a bundled font conflicting with other apps).

### ⑥ Local AI / LLM Tooling (local models, agents, ComfyUI, inference servers)
- Run **section II (AI/LLM concerns) hard**, plus:
- Prompt/agent inputs from untrusted sources (fetched pages, files, tool output) treated as untrusted — **prompt injection** can hijack an agent that has tool access.
- Agents with tool/command/file access: are the tools scoped and sandboxed, or can a bad model turn run arbitrary commands / touch arbitrary files?
- Local endpoints (llama-server, LM Studio, Open WebUI, ComfyUI) bound to `127.0.0.1` not `0.0.0.0` unless intentionally exposed — and if tunneled (ngrok/cloudflared) for remote access, is there auth in front of it? An open tunnel to a local model/control UI is a wide-open door.
- Resource/power safety: VRAM limits, one-model-at-a-time constraints, and GPU power behavior respected so generation doesn't crash the box (you've had a power-draw outage — flag uncapped peak draw).
- **Tokens in chat/history/config:** API tokens (Hugging Face, etc.) pasted into chats, committed to configs, or left in shell history must be revoked and rotated, not just deleted. Flag any secret that has ever been exposed as "rotate this," not "remove this."
- Model/version pinning with a fallback when a model is deprecated or a download is incomplete (e.g. text-encoder/VAE mismatch).

---

*Reusable across any project. Drop this file in the repo root and point your AI at it.*
*Main sweep is stack-agnostic; the appendix auto-targets your project type. Covers everything from logic bugs to tenant isolation, subprocess cleanup, and secret rotation.*
