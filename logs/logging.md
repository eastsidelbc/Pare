# 🧠 Pare Logging & Debugging System
> **Internal Developer Reference** — used by AI agents (Cursor, Claude, ChatGPT) and contributors to perform consistent, professional debugging across the Pare codebase.

---

## 📘 Purpose
This document defines **how debugging is implemented, structured, and documented** in the Pare project.

It ensures that:
- Logs are clean, isolated, and removable.
- Temporary instrumentation never alters app behavior.
- Every debug session produces traceable, timestamped evidence.

This file is **always safe for AI assistants to read before performing a debug or audit task.**

---

## 📁 Folder Structure

All debug and instrumentation output lives under `/logs/debug` in the repo root.

```
/logs
 ├── debug/
 │    ├── ui-<feature>.log         → front-end (React) logs
 │    ├── network.log              → API request/response traces
 │    ├── timing.log               → fetch / render timing durations
 │    ├── <date>-findings.md       → manual or AI-generated findings reports
 │    └── session-YYYY-MM-DD/      → optional folder for full session captures
 └── readme.md                     → quick reference for log categories
```

### 📅 File Naming Rules
| Type | Format | Example |
|------|---------|---------|
| UI logs | `ui-<component>.log` | `ui-flicker.log`, `ui-header.log` |
| API logs | `network.log` | Logs all server routes or endpoint hits |
| Timing logs | `timing.log` | Duration of fetches, renders, transitions |
| Findings | `<YYYY-MM-DD>-findings.md` | Summary of root causes |
| Session folders | `session-<YYYY-MM-DD>/` | Grouped logs for multi-file investigations |

---

## 🧩 Logging Utility

All structured logging uses the built-in helper at `lib/logger.ts`.

```ts
import fs from "fs";
import path from "path";
import chalk from "chalk";

export function logDebug(scope: string, data: any) {
  const time = new Date();
  const timestamp = time.toISOString();
  const local = time.toLocaleTimeString("en-US", { hour12: false });
  const payload = JSON.stringify(data, null, 2);

  const line = `[${timestamp} | ${local}] [${scope}]\n${payload}\n\n`;
  const logDir = path.join(process.cwd(), "logs/debug");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  fs.appendFileSync(path.join(logDir, "ui-flicker.log"), line);
  console.log(chalk.gray(`[${local}]`), chalk.yellow(`[${scope}]`), chalk.blue(payload));
}
```

### Usage Example
```ts
import { logDebug } from "@/lib/logger";

logDebug("CompareHeader/render", {
  awayAbbr,
  homeAbbr,
  showSkeleton,
  ts: Date.now(),
});
```

Each log automatically:
- Writes to `/logs/debug/ui-flicker.log`
- Mirrors the same output to the console with color
- Creates directories if missing

---

## 🧭 How to Run a Debug Session

1. **Create a session folder (optional)**
   ```bash
   mkdir -p logs/debug/session-$(date +%Y-%m-%d)
   ```
   or name it for a feature:
   ```
   logs/debug/session-2025-10-27-flicker/
   ```

2. **Add logs**
   Import `logDebug` and place logs in key lifecycle or fetch points  
   (e.g., component renders, useEffect hooks, API route entry/exit).

3. **Run the app**
   ```bash
   npm run dev
   ```
   or in production mode if needed:
   ```bash
   npm run build && npm start
   ```

4. **Reproduce the issue**
   - Click, scroll, or interact as needed.
   - The logger automatically timestamps and appends all events.

5. **Review output**
   - Check `/logs/debug/ui-flicker.log` or session folder.
   - Use VSCode’s search (`Ctrl + F`) for component names or timestamps.

6. **Document findings**
   Save conclusions in `/logs/debug/<date>-findings.md`:
   ```markdown
   ## Findings — 2025-10-27 (UI Flicker)
   - Cause: component re-mounted on every polling interval.
   - Evidence: "MismatchChips/render" fired twice per click.
   - Fix candidate: add stable `key` or debounce re-fetch.
   ```

7. **Clean up**
   - Remove all `logDebug` imports.
   - Delete `/logs/debug` folder if not needed.
   - Commit only findings files, never raw `.log` files.

---

## 🧠 AI Debug Rules

If you (AI agent) are performing a debugging task:
1. **Read this file first** to understand the logging protocol.  
2. Only **instrument with `logDebug()`** — do not alter app logic or visual output.  
3. Always create logs under `/logs/debug/`, never mix with `/src` or `/public`.  
4. When investigation ends, write a findings file named:
   ```
   /logs/debug/<YYYY-MM-DD>-findings.md
   ```
   summarizing:
   - Root cause(s)
   - Files involved
   - Suggested minimal fixes
   - Verification plan

5. Never delete or modify existing logs from previous sessions.

---

## 🔒 Logging Safety Guidelines
- All logging is **temporary and local** — no sensitive data is stored or uploaded.
- The `/logs` directory should be **gitignored** except for `findings.md` summaries.
- Each debug run should be self-contained and easily removed.

---

## ✅ Goal
Every time debugging is needed:
- Create or reuse `/logs/debug`
- Use `logDebug(scope, data)`
- Produce a clean chronological trace
- Summarize in `<date>-findings.md`
- Remove logs after verification

This ensures debugging remains **controlled, consistent, and professional** for all future development and AI-assisted diagnostics.

---
