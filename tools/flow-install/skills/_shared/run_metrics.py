#!/usr/bin/env python3
"""
Compute, compare, and trend quality metrics from decision traces.

This is evaluation infrastructure — fixed and not modified by agents.
It computes the metrics that the autoflow loop uses to decide whether
skill improvements are working.

Usage:
    run_metrics.py compute --skill issue-flow [--since 7d] [--last N]
    run_metrics.py compare --skill issue-flow --before <version> --after <version>
    run_metrics.py trend --skill issue-flow [--gate prd_approval] [--last 20]
    run_metrics.py score --skill issue-flow [--since 7d]
"""

import argparse
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Reuse trace loading from trace_query
sys.path.insert(0, str(Path(__file__).parent))
from trace_query import load_traces, _parse_duration


def compute_metrics(traces: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute aggregate quality metrics from a set of traces."""
    if not traces:
        return {
            "total_traces": 0,
            "avg_refinement_loops": 0.0,
            "first_pass_rate": 0.0,
            "total_refinement_loops": 0,
            "gates": {},
        }

    total_loops = 0
    first_pass = 0
    total_duration = 0
    duration_count = 0
    gate_metrics: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "count": 0, "total_loops": 0, "first_pass": 0,
        "total_duration": 0, "duration_count": 0,
        "outcomes": defaultdict(int),
    })

    for t in traces:
        g = t.get("gate", {})
        name = g.get("name", "unknown")
        loops = g.get("refinement_loops", 0)
        duration = g.get("duration_seconds")

        total_loops += loops
        if loops == 0:
            first_pass += 1

        gm = gate_metrics[name]
        gm["count"] += 1
        gm["total_loops"] += loops
        if loops == 0:
            gm["first_pass"] += 1
        gm["outcomes"][g.get("outcome", "unknown")] += 1
        if duration is not None:
            total_duration += duration
            duration_count += 1
            gm["total_duration"] += duration
            gm["duration_count"] += 1

    result = {
        "total_traces": len(traces),
        "avg_refinement_loops": round(total_loops / len(traces), 3),
        "first_pass_rate": round(first_pass / len(traces), 3),
        "total_refinement_loops": total_loops,
        "first_pass_count": first_pass,
    }

    if duration_count > 0:
        result["avg_duration_seconds"] = round(total_duration / duration_count, 1)

    gates = {}
    for name, gm in sorted(gate_metrics.items(), key=lambda x: x[1]["total_loops"] / max(x[1]["count"], 1), reverse=True):
        gates[name] = {
            "count": gm["count"],
            "avg_refinement_loops": round(gm["total_loops"] / gm["count"], 3),
            "first_pass_rate": round(gm["first_pass"] / gm["count"], 3),
            "outcomes": dict(gm["outcomes"]),
        }
        if gm["duration_count"] > 0:
            gates[name]["avg_duration_seconds"] = round(gm["total_duration"] / gm["duration_count"], 1)

    result["gates"] = gates
    return result


def compute_quality_score(metrics: Dict[str, Any]) -> float:
    """Compute composite quality score (0.0-1.0, higher is better).

    Formula: (first_pass_rate * 0.5) + ((1 - normalized_avg_loops) * 0.3) + ((1 - normalized_duration) * 0.2)

    Normalization: avg_loops capped at 5.0, duration capped at 7200s (2h).
    """
    fpr = metrics.get("first_pass_rate", 0.0)
    avg_loops = min(metrics.get("avg_refinement_loops", 0.0), 5.0) / 5.0
    avg_dur = min(metrics.get("avg_duration_seconds", 0.0), 7200.0) / 7200.0

    return round(fpr * 0.5 + (1 - avg_loops) * 0.3 + (1 - avg_dur) * 0.2, 4)


def command_compute(args: argparse.Namespace) -> int:
    traces = load_traces(args.skill)

    if args.since:
        cutoff = datetime.now(timezone.utc) - _parse_duration(args.since)
        traces = [t for t in traces if _parse_ts(t) and _parse_ts(t) >= cutoff]

    if args.last:
        traces = sorted(traces, key=lambda t: t.get("timestamp", ""), reverse=True)[:args.last]

    # Exclude retrospective/ad-hoc traces from metrics (they're feedback, not gate outcomes)
    gate_traces = [t for t in traces if t.get("gate", {}).get("type") not in ("retrospective",)]

    metrics = compute_metrics(gate_traces)
    metrics["skill"] = args.skill
    metrics["quality_score"] = compute_quality_score(metrics)

    if args.json:
        print(json.dumps(metrics, indent=2))
    else:
        print(f"=== {args.skill} Quality Metrics ===")
        print(f"  Traces analyzed: {metrics['total_traces']}")
        print(f"  Quality score:   {metrics['quality_score']:.2f} / 1.00")
        print(f"  First-pass rate: {metrics['first_pass_rate']:.1%}")
        print(f"  Avg refinement:  {metrics['avg_refinement_loops']:.2f} loops")
        if "avg_duration_seconds" in metrics:
            print(f"  Avg duration:    {metrics['avg_duration_seconds']:.0f}s")
        print()
        if metrics["gates"]:
            print("  Gates (sorted by refinement cost):")
            for name, gm in metrics["gates"].items():
                loops = gm["avg_refinement_loops"]
                fpr = gm["first_pass_rate"]
                flag = " ⚠" if loops > 1.5 else ""
                print(f"    {name:<40} {loops:.1f} loops  {fpr:.0%} first-pass{flag}")

    return 0


def command_compare(args: argparse.Namespace) -> int:
    traces = load_traces(args.skill)

    before_traces = [t for t in traces if t.get("version") == args.before and t.get("gate", {}).get("type") != "retrospective"]
    after_traces = [t for t in traces if t.get("version") == args.after and t.get("gate", {}).get("type") != "retrospective"]

    before = compute_metrics(before_traces)
    after = compute_metrics(after_traces)

    before_score = compute_quality_score(before)
    after_score = compute_quality_score(after)

    result = {
        "skill": args.skill,
        "before_version": args.before,
        "after_version": args.after,
        "before": {**before, "quality_score": before_score},
        "after": {**after, "quality_score": after_score},
        "delta": {
            "quality_score": round(after_score - before_score, 4),
            "avg_refinement_loops": round(after.get("avg_refinement_loops", 0) - before.get("avg_refinement_loops", 0), 3),
            "first_pass_rate": round(after.get("first_pass_rate", 0) - before.get("first_pass_rate", 0), 3),
        },
        "decision": "keep" if after_score >= before_score else "revert",
    }

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        d = result["delta"]
        arrow = lambda v: "↑" if v > 0 else "↓" if v < 0 else "="
        print(f"=== {args.skill} Compare: v{args.before} → v{args.after} ===")
        print(f"  Quality score: {before_score:.2f} → {after_score:.2f} ({arrow(d['quality_score'])} {d['quality_score']:+.4f})")
        print(f"  Avg loops:     {before['avg_refinement_loops']:.2f} → {after['avg_refinement_loops']:.2f} ({arrow(-d['avg_refinement_loops'])} {d['avg_refinement_loops']:+.3f})")
        print(f"  First-pass:    {before['first_pass_rate']:.1%} → {after['first_pass_rate']:.1%} ({arrow(d['first_pass_rate'])} {d['first_pass_rate']:+.3f})")
        print(f"  Decision:      {result['decision'].upper()}")

    return 0


def command_trend(args: argparse.Namespace) -> int:
    traces = load_traces(args.skill)
    if args.gate:
        traces = [t for t in traces if t.get("gate", {}).get("name") == args.gate]

    traces = sorted(traces, key=lambda t: t.get("timestamp", ""))
    if args.last:
        traces = traces[-args.last:]

    if not traces:
        print(json.dumps({"trend": [], "count": 0}))
        return 0

    trend = []
    for t in traces:
        g = t.get("gate", {})
        trend.append({
            "timestamp": t.get("timestamp", "")[:10],
            "gate": g.get("name"),
            "loops": g.get("refinement_loops", 0),
            "outcome": g.get("outcome"),
            "version": t.get("version"),
        })

    if args.json:
        print(json.dumps({"trend": trend, "count": len(trend)}, indent=2))
    else:
        gate_label = args.gate or "all gates"
        print(f"=== {args.skill} Trend: {gate_label} (last {len(trend)}) ===")
        for entry in trend:
            loops = entry["loops"]
            bar = "█" * loops + "░" * max(0, 5 - loops)
            print(f"  {entry['timestamp']}  {bar}  {loops} loops  {entry['outcome']}")

    return 0


def command_score(args: argparse.Namespace) -> int:
    traces = load_traces(args.skill)

    if args.since:
        cutoff = datetime.now(timezone.utc) - _parse_duration(args.since)
        traces = [t for t in traces if _parse_ts(t) and _parse_ts(t) >= cutoff]

    gate_traces = [t for t in traces if t.get("gate", {}).get("type") not in ("retrospective",)]
    metrics = compute_metrics(gate_traces)
    score = compute_quality_score(metrics)

    print(json.dumps({
        "skill": args.skill,
        "quality_score": score,
        "first_pass_rate": metrics["first_pass_rate"],
        "avg_refinement_loops": metrics["avg_refinement_loops"],
        "total_traces": metrics["total_traces"],
    }))
    return 0


def _parse_ts(trace: Dict[str, Any]) -> Optional[datetime]:
    ts = trace.get("timestamp", "")
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compute quality metrics from decision traces")
    subparsers = parser.add_subparsers(dest="command", required=True)

    c = subparsers.add_parser("compute", help="Compute aggregate metrics")
    c.add_argument("--skill", required=True)
    c.add_argument("--since", help="Only traces from this duration (e.g., 7d, 1m)")
    c.add_argument("--last", type=int, help="Only last N traces")
    c.add_argument("--json", action="store_true")

    cmp = subparsers.add_parser("compare", help="Compare metrics between skill versions")
    cmp.add_argument("--skill", required=True)
    cmp.add_argument("--before", required=True, help="Version before improvement")
    cmp.add_argument("--after", required=True, help="Version after improvement")
    cmp.add_argument("--json", action="store_true")

    t = subparsers.add_parser("trend", help="Show metric trend over time")
    t.add_argument("--skill", required=True)
    t.add_argument("--gate", help="Filter by gate name")
    t.add_argument("--last", type=int, default=20, help="Last N traces")
    t.add_argument("--json", action="store_true")

    s = subparsers.add_parser("score", help="Output quality score as JSON (for automation)")
    s.add_argument("--skill", required=True)
    s.add_argument("--since", help="Only traces from this duration")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    commands = {
        "compute": command_compute,
        "compare": command_compare,
        "trend": command_trend,
        "score": command_score,
    }
    return commands[args.command](args)


if __name__ == "__main__":
    raise SystemExit(main())
