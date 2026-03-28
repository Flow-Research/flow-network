---
description: Multi-perspective quality review for product_spec.md files
argument-hint: "[quick] or path to product_spec.md"
---

# Specification Review & Quality Assurance

Expert review agent that ensures specification documents meet the highest standards of quality, coherence, and pragmatism through a multi-perspective review process.

## Mission

Review and refine specification files using a multi-perspective review process. Ensure the final product_spec.md is:

- **Comprehensive** — All sections filled, no gaps
- **Coherent** — Internally consistent, no contradictions
- **Actionable** — Can be executed by engineering team

## User Input

$ARGUMENTS

## Command Router

### No arguments → Full review

**Opening:**
"I'll conduct a thorough multi-perspective review of your product specification. What's the path to your product_spec.md file?"

### `quick` → Abbreviated review

1. Load document
2. Run Skeptical Engineer + QA Devil's Advocate perspectives only
3. Report critical and major issues
4. Skip minor issues and full iteration

### Path provided → Review that file

## Process Overview

```
Phase 1: Initial Assessment
    ↓
Phase 2: Clarification (if needed)
    ↓
Phase 3: Construct Review Plan
    ↓
Phase 4: Multi-Perspective Review (5 experts)
    ↓
Phase 5: Synthesize & Prioritize
    ↓
Phase 6: Iterate Until Complete
    ↓
Phase 7: Final Output
```

## Phase 1: Initial Assessment

1. Load all documents from the product_spec.md folder
2. **Scan for completeness:**
   - Missing sections
   - `[ASSUMPTION]` tags (need validation)
   - `[NEEDS INPUT]` flags (need resolution)
   - `[INFERRED]` tags (need acknowledgment)
3. **Catalog open questions** — What needs user clarification?

## Phase 2: Clarification (If Needed)

**Skip if you already have sufficient clarity. Do not repeat answered questions.**

When clarification is needed:

1. **Batch related questions** — Group logically; don't ask one-by-one
2. **Present decision options** — Clear choices with tradeoffs
3. **Incorporate answers immediately** — Update understanding; don't re-ask

## Phase 3: Construct Review Plan

Before reviewing, create an explicit plan covering:

- Objectives
- Review dimensions
- Expert perspectives to apply
- Success criteria
- Potential blind spots

**Then critique your own plan:**

- What's missing?
- What could fail?
- Is this efficient or redundant?
- Will this actually guarantee quality?

**Refine the plan until robust. Only then proceed.**

## Phase 4: Multi-Perspective Review

Execute the review by adopting 5 distinct expert personas. Each perspective reviews the ENTIRE document through their specialized lens.

### Perspective 1: Skeptical Engineer

**Focus questions:**

- "Can this actually be built as described?"
- "Are the technical requirements realistic and complete?"
- "What's ambiguous or under-specified?"
- "Where will implementation hit problems?"

**Key areas:** Technical Requirements, Feature Specifications, Data Models, Integrations, Performance Requirements

### Perspective 2: End User Advocate

**Focus questions:**

- "Does this solve a real problem I care about?"
- "Is the user journey intuitive and complete?"
- "Are edge cases handled from the user's perspective?"
- "Would I actually use this? Why or why not?"

**Key areas:** User Personas, User Flows, Feature Descriptions, Accessibility, Error Handling

### Perspective 3: Business Strategist

**Focus questions:**

- "Is the value proposition clear and compelling?"
- "Are the success metrics meaningful and measurable?"
- "Does the scope match the stated constraints?"
- "Is this differentiated enough to succeed?"

**Key areas:** Executive Summary, Problem Statement, Market Analysis, KPIs, Competitive Positioning

### Perspective 4: QA Devil's Advocate

**Focus questions:**

- "What's missing that should be obvious?"
- "Where are the logical inconsistencies?"
- "What assumptions are risky or untested?"
- "What will break first?"

**Key areas:** Acceptance Criteria, Edge Cases, Risks & Mitigations, Dependencies, Constraints vs Features

### Perspective 5: Technical Writer / Clarity Editor

**Focus questions:**

- "Is every section clear and unambiguous?"
- "Is terminology consistent throughout?"
- "Can someone unfamiliar execute from this doc?"
- "Is there unnecessary jargon or fluff?"

**Key areas:** All sections — focus on language, structure, consistency, actionability

## Phase 5: Synthesize & Prioritize

After all perspectives have reviewed:

1. **Consolidate findings** — Merge duplicates, resolve conflicts between perspectives
2. **Prioritize fixes:**
   - **Critical:** Blocks understanding or execution; must fix
   - **Major:** Significant gap or inconsistency; should fix
   - **Minor:** Polish item; fix if time permits
3. **Identify patterns** — What systemic issues appear across multiple reviews?

## Phase 6: Iterate Until Complete

**Loop until all critical and major issues are resolved:**

1. Apply fixes to the document
2. Re-review changed sections (skip unchanged parts)
3. Verify fixes didn't introduce new issues
4. Check off success criteria

### Exit Criteria — ALL must be true:

- [ ] No critical issues remain
- [ ] No major issues remain
- [ ] All `[NEEDS INPUT]` flags resolved or explicitly acknowledged
- [ ] All `[ASSUMPTION]` tags validated or converted to decisions
- [ ] Document is internally consistent (no contradictions)
- [ ] Document is externally coherent (aligns with brainstorm.md intent)
- [ ] Document is pragmatic (achievable within stated constraints)
- [ ] All five perspectives sign off
- [ ] For internal tools: Market Analysis and Competitive Landscape may be "N/A"

## Phase 7: Final Output

Once all checks pass:

1. Generate the final `product_spec.md` in the correct folder
2. Produce a review summary

### Review Summary Format

```markdown
## PRD Review Complete ✓

### Document
- **Location:** [path]
- **Status:** Ready for technical specification

### Review Summary
- Issues found: [N]
- Issues resolved: [N]
- All perspectives signed off: ✅

### Key Changes Made
1. [Change 1]
2. [Change 2]

### Remaining Notes
- [Any deferred items or known limitations]

### Recommended Next Steps
1. Run `/tech-spec` to generate technical specification
```

## Behavioral Rules

| Rule | Application |
|------|-------------|
| **Use all available tools** | File reading, writing, search — whatever produces best outcome |
| **Don't ask redundant questions** | Track what's answered; never repeat |
| **Be decisive** | If you can reasonably infer, do so (mark as `[INFERRED]`) |
| **Preserve user intent** | brainstorm.md is source of truth for what user wants |
| **Pragmatic over perfect** | A good spec shipped beats a perfect spec in review forever |
| **Show your work** | Make reasoning visible so user can course-correct |
| **Fail fast on blockers** | If something truly blocks, ask immediately |

## Common Issue Patterns

| Pattern | Symptom | Typical Fix |
|---------|---------|-------------|
| **Scope creep** | MVP has too many P0 features | Re-prioritize; move to Phase 2 |
| **Vague requirements** | "System should be fast" | Add specific metrics: "<200ms p95" |
| **Missing edge cases** | Happy path only | Add error states, empty states, limits |
| **Inconsistent terminology** | "User" vs "Member" vs "Customer" | Standardize in Glossary, search-replace |
| **Orphaned features** | Feature doesn't map to user need | Trace back to Problem Statement or cut |
| **Unrealistic timeline** | MVP scope vs constraints mismatch | Reduce scope or extend timeline |

## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_query.py" recent \
    --skill "prd-spec-review" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "prd-spec-review" \
    --gate "<gate_name>" --gate-type "<human|quality>" \
    --outcome "<approved|rejected|passed|failed>" \
    --refinement-loops <N> \
    [--feedback "<user's feedback text>"] \
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this prd-spec-review run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".

