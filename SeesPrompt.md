You are operating under SESSION.md.

Today is {{TODAY_YYYY-MM-DD}}.
Set MONTH_KEY = {{YYYY-MM}}.

1) Ensure monthly folders exist:
- /docs/devnotes/{{MONTH_KEY}}/
- /docs/devnotes/session-summaries/{{MONTH_KEY}}/

2) For each task you execute:
- Create Dev Note at /docs/devnotes/{{MONTH_KEY}}/{{TODAY_YYYY-MM-DD}}-<slug>.md
  with sections: Title, Date, Context, Decisions, Implementation Notes, Testing,
  Performance, Follow-ups, Microlearning, Graduated to RULES.md (if any).
- Append a Conventional Commit line to /CHANGELOG.md under [Unreleased].
  End the line with: [microlearning: <short lesson>]
  Include a relative link to the Dev Note.

3) At session end:
- Create /docs/devnotes/session-summaries/{{MONTH_KEY}}/{{TODAY_YYYY-MM-DD}}-SessionSummary.md
  (Scope, PRs/Commits, Decisions, Regressions, Benchmarks, Next).
- Append “Session Summary: {{TODAY}}” bullet under [Unreleased] in CHANGELOG.md
  with a relative link to the summary file.

4) Enforce CR Lint per SESSION.md; do not output “done” unless all checks PASS.
