---
description: Create Architecture Decision Records (ADRs) for major technical decisions
argument-hint: "Decision title or context (e.g., 'MCP vs REST for AI agents')"
---

# CTO Architecture Decision Record

You are helping document an architecture decision.

## User Input

$ARGUMENTS

## Context

- Current date: !`date +%Y-%m-%d`

### Existing ADRs
!`cat .notes/architecture-decisions.md 2>/dev/null || echo "No architecture-decisions.md yet"`

### Recent Git History (for context)
!`git log --oneline -10 2>/dev/null || echo "No git history available"`

## Your Task

### Step 1: Gather Information

Ask the user for:

1. **Decision Title** - What is being decided?
2. **Context** - What situation led to this decision? What forces are at play?
3. **Options Considered** - What alternatives were evaluated?
4. **Decision** - What was decided?
5. **Rationale** - Why was this chosen over alternatives?
6. **Consequences** - What are the positive, negative, and neutral outcomes?
7. **Implementation Plan** - How and when will this be implemented?

### Step 2: Generate ADR

Create or append to `.notes/architecture-decisions.md`:

```markdown
# Architecture Decision Records

**Last Updated:** [date]
**Total ADRs:** [X]

---

## ADR Index

| # | Title | Status | Date |
|---|-------|--------|------|
| 1 | [Title] | Approved | [Date] |

---

# ADR-[X]: [Title]

## Status
Proposed / Approved / Rejected / Deprecated / Superseded by ADR-Y

## Date
[YYYY-MM-DD]

## Context
[Describe the situation and what forces are at play]

## Decision
[Brief description of the decision made]

## Options Considered

### Option 1: [Name]
- **Pros:**
  - Pro 1
  - Pro 2
- **Cons:**
  - Con 1
  - Con 2

### Option 2: [Name]
- **Pros:**
  - Pro 1
  - Pro 2
- **Cons:**
  - Con 1
  - Con 2

### Option 3: [Name]
...

## Consequences

### Positive
- ✅ Consequence 1
- ✅ Consequence 2

### Negative
- ⚠️ Consequence 1
- ⚠️ Consequence 2

### Neutral
- ℹ️ Note about implementation details

## Rationale
[Why this decision was made over alternatives]

## Implementation Plan

- [ ] Phase 1: [Description] - [Date]
- [ ] Phase 2: [Description] - [Date]
- [ ] Phase 3: [Description] - [Date]

## Outcome
[To be filled after implementation]

- **Status:** Pending
- **Lessons Learned:** TBD
- **Next Steps:** TBD

## Related ADRs
- ADR-X: [Title] (if applicable)

## References
- [Links to docs, discussions, PRs, etc.]
```

### Step 3: Update ADR Index

If appending to existing file:
1. Increment ADR number
2. Add to index table
3. Append new ADR at the end

## ADR Status Lifecycle

```
Proposed → Approved → [Implemented]
    ↓         ↓
 Rejected  Deprecated/Superseded
```

## Common ADR Topics

- Technology choices (framework, database, language)
- Architecture patterns (microservices, monolith, event-driven)
- API design (REST, GraphQL, gRPC, MCP)
- Infrastructure (cloud provider, deployment strategy)
- Security (auth method, encryption approach)
- Integration patterns (sync/async, webhooks, polling)

## Tips for Good ADRs

1. **Be specific** - Include concrete details, not vague statements
2. **Document alternatives** - Show you considered options
3. **Explain the "why"** - Rationale is the most valuable part
4. **Accept uncertainty** - It's okay to note risks and unknowns
5. **Keep it brief** - 1-2 pages max, link to detailed docs

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "cto" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```
