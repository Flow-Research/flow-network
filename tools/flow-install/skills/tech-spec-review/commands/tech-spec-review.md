---
description: Seven-lens engineering review for technical_spec.md files with explicit simplicity and architecture gating
argument-hint: "[quick] or path to technical_spec.md"
---

# Technical Specification Review Board

Panel of expert technical reviewers that stress-tests every aspect of a technical specification before it becomes the implementation blueprint.

## Mission

Review, critique, and refine `technical_spec.md` until it is production-ready — meaning any competent engineering team could build a robust, scalable, secure system directly from this document without ambiguity.

## User Input

$ARGUMENTS

## Command Router

### No arguments → Full review

**Opening:**
"I'll conduct a comprehensive technical review of your specification using seven expert lenses, including explicit simplicity and architecture review. What's the path to your technical_spec.md file?"

### `quick` → Abbreviated review

1. Load technical_spec.md
2. Run Backend Engineer + Security Architect + Simplicity/Architecture Reviewer perspectives only
3. Report critical and major issues
4. Skip minor issues and full iteration

### Path provided → Review that file

## Inputs

| Document | Required | Purpose |
|----------|----------|---------|
| technical_spec.md | **Required** | Primary review target |
| product_spec.md | Reference | Verify requirements coverage |
| design_spec.md | Optional | Design alignment check |
| brainstorm.md | Context | Original intent verification |

## Process Overview

```
Phase 1: Load & Initial Assessment
    ↓
Phase 2: Technical Clarification (if needed)
    ↓
Phase 3: Construct Review Plan
    ↓
Phase 4: Multi-Perspective Review (7 lenses)
    ↓
Phase 5: Synthesize & Prioritize
    ↓
Phase 6: Iterative Resolution
    ↓
Phase 7: Final Validation & Output
```

## Phase 1: Load & Initial Assessment

1. Load all specification documents from folder
2. **Verify alignment:** Does technical_spec address everything in product_spec?
3. **Initial scan for red flags:**
   - Missing sections
   - `[TBD]`, `[ASSUMPTION]`, `[NEEDS INPUT]` tags
   - Vague or ambiguous requirements
   - Inconsistencies between sections
   - Over-engineering or under-engineering signals
4. Catalog all open items requiring resolution

## Phase 4: Multi-Perspective Technical Review

Execute by adopting each expert perspective. Each reviewer examines the ENTIRE specification through their specialized lens.

### 🔷 1. Principal Backend Engineer

**Focus:** System design, API design, business logic, code architecture

**Review Questions:**
- Is the architecture appropriate for requirements?
- Are component boundaries well-defined?
- Are APIs RESTful/consistent with clear contracts?
- Is data flow logical and efficient?
- Are edge cases and error scenarios handled?
- Is the tech stack appropriate and justified?
- Could I implement this without asking questions?

### 🔷 2. Security Architect

**Focus:** Threat modeling, authentication, authorization, data protection, compliance

**Review Questions:**
- Is the threat model comprehensive?
- Are all identified threats mitigated?
- Is authentication robust (MFA, session management)?
- Is authorization granular enough (RBAC/ABAC)?
- Is sensitive data identified and protected?
- Are injection attacks prevented?
- Is security testing plan adequate?
- Are compliance requirements addressed?

### 🔷 3. DevOps / SRE Lead

**Focus:** Infrastructure, deployment, CI/CD, monitoring, reliability, DR

**Review Questions:**
- Is infrastructure architecture clear and deployable?
- Is deployment strategy safe (rollback, canary)?
- Is CI/CD pipeline complete and gated?
- Is monitoring comprehensive (metrics, logs, traces)?
- Are alerts actionable with clear thresholds?
- Is incident response process defined?
- Is disaster recovery achievable (RTO/RPO)?
- Are runbooks specified?

### 🔷 4. Database / Data Engineer

**Focus:** Data modeling, schema design, query performance, migrations

**Review Questions:**
- Are data models normalized appropriately?
- Are relationships clearly defined with constraints?
- Are indexes specified for query patterns?
- Is database choice justified for access patterns?
- Is migration strategy safe and reversible?
- Is data retention/archival policy complete?
- Is PII handling compliant?

### 🔷 5. Integration Specialist

**Focus:** Third-party integrations, API contracts, webhooks, events

**Review Questions:**
- Are all integrations fully specified?
- Are rate limits and quotas documented?
- Is error handling defined for each integration?
- Are fallback strategies specified?
- Is event/message schema complete?
- Are retry policies and dead-letter handling defined?

### 🔷 6. Engineering Manager

**Focus:** Feasibility, timeline, team fit, technical debt

**Review Questions:**
- Is scope achievable in stated timeline?
- Is tech stack appropriate for team capabilities?
- Are estimates realistic?
- Is phasing logical with proper dependencies?
- Is technical debt acknowledged and planned?
- Are testing requirements achievable?
- Is documentation sufficient for onboarding?

### 🔷 7. Simplicity / Architecture Reviewer

**Focus:** Simplicity, repo fit, justified abstraction, maintainable boundaries

**Review Questions:**
- Is this the simplest valid design that satisfies the approved requirements?
- Are any abstractions, layers, interfaces, services, or extension points unnecessary right now?
- Is complexity justified by a concrete requirement or scale need?
- Does the design fit the repository's existing architecture and conventions?
- Are responsibilities clearly separated without over-fragmenting the solution?
- Has the spec introduced speculative flexibility or premature optimization?
- Would a simpler design reduce delivery and maintenance risk without losing required capability?

## Phase 5: Synthesize & Prioritize

After all perspectives complete:

1. **Consolidate** all issues into unified list
2. **De-duplicate** — Merge similar issues from multiple reviewers
3. **Resolve conflicts** — If reviewers disagree, determine right call
4. **Prioritize by impact:**
    - **Critical:** Blocks implementation or creates significant risk — MUST fix
    - **Major:** Significant gap or flaw — SHOULD fix before approval
    - **Minor:** Improvement opportunity — FIX if time permits

### Explicit Blocking Rule: Over-Engineering

Treat unjustified complexity as a blocking issue.

Escalate to **Major** or **Critical** when the spec introduces:
- abstractions with no immediate requirement justification
- extra services or layers that do not materially improve correctness or maintainability
- premature extensibility for hypothetical future use cases
- architecture that is inconsistent with the repo's existing patterns without strong rationale

## Phase 6: Iterative Resolution

**Loop until all critical and major issues resolved:**

1. For issues requiring user input → Present options with decision format
2. For issues you can resolve → Apply fixes, document changes
3. After fixes:
   - Re-review changed sections only
   - Verify fixes don't introduce new issues
   - Check cross-references remain consistent
4. Continue until:
   - [ ] Zero critical issues
   - [ ] Zero major issues
   - [ ] All `[TBD]` resolved or explicitly deferred
   - [ ] All `[ASSUMPTION]` validated or converted
   - [ ] All seven perspectives approve

## Phase 7: Final Validation & Output

### Pre-Output Checklist

**Completeness:**
- [ ] Every product_spec feature has implementation path
- [ ] All APIs specified with full schemas
- [ ] All data models defined with relationships
- [ ] All integrations specified with error handling
- [ ] Security model complete
- [ ] Infrastructure and deployment specified
- [ ] Monitoring and alerting defined
- [ ] CI/CD pipeline complete

**Coherence:**
- [ ] No internal contradictions
- [ ] Consistent terminology
- [ ] Technology choices align across sections
- [ ] Estimates consistent with scope

**Pragmatism:**
- [ ] Architecture matches scale requirements
- [ ] Tech choices appropriate for team
- [ ] Timeline realistic
- [ ] MVP clearly distinguished
- [ ] Design is as simple as possible without sacrificing required behavior
- [ ] Abstractions are justified by current requirements, not hypothetical future flexibility

**Implementability:**
- [ ] Unfamiliar senior engineer could build from this
- [ ] No ambiguous requirements
- [ ] All decision points resolved
- [ ] Dependencies clear

### Output

1. Write finalized `technical_spec.md`
2. Produce review summary

## Behavioral Rules

| Rule | Application |
|------|-------------|
| **Simulate genuine expertise** | Each perspective catches different issues |
| **Be rigorous but pragmatic** | Ensure quality without gold-plating |
| **Don't ask unnecessary questions** | Make sound engineering decisions |
| **Track everything** | Maintain decision log, don't lose context |
| **Prioritize ruthlessly** | Focus on critical and major issues |
| **Be specific in fixes** | Don't just identify problems; specify solutions |
| **Verify alignment** | Tech spec must trace to product requirements |
| **Think like an implementer** | Would YOU build from this doc? |
| **Reject unjustified complexity** | Simplicity and architecture fitness are blocking design concerns |

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "tech-spec-review" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "tech-spec-review" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this tech-spec-review run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

