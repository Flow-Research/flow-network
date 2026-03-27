#!/usr/bin/env python3
"""
Check for unpromoted skill improvements by comparing installed vs source versions.

Usage:
    promote_check.py check --skill <name> \
        --installed-root ~/.agents/skills \
        --source-root <flow-repo>/tools/flow-install/skills

    promote_check.py scan \
        --installed-root ~/.agents/skills \
        --source-root <flow-repo>/tools/flow-install/skills
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def parse_version(manifest_path: Path) -> Optional[str]:
    if not manifest_path.exists():
        return None
    for line in manifest_path.read_text().splitlines():
        match = re.match(r"^version:\s*(.+)$", line.strip())
        if match:
            return match.group(1).strip().strip('"').strip("'")
    return None


def version_tuple(v: str) -> Tuple[int, ...]:
    return tuple(int(x) for x in v.split(".") if x.isdigit())


def load_improvements(skill: str) -> List[Dict[str, Any]]:
    traces_root = Path.home() / ".agents" / "traces" / skill
    imp_file = traces_root / "improvements.ndjson"
    if not imp_file.exists():
        return []
    improvements = []
    for line in imp_file.read_text().splitlines():
        line = line.strip()
        if line:
            try:
                record = json.loads(line)
                if record.get("type") == "promotion":
                    continue
                improvements.append(record)
            except json.JSONDecodeError:
                continue
    return improvements


def get_promoted_ids(skill: str) -> set:
    traces_root = Path.home() / ".agents" / "traces" / skill
    imp_file = traces_root / "improvements.ndjson"
    if not imp_file.exists():
        return set()
    promoted = set()
    for line in imp_file.read_text().splitlines():
        line = line.strip()
        if line:
            try:
                record = json.loads(line)
                if record.get("type") == "promotion":
                    for imp_id in record.get("improvements_promoted", []):
                        promoted.add(imp_id)
            except json.JSONDecodeError:
                continue
    return promoted


def check_skill(skill: str, installed_root: Path, source_root: Path) -> Dict[str, Any]:
    installed_manifest = installed_root / skill / "manifest.yaml"
    source_manifest = source_root / skill / "manifest.yaml"

    installed_version = parse_version(installed_manifest)
    source_version = parse_version(source_manifest)

    result: Dict[str, Any] = {
        "skill": skill,
        "installed_version": installed_version,
        "source_version": source_version,
        "installed_exists": installed_manifest.exists(),
        "source_exists": source_manifest.exists(),
    }

    if not installed_version or not source_version:
        result["has_unpromoted"] = False
        result["reason"] = "missing manifest"
        return result

    installed_t = version_tuple(installed_version)
    source_t = version_tuple(source_version)

    if installed_t <= source_t:
        result["has_unpromoted"] = False
        result["reason"] = "source is up to date"
        return result

    # There are unpromoted improvements
    all_improvements = load_improvements(skill)
    promoted_ids = get_promoted_ids(skill)
    unpromoted = [
        imp for imp in all_improvements
        if imp.get("improvement_id") not in promoted_ids
    ]

    result["has_unpromoted"] = True
    result["unpromoted_count"] = len(unpromoted)
    result["unpromoted"] = unpromoted

    return result


def command_check(args: argparse.Namespace) -> int:
    installed_root = Path(args.installed_root).expanduser()
    source_root = Path(args.source_root).expanduser()

    result = check_skill(args.skill, installed_root, source_root)
    print(json.dumps(result, indent=2, default=str))
    return 0 if not result.get("has_unpromoted") else 0


def command_scan(args: argparse.Namespace) -> int:
    installed_root = Path(args.installed_root).expanduser()
    source_root = Path(args.source_root).expanduser()

    if not source_root.exists():
        print(json.dumps({"error": f"Source root not found: {source_root}"}), file=sys.stderr)
        return 1

    # Find skills that exist in both locations
    source_skills = {d.name for d in source_root.iterdir() if d.is_dir() and not d.name.startswith("_")}
    installed_skills = {d.name for d in installed_root.iterdir() if d.is_dir() and not d.name.startswith("_")} if installed_root.exists() else set()

    shared_skills = sorted(source_skills & installed_skills)

    results = []
    for skill in shared_skills:
        result = check_skill(skill, installed_root, source_root)
        results.append(result)

    unpromoted = [r for r in results if r.get("has_unpromoted")]

    output = {
        "total_shared_skills": len(shared_skills),
        "skills_with_unpromoted": len(unpromoted),
        "skills": results,
    }

    if not args.json:
        print(f"{'Skill':<30} {'Installed':<12} {'Source':<12} {'Unpromoted'}")
        print("-" * 70)
        for r in results:
            unp = f"{r.get('unpromoted_count', 0)} improvements" if r.get("has_unpromoted") else "—"
            print(f"{r['skill']:<30} {r.get('installed_version', '?'):<12} {r.get('source_version', '?'):<12} {unp}")
        if unpromoted:
            print(f"\n{len(unpromoted)} skill(s) have unpromoted improvements.")
    else:
        print(json.dumps(output, indent=2, default=str))

    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check for unpromoted skill improvements")
    subparsers = parser.add_subparsers(dest="command", required=True)

    c = subparsers.add_parser("check", help="Check one skill")
    c.add_argument("--skill", required=True)
    c.add_argument("--installed-root", required=True)
    c.add_argument("--source-root", required=True)

    s = subparsers.add_parser("scan", help="Scan all shared skills")
    s.add_argument("--installed-root", required=True)
    s.add_argument("--source-root", required=True)
    s.add_argument("--json", action="store_true")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.command == "check":
        return command_check(args)
    if args.command == "scan":
        return command_scan(args)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
