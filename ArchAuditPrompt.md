Goal: Produce a living map of the Pare codebase and confirm parity with /docs/ARCHITECTURE.md.

OUTPUTS (create these):
1) /docs/audit/AUDIT_ARCHITECTURE_{{TODAY_YYYY-MM-DD}}.md
2) Chat output must end with a short "Microlearning" section (≤6 sentences).

SCOPE
- Scan entire repository (files, exports, hooks, components, API routes).
- No code changes—read & report only.

CHECKLIST
- File Tree (top-level + key feature dirs)
- Components Inventory (name → path → props interface summary)
- Hooks Inventory (`use*.ts`): exported signatures and return shapes
- API Routes Inventory (path → method → summary)
- Data Flow Diagram (Mermaid)
- Dependency Edges (who imports whom) for: compare/page.tsx, OffensePanel, DefensePanel, DynamicComparisonRow, RankingDropdown
- Contract Parity: compare documented expectations in /docs/ARCHITECTURE.md with actual code (list any divergences)
- Risks & Hotspots: duplication, tight coupling, un-memoized heavy computations, stale closures, unnecessary re-renders
- Actionable Recommendations: 3–7 bullets, each with a path and a surgical fix idea

FORMAT for /docs/AUDIT_ARCHITECTURE_{{TODAY_YYYY-MM-DD}}.md
# Architecture Audit — {{TODAY_YYYY-MM-DD}}

## 1) Summary
- Scope, tools used (static scan), notable findings

## 2) File Tree (truncated to relevant dirs)
<tree here> ```
3) Inventory
Components
<ComponentName> — <path>

Props: <InterfaceName> (key fields only)

Uses: useRanking, useDisplayMode, etc.

Hooks
useRanking — <path>

Signature: (data, metricKey, teamName, options) => { rank, sortedTeams }

Notes: dependencies, memoization, risks

API Routes
GET /api/nfl-2025/offense — <path>

CSV→JSON, 6h cache, returns { rows, lastUpdated, stale? }

4) Data Flow (Mermaid)
mermaid
Copy code
flowchart LR
  CSV[PFR CSV] --> API[Next.js API routes]
  API --> useNflStats
  useNflStats --> useRanking & useDisplayMode & useTheme
  useRanking --> DynamicComparisonRow
  useDisplayMode --> DynamicComparisonRow
  DynamicComparisonRow --> Bars[Inward Bars]
  ComparePage --> OffensePanel & DefensePanel
5) Dependency Edges (key modules)
compare/page.tsx → OffensePanel, DefensePanel, TeamSelectionPanel

OffensePanel → DynamicComparisonRow, RankingDropdown

DynamicComparisonRow → useRanking, useBarCalculation

RankingDropdown → onTeamChange (prop), state path back to ComparePage

6) Contract Parity vs /docs/ARCHITECTURE.md
✅ Matches:

[list matches]

⚠️ Divergences:

[path] — [description]

[path] — [description]

📌 Suggested doc or code updates:

[doc vs code target + minimal change]

7) Risks & Hotspots
[bullet list with file paths]

8) Recommendations (surgical)
[1–2 line actionable bullets, each with path + idea + expected win]

9) Appendix
Hook signatures

Component prop excerpts (trimmed)

Any perf timings observed

At the end of your chat response, append:

Microlearning
<Beginner-friendly explanation of what we learned from the audit and why it matters, ≤6 sentences.>

pgsql
Copy code

---

## Quick sanity: what you’ll see during use

- **During a normal coding task:** Cursor’s chat reply ends with “Microlearning,” *and* it saves the same into the Dev Note + a tiny CHANGELOG microlearning tag.
- **When you run the audit prompt:** Cursor writes the full audit file under `/docs/` and also ends the chat reply with a short Microlearning section about what the audit revealed.

If you want, I can also generate a tiny **/docs/AUDIT_README.md** that explains how/when to run the audit and how to read it—but this is optional.

Want me to add that quick README too, or are you good to run with these two blocks?