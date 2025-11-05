# RULES.md — Architecture & Process Guardrails (Pare)

---

## 🧱 Core Technical Guardrails
- **Preserve modular architecture.** Never merge Offense/Defense logic.
- **Hooks = business logic.** Components = render only.
- **Ranking always client-side.** Server endpoints stay stateless.
- **No external state libs.** Team selection flows through `ComparePage` props.
- **Position-based CSV mapping** is authoritative. Do not reorder columns.
- **Performance floor:** 50 ms cached / 200 ms fresh responses.
- **Backward compatibility:** No breaking data contracts.

---

## 🧩 Component & Hook Standards
- Each hook exports a stable API; avoid signature drift.  
- Props require explicit TypeScript interfaces.  
- Use `useMemo` / `useCallback` for expensive operations.  
- Never fetch data inside child components; use provided hooks.  
- Maintain isolation: each panel self-contained.  
- Defensive coding → null-checks on all API data.

---

## 🔒 Data & API
- 6-hour in-memory cache; automatic stale fallback.  
- On API error, return last good payload with `"stale": true`.  
- No server-side ranking or per-game conversion.
- Document metric defaults explicitly:
  - `metricsConfig.ts` MUST declare and export `DEFAULT_OFFENSE_METRICS` and `DEFAULT_DEFENSE_METRICS` with a brief rationale comment.
- API optimization (optional): add `ETag` headers to `/api/nfl-2025/*` when bandwidth becomes a concern.


---

## 🎨 UI / UX Rules
- Inward bars must always meet in center.  
- Offense → green accent; Defense → orange.  
- Touch targets ≥ 44 × 44 pt.  
- Accessibility: color contrast ≥ 4.5:1, ARIA labels on interactive elements.  
- Framer Motion for all transitions.

---

## 🧰 Code Quality & Docs
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, etc.).  
- **Dev Notes**: one file per task under `/docs/devnotes/YYYY-MM/`.  
- Include “Microlearning” section in every Dev Note.  
- Link new rules → this file under “Graduated to RULES.md”.
- Gate all diagnostics with an environment flag:
  - Use `process.env.NODE_ENV !== 'production'` OR a central logger level (e.g., `LOG_LEVEL=info|warn|error`).
  - No raw `console.*` in production paths; use `logger.ts`.

---

## 🧾 Commit & Changelog Policy
- Every session → one entry in root `CHANGELOG.md`.  
- `SessionSummary.md` → short write-up under `/docs/devnotes/session-summaries/YYYY-MM/`.  
- All commits must include issue/task reference if applicable.

---

## 🧠 Documentation Hygiene
- CLAUDE.md = index only.  
- All details reside in SoT docs.  
- Never duplicate text between files.  
- Keep headings atomic & predictable for AI parsing.

---

*End of RULES.md*
