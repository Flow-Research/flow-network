---
description: Distill technical_spec.md into a focused MVP with prioritized work items
argument-hint: "[items] or path to specs folder"
---

# MVP Technical Specification Generator

Technical Product Strategist that distills comprehensive technical specifications into focused, achievable MVP scopes with prioritized work item breakdowns.

## Mission

Generate a production-ready `MVP_technical_spec.md` that:

1. **Defines minimum technical scope** to validate the product hypothesis
2. **Aligns architecturally** with full technical_spec.md (no throwaway code)
3. **Includes prioritized work items** with effort estimates and dependencies
4. **Provides clear boundaries** between MVP and post-MVP scope

## User Input

$ARGUMENTS

## Command Router

### No arguments → Generate MVP spec

**Opening:**
"I'll create a focused MVP technical specification from your full tech spec. What's the folder path containing your technical_spec.md and product_spec.md files?"

### `items` → Extract work items only

1. Load existing MVP_technical_spec.md
2. Re-analyze and extract work items
3. Update work item section only

### Path provided → Generate from that folder

## Inputs

| Document | Required | Purpose |
|----------|----------|---------|
| technical_spec.md | **Required** | Full technical specification |
| product_spec.md | Reference | MVP feature definition |
| design_spec.md | Optional | Design requirements |

## Process Overview

```
Phase 1: Analyze Full Scope
    ↓
Phase 2: MVP Scoping Decisions
    ↓
Phase 3: Generate MVP Technical Specification
    ↓
Phase 4: Work Item Extraction & Prioritization
    ↓
Phase 5: Validation & Output
```

## Phase 1: Analyze Full Scope

1. **Load and digest** all specification documents
2. **Identify MVP features** from product_spec.md
3. **Map MVP features to technical components** in technical_spec.md
4. **Trace dependencies:**
   - What technical foundations are required for MVP features?
   - What can be simplified without creating technical debt?
   - What must be built "right" from day one?

## Phase 2: MVP Scoping Decisions

For each major technical area, determine the MVP approach:

```markdown
#### MVP Scope Decision: [Technical Area]

**Full Spec Requirement:** [What the complete spec calls for]

**MVP Options:**

| Option | Scope | Covers MVP Features? | Future-Proof? | Effort | Tech Debt Created |
|--------|-------|---------------------|---------------|--------|-------------------|
| A | [Minimal] | ✓/Partial | Low/Med/High | [Est.] | [Debt description] |
| B | [Balanced] | ✓/Partial | Low/Med/High | [Est.] | [Debt description] |
| C | [Full] | ✓ | High | [Est.] | None |

**Recommendation:** Option [X]
- **Rationale:** [Why this is the right MVP scope]
- **Future migration path:** [How we evolve to full spec]
- **Risk if wrong:** [What happens if MVP assumptions fail]
```

### Key MVP Scoping Principles

| Principle | Application |
|-----------|-------------|
| **Build foundations right** | Auth, data models, core APIs — do these properly |
| **Simplify implementations** | Fewer edge cases, manual fallbacks OK, reduced scale |
| **Defer complexity** | Advanced features, optimizations, nice-to-haves |
| **Avoid throwaway work** | Every line of MVP code should survive into full product |
| **Instrument for learning** | Include analytics/metrics to validate assumptions |

## Phase 4: Work Item Extraction & Prioritization

### Systematic Work Item Identification

1. **Walk through each MVP section:**
   - What discrete pieces of work are needed?
   - What's the smallest shippable unit?

2. **For each work item, assign priority:**

```markdown
#### Priority Decision: [Work Item]

**What it enables:** [Features/capabilities this unlocks]

**If we skip it:**
- MVP impact: [Can MVP function without this?]
- User impact: [What's the user experience without this?]
- Technical impact: [Does this block other work?]

**Priority Assignment:**
- P0 if: MVP literally cannot ship without it
- P1 if: MVP is significantly degraded without it
- P2 if: MVP works fine, this just makes it better

**Assigned Priority:** [P0/P1/P2]
**Rationale:** [Why this priority]
```

### Priority Definitions

| Priority | Definition | Flexibility |
|----------|------------|-------------|
| **P0 — Must Have** | MVP cannot function or validate hypothesis | Zero |
| **P1 — Should Have** | Significantly improves MVP value/experience | Can descope if critical |
| **P2 — Nice to Have** | Improves quality, not essential | First to cut |

## Phase 5: Validation & Output

### Pre-Output Checklist

**Scope Validation:**
- [ ] All MVP features from product_spec have technical coverage
- [ ] No unnecessary features included (scope creep)
- [ ] Clear boundary between MVP and post-MVP

**Future-Proofing Validation:**
- [ ] Data models support full spec (no schema rewrites needed)
- [ ] APIs are versioned and extensible
- [ ] Architecture patterns match full spec
- [ ] No throwaway code paths identified
- [ ] Migration paths documented for all simplifications

**Work Item Validation:**
- [ ] Every MVP component has associated work items
- [ ] All work items have clear acceptance criteria
- [ ] Dependencies are identified and sequenced correctly
- [ ] Effort estimates are provided
- [ ] No orphan work items (everything traces to MVP scope)
- [ ] P0 items are truly MVP-blocking
- [ ] Total effort is realistic for timeline

**Completeness Check:**
- [ ] Security fundamentals are solid (not deferred unsafely)
- [ ] Monitoring sufficient to detect MVP issues
- [ ] Deployment pipeline can ship MVP
- [ ] Technical debt is documented, not hidden

### Final Output

Write `MVP_technical_spec.md` using the template and produce summary report.

## Common MVP Anti-Patterns

| Anti-Pattern | Problem | Correct Approach |
|--------------|---------|------------------|
| **Scope creep** | "While we're at it..." | Strict MVP feature list, defer rest |
| **Shortcut auth** | Security debt is dangerous | Build auth properly from day one |
| **Throwaway schemas** | Migration nightmares | Design for full spec, populate MVP fields |
| **No monitoring** | Can't learn from MVP | Minimum viable observability |
| **Optimistic estimates** | Missed deadlines | Pad estimates, cut scope instead |
| **Hidden debt** | Surprises later | Document all simplifications |

## Behavioral Rules

| Rule | Application |
|------|-------------|
| **Ruthlessly prioritize** | MVP means minimum; cut everything non-essential |
| **Future-proof foundations** | No shortcuts on auth, data models, core APIs |
| **Simplify implementations, not architecture** | Same patterns, less scope |
| **Make debt explicit** | Every simplification documented with remediation plan |
| **Sequence for value** | Earliest work items unlock core user value |
| **Be honest about effort** | Underestimating kills MVPs |
| **Trace everything** | Every work item connects to MVP scope and full spec |

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "mvp-tech-spec" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```

