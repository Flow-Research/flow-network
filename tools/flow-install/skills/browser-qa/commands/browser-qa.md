---
description: Playwright-based browser QA orchestrator for setup, auth, scripted feature checks, and artifact reporting
argument-hint: "[setup|start|auth|inspect|run|qa-script|report] [--app <path>] [--url <url>] [--script <path>] [--headed] [--allow-destructive]"
---

# Browser QA Command

Guide users through browser automation with Playwright while keeping the workflow safe, deterministic, and portable across repos.

## User Input

$ARGUMENTS

## Safety Defaults

Before any browser run, classify the request into one of these safety modes:

- `read-only` — navigation, inspection, screenshots, passive validation only
- `safe-test-data` — mutations allowed only in clearly non-production test data paths
- `destructive` — any create/edit/delete/submit/approve action that can mutate meaningful state

Default to `read-only`. Only allow `destructive` when the user explicitly opts in.

## Required Detection Order

1. Run `${AGENTS_SKILLS_ROOT}/browser-qa/scripts/detect-runtime.js` from repo root.
2. Read the returned startup candidates and README-derived guidance.
3. Run `${AGENTS_SKILLS_ROOT}/browser-qa/scripts/check-playwright.js`.
4. If Playwright package or browsers are missing, explain what is missing and offer the exact install command.
5. Only ask the user for values the repo cannot answer automatically.

## Interaction Model

Keep the workflow conversational and incremental:

1. Explain what was auto-detected.
2. Ask for missing inputs only.
3. Confirm auth mode only when execution requires login.
4. Confirm safety mode only when the requested flow can mutate state.
5. Execute the smallest useful browser task first.
6. Return artifacts and findings, then suggest the next likely browser-QA action.

## Startup Discovery Rules

Inspect, in order:

1. Root `README.md`
2. App-level README files under likely target apps
3. `package.json` scripts at root and target app
4. Known monorepo conventions (`turbo run dev --filter=<app>`, `pnpm dev`, etc.)

If multiple apps are plausible, present the most likely options with a recommendation instead of guessing silently.

## Auth Modes

Support these modes, in order of preference for first-run debugging:

1. `manual-headed` (recommended default)
2. `typed-credentials`
3. `env-credentials`
4. `storage-state`

Rules:

- Never store typed credentials in repo files.
- Never echo raw secrets back into summaries.
- Only reuse storage state when the user explicitly asks.

## Mode Router

### `setup`

1. Detect project runtime and startup candidates.
2. Check Playwright package and browser availability.
3. Return exact install or startup commands if anything is missing.

### `start`

1. Resolve the target app and startup command.
2. Start the app if not already running.
3. Confirm the base URL is reachable.

### `auth`

1. Resolve auth route from repo context when possible.
2. Ask the user for preferred auth mode only if login is required.
3. Document the chosen auth handoff for the current session.

### `inspect`

1. Open the target URL in Playwright.
2. Capture screenshots and console/network issues.
3. Return observations without mutating data.

### `run`

1. Execute a specific browser task or user-requested flow.
2. Use `read-only` unless the user explicitly allows mutations.
3. Capture trace, screenshot, and any blocked step.

### `qa-script`

1. Parse the supplied markdown or JSON test script using `${AGENTS_SKILLS_ROOT}/browser-qa/scripts/parse-qa-script.js`.
2. Execute scenarios in order.
3. Record pass/fail/blocked plus evidence.
4. Summarize with `${AGENTS_SKILLS_ROOT}/browser-qa/scripts/summarize-artifacts.js`.
5. When the repo already includes a reusable script under `qa/browser/scripts/`, prefer using that script as the baseline regression suite and extend it instead of creating a one-off script.
6. Any reusable Markdown script created or updated in `qa/browser/scripts/` must also have a sibling `.xlsx` export generated with `python3 ${AGENTS_SKILLS_ROOT}/qa/scripts/export-user-test-script.py <markdown-path> [xlsx-path]`.

### `report`

Summarize the latest browser-QA run, including:

- target app and URL
- auth mode
- safety mode
- scenarios executed
- pass/fail/blocked counts
- artifact locations
- follow-up recommendations

## Recommended Artifact Layout

Prefer:

```text
qa/browser/
  runs/<timestamp>/
    screenshots/
    traces/
    videos/
    console.json
    network.json
    summary.json
```

If invoked by the `qa` skill inside an epic, store under that epic's `qa/` folder instead.

## Blocker Handling

If blocked, explain plainly which category applies:

- startup_missing
- playwright_missing
- browser_binary_missing
- auth_blocked
- selector_drift
- destructive_not_approved
- qa_script_invalid

For each blocker, include 1-3 concrete recovery steps.

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "browser-qa" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "browser-qa" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this browser-qa run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

