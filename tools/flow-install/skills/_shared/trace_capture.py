#!/usr/bin/env python3
"""
Capture decision traces from skill gate interactions.

Appends NDJSON trace records to ~/.agents/traces/{skill}/traces.ndjson.
Each record captures a gate resolution: what was proposed, what feedback
was given, how many refinement loops occurred, and the outcome.

Usage:
    trace_capture.py capture \
        --skill issue-flow --gate prd_approval --gate-type human \
        --outcome approved --refinement-loops 2 \
        [--feedback "The mobile use case was missing"] \
        [--feedback "Acceptance criteria not testable"] \
        [--category MISSING_SCOPE --category UNCLEAR_CRITERIA] \
        [--issues-found 2] \
        [--duration-seconds 2722] \
        [--phase-id 3 --phase-name "PRD review"] \
        [--skill-version 0.8.0] \
        [--issue-number 113 --project accelerate-africa --epic program-team-selection] \
        [--precedent "tr_20260320..."] \
        [--state-path /path/to/.issue-flow-state.json]

    trace_capture.py from-state \
        --state-path /path/to/.issue-flow-state.json \
        --skill issue-flow --gate prd_approval --gate-type human \
        --outcome approved \
        [--feedback "..."]
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def traces_dir(skill: str) -> Path:
    base = Path(os.environ.get("AGENTS_TRACES_ROOT", Path.home() / ".agents" / "traces"))
    return base / skill


def make_trace_id(skill: str, phase_id: Optional[int], gate: str) -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    phase_part = f"_{phase_id}" if phase_id is not None else ""
    return f"tr_{ts}_{skill}{phase_part}_{gate}"


def build_trace(
    skill: str,
    gate: str,
    gate_type: str,
    outcome: str,
    refinement_loops: int = 0,
    duration_seconds: Optional[int] = None,
    feedback_texts: Optional[List[str]] = None,
    categories: Optional[List[str]] = None,
    issues_found: Optional[int] = None,
    phase_id: Optional[int] = None,
    phase_name: Optional[str] = None,
    skill_version: Optional[str] = None,
    issue_number: Optional[str] = None,
    project: Optional[str] = None,
    epic: Optional[str] = None,
    precedent_cited: Optional[str] = None,
) -> Dict[str, Any]:
    trace: Dict[str, Any] = {
        "trace_id": make_trace_id(skill, phase_id, gate),
        "timestamp": now_iso(),
        "skill": skill,
    }

    if skill_version:
        trace["version"] = skill_version

    trace["phase"] = {}
    if phase_id is not None:
        trace["phase"]["id"] = phase_id
    if phase_name:
        trace["phase"]["name"] = phase_name

    trace["gate"] = {
        "name": gate,
        "type": gate_type,
        "outcome": outcome,
        "refinement_loops": refinement_loops,
    }
    if duration_seconds is not None:
        trace["gate"]["duration_seconds"] = duration_seconds

    structured: Dict[str, Any] = {}
    if issues_found is not None:
        structured["issues_found"] = issues_found
    if categories:
        structured["categories"] = categories

    trace["feedback"] = {
        "structured": structured,
        "unstructured": feedback_texts or [],
    }

    trace["precedent_cited"] = precedent_cited

    context: Dict[str, Any] = {}
    if issue_number:
        context["issue_number"] = issue_number
    if project:
        context["project"] = project
    if epic:
        context["epic"] = epic
    if context:
        trace["context"] = context

    return trace


def append_trace(skill: str, trace: Dict[str, Any]) -> Path:
    d = traces_dir(skill)
    d.mkdir(parents=True, exist_ok=True)
    trace_file = d / "traces.ndjson"
    with open(trace_file, "a") as f:
        f.write(json.dumps(trace, separators=(",", ":")) + "\n")
    return trace_file


def extract_from_state(state_path: Path, gate: str) -> Dict[str, Any]:
    """Extract context from a skill state file for trace enrichment."""
    state = json.loads(state_path.read_text())
    info: Dict[str, Any] = {}

    phase = state.get("phase", {})
    info["phase_id"] = phase.get("id")
    info["phase_name"] = phase.get("name")

    issue = state.get("issue", {})
    if issue.get("number"):
        info["issue_number"] = str(issue["number"])

    epic = state.get("epic", {})
    if epic.get("name"):
        info["epic"] = epic["name"]

    # Count refinement loops from history: count rejection events for this gate
    history = state.get("history", [])
    loops = 0
    for entry in history:
        event = entry.get("event", "")
        details = entry.get("details", "")
        if gate in details and ("rejected" in event or "refinement" in event.lower() or "loop" in details.lower()):
            loops += 1
    info["refinement_loops_from_history"] = loops

    return info


def command_capture(args: argparse.Namespace) -> int:
    state_info: Dict[str, Any] = {}
    if args.state_path:
        state_path = Path(args.state_path)
        if state_path.exists():
            state_info = extract_from_state(state_path, args.gate)

    trace = build_trace(
        skill=args.skill,
        gate=args.gate,
        gate_type=args.gate_type,
        outcome=args.outcome,
        refinement_loops=args.refinement_loops or state_info.get("refinement_loops_from_history", 0),
        duration_seconds=args.duration_seconds,
        feedback_texts=args.feedback or [],
        categories=args.category or [],
        issues_found=args.issues_found,
        phase_id=args.phase_id if args.phase_id is not None else state_info.get("phase_id"),
        phase_name=args.phase_name or state_info.get("phase_name"),
        skill_version=args.skill_version,
        issue_number=args.issue_number or state_info.get("issue_number"),
        project=args.project,
        epic=args.epic or state_info.get("epic"),
        precedent_cited=args.precedent,
    )

    trace_file = append_trace(args.skill, trace)
    print(json.dumps({"ok": True, "trace_id": trace["trace_id"], "file": str(trace_file)}, indent=2))
    return 0


def command_from_state(args: argparse.Namespace) -> int:
    state_path = Path(args.state_path)
    if not state_path.exists():
        print(json.dumps({"error": f"State file not found: {state_path}"}), file=sys.stderr)
        return 1

    state_info = extract_from_state(state_path, args.gate)

    trace = build_trace(
        skill=args.skill,
        gate=args.gate,
        gate_type=args.gate_type,
        outcome=args.outcome,
        refinement_loops=state_info.get("refinement_loops_from_history", 0),
        feedback_texts=args.feedback or [],
        phase_id=state_info.get("phase_id"),
        phase_name=state_info.get("phase_name"),
        issue_number=state_info.get("issue_number"),
        epic=state_info.get("epic"),
    )

    trace_file = append_trace(args.skill, trace)
    print(json.dumps({"ok": True, "trace_id": trace["trace_id"], "file": str(trace_file)}, indent=2))
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Capture decision traces from skill gate interactions")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # capture subcommand
    cap = subparsers.add_parser("capture", help="Capture a trace record")
    cap.add_argument("--skill", required=True, help="Skill name")
    cap.add_argument("--gate", required=True, help="Gate name (e.g., prd_approval)")
    cap.add_argument("--gate-type", required=True, choices=["human", "quality", "retrospective"],
                     help="Gate type")
    cap.add_argument("--outcome", required=True, choices=["approved", "rejected", "passed", "failed", "skipped"],
                     help="Gate outcome")
    cap.add_argument("--refinement-loops", type=int, default=None,
                     help="Number of refinement loops before resolution")
    cap.add_argument("--duration-seconds", type=int, help="Time from proposal to resolution")
    cap.add_argument("--feedback", action="append", help="Unstructured feedback text (repeatable)")
    cap.add_argument("--category", action="append", help="Structured feedback category (repeatable)")
    cap.add_argument("--issues-found", type=int, help="Number of issues found")
    cap.add_argument("--phase-id", type=int, help="Phase ID")
    cap.add_argument("--phase-name", help="Phase name")
    cap.add_argument("--skill-version", help="Skill version")
    cap.add_argument("--issue-number", help="GitHub issue number")
    cap.add_argument("--project", help="Project name")
    cap.add_argument("--epic", help="Epic name")
    cap.add_argument("--precedent", help="Trace ID of a precedent cited")
    cap.add_argument("--state-path", help="Path to skill state file for auto-enrichment")

    # from-state subcommand
    fs = subparsers.add_parser("from-state", help="Capture trace enriched from a state file")
    fs.add_argument("--state-path", required=True, help="Path to skill state file")
    fs.add_argument("--skill", required=True, help="Skill name")
    fs.add_argument("--gate", required=True, help="Gate name")
    fs.add_argument("--gate-type", required=True, choices=["human", "quality", "retrospective"])
    fs.add_argument("--outcome", required=True, choices=["approved", "rejected", "passed", "failed", "skipped"])
    fs.add_argument("--feedback", action="append", help="Unstructured feedback text (repeatable)")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "capture":
        return command_capture(args)
    if args.command == "from-state":
        return command_from_state(args)
    print(f"Unknown command: {args.command}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
