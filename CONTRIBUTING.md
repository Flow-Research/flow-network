# Contributing to Flow

Flow uses a Git-native contribution model for framework changes, shared skills, project-local skills, and shared knowledge or memory.

Start here:

- protocol: `.jarvis/context/docs/contribution-protocol.md`
- maintainer promotion playbook: `.jarvis/context/docs/skill-promotion-maintainer-playbook.md`
- context rules: `.jarvis/context/README.md`
- personal/private boundary: `.jarvis/context/docs/personal-context-protocol.md`

## Quick Routing

Use this decision tree first.

### I changed Flow itself

Examples:

- installer behavior
- shared docs
- shared lifecycle scripts
- shared Flow skills in `tools/flow-install/skills/`

Use the `flow-core` path in `.jarvis/context/docs/contribution-protocol.md`.

### I built a skill for one installed app or one repo

Put it in:

```text
.agents/skills/
```

Then run:

```bash
pnpm skills:validate
pnpm skills:register
pnpm harness:verify
```

Use the `project-local-skill` path in `.jarvis/context/docs/contribution-protocol.md`.

### I think a local skill should ship with Flow

Treat it as a `shared-skill-candidate` first. Do not skip the local-skill stage.

Promotion rules live in `.jarvis/context/docs/contribution-protocol.md`.

### I learned something useful during work

If it is reusable and safe to share, follow the `shared-knowledge` or `shared-memory-candidate` path.

If it is personal, tentative, or machine-specific, keep it in:

```text
.jarvis/context/private/<username>/
```

### I am not sure whether something should be shared

Default to the narrower scope first:

- private before shared
- local before Flow-wide
- candidate before published

## Core Validation Commands

```bash
pnpm skills:validate
pnpm skills:register
pnpm harness:verify
```

## Non-Negotiable Rules

- Do not commit `.env` files or secrets.
- Do not copy private or machine-specific context into tracked shared docs.
- Do not publish personal notes verbatim from `.jarvis/context/private/<username>/`.
- Do not promote repo-specific skills into shared Flow paths without review.

## Review Expectations

- Project-local skills: project owner review
- Shared Flow skills and protocol changes: Flow maintainer review
- Shared knowledge or memory: relevant scope owner review
