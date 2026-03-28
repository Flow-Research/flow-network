#!/usr/bin/env python3
"""
One-shot script to instrument all harnessy skills with the Decision Trace Protocol.

Tier 1 (explicit gates): adds traces: block to manifest + Decision Trace Protocol section
Tier 2 (implicit feedback): adds traces: { enabled: true } + Feedback Capture section
Tier 3 (skip): no changes

Run from repo root:
    python3 tools/flow-install/scripts/instrument-traces.py [--dry-run]
"""

import os
import sys
from pathlib import Path

DRY_RUN = "--dry-run" in sys.argv
SKILLS_DIR = Path("tools/flow-install/skills")

# ─── Tier definitions ────────────────────────────────────────────────────────

TIER1 = {
    "build-e2e": {
        "quality": ["brainstorm_review", "prd_review", "tech_spec_review", "mvp_spec_review", "qa_review"],
        "human": ["checkpoint_approval"],
    },
    "context-sync": {
        "quality": ["verification_check", "conflict_detection"],
        "human": ["conflict_resolution", "pr_approval"],
    },
    "code-review": {
        "quality": ["simplicity_gate", "correctness_gate", "architecture_gate"],
        "human": ["review_approval"],
    },
    "prd-spec-review": {
        "quality": ["spec_completeness", "criteria_testability"],
        "human": ["review_approval"],
    },
    "tech-spec-review": {
        "quality": ["simplicity_gate", "architecture_fitness"],
        "human": ["review_approval"],
    },
    "design-spec-review": {
        "quality": ["ux_completeness", "accessibility_compliance", "implementability"],
        "human": ["review_approval"],
    },
    "skill-validate": {
        "quality": ["manifest_check", "catalog_check", "blast_radius_gate"],
        "human": [],
    },
    "skill-publish": {
        "quality": ["validation_gate"],
        "human": ["approval_gate"],
    },
    "ci-fix": {
        "quality": ["classification_gate", "fix_verification"],
        "human": ["escalation_decision"],
    },
    "test-quality-validator": {
        "quality": ["coverage_gate", "false_green_gate", "pattern_gate"],
        "human": [],
    },
    "spec-to-regression": {
        "quality": ["coverage_completeness", "scenario_generation"],
        "human": [],
    },
    "api-integration-codegen": {
        "quality": ["generation_completeness", "adapter_coverage"],
        "human": [],
    },
    "browser-integration-codegen": {
        "quality": ["selector_certainty", "todo_resolution"],
        "human": [],
    },
    "browser-qa": {
        "quality": ["playwright_readiness", "auth_verification"],
        "human": ["safety_mode_approval"],
    },
    "skill-improve": {
        "quality": ["trace_analysis", "proposal_generation"],
        "human": ["improvement_approval"],
    },
    "skill-promote": {
        "quality": ["version_comparison", "diff_review"],
        "human": ["promotion_approval"],
    },
    "design-mockup": {
        "quality": ["framework_detection", "spec_parsing"],
        "human": ["mockup_review"],
    },
    "engineer": {
        "quality": ["implementation_coverage", "test_pass"],
        "human": ["scope_review"],
    },
}

TIER2 = [
    "brainstorm", "prd", "tech-spec", "design-spec", "mvp-tech-spec",
    "qa", "git-commit", "ci-watch", "ci-logs", "ci-rerun",
    "skill-create", "dev-container", "local-run", "semver",
    "cto", "github-issue-create", "jarvis", "tmux-agent-launcher",
]

SKIP = {"skill-feedback",  # IS the feedback system — tracing itself would be circular
        "issue-flow",  # already instrumented manually with full protocol
        "_shared", "community-skills-install", "alpine-dev-container"}


# ─── Templates ───────────────────────────────────────────────────────────────

def traces_block_tier1(gates):
    lines = ["traces:", "  enabled: true", "  gates:"]
    if gates.get("quality"):
        lines.append("    quality:")
        for g in gates["quality"]:
            lines.append(f"      - {g}")
    if gates.get("human"):
        lines.append("    human:")
        for g in gates["human"]:
            lines.append(f"      - {g}")
    return "\n".join(lines)


TRACES_BLOCK_TIER2 = "traces:\n  enabled: true"


def decision_trace_protocol(skill_name):
    return f'''
## Decision Trace Protocol

This skill participates in the skill evolution system by capturing decision traces at gate resolutions and consulting accumulated feedback.

### Trace Consultation (short loop)

Before executing any step with a quality or human gate, query accumulated decision traces:

```bash
python3 "${{AGENTS_SKILLS_ROOT}}/_shared/trace_query.py" recent \\
    --skill "{skill_name}" --gate "<gate_name>" --limit 5 --min-loops 1
```

If patterns or recent feedback exist, incorporate them as additional constraints. Do not cite traces to the user unless asked.

### Trace Capture (after gate resolution)

After every gate resolves, capture a decision trace:

```bash
python3 "${{AGENTS_SKILLS_ROOT}}/_shared/trace_capture.py" capture \\
    --skill "{skill_name}" \\
    --gate "<gate_name>" --gate-type "<human|quality>" \\
    --outcome "<approved|rejected|passed|failed>" \\
    --refinement-loops <N> \\
    [--feedback "<user's feedback text>"] \\
    [--category <CATEGORY>]
```

### Post-Run Retrospective

After completion, ask: **"Any feedback on this {skill_name} run? (skip to finish)"**
If provided, capture via trace_capture.py with gate "run_retrospective" and gate-type "retrospective".
'''


def feedback_capture_section(skill_name):
    return f'''
## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${{AGENTS_SKILLS_ROOT}}/_shared/trace_capture.py" capture \\
    --skill "{skill_name}" --gate "run_retrospective" --gate-type "retrospective" \\
    --outcome "approved" --feedback "<user's feedback>"
```
'''


# ─── Helpers ─────────────────────────────────────────────────────────────────

def add_traces_to_manifest(manifest_path, traces_block):
    content = manifest_path.read_text()
    if "traces:" in content:
        return False  # already has traces
    # Insert before dependencies: if present, else append
    if "dependencies:" in content:
        content = content.replace("dependencies:", traces_block + "\ndependencies:")
    else:
        content = content.rstrip() + "\n" + traces_block + "\n"
    if not DRY_RUN:
        manifest_path.write_text(content)
    return True


def add_protocol_to_skill(skill_dir, skill_name, section_text):
    """Add the trace protocol section to the best target file."""
    # Prefer commands/*.md if it exists, otherwise SKILL.md
    commands_dir = skill_dir / "commands"
    target = None
    if commands_dir.is_dir():
        cmd_files = list(commands_dir.glob("*.md"))
        if cmd_files:
            target = cmd_files[0]  # primary command doc

    if target is None:
        target = skill_dir / "SKILL.md"

    if not target.exists():
        return False

    content = target.read_text()
    if "Decision Trace Protocol" in content or "Feedback Capture" in content:
        return False  # already instrumented

    # Insert before "## Output" section if it exists, otherwise append
    if "\n## Output" in content:
        content = content.replace("\n## Output", section_text + "\n## Output")
    else:
        content = content.rstrip() + "\n" + section_text + "\n"

    if not DRY_RUN:
        target.write_text(content)
    return True


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    if not SKILLS_DIR.is_dir():
        print(f"ERROR: {SKILLS_DIR} not found. Run from repo root.", file=sys.stderr)
        return 1

    tier1_count = 0
    tier2_count = 0
    skipped = 0
    errors = []

    for skill_dir in sorted(SKILLS_DIR.iterdir()):
        if not skill_dir.is_dir():
            continue
        name = skill_dir.name
        if name in SKIP:
            skipped += 1
            continue

        manifest = skill_dir / "manifest.yaml"
        if not manifest.exists():
            continue

        if name in TIER1:
            gates = TIER1[name]
            block = traces_block_tier1(gates)
            m_changed = add_traces_to_manifest(manifest, block)
            s_changed = add_protocol_to_skill(skill_dir, name, decision_trace_protocol(name))
            status = "TIER1"
            if m_changed or s_changed:
                tier1_count += 1
                print(f"  {status} {name}: manifest={'updated' if m_changed else 'skip'} skill={'updated' if s_changed else 'skip'}")
            else:
                print(f"  {status} {name}: already instrumented")

        elif name in TIER2:
            m_changed = add_traces_to_manifest(manifest, TRACES_BLOCK_TIER2)
            s_changed = add_protocol_to_skill(skill_dir, name, feedback_capture_section(name))
            status = "TIER2"
            if m_changed or s_changed:
                tier2_count += 1
                print(f"  {status} {name}: manifest={'updated' if m_changed else 'skip'} skill={'updated' if s_changed else 'skip'}")
            else:
                print(f"  {status} {name}: already instrumented")

        else:
            print(f"  UNKNOWN {name}: not classified — skipping")
            skipped += 1

    print(f"\n{'DRY RUN — ' if DRY_RUN else ''}Summary: {tier1_count} Tier1, {tier2_count} Tier2, {skipped} skipped")
    if errors:
        print(f"Errors: {errors}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
