#!/usr/bin/env python3
"""
Query decision traces for skill feedback loops.

Subcommands:
    recent    — Show recent traces for a gate (short loop: ~500 token output)
    stats     — Aggregate statistics for a skill's traces
    patterns  — Extract recurring feedback patterns across traces
    summarize — Regenerate the human-readable index.md for a skill
    prune     — Remove traces older than a threshold

Usage:
    trace_query.py recent --skill issue-flow --gate prd_approval [--limit 5] [--min-loops 1]
    trace_query.py stats --skill issue-flow
    trace_query.py patterns --skill issue-flow [--gate prd_approval] [--min-occurrences 2]
    trace_query.py summarize --skill issue-flow
    trace_query.py prune --skill issue-flow --older-than 6m
"""

import argparse
import json
import os
import re
import sys
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


def traces_dir(skill: str) -> Path:
    base = Path(os.environ.get("AGENTS_TRACES_ROOT", Path.home() / ".agents" / "traces"))
    return base / skill


def load_traces(skill: str) -> List[Dict[str, Any]]:
    trace_file = traces_dir(skill) / "traces.ndjson"
    if not trace_file.exists():
        return []
    traces = []
    for line in trace_file.read_text().splitlines():
        line = line.strip()
        if line:
            try:
                traces.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return traces


def filter_traces(
    traces: List[Dict[str, Any]],
    gate: Optional[str] = None,
    min_loops: int = 0,
    outcome: Optional[str] = None,
    since: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    filtered = []
    for t in traces:
        g = t.get("gate", {})
        if gate and g.get("name") != gate:
            continue
        if g.get("refinement_loops", 0) < min_loops:
            continue
        if outcome and g.get("outcome") != outcome:
            continue
        if since:
            ts_str = t.get("timestamp", "")
            try:
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                if ts < since:
                    continue
            except (ValueError, TypeError):
                continue
        filtered.append(t)
    return filtered


def command_recent(args: argparse.Namespace) -> int:
    traces = load_traces(args.skill)
    filtered = filter_traces(traces, gate=args.gate, min_loops=args.min_loops)

    if not filtered:
        if args.json:
            print(json.dumps({"traces": [], "count": 0}))
        return 0

    # Most recent first
    filtered.sort(key=lambda t: t.get("timestamp", ""), reverse=True)
    selected = filtered[:args.limit]

    if args.json:
        print(json.dumps({"traces": selected, "count": len(filtered)}, indent=2))
        return 0

    # Human-readable summary (~500 tokens)
    avg_loops = sum(t["gate"].get("refinement_loops", 0) for t in filtered) / len(filtered)
    gate_label = args.gate or "all gates"
    print(f"=== Feedback for gate: {gate_label} ({len(filtered)} traces, avg {avg_loops:.1f} loops) ===")
    print()

    # Extract recurring patterns from unstructured feedback
    all_feedback = []
    for t in filtered:
        all_feedback.extend(t.get("feedback", {}).get("unstructured", []))

    if all_feedback:
        # Simple word-frequency pattern detection
        patterns = _extract_patterns(all_feedback, min_count=2)
        if patterns:
            print("PATTERNS (recurring in 2+ traces):")
            for pattern, count in patterns[:5]:
                print(f"- {pattern} ({count}/{len(filtered)})")
            print()

    print("RECENT FEEDBACK:")
    for t in selected:
        ts = t.get("timestamp", "")[:10]
        loops = t["gate"].get("refinement_loops", 0)
        outcome = t["gate"].get("outcome", "?")
        feedback_items = t.get("feedback", {}).get("unstructured", [])
        if feedback_items:
            for fb in feedback_items:
                print(f'- [{ts}] ({outcome}, {loops} loops) "{fb}"')
        else:
            categories = t.get("feedback", {}).get("structured", {}).get("categories", [])
            if categories:
                print(f"- [{ts}] ({outcome}, {loops} loops) categories: {', '.join(categories)}")
            else:
                print(f"- [{ts}] ({outcome}, {loops} loops) [no feedback text]")

    return 0


def command_stats(args: argparse.Namespace) -> int:
    traces = load_traces(args.skill)
    if not traces:
        print(json.dumps({"skill": args.skill, "total_traces": 0}))
        return 0

    gate_stats: Dict[str, Dict[str, Any]] = {}
    for t in traces:
        g = t.get("gate", {})
        name = g.get("name", "unknown")
        if name not in gate_stats:
            gate_stats[name] = {
                "count": 0,
                "total_loops": 0,
                "outcomes": Counter(),
                "categories": Counter(),
            }
        gs = gate_stats[name]
        gs["count"] += 1
        gs["total_loops"] += g.get("refinement_loops", 0)
        gs["outcomes"][g.get("outcome", "unknown")] += 1
        for cat in t.get("feedback", {}).get("structured", {}).get("categories", []):
            gs["categories"][cat] += 1

    result = {
        "skill": args.skill,
        "total_traces": len(traces),
        "date_range": {
            "earliest": min(t.get("timestamp", "") for t in traces),
            "latest": max(t.get("timestamp", "") for t in traces),
        },
        "gates": {},
    }
    for name, gs in sorted(gate_stats.items(), key=lambda x: x[1]["total_loops"] / max(x[1]["count"], 1), reverse=True):
        result["gates"][name] = {
            "count": gs["count"],
            "avg_refinement_loops": round(gs["total_loops"] / gs["count"], 2),
            "outcomes": dict(gs["outcomes"]),
            "top_categories": dict(gs["categories"].most_common(5)),
        }

    print(json.dumps(result, indent=2))
    return 0


def command_patterns(args: argparse.Namespace) -> int:
    traces = load_traces(args.skill)
    filtered = filter_traces(traces, gate=args.gate)
    if not filtered:
        print(json.dumps({"patterns": [], "count": 0}))
        return 0

    all_feedback = []
    for t in filtered:
        all_feedback.extend(t.get("feedback", {}).get("unstructured", []))

    all_categories: Counter = Counter()
    for t in filtered:
        for cat in t.get("feedback", {}).get("structured", {}).get("categories", []):
            all_categories[cat] += 1

    patterns = _extract_patterns(all_feedback, min_count=args.min_occurrences)

    result = {
        "skill": args.skill,
        "gate": args.gate,
        "trace_count": len(filtered),
        "feedback_patterns": [{"pattern": p, "count": c} for p, c in patterns],
        "category_counts": dict(all_categories.most_common(10)),
    }
    print(json.dumps(result, indent=2))
    return 0


def command_summarize(args: argparse.Namespace) -> int:
    traces = load_traces(args.skill)
    d = traces_dir(args.skill)
    index_path = d / "index.md"

    if not traces:
        index_path.write_text(f"# {args.skill} — Decision Trace Summary\n\nNo traces recorded yet.\n")
        print(f"Wrote {index_path}")
        return 0

    lines = [
        f"# {args.skill} — Decision Trace Summary",
        "",
        f"**Total traces**: {len(traces)}",
        f"**Date range**: {min(t.get('timestamp', '')[:10] for t in traces)} to {max(t.get('timestamp', '')[:10] for t in traces)}",
        "",
    ]

    # Gates sorted by avg refinement loops (highest first)
    gate_data: Dict[str, List[int]] = {}
    for t in traces:
        g = t.get("gate", {})
        name = g.get("name", "unknown")
        gate_data.setdefault(name, []).append(g.get("refinement_loops", 0))

    lines.append("## Gates by refinement effort")
    lines.append("")
    sorted_gates = sorted(gate_data.items(), key=lambda x: sum(x[1]) / len(x[1]), reverse=True)
    for name, loops in sorted_gates[:10]:
        avg = sum(loops) / len(loops)
        total = len(loops)
        high_loop = sum(1 for l in loops if l > 0)
        lines.append(f"- **{name}**: {total} traces, avg {avg:.1f} loops, {high_loop} with refinement")

    # Recent unstructured feedback
    recent = sorted(traces, key=lambda t: t.get("timestamp", ""), reverse=True)[:10]
    feedback_items = []
    for t in recent:
        for fb in t.get("feedback", {}).get("unstructured", []):
            feedback_items.append((t.get("timestamp", "")[:10], t["gate"]["name"], fb))
    if feedback_items:
        lines.extend(["", "## Recent feedback", ""])
        for ts, gate, fb in feedback_items[:10]:
            lines.append(f'- [{ts}] **{gate}**: "{fb}"')

    # Top categories
    all_cats: Counter = Counter()
    for t in traces:
        for cat in t.get("feedback", {}).get("structured", {}).get("categories", []):
            all_cats[cat] += 1
    if all_cats:
        lines.extend(["", "## Top feedback categories", ""])
        for cat, count in all_cats.most_common(10):
            lines.append(f"- {cat}: {count}")

    # Improvement signal
    high_loop_gates = [(name, sum(loops) / len(loops)) for name, loops in sorted_gates if sum(loops) / len(loops) > 1.5]
    if high_loop_gates:
        lines.extend(["", "## Improvement signals", ""])
        lines.append("The following gates consistently require refinement and may benefit from `/skill-improve`:")
        for name, avg in high_loop_gates:
            lines.append(f"- **{name}** (avg {avg:.1f} loops)")

    lines.append("")
    index_path.write_text("\n".join(lines))
    print(f"Wrote {index_path}")
    return 0


def command_prune(args: argparse.Namespace) -> int:
    traces = load_traces(args.skill)
    if not traces:
        print("No traces to prune.")
        return 0

    cutoff = _parse_duration(args.older_than)
    now = datetime.now(timezone.utc)
    threshold = now - cutoff

    kept = []
    pruned = 0
    for t in traces:
        ts_str = t.get("timestamp", "")
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if ts < threshold:
                pruned += 1
                continue
        except (ValueError, TypeError):
            pass
        kept.append(t)

    trace_file = traces_dir(args.skill) / "traces.ndjson"
    with open(trace_file, "w") as f:
        for t in kept:
            f.write(json.dumps(t, separators=(",", ":")) + "\n")

    print(f"Pruned {pruned} traces, kept {len(kept)}.")
    return 0


def _extract_patterns(feedback_items: List[str], min_count: int = 2) -> List[tuple]:
    """Extract recurring themes from feedback text using simple n-gram analysis."""
    if not feedback_items:
        return []

    # Normalize and tokenize
    normalized = []
    for fb in feedback_items:
        words = re.sub(r"[^\w\s]", "", fb.lower()).split()
        normalized.append(words)

    # Extract 2-grams and 3-grams
    ngram_counter: Counter = Counter()
    for words in normalized:
        for n in (2, 3):
            for i in range(len(words) - n + 1):
                gram = " ".join(words[i : i + n])
                # Skip very common/stopword-heavy grams
                if all(w in _STOPWORDS for w in words[i : i + n]):
                    continue
                ngram_counter[gram] += 1

    # Also count per-feedback presence (not just frequency)
    presence_counter: Counter = Counter()
    for words in normalized:
        seen = set()
        for n in (2, 3):
            for i in range(len(words) - n + 1):
                gram = " ".join(words[i : i + n])
                if gram not in seen and gram in ngram_counter:
                    seen.add(gram)
                    presence_counter[gram] += 1

    # Return patterns that appear in min_count distinct feedback items
    patterns = [
        (gram, count)
        for gram, count in presence_counter.most_common(20)
        if count >= min_count
    ]
    return patterns


_STOPWORDS = frozenset(
    "the a an is was were be been being have has had do does did will would shall should "
    "may might can could this that these those it its and or but not no nor for to in on at "
    "by of with from as into about between through after before".split()
)


def _parse_duration(s: str) -> timedelta:
    """Parse duration strings like '6m', '30d', '1y'."""
    match = re.match(r"^(\d+)([dmyDMY])$", s)
    if not match:
        raise ValueError(f"Invalid duration: {s}. Use format like 6m, 30d, 1y")
    value = int(match.group(1))
    unit = match.group(2).lower()
    if unit == "d":
        return timedelta(days=value)
    if unit == "m":
        return timedelta(days=value * 30)
    if unit == "y":
        return timedelta(days=value * 365)
    raise ValueError(f"Unknown unit: {unit}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Query decision traces for skill feedback loops")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # recent
    r = subparsers.add_parser("recent", help="Show recent traces for a gate (short loop)")
    r.add_argument("--skill", required=True)
    r.add_argument("--gate", help="Filter by gate name")
    r.add_argument("--limit", type=int, default=5, help="Max traces to show (default: 5)")
    r.add_argument("--min-loops", type=int, default=0, help="Min refinement loops (default: 0)")
    r.add_argument("--json", action="store_true", help="JSON output")

    # stats
    s = subparsers.add_parser("stats", help="Aggregate statistics")
    s.add_argument("--skill", required=True)

    # patterns
    p = subparsers.add_parser("patterns", help="Extract feedback patterns")
    p.add_argument("--skill", required=True)
    p.add_argument("--gate", help="Filter by gate name")
    p.add_argument("--min-occurrences", type=int, default=2)

    # summarize
    sm = subparsers.add_parser("summarize", help="Regenerate index.md")
    sm.add_argument("--skill", required=True)

    # prune
    pr = subparsers.add_parser("prune", help="Remove old traces")
    pr.add_argument("--skill", required=True)
    pr.add_argument("--older-than", required=True, help="Duration: 6m, 30d, 1y")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    commands = {
        "recent": command_recent,
        "stats": command_stats,
        "patterns": command_patterns,
        "summarize": command_summarize,
        "prune": command_prune,
    }
    handler = commands.get(args.command)
    if not handler:
        print(f"Unknown command: {args.command}", file=sys.stderr)
        return 1
    return handler(args)


if __name__ == "__main__":
    raise SystemExit(main())
