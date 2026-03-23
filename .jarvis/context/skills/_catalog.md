# Skill Catalog (Unified)

This catalog is the single discovery layer for **all skills and plugins** across OpenCode, openclaw, and n8n. It is **readable by humans and agents** and should be updated whenever a skill is published or updated.

> Lifecycle currently stops at **MAINTAIN** (no deprecation phase).

## Entry Format

```yaml
---
name: example-skill
type: opencode                    # opencode | openclaw | n8n
version: 1.0.0
status: active                    # active | experimental
owner: julian
blast_radius: high                # low | medium | high
description: "Short description of what this skill does"
location: tools/flow-install/skills/example-skill
invoke: "/example-skill"            # command or trigger
permissions: []                   # required scopes/privileges
data_categories: []               # pii | financial | credentials | none
egress: []                        # allowed outbound destinations
phase: P2                         # delivery phase(s)
tags: [planning, discovery]
depends_on: []                    # other skills this requires
created: 2026-02-20
updated: 2026-02-20
---
```

---
name: skill-create
type: opencode
version: 0.1.0
status: active
owner: julian
blast_radius: low
description: "Scaffold new skills with manifest and catalog entry."
location: tools/flow-install/skills/skill-create
invoke: "/skill-create"
permissions: [read, write]
data_categories: [none]
egress: []
phase: P0
tags: [skills, governance]
depends_on: []
created: 2026-03-16
updated: 2026-03-16
---

---
name: skill-validate
type: opencode
version: 0.1.0
status: active
owner: julian
blast_radius: medium
description: "Validate skill manifest, catalog entry, and blast-radius gates."
location: tools/flow-install/skills/skill-validate
invoke: "/skill-validate"
permissions: [read]
data_categories: [none]
egress: []
phase: P0
tags: [skills, governance]
depends_on: []
created: 2026-03-16
updated: 2026-03-16
---

---
name: skill-publish
type: opencode
version: 0.1.0
status: active
owner: julian
blast_radius: high
description: "Publish a skill with approval gates, catalog update, and audit log."
location: tools/flow-install/skills/skill-publish
invoke: "/skill-publish"
permissions: [write]
data_categories: [none]
egress: []
phase: P0
tags: [skills, governance]
depends_on: [skill-validate]
created: 2026-03-16
updated: 2026-03-16
---

---
name: brainstorm
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Collaborative brainstorming facilitator that develops raw ideas into well-defined concepts."
location: tools/flow-install/skills/brainstorm
invoke: "/brainstorm"
permissions: [write]
data_categories: [pii]
egress: []
phase: P2
tags: [planning, discovery]
depends_on: []
created: 2026-03-16
updated: 2026-03-16
---

---
name: prd
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Transform brainstorm.md into a comprehensive Product Specification Document."
location: tools/flow-install/skills/prd
invoke: "/prd"
permissions: [write]
data_categories: [pii]
egress: []
phase: P2
tags: [planning, spec]
depends_on: [brainstorm]
created: 2026-03-16
updated: 2026-03-16
---

---
name: prd-spec-review
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Multi-perspective quality review for product_spec.md files."
location: tools/flow-install/skills/prd-spec-review
invoke: "/prd-spec-review"
permissions: [write]
data_categories: [pii]
egress: []
phase: P2
tags: [review, spec]
depends_on: [prd]
created: 2026-03-16
updated: 2026-03-16
---

---
name: tech-spec
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Generate production-ready technical specifications from product specs."
location: tools/flow-install/skills/tech-spec
invoke: "/tech-spec"
permissions: [write]
data_categories: [pii]
egress: []
phase: P2
tags: [architecture, spec]
depends_on: [prd]
created: 2026-03-16
updated: 2026-03-16
---

---
name: tech-spec-review
type: opencode
version: 0.2.2
status: experimental
owner: julian
blast_radius: medium
description: "Seven-lens engineering review for technical_spec.md files, including an explicit simplicity and architectural fitness gate."
location: tools/flow-install/skills/tech-spec-review
invoke: "/tech-spec-review"
permissions: [write]
data_categories: [pii]
egress: []
phase: P2
tags: [review, spec]
depends_on: [tech-spec]
created: 2026-03-16
updated: 2026-03-16
---

---
name: mvp-tech-spec
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Distill technical_spec.md into a focused MVP with prioritized work items."
location: tools/flow-install/skills/mvp-tech-spec
invoke: "/mvp-tech-spec"
permissions: [write]
data_categories: [pii]
egress: []
phase: P3
tags: [planning, mvp]
depends_on: [tech-spec]
created: 2026-03-16
updated: 2026-03-16
---

---
name: engineer
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: high
description: "Autonomous full-stack development agent that implements technical specifications with high test coverage."
location: tools/flow-install/skills/engineer
invoke: "/engineer"
permissions: [write]
data_categories: [pii]
egress: []
phase: P4
tags: [engineering, implementation]
depends_on: [mvp-tech-spec]
created: 2026-03-16
updated: 2026-03-16
---

---
name: code-review
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Expert code reviewer ensuring implementations are simple, requirement-compliant, and architecturally sound."
location: tools/flow-install/skills/code-review
invoke: "/code-review"
permissions: [write]
data_categories: [pii]
egress: []
phase: P4
tags: [review, engineering]
depends_on: [engineer]
created: 2026-03-16
updated: 2026-03-16
---

---
name: qa
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Quality Assurance agent for test execution, coverage analysis, bug identification, and browser-QA delegation."
location: tools/flow-install/skills/qa
invoke: "/qa"
permissions: [write]
data_categories: [pii]
egress: []
phase: P5
tags: [qa, testing]
depends_on: [engineer]
created: 2026-03-16
updated: 2026-03-16
---

---
name: build-e2e
type: opencode
version: 0.2.2
status: experimental
owner: julian
blast_radius: high
description: "End-to-end product development orchestrator with human-in-the-loop reviews and spec-root resolution across Flow-compatible repositories."
location: tools/flow-install/skills/build-e2e
invoke: "/build-e2e"
permissions: [write]
data_categories: [pii]
egress: []
phase: P3
tags: [orchestration, pipeline]
depends_on: [brainstorm, prd, prd-spec-review, tech-spec, tech-spec-review, mvp-tech-spec, engineer, qa]
created: 2026-03-16
updated: 2026-03-16
---

---
name: cto
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Battle-tested CTO providing strategic technical leadership and structured notes."
location: tools/flow-install/skills/cto
invoke: "/cto"
permissions: [write]
data_categories: [pii]
egress: []
phase: P1
tags: [strategy, leadership]
depends_on: []
created: 2026-03-16
updated: 2026-03-16
---

---
name: semver
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Manage semantic versioning with VERSION file + CHANGELOG.md for any codebase."
location: tools/flow-install/skills/semver
invoke: "/semver"
permissions: [write]
data_categories: [none]
egress: []
phase: P1
tags: [versioning]
depends_on: []
created: 2026-03-16
updated: 2026-03-16
---

---
name: git-commit
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Interactive git commit flow with branch selection and contextual commit messages."
location: tools/flow-install/skills/git-commit
invoke: "/git-commit"
permissions: [read, write, execute]
data_categories: [none]
egress: []
phase: P1
tags: [git, commit, branching, automation]
depends_on: []
created: 2026-03-16
updated: 2026-03-16
---

---
name: community-skills-install
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Install community skills from antigravity-awesome-skills with bundle filtering and catalog merging."
location: tools/flow-install/skills/community-skills-install
invoke: "/install-skills"
permissions: [read, write, execute]
data_categories: [none]
egress: [github.com]
phase: P1
tags: [skills, community, sync]
depends_on: []
created: 2026-03-16
updated: 2026-03-16
---

---
name: jarvis
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Bridge to Jarvis CLI for scheduling, journaling, and context management."
location: tools/flow-install/skills/jarvis
invoke: "/jarvis"
permissions: [write]
data_categories: [credentials]
egress: [api.anthropic.com]
phase: P6
tags: [productivity, assistant]
depends_on: []
created: 2026-03-16
updated: 2026-03-16
---

---
name: tmux-agent-launcher
type: opencode
version: 0.1.0
install_scope: global
status: experimental
owner: julian
blast_radius: medium
description: "Launch Claude or OpenCode in a named tmux session from the command line or a skill wrapper."
location: tools/flow-install/skills/tmux-agent-launcher
invoke: "/tmux-agent-launcher"
permissions: [execute]
data_categories: [none]
egress: [none]
phase: P1
tags: [tmux, automation, agents]
depends_on: []
created: 2026-03-22
updated: 2026-03-22
---

---
name: browser-qa
type: opencode
version: 0.2.2
status: experimental
owner: julian
blast_radius: high
description: "Playwright-based browser QA skill for guided setup, auth handoff, scripted runs, and artifact capture across Flow-compatible repositories."
location: tools/flow-install/skills/browser-qa
invoke: "/browser-qa"
permissions: [read, write, execute]
data_categories: [credentials, pii]
egress: []
phase: P5
tags: [qa, browser, playwright]
depends_on: [qa]
created: 2026-03-23
updated: 2026-03-23
---

---
name: ci-logs
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: low
description: "Download and parse GitHub Actions logs to identify failures."
location: tools/flow-install/skills/ci-logs
invoke: "/ci-logs"
permissions: [read:actions]
data_categories: [none]
egress: [api.github.com, github.com]
phase: P5
tags: [ci, github, logs]
depends_on: []
created: 2026-03-23
updated: 2026-03-23
---

---
name: ci-rerun
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: low
description: "Re-run GitHub Actions workflow runs (full or failed jobs only)."
location: tools/flow-install/skills/ci-rerun
invoke: "/ci-rerun"
permissions: [write:actions]
data_categories: [none]
egress: [api.github.com, github.com]
phase: P5
tags: [ci, github, rerun]
depends_on: [ci-watch]
created: 2026-03-23
updated: 2026-03-23
---

---
name: ci-fix
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: high
description: "Iteratively diagnose and fix failing GitHub Actions runs until CI passes or safely escalates."
location: tools/flow-install/skills/ci-fix
invoke: "/ci-fix"
permissions: [read, write, execute]
data_categories: [none]
egress: [api.github.com, github.com]
phase: P5
tags: [ci, github, remediation]
depends_on: [ci-logs, ci-watch]
created: 2026-03-23
updated: 2026-03-23
---

---
name: ci-watch
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: low
description: "Monitor GitHub Actions workflow runs and report status."
location: tools/flow-install/skills/ci-watch
invoke: "/ci-watch"
permissions: [read:actions]
data_categories: [none]
egress: [api.github.com, github.com]
phase: P5
tags: [ci, github, monitoring]
depends_on: []
created: 2026-03-23
updated: 2026-03-23
---

---
name: github-issue-create
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Create GitHub issues with structured inputs and optional project-board placement."
location: tools/flow-install/skills/github-issue-create
invoke: "/github-issue-create"
permissions: [write]
data_categories: [pii]
egress: [api.github.com, github.com]
phase: P5
tags: [github, issues, automation]
depends_on: []
created: 2026-03-23
updated: 2026-03-23
---

---
name: issue-flow
type: opencode
version: 0.2.0
status: experimental
owner: julian
blast_radius: high
description: "Drive one GitHub issue through clarification recovery, specs, implementation, regression generation, test generation, validation, QA, simplicity review, PR, and acceptance with enforced human review gates and quality gates."
location: tools/flow-install/skills/issue-flow
invoke: "/issue-flow"
permissions: [read, write, execute]
data_categories: [none]
egress: [api.github.com, github.com]
phase: P3
tags: [issues, orchestration, delivery]
depends_on: [build-e2e, spec-to-regression, api-integration-codegen, browser-integration-codegen, test-quality-validator, qa]
created: 2026-03-23
updated: 2026-03-23
---

---
name: context-sync
type: opencode
version: 0.3.0
status: beta
owner: julian
blast_radius: high
description: "Safe repo pull/push workflow that targets the repository integration branch, uses deterministic planning, and keeps PRs moving with a bounded autonomous resolution loop."
location: tools/flow-install/skills/context-sync
invoke: "/context-sync"
permissions: [read, write, execute]
data_categories: [credentials]
egress: [api.github.com, github.com]
phase: P6
tags: [git, sync, pr]
depends_on: []
created: 2026-03-23
updated: 2026-03-23
---

---
name: local-run
type: opencode
version: 0.1.0
status: experimental
owner: julian
blast_radius: medium
description: "Prepare accurate local run instructions and optional Docker assets for a repository."
location: tools/flow-install/skills/local-run
invoke: "/local-run"
permissions: [write]
data_categories: [credentials]
egress: []
phase: P5
tags: [devops, docker, docs]
depends_on: []
created: 2026-03-23
updated: 2026-03-23
---

---
name: spec-to-regression
type: opencode
version: 0.2.2
status: experimental
owner: julian
blast_radius: medium
description: "Generate structured browser and API regression scenarios from approved specs using the Flow delivery profile and regression artifact contract."
location: tools/flow-install/skills/spec-to-regression
invoke: "/spec-to-regression"
permissions: [read-source, read-specs, write-regression-specs, write-coverage-matrix]
data_categories: [none]
egress: []
phase: P4
tags: [testing, regression, spec]
depends_on: [build-e2e, tech-spec-review]
created: 2026-03-23
updated: 2026-03-23
---

---
name: api-integration-codegen
type: opencode
version: 0.2.2
status: experimental
owner: julian
blast_radius: medium
description: "Generate API integration test suites from Flow regression artifacts using profile-driven suite metadata, helper imports, and project adapters."
location: tools/flow-install/skills/api-integration-codegen
invoke: "/api-integration-codegen"
permissions: [read-source, read-regression-spec, write-test-suites, execute-scripts]
data_categories: [none]
egress: []
phase: P4
tags: [testing, codegen, api]
depends_on: [spec-to-regression]
created: 2026-03-23
updated: 2026-03-23
---

---
name: browser-integration-codegen
type: opencode
version: 0.2.1
status: experimental
owner: julian
blast_radius: medium
description: "Generate browser integration test suites from Flow regression artifacts using profile-driven fixtures, imports, and selector verification."
location: tools/flow-install/skills/browser-integration-codegen
invoke: "/browser-integration-codegen"
permissions: [read-source, read-regression-spec, read-dom-artifacts, write-test-suites, execute-scripts]
data_categories: [none]
egress: []
phase: P4
tags: [testing, codegen, browser]
depends_on: [spec-to-regression, browser-qa]
created: 2026-03-23
updated: 2026-03-23
---

---
name: test-quality-validator
type: opencode
version: 0.2.1
status: experimental
owner: julian
blast_radius: low
description: "Validate generated or maintained tests for coverage completeness, correctness, and false-green risks using Flow regression artifacts and delivery-profile rules."
location: tools/flow-install/skills/test-quality-validator
invoke: "/test-quality-validator"
permissions: [read-source, read-specs, read-regression-specs, read-test-files, write-reports]
data_categories: [none]
egress: []
phase: P5
tags: [testing, validation, qa]
depends_on: [spec-to-regression, api-integration-codegen, browser-integration-codegen]
created: 2026-03-23
updated: 2026-03-23
---

## Notes

- **Owner is required**. If unowned, default to Julian.
- **Blast radius drives approvals** (low/medium self-publish, high needs explicit approval).
- **permissions/data_categories/egress** are mandatory for medium/high skills.
- Keep entries concise and consistent. This file is a registry, not a full spec.
- For skills that read command docs, use installed paths in `SKILL.md`: `${AGENTS_SKILLS_ROOT}/<skill-name>/commands/<file-name>.md`.
