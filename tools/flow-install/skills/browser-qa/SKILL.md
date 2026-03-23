---
name: browser-qa
description: "Playwright-based browser QA skill for guided setup, auth handoff, scripted runs, and artifact capture."
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, ApplyPatch, Question
argument-hint: "[setup|start|auth|inspect|run|qa-script|report] [--app <path>] [--url <url>] [--script <path>] [--headed] [--allow-destructive]"
---

# Browser QA

## Purpose
Use Playwright for guided browser-based QA across local, preview, staging, or production environments while keeping setup deterministic, credentials safe, and artifacts easy to review.

## Inputs
- Optional subcommand: `setup`, `start`, `auth`, `inspect`, `run`, `qa-script`, or `report`
- Optional flags: `--app <path>`, `--url <url>`, `--script <path>`, `--headed`, `--allow-destructive`

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/browser-qa/`.

## Steps
1. Follow the command specification in `${AGENTS_SKILLS_ROOT}/browser-qa/commands/browser-qa.md` exactly.
2. Use `${AGENTS_SKILLS_ROOT}/browser-qa/scripts/detect-runtime.js` to inspect `README.md`, app-level READMEs, and package metadata before asking startup questions.
3. Use `${AGENTS_SKILLS_ROOT}/browser-qa/scripts/check-playwright.js` to deterministically report whether Playwright packages and browser binaries are ready before attempting browser execution.
4. Default to `read-only` mode. Only perform create/edit/delete/submit/approve side effects when the user explicitly opts into destructive actions.
5. Default to manual login in a headed browser for first-run auth unless the user explicitly chooses typed credentials, env-backed credentials, or an existing storage state.
6. Never persist secrets or session state unless the user explicitly asks. Redact sensitive values from summaries.
7. Use `${AGENTS_SKILLS_ROOT}/browser-qa/scripts/parse-qa-script.js` to normalize markdown or JSON QA scripts into a deterministic scenario list before execution.
8. Use `${AGENTS_SKILLS_ROOT}/browser-qa/scripts/summarize-artifacts.js` after execution to normalize artifact paths, scenario outcomes, and blocked reasons for handoff to the user or the `qa` skill.
9. When creating or updating a reusable Markdown QA script, also export a sibling `.xlsx` workbook with `python3 ${AGENTS_SKILLS_ROOT}/qa/scripts/export-user-test-script.py <markdown-path> [xlsx-path]` so human testers can use either format.
10. When browser execution is requested from the broader `qa` workflow, return a structured summary that `qa` can incorporate into bug reports and QA artifacts.

## Output
- Friendly browser-QA summary with target app/URL, auth mode, safety mode, actions performed, artifact locations, and pass/fail/blocked results.
- Clear list of missing prerequisites when Playwright, browsers, or startup commands are not ready.
- Structured scenario summary suitable for `qa` delegation and follow-up fixes.
