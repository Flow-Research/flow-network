---
description: Scaffold and maintain a reusable Docker dev container baseline with spec-driven validation across supported base images.
argument-hint: "[scaffold|validate|update] [target-dir]"
---

# Dev Container Command Contract

## Goal

Create or maintain a portable dev-container bundle that can live outside the inspected repo, while still adapting to repo context and validating container state from a declarative spec.

## Supported Base Strategies (v1)

- `alpine` with `apk`
- `debian` with `apt`
- `ubuntu` with `apt`
- `custom` image, only if the user provides a compatible package manager supported by this skill in v1

## Required Interactive Intake

Before scaffolding or materially changing the container contract, ask the user:

1. Which source repo or working directory should be inspected
2. Which output location should hold the generated bundle
3. Which container bundle name should be used if the default context-derived one is not desired
4. Which base image family they want
5. The exact base image tag they want to start from
6. Which package manager applies (`apk` or `apt` in v1)
7. Which tools are required in every container
8. Which optional feature packs should be included
9. Whether passwordless `sudo` should be configured for the dev user
10. Which repo-specific validation commands should run inside the container

If the repo clearly suggests defaults, recommend them first, but still ask. The default save path should be `~/containers/<repo-slug>/<container-name>/`, not inside the repo.

## Modes

### `scaffold` (default)

Create a bundle root in the chosen output directory.

1. Resolve the source directory from `$ARGUMENTS`; default to the current working directory.
2. Derive a repo slug from the source directory name.
3. Derive a sensible container name from repo context; default to `dev-baseline` if no better name is obvious.
4. Default the output path to `~/containers/<repo-slug>/<container-name>/` unless the user overrides it.
5. Run `${AGENTS_SKILLS_ROOT}/dev-container/scripts/recommend_features.py <source-dir>`.
6. Ask the interactive intake questions, presenting recommendations when possible.
7. Run `${AGENTS_SKILLS_ROOT}/dev-container/scripts/scaffold.py --output <bundle-dir>`.
8. Update `<bundle-dir>/specs/dev-baseline.json` with the chosen base image, package manager, feature packs, required binaries, and validation commands.
9. Update package manifests in `<bundle-dir>/baseline/` and `<bundle-dir>/features/` rather than hardcoding tool installs directly into the Dockerfile.

### `update`

Adjust an existing bundle root.

1. Inspect the existing bundle root at the chosen output path.
2. Re-run `${AGENTS_SKILLS_ROOT}/dev-container/scripts/recommend_features.py <source-dir>`.
3. Ask follow-up questions only where the current contract is ambiguous or the user's request changes the baseline.
4. Apply changes to the baseline manifests, feature packs, validation spec, and documentation together.

### `validate`

Validate the current container state against the spec.

1. Ensure the bundle root already exists.
2. Run `<bundle-root>/scripts/run-validation.sh` from the bundle root or by absolute path.
3. Report pass/fail and summarize the first actionable failures rather than dumping raw logs.

## Required Structure in Bundle Root

```text
<bundle-root>/
  Dockerfile
  README.md
  baseline/apk.txt
  baseline/apt.txt
  baseline/npm.txt
  baseline/pip.txt
  features/<feature>/apk.txt
  features/<feature>/apt.txt
  specs/dev-baseline.json
  scripts/install-system-packages.sh
  scripts/installers/apk.sh
  scripts/installers/apt.sh
  scripts/build-image.sh
  scripts/run-container.sh
  scripts/run-validation.sh
  scripts/validate-container.py
```

## Baseline Rules

- Keep common tools in the family-specific baseline manifest.
- Keep specialized tools in feature packs under `features/<feature>/`.
- Treat the validation spec as the source of truth for state verification.
- Keep validation runnable inside the container; host wrappers only orchestrate build/run/exec.
- Do not assume the source repo is mounted automatically. Mount it only when an interactive shell or repo-specific validation command needs it.
- For unsupported package managers, stop and say the current v1 support does not cover that base image yet.

## Suggested Repo Adaptations

- `Cargo.toml` present -> recommend `rust`
- existing Docker assets present -> recommend `docker`
- Postgres usage -> recommend `postgres`
- SQLite usage -> recommend `sqlite`

## Validation Contract

The validator should prove, at minimum:

- required system packages are installed for the chosen package manager
- required binaries are in `PATH`
- version commands match expected patterns where specified
- the current user/group configuration matches the spec
- required paths exist
- custom commands exit successfully

## Maintenance Rule

When the baseline install set changes, update all three layers together:

1. package manifests (`baseline/` or `features/`)
2. validation spec (`specs/`)
3. documentation (`README.md`)

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "dev-container" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```

