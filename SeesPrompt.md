# SeesPrompt.md — Session Bootstrap & Summary Protocol

You are operating under SESSION.md.

Today is {{TODAY_YYYY-MM-DD}}.  
Set MONTH_KEY = {{YYYY-MM}}.

---

## 📁 Folder Structure Enforcement
Before starting, ensure these exist (create if missing):

- `/docs/devnotes/{{MONTH_KEY}}/`
- `/docs/audit/{{MONTH_KEY}}/` *(for architecture + behavior audits)*
- `/docs/sessionsummary/{{MONTH_KEY}}/` *(new unified summary folder)*

---

## 🧠 Dev Notes
For each substantial task or change:

Create a Dev Note at  
`/docs/devnotes/{{MONTH_KEY}}/{{TODAY_YYYY-MM-DD}}-<slug>.md`

Each file must include:
```
# Title
## Date
## Context
## Decisions
## Implementation Notes
## Testing
## Performance
## Follow-ups
## Microlearning
## Graduated to RULES.md (if any)
```

Append a **Conventional Commit line** to `/CHANGELOG.md` under `[Unreleased]`:
```
- feat(scope): short description [microlearning: <lesson>]
  ↳ /docs/devnotes/{{MONTH_KEY}}/{{TODAY}}-<slug>.md
```

---

## 🧾 Session Summaries 
At the end of every working session:

Create  
`/docs/sessionsummary/{{MONTH_KEY}}/{{TODAY_YYYY-MM-DD}}-SessionSummary.md`

Sections:
```
# Session Summary — {{TODAY_YYYY-MM-DD}}
## Scope
## PRs / Commits
## Decisions
## Regressions / Fixes
## Benchmarks / Tests
## Next Steps
## Reflections / Microlearning
```

Then append to `/CHANGELOG.md` under `[Unreleased]`:
```
- Session Summary: {{TODAY_YYYY-MM-DD}}
  ↳ /docs/sessionsummary/{{MONTH_KEY}}/{{TODAY}}-SessionSummary.md
```

---

## 🔍 Enforcement Rules
- CR lint per `SESSION.md` must pass before session end.
- Do **not** output “done” unless:
  - Dev Note and Session Summary are both created
  - CHANGELOG entry appended correctly
  - Any microlearning notes are written and tagged

---

## 🧩 Optional Integration
If using Cursor automation:
- Add task to auto-run “Session Summary builder” when you type `#end-session`
- Have it detect uncommitted Dev Notes and include them in summary context
- Ensure summaries are chronological (link to last session at bottom)

---

### Microlearning
Organizing session summaries under `/docs/sessionsummary/` gives a single timeline of development sessions, separate from individual Dev Notes. This allows you to quickly review your daily flow without parsing technical notes, while still tying each session’s decisions back to the SoTs.
