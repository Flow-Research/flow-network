# Flow Contribution Protocol

This protocol defines how users of Flow-installed applications contribute back to:

- Flow core
- project-local skills
- shared Flow skills
- shared knowledge in `.jarvis/context/`
- shared memory derived from private or project-local work

This is a Git-native workflow. Contributions move through files, validation scripts, pull requests, and review. There is no separate product submission system in v1.

For the maintainer-specific playbook for promoting a local skill from an installed repo into Flow shared skills, see `skill-promotion-maintainer-playbook.md`.

## Goals

- Keep local work easy to create and validate.
- Make promotion to shared Flow artifacts explicit and reviewable.
- Preserve strong boundaries between private, project-local, and shared knowledge.
- Reuse existing Flow primitives instead of inventing parallel systems.

## Contribution Classes

| Class | Purpose | Canonical home | Review level |
|---|---|---|---|
| `flow-core` | Installer, framework, shared docs, shared automation | repo root, `tools/flow-install/`, shared docs | Flow maintainer |
| `project-local-skill` | Skill useful only inside one installed app or repo | `.agents/skills/` | Project owner |
| `shared-skill-candidate` | Local skill proposed for reuse across Flow installs | Start in `.agents/skills/`, promote to `tools/flow-install/skills/` | Flow maintainer |
| `shared-knowledge` | Durable tracked context or documentation | `.jarvis/context/` tracked files | Scope owner |
| `private-memory` | Personal notes, scratch, drafts, local preferences | `.jarvis/context/private/<username>/` | None by default |
| `shared-memory-candidate` | Reusable memory promoted out of private/project-local work | Stage privately first, then promote into tracked shared context | Scope owner |

## Trust Levels

| Level | Meaning |
|---|---|
| `private-only` | Stays in gitignored personal space |
| `project-reviewed` | Accepted for one installed repo or one project |
| `flow-reviewed` | Accepted as shared Flow framework knowledge or functionality |
| `published` | Distributed by Flow install and expected to work across agent surfaces |

## Source-of-Truth Boundaries

### 1. Flow core

Use for reusable framework logic and docs.

- `tools/flow-install/skills/` — shared Flow skills
- `tools/flow-install/` — installer/runtime logic
- `scripts/flow/` — generated lifecycle behavior source
- `README.md` and shared protocol docs — public framework documentation

### 2. Project-local

Use for repo-specific behavior.

- `.agents/skills/` — repo-local skills
- repo-specific docs and specs — project-only conventions

### 3. Shared tracked knowledge

Use for knowledge that should be available to future contributors and agents.

- `.jarvis/context/README.md`
- `.jarvis/context/AGENTS.md`
- `.jarvis/context/decisions.md`
- `.jarvis/context/docs/*.md`
- `.jarvis/context/technical-debt.md`
- other tracked scope files under `.jarvis/context/`

### 4. Private memory

Use for material that should not be committed or generalized automatically.

- `.jarvis/context/private/<username>/`
- `.jarvis/context/local.md`
- gitignored personal root files documented in `personal-context-protocol.md`

## Required Decision Rule

Before creating or editing anything, the contributor must answer:

1. Is this private, project-local, or shared?
2. Is this a skill, a framework change, knowledge, or memory?
3. Does it need review at the project level or Flow level?

If the answer is unclear, default to the narrower scope first:

- private before shared
- local before Flow-wide
- candidate before published

## Execution Workflow

## Phase 1: Classify

Decide which path applies.

### Path A: Flow core

Use when changing installer behavior, shared docs, shared scripts, or shared Flow skills.

### Path B: Project-local skill

Use when building behavior that belongs only to one installed repo.

### Path C: Shared skill candidate

Use when a local skill has proven reusable value and should be proposed for Flow-wide distribution.

### Path D: Shared knowledge or shared memory candidate

Use when work produced a reusable fact, decision, pattern, or event that future contributors and agents should see.

### Path E: Private memory

Use when content is personal, machine-specific, tentative, sensitive, or not ready for publication.

## Phase 2: Stage in the narrowest valid scope

### Flow core

Edit the shared source directly in this repo and prepare a normal PR.

### Project-local skill

Create or edit the skill in:

```text
.agents/skills/<skill-name>/
```

Run:

```bash
pnpm skills:validate
pnpm skills:register
pnpm harness:verify
```

### Shared skill candidate

Start as a project-local skill first. Do not create directly in `tools/flow-install/skills/` unless the work is already clearly framework-owned.

The candidate must accumulate:

- a real downstream use case
- generic naming
- no project-specific assumptions
- complete governance metadata
- docs and validation evidence

### Shared knowledge / shared memory candidate

Draft privately first. Use the private area or a project-local notes file while deciding whether it should become tracked shared context.

Each candidate must state:

- artifact type: `fact`, `decision`, `preference`, or `event`
- target scope
- source or evidence
- confidence level
- author
- why it should be shared

### Private memory

Store it under:

```text
.jarvis/context/private/<username>/
```

No promotion is implied.

## Phase 3: Validate

## Skills

For any skill contribution:

1. validate skill structure and metadata
2. register it into the local agent environment
3. verify harness parity

Required commands:

```bash
pnpm skills:validate
pnpm skills:register
pnpm harness:verify
```

Minimum correctness checks:

- catalog and manifest consistency
- required metadata present
- no duplicate skill name collisions
- correct installation visibility across OpenCode and Claude

## Knowledge and memory

Before promotion to shared tracked context, check:

- correct scope placement
- no personal or machine-specific paths
- no secrets, credentials, or scratch notes
- clear distinction between fact and inference
- explicit provenance
- no unresolved contradiction with current tracked context

## Flow core

Before merge, check:

- docs align with installed behavior
- lifecycle commands still work
- harness verification still passes
- any new contribution rules are reflected in canonical docs

## Phase 4: Review

| Artifact | Reviewer |
|---|---|
| Project-local skill | Project owner or maintainer |
| Shared skill candidate | Flow maintainer |
| Shared project knowledge | Project scope owner |
| Shared Flow knowledge/protocol | Flow maintainer |
| Private memory | No reviewer unless promoted |

Review questions:

1. Is this in the correct scope?
2. Is the metadata complete?
3. Is anything sensitive or private being over-shared?
4. Does this duplicate an existing artifact?
5. If promoted, is it reusable enough to justify shared status?

## Phase 5: Promote

Promotion is always explicit.

### Local skill -> shared Flow skill

Promote only after review. When accepted:

1. move or recreate the skill under `tools/flow-install/skills/`
2. update catalog and related docs
3. re-run validation and harness parity checks
4. record reviewer and ownership in the PR or publish log once that log exists

### Private/project-local memory -> shared tracked knowledge

Promote by copying only the reusable portion into the correct tracked file under `.jarvis/context/`.

Do not move entire raw notes wholesale. Shared artifacts must be normalized, concise, and provenance-backed.

## Phase 6: Distribute and audit

After acceptance:

- re-run `pnpm skills:register` if a skill changed
- re-run `pnpm harness:verify` for shared or promoted skills
- ensure docs point to the canonical artifact location
- ensure ownership and approval are visible in Git history and PR review

## Promotion Criteria

## Shared skill candidate promotion criteria

All of the following should be true:

- solves a problem likely to recur across Flow installs
- name and docs are generic rather than project-branded
- required permissions and blast radius are justified
- passes local validation and parity checks
- includes enough docs for a cold-start contributor to use it
- has an assigned maintainer

## Shared knowledge or memory promotion criteria

All of the following should be true:

- useful beyond one contributor's immediate workflow
- non-sensitive and non-machine-specific
- belongs in a tracked shared scope
- backed by evidence or clearly labeled as a decision or preference
- does not silently conflict with existing tracked knowledge

## Rejection Rules

Reject or keep local/private if any of the following are true:

- contains personal notes, secrets, or machine-specific details
- only makes sense inside one repo or one temporary initiative
- duplicates existing shared knowledge without superseding it
- lacks provenance or ownership
- fails parity or validation gates

## Shared Memory Normalization Rules

When promoting memory into tracked shared context:

1. Rewrite raw notes into durable statements.
2. Keep opinions labeled as preferences unless they are accepted decisions.
3. Put architecture and policy in canonical shared docs, not random scratch files.
4. If a new item replaces an old item, state that relationship explicitly.
5. Never publish private-user scope contents verbatim.

## Suggested Provenance Fields for shared memory candidates

Use these fields in the staged note or PR description:

- `type`
- `target_scope`
- `author`
- `source`
- `confidence`
- `review_status`
- `supersedes` or `replaces` when relevant

## Correctness Evaluation Plan

This section defines how to evaluate whether the protocol is working correctly.

### 1. Placement correctness

Question: did the contribution land in the right home?

Checks:

- shared skills exist only in `tools/flow-install/skills/`
- repo-specific skills exist only in `.agents/skills/`
- private memory stays in `.jarvis/context/private/<username>/`
- tracked shared knowledge stays in the appropriate tracked context files

Failure examples:

- a project-specific skill promoted into shared Flow paths
- user scratch notes committed into `.jarvis/context/`

### 2. Boundary correctness

Question: were privacy and scope boundaries preserved?

Checks:

- no absolute personal filesystem paths in tracked shared docs
- no `.env`, credentials, private preferences, or drafts promoted into shared files
- no user-specific content stored under tracked scope files unless intentionally shared and reviewed

Failure examples:

- `local.md` details copied into shared context
- personal preferences published as org-wide defaults

### 3. Metadata correctness

Question: does the artifact carry the metadata needed for governance and future promotion?

Checks:

- skills have owner, version, blast radius, permissions, data categories, and egress metadata
- shared memory candidates have type, target scope, provenance, confidence, and review status

Failure examples:

- accepted shared skill with no owner
- promoted knowledge with no evidence trail

### 4. Scope correctness

Question: was shared knowledge promoted to the correct scope and no broader?

Checks:

- project knowledge lands in project-level tracked context
- Flow-wide protocol changes land in shared framework docs
- private user material remains under the user scope mapping in `_scopes.yaml`

Failure examples:

- project convention written as Flow-global protocol
- Flow-global decision hidden in one private notebook

### 5. Parity correctness

Question: does an accepted skill behave as a first-class Flow artifact across supported agent surfaces?

Checks:

- `pnpm skills:register` completes successfully
- `pnpm harness:verify` stays green
- the skill resolves correctly in OpenCode and Claude environments

Failure examples:

- skill appears in one environment but not the other
- shared skill passes locally but breaks install parity

### 6. Promotion correctness

Question: can a project-local contribution be promoted to shared Flow with minimal rework?

Checks:

- candidate started with reusable naming
- docs are generic enough for other installs
- governance metadata is already complete
- no hidden project assumptions remain

Failure examples:

- a good local skill cannot be promoted because it hardcodes repo structure or team names

### 7. Knowledge correctness

Question: is shared knowledge accurate, durable, and understandable?

Checks:

- fact vs decision vs preference vs event is correctly classified
- provenance exists
- confidence is stated where uncertainty remains
- existing tracked context is updated rather than contradicted silently

Failure examples:

- stale assumptions preserved as facts
- conflicting architecture decisions left unresolved

### 8. Review correctness

Question: did the right reviewer approve the right artifact?

Checks:

- local skills reviewed by project owners
- shared Flow skills reviewed by Flow maintainers
- org/project knowledge reviewed by the relevant scope owner

Failure examples:

- high-blast-radius shared skill merged without maintainer review

### 9. Contributor UX correctness

Question: can a first-time contributor follow the workflow without extra tribal knowledge?

Checks:

- they can classify the artifact in under 2 minutes
- they can find the canonical location quickly
- they know which commands to run
- they know whether the artifact should stay local, private, or be proposed for promotion

Failure examples:

- contributors ask where to put the same type of artifact repeatedly
- contributors skip validation because the protocol is unclear

### 10. Regression correctness

Question: do protocol docs and installer behavior stay aligned over time?

Checks:

- contribution docs reference real current commands
- harness verification still reflects shared skill expectations
- README, protocol docs, and generated agent instructions remain consistent

Failure examples:

- docs recommend commands no longer generated by `flow-install`

## Acceptance Criteria

The protocol is considered correct when all of the following are true:

1. A contributor can add a repo-local skill and validate it without touching Flow core.
2. A maintainer can promote a good local skill into shared Flow skills using a documented path.
3. A contributor can keep private memory private by default.
4. A reviewer can promote reusable knowledge into tracked shared context with provenance and scope discipline.
5. Shared/private boundaries remain intact.
6. Shared skill changes preserve OpenCode and Claude parity.
7. A first-time contributor can complete one common path in under 10 minutes.

## Recommended Initial Rollout

Start with two pilot paths:

1. local skill -> validated local install -> proposed shared skill candidate
2. private note -> normalized shared knowledge entry in `.jarvis/context/`

If both paths are smooth, add templates and automation on top. Do not automate promotion before the human review and scope rules are stable.
