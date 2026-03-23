---
name: local-run
description: "Prepare accurate local run instructions and optional Docker assets for a repository. Use when a project needs clearer setup docs, a Dockerfile, or docker-compose scaffolding for local development."
disable-model-invocation: true
allowed-tools: Read, Write, ApplyPatch, Grep, Glob, Bash
argument-hint: "[docker|readme|analyze]"
---

# Local Run

## Purpose

Help a repository become runnable locally with accurate documentation, optional Docker assets, and explicit verification of what actually works.

## Inputs

- optional mode: `docker`, `readme`, or `analyze`

- Template paths are resolved from `${AGENTS_SKILLS_ROOT}/local-run/`.

## Steps

1. Follow the command contract in `${AGENTS_SKILLS_ROOT}/local-run/commands/local-run.md`.
2. Inspect the repository to identify runtime, package manager, service dependencies, and likely run modes.
3. Prefer updating existing Docker and README assets over replacing them blindly.
4. Use `${AGENTS_SKILLS_ROOT}/local-run/templates/Dockerfile` and `${AGENTS_SKILLS_ROOT}/local-run/templates/docker-compose.yml` only as starting points; adapt them to the actual stack.
5. Do not claim a run path works until the commands or generated artifacts are verified.

## Output

- local run analysis summary
- optional Dockerfile and docker-compose scaffolding
- updated README or setup instructions grounded in verified commands
