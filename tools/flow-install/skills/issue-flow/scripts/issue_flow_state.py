#!/usr/bin/env python3

import argparse
import copy
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

sys.path.insert(0, str(Path(__file__).parent))


QUALITY_GATES = {
    "issue_readiness_check": "pending",
    "issue_clarification_recovery_gate": "pending",
    "brainstorm_discovery_gate": "pending",
    "spec_gate": "pending",
    "design_completeness_gate": "pending",
    "design_simplicity_gate": "pending",
    "regression_coverage_gate": "pending",
    "generated_test_gate": "pending",
    "test_quality_gate": "pending",
    "qa_execution_gate": "pending",
    "implementation_simplicity_gate": "pending",
    "final_verification_gate": "pending",
}


HUMAN_GATES = {
    "brainstorm_approval": "pending",
    "issue_append_approval": "pending",
    "prd_approval": "pending",
    "design_approval": "pending",
    "tech_spec_approval": "pending",
    "execution_scope_approval": "pending",
    "final_acceptance": "pending",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def default_state(spec_root: str, epic_name: str, epic_path: str) -> Dict[str, Any]:
    timestamp = now_iso()
    return {
        "version": 4,
        "updated_at": timestamp,
        "issue": {
            "number": None,
            "url": None,
            "title": None,
        },
        "epic": {
            "name": epic_name,
            "path": epic_path,
            "spec_root": spec_root,
        },
        "phase": {
            "id": 0,
            "name": "Phase 0 — Intake, readiness check, and clarification recovery",
            "status": "pending",
            "started_at": timestamp,
            "updated_at": timestamp,
        },
        "mode": "discovery-recovery",
        "git": {
            "branch": None,
            "base_branch": "main",
            "worktree_strategy": "sibling-project-worktrees-v1",
            "worktree_dirname": None,
        },
        "github": {
            "issue_state": None,
            "project_status": None,
            "project_title": None,
            "pr_url": None,
            "ci_url": None,
            "last_sync_at": None,
        },
        "gates": {
            "quality": copy.deepcopy(QUALITY_GATES),
            "human": copy.deepcopy(HUMAN_GATES),
        },
        "artifacts": {
            "issue_intake": None,
            "brainstorm": None,
            "brainstorm_transcript": None,
            "issue_body_draft": None,
            "product_spec": None,
            "prd_review_summary": None,
            "design_spec": None,
            "design_review_summary": None,
            "technical_spec": None,
            "techspec_review_summary": None,
            "regression_spec": None,
            "api_tests": [],
            "browser_tests": [],
            "test_quality_report": None,
            "qa_summary": None,
            "qa_logs": [],
            "verification_report": None,
            "design_mockup": None,
        },
        "artifact_commits": {
            "product_spec": {"committed": False, "skipped": False, "pr_created": False},
            "design_spec": {"committed": False, "skipped": False, "pr_created": False},
            "technical_spec": {"committed": False, "skipped": False, "pr_created": False},
            "design_mockup": {"committed": False, "skipped": False, "pr_created": False},
            "regression_spec": {"committed": False, "skipped": False, "pr_created": False},
        },
        "mockup": {
            "offered": False,
            "declined": False,
            "generated": False,
            "reviewed": False,
        },
        "reconciliation": {
            "last_checked_at": None,
            "status": "pending",
            "discrepancies": [],
            "resolution_notes": [],
        },
        "blockers": [],
        "next_action": "Run intake and classify issue readiness.",
        "history": [
            {
                "timestamp": timestamp,
                "event": "state_initialized",
                "phase_id": 0,
                "phase_name": "Phase 0 — Intake, readiness check, and clarification recovery",
                "details": "Initialized issue-flow state file.",
                "source": "issue-flow",
            }
        ],
    }


def load_state(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text())


def save_state(path: Path, state: Dict[str, Any]) -> None:
    state["updated_at"] = now_iso()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2) + "\n")


def deep_merge(base: Dict[str, Any], incoming: Dict[str, Any]) -> Dict[str, Any]:
    for key, value in incoming.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def append_history(state: Dict[str, Any], event: str, details: str, source: str) -> None:
    phase = state.get("phase", {})
    state.setdefault("history", []).append(
        {
            "timestamp": now_iso(),
            "event": event,
            "phase_id": phase.get("id"),
            "phase_name": phase.get("name"),
            "details": details,
            "source": source,
        }
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage issue-flow state files")
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init")
    init_parser.add_argument("--spec-root", required=True)
    init_parser.add_argument("--epic-name", required=True)
    init_parser.add_argument("--epic-path", required=True)
    init_parser.add_argument("--state-path", required=True)
    init_parser.add_argument("--issue-number")
    init_parser.add_argument("--issue-url")
    init_parser.add_argument("--issue-title")
    init_parser.add_argument("--force", action="store_true")

    merge_parser = subparsers.add_parser("merge")
    merge_parser.add_argument("--state-path", required=True)
    merge_parser.add_argument("--json", required=True)
    merge_parser.add_argument("--history-event")
    merge_parser.add_argument("--history-details")
    merge_parser.add_argument("--history-source", default="issue-flow")

    status_parser = subparsers.add_parser("status")
    status_parser.add_argument("--state-path", required=True)

    pause_parser = subparsers.add_parser("pause")
    pause_parser.add_argument("--state-path", required=True)
    pause_parser.add_argument("--next-action", required=True)

    return parser.parse_args()


def command_init(args: argparse.Namespace) -> int:
    path = Path(args.state_path)
    if path.exists() and not args.force:
        state = load_state(path)
    else:
        state = default_state(args.spec_root, args.epic_name, args.epic_path)

    if args.issue_number:
        state["issue"]["number"] = str(args.issue_number)
    if args.issue_url:
        state["issue"]["url"] = args.issue_url
    if args.issue_title:
        state["issue"]["title"] = args.issue_title

    state.setdefault("git", {})
    if not state["git"].get("branch"):
        state["git"]["branch"] = epic_name = state.get("epic", {}).get("name")
        state["git"]["worktree_dirname"] = epic_name
    state["git"].setdefault("base_branch", "main")
    state["git"].setdefault("worktree_strategy", "sibling-project-worktrees-v1")

    save_state(path, state)
    print(json.dumps(state, indent=2))
    return 0


def command_merge(args: argparse.Namespace) -> int:
    path = Path(args.state_path)
    state = load_state(path)
    incoming = json.loads(args.json)

    # Phase transition guard
    incoming_phase_id = incoming.get("phase", {}).get("id")
    current_phase_id = state.get("phase", {}).get("id")
    if incoming_phase_id is not None and incoming_phase_id != current_phase_id:
        from issue_flow_validate_transition import validate_transition
        is_valid, reasons = validate_transition(state, incoming_phase_id)
        if not is_valid:
            error = {
                "error": "transition_blocked",
                "current_phase": current_phase_id,
                "target_phase": incoming_phase_id,
                "blocking_reasons": reasons,
            }
            print(json.dumps(error, indent=2), file=sys.stderr)
            return 1

    merged = deep_merge(state, incoming)
    merged_phase = merged.get("phase", {})
    if merged_phase:
        merged_phase["updated_at"] = now_iso()
    if args.history_event and args.history_details:
        append_history(merged, args.history_event, args.history_details, args.history_source)
    save_state(path, merged)
    print(json.dumps(merged, indent=2))
    return 0


def command_status(args: argparse.Namespace) -> int:
    state = load_state(Path(args.state_path))
    print(json.dumps(state, indent=2))
    return 0


def command_pause(args: argparse.Namespace) -> int:
    path = Path(args.state_path)
    state = load_state(path)
    state["phase"]["status"] = "paused_awaiting_instruction"
    state["next_action"] = args.next_action
    append_history(state, "phase_paused", f"Paused: {args.next_action}", "issue-flow")
    save_state(path, state)
    print(json.dumps(state, indent=2))
    return 0


def main() -> int:
    args = parse_args()
    if args.command == "init":
        return command_init(args)
    if args.command == "merge":
        return command_merge(args)
    if args.command == "status":
        return command_status(args)
    if args.command == "pause":
        return command_pause(args)
    raise ValueError(f"Unknown command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
