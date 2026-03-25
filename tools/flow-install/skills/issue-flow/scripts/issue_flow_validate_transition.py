#!/usr/bin/env python3
"""
issue-flow phase transition validator.

Encodes the transition table as data and validates prerequisites
before any phase change. Called by issue_flow_state.py command_merge
and directly by the AI agent via CLI.

Usage:
    python3 issue_flow_validate_transition.py check --state-path <path> --target-phase <N>
    python3 issue_flow_validate_transition.py show-rules
"""

import argparse
import json
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class TransitionRule:
    """What must be true before moving from one phase to the next."""
    quality_gates: List[str]
    human_gates: List[str]
    artifact_commits: List[str]
    pause_after: bool
    explicit_trigger: Optional[str]


TRANSITION_TABLE: Dict[Tuple[int, int], TransitionRule] = {
    (0, 1): TransitionRule(
        quality_gates=["issue_readiness_check"],
        human_gates=[],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (1, 2): TransitionRule(
        quality_gates=["brainstorm_discovery_gate"],
        human_gates=["brainstorm_approval"],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (2, 3): TransitionRule(
        quality_gates=[],
        human_gates=[],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (3, 4): TransitionRule(
        quality_gates=["spec_gate"],
        human_gates=["prd_approval"],
        artifact_commits=["product_spec"],
        pause_after=True,
        explicit_trigger="User explicitly says to start tech spec",
    ),
    (4, 5): TransitionRule(
        quality_gates=[],
        human_gates=[],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (5, 6): TransitionRule(
        quality_gates=["design_simplicity_gate"],
        human_gates=["tech_spec_approval"],
        artifact_commits=["technical_spec"],
        pause_after=True,
        explicit_trigger="User explicitly says to start implementation planning",
    ),
    (6, 7): TransitionRule(
        quality_gates=[],
        human_gates=["execution_scope_approval"],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (7, 8): TransitionRule(
        quality_gates=[],
        human_gates=[],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (8, 9): TransitionRule(
        quality_gates=["regression_coverage_gate"],
        human_gates=[],
        artifact_commits=["regression_spec"],
        pause_after=False,
        explicit_trigger=None,
    ),
    (9, 10): TransitionRule(
        quality_gates=["generated_test_gate"],
        human_gates=[],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (10, 11): TransitionRule(
        quality_gates=["test_quality_gate"],
        human_gates=[],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (11, 12): TransitionRule(
        quality_gates=["qa_execution_gate"],
        human_gates=[],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (12, 13): TransitionRule(
        quality_gates=["implementation_simplicity_gate"],
        human_gates=[],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (13, 14): TransitionRule(
        quality_gates=[],
        human_gates=[],
        artifact_commits=[],
        pause_after=False,
        explicit_trigger=None,
    ),
    (14, 15): TransitionRule(
        quality_gates=["final_verification_gate"],
        human_gates=["final_acceptance"],
        artifact_commits=[],
        pause_after=True,
        explicit_trigger="User explicitly says to close out",
    ),
}


def validate_transition(state: dict, target_phase_id: int) -> Tuple[bool, List[str]]:
    """
    Validate whether the state allows advancing to target_phase_id.
    Returns (is_valid, list_of_blocking_reasons).
    """
    current_phase_id = state.get("phase", {}).get("id", 0)
    current_status = state.get("phase", {}).get("status", "pending")

    # No skipping phases
    if target_phase_id > current_phase_id + 1:
        return (False, [
            f"Cannot skip from phase {current_phase_id} to {target_phase_id}; "
            f"must advance one phase at a time"
        ])

    # No going backward
    if target_phase_id <= current_phase_id:
        return (False, [
            f"Cannot move backward from phase {current_phase_id} to {target_phase_id}"
        ])

    key = (current_phase_id, target_phase_id)
    rule = TRANSITION_TABLE.get(key)
    if rule is None:
        return (False, [f"No transition rule defined for {current_phase_id} -> {target_phase_id}"])

    reasons = []
    gates = state.get("gates", {})

    # Check quality gates
    for qg in rule.quality_gates:
        val = gates.get("quality", {}).get(qg, "pending")
        if val != "passed":
            reasons.append(f"Quality gate '{qg}' is '{val}', must be 'passed'")

    # Check human gates
    for hg in rule.human_gates:
        val = gates.get("human", {}).get(hg, "pending")
        if val != "passed":
            reasons.append(f"Human gate '{hg}' is '{val}', must be 'passed'")

    # Check artifact commits
    ac = state.get("artifact_commits", {})
    for ak in rule.artifact_commits:
        entry = ac.get(ak, {})
        committed = entry.get("committed", False)
        skipped = entry.get("skipped", False)
        if not committed and not skipped:
            reasons.append(
                f"Artifact commit '{ak}' not completed "
                f"(committed={committed}, skipped={skipped})"
            )

    # Check pause requirement
    if rule.pause_after:
        if current_status != "paused_awaiting_instruction":
            reasons.append(
                f"Phase {current_phase_id} requires explicit user instruction to advance. "
                f"phase.status must be 'paused_awaiting_instruction', is '{current_status}'. "
                f"Expected trigger: {rule.explicit_trigger}"
            )

    return (len(reasons) == 0, reasons)


def command_check(args: argparse.Namespace) -> int:
    path = Path(args.state_path)
    if not path.exists():
        print(json.dumps({"error": f"State file not found: {path}"}))
        return 1

    state = json.loads(path.read_text(encoding="utf-8"))
    is_valid, reasons = validate_transition(state, args.target_phase)

    current_phase_id = state.get("phase", {}).get("id", 0)
    key = (current_phase_id, args.target_phase)
    rule = TRANSITION_TABLE.get(key)

    result = {
        "valid": is_valid,
        "current_phase": current_phase_id,
        "target_phase": args.target_phase,
        "blocking_reasons": reasons,
    }
    if rule:
        result["rule"] = asdict(rule)

    print(json.dumps(result, indent=2))
    return 0 if is_valid else 1


def command_show_rules(args: argparse.Namespace) -> int:
    rules = {}
    for (from_p, to_p), rule in sorted(TRANSITION_TABLE.items()):
        rules[f"{from_p}->{to_p}"] = asdict(rule)
    print(json.dumps(rules, indent=2))
    return 0


def main():
    parser = argparse.ArgumentParser(description="issue-flow phase transition validator")
    subparsers = parser.add_subparsers(dest="command", required=True)

    check_parser = subparsers.add_parser("check", help="Validate a phase transition")
    check_parser.add_argument("--state-path", required=True, help="Path to .issue-flow-state.json")
    check_parser.add_argument("--target-phase", type=int, required=True, help="Target phase ID")

    subparsers.add_parser("show-rules", help="Print the full transition table")

    args = parser.parse_args()

    if args.command == "check":
        sys.exit(command_check(args))
    elif args.command == "show-rules":
        sys.exit(command_show_rules(args))


if __name__ == "__main__":
    main()
