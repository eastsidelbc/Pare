# WORKFLOWS.md — Session Rituals & Automation

---

## 🔁 Session Lifecycle Overview
1. **Startup**
   - Read: CLAUDE.md, PROJECT_PLAN.md, CHANGELOG.md ([Unreleased]),
     recent Dev Notes, ADRs.  
   - Output: *Rule Summary*, *Open Decisions*, *Unreleased Changes*.
   - Optional: Run `/docs/ArchAuditPrompt.md` to generate `/docs/audit/AUDIT_ARCHITECTURE_YYYY-MM-DD.md` before coding.


2. **Task Phase**
   - Plan: 3–5 steps + file paths.  
   - Ask one clarifying question if needed.  
   - Execute changes.

3. **Documentation Phase**
   - Create Dev Note → `/docs/devnotes/YYYY-MM/YYYY-MM-DD-<task>.md`.  
   - Sections: Title, Date, Context, Decisions, Implementation Notes, Testing, Performance, Follow-ups, **Microlearning**.  
   - Update `/CHANGELOG.md` under [Unreleased].  
   - Add ADR if architecture changed.  
   - Promote rules → `/docs/RULES.md` if needed.

4. **Closure**
   - Generate Session Summary → `/docs/devnotes/session-summaries/YYYY-MM/YYYY-MM-DD-SessionSummary.md`.  
   - Append short bullet → `/CHANGELOG.md`.  
   - Run CR Lint → all checks PASS before marking done.

---

## ✅ CR Lint Checklist
| Check | Status |
|--------|--------|
| Dev Note created | [ ] |
| CHANGELOG updated | [ ] |
| RULES updated (if needed) | [ ] |
| ADR created (if needed) | [ ] |
| Session Summary generated | [ ] |
| Conventional Commit used | [ ] |

---

## 🧠 Microlearning Guidance
Each Dev Note ends with a short explanation written for a beginner:  
> “What concept did this code teach or reinforce?”  
Keep ≤ 6 sentences, plain language.

---

## ⚙️ Automation Reference
Use this when opening a new Cursor session:

```text
You are operating under SESSION.md.

Today = {{TODAY_YYYY-MM-DD}}  
MONTH_KEY = {{YYYY-MM}}

1. Ensure folders exist:
/docs/devnotes/{{MONTH_KEY}}/
/docs/devnotes/session-summaries/{{MONTH_KEY}}/

2. For each task:
  - Create Dev Note file  
  - Append CHANGELOG line [microlearning: summary] → link Dev Note  

3. On session end:
  - Generate Session Summary file  
  - Append summary link → CHANGELOG [Unreleased]  

4. Run CR Lint until PASS
```

---

*End of WORKFLOWS.md*
