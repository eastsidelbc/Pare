# CLAUDE.md — Source-of-Truth Index (Pare Project)

> **Status Banner**
> - **Active Track:** Web Phases 4–9 → Mock API → Live Polling → Performance → Polish → RN Parity → Monetization
> - **Next Track (Queued):** Mobile Web → iOS Native App (Store Release)
> - **Environment:** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui  
> - **Primary SoT files:** Located under `/docs/`

---

## 🎯 Purpose
This document serves as the **index and authority entry-point** for the Pare NFL Comparison Platform.  
It defines *where* information lives—not the content itself.  
All technical, workflow, and rule specifics are delegated to modular SoT documents.

---

## 📚 SoT Directory Overview

| Domain | File | Responsibility |
|--------|------|----------------|
| **Rules & Standards** | [`/docs/RULES.md`](./docs/RULES.md) | Architecture guardrails, coding standards, naming conventions, commit format. |
| **Workflows** | [`/docs/WORKFLOWS.md`](./docs/WORKFLOWS.md) | Session rituals, automation, CR Lint, Dev Note structure. |
| **Architecture** | [`/docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | File responsibilities, data flow, hook hierarchy, performance design. |
| **Mobile Plan** | [`/docs/MOBILE_PLAN.md`](./docs/MOBILE_PLAN.md) | iOS/Expo roadmap – queued after Web v1. |
| **Project Plan** | [`/PROJECT_PLAN.md`](./PROJECT_PLAN.md) | Phase status & timelines (authoritative phase document). |

---

## 🧭 Current Strategic Direction

### Active Track → Web Phases 4–9
- **Phase 4 – Live Polling:** Replace CSV fetch with API polling & caching.
- **Phase 5 – Scraping Fallback:** Cheerio/Puppeteer backup for offline data.
- **Phase 6 – Performance Pass:** Memoization, lazy loading, service worker.
- **Phase 7 – UI Polish:** Animated transitions, glow effects, accessibility.
- **Phase 8 – RN Parity:** Expo/React Native version sharing Pare core.
- **Phase 9 – Monetization:** Stripe + user accounts.

### Queued → Mobile / iOS
Defined fully in `/docs/MOBILE_PLAN.md`. Work begins **after Web v1** is stable.

---

## 🏗️ Architecture Summary
For full diagrams and file-by-file mapping see `/docs/ARCHITECTURE.md`.

**Core Concepts**
- Hook-based architecture (`useNflStats`, `useRanking`, etc.)
- Client-side ranking → never server-side.
- Offense & Defense panels → self-contained, stateless components.
- CSV → API → hook → UI data flow.
- 50 ms API latency target.

---

## 📊 Metrics System (High-Level)
Metrics defined in `lib/metricsConfig.ts`.  
44 + stats with context-aware offense/defense logic and rank-based amplification.  
Refer to `/docs/ARCHITECTURE.md → Metrics Registry`.

---

## 🧱 Documentation Hierarchy
```
Pare/
├── CLAUDE.md                # Index (this file)
├── SESSION.md               # Automation rule reference
├── PROJECT_PLAN.md          # Phase tracking
├── CHANGELOG.md             # Root changelog
└── docs/
    ├── RULES.md
    ├── WORKFLOWS.md
    ├── ARCHITECTURE.md
    └── MOBILE_PLAN.md
```

---

## ⚙️ Session & Automation
All ritual logic resides in `/docs/WORKFLOWS.md`  
and is executed automatically via `SESSION.md + Cursor Automation Block`.

---

## ✅ Maintenance Policy
- Never duplicate SoT content between files.
- Update SoTs only when architecture or rules change.
- Day-to-day logs → `/docs/devnotes/YYYY-MM/`.
- Session summaries → `/docs/devnotes/session-summaries/YYYY-MM/`.

---

## 📋 References
- `/docs/RULES.md` → for rule enforcement  
- `/docs/WORKFLOWS.md` → for session rituals  
- `/docs/ARCHITECTURE.md` → for implementation details  
- `/docs/MOBILE_PLAN.md` → for queued iOS plan  
- `/PROJECT_PLAN.md` → for active phase tracking

---

*End of CLAUDE.md*
