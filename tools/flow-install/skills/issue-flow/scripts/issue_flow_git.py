#!/usr/bin/env python3

import argparse
import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional


def run_git(args: List[str], cwd: Optional[Path] = None) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=str(cwd) if cwd else None,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def current_checkout_root(start: Optional[Path] = None) -> Path:
    cwd = start or Path.cwd()
    return Path(run_git(["rev-parse", "--path-format=absolute", "--show-toplevel"], cwd=cwd)).resolve()


def canonical_repo_root(start: Optional[Path] = None) -> Path:
    cwd = start or Path.cwd()
    common_dir = Path(run_git(["rev-parse", "--path-format=absolute", "--git-common-dir"], cwd=cwd))
    return common_dir.parent.resolve()


def project_name(repo_root: Path) -> str:
    return repo_root.name


def canonical_worktree_root(repo_root: Path) -> Path:
    return (repo_root.parent / f"{repo_root.name}-worktrees").resolve()


def sanitize_branch_name(raw: str) -> str:
    allowed = []
    last_sep = False
    for char in raw.lower():
        if char.isalnum() or char in {"-", "_"}:
            allowed.append(char)
            last_sep = False
        else:
            if not last_sep:
                allowed.append("-")
                last_sep = True
    sanitized = "".join(allowed).strip("-_")
    while "--" in sanitized:
        sanitized = sanitized.replace("--", "-")
    return sanitized


def canonical_worktree_path(repo_root: Path, branch: str) -> Path:
    return canonical_worktree_root(repo_root) / sanitize_branch_name(branch)


def parse_worktree_list(repo_root: Path) -> List[Dict[str, Any]]:
    output = run_git(["worktree", "list", "--porcelain"], cwd=repo_root)
    if not output:
        return []

    items: List[Dict[str, Any]] = []
    current: Dict[str, Any] = {}
    for line in output.splitlines():
        if not line:
            if current:
                items.append(current)
                current = {}
            continue
        key, _, value = line.partition(" ")
        if key == "worktree":
            current["path"] = value
        elif key == "HEAD":
            current["head"] = value
        elif key == "branch":
            current["branch"] = value.removeprefix("refs/heads/")
        else:
            current[key] = value or True
    if current:
        items.append(current)
    return items


def branch_exists(repo_root: Path, branch: str) -> bool:
    result = subprocess.run(
        ["git", "show-ref", "--verify", f"refs/heads/{branch}"],
        cwd=str(repo_root),
        capture_output=True,
        text=True,
    )
    return result.returncode == 0


def ensure_worktree_root(repo_root: Path) -> Path:
    root = canonical_worktree_root(repo_root)
    root.mkdir(parents=True, exist_ok=True)
    return root


def create_worktree(repo_root: Path, branch: str, base_branch: str) -> Dict[str, Any]:
    root = ensure_worktree_root(repo_root)
    path = canonical_worktree_path(repo_root, branch)
    sanitized_branch = sanitize_branch_name(branch)

    attached = None
    for item in parse_worktree_list(repo_root):
        if item.get("branch") == sanitized_branch:
            attached = item
            break

    if attached:
        return {
            "repo_root": str(repo_root),
            "project": project_name(repo_root),
            "worktree_root": str(root),
            "branch": sanitized_branch,
            "base_branch": base_branch,
            "worktree": attached.get("path"),
            "created": False,
            "attached_elsewhere": True,
        }

    if path.exists():
        return {
            "repo_root": str(repo_root),
            "project": project_name(repo_root),
            "worktree_root": str(root),
            "branch": sanitized_branch,
            "base_branch": base_branch,
            "worktree": str(path),
            "created": False,
            "attached_elsewhere": False,
        }

    cmd = ["worktree", "add", str(path)]
    if branch_exists(repo_root, sanitized_branch):
        cmd.append(sanitized_branch)
    else:
        cmd.extend(["-b", sanitized_branch, base_branch])
    run_git(cmd, cwd=repo_root)

    return {
        "repo_root": str(repo_root),
        "project": project_name(repo_root),
        "worktree_root": str(root),
        "branch": sanitized_branch,
        "base_branch": base_branch,
        "worktree": str(path),
        "created": True,
        "attached_elsewhere": False,
    }


def find_state_files(repo_root: Path, spec_root_rel: str, issue_number: Optional[str]) -> List[str]:
    roots = [repo_root, canonical_worktree_root(repo_root)]
    matches: List[str] = []
    seen = set()
    for root in roots:
        if not root.exists():
            continue
        try:
            candidates = root.glob(f"**/{spec_root_rel}/**/.issue-flow-state.json")
        except Exception:
            continue
        for candidate in candidates:
            resolved = str(candidate.resolve())
            if resolved in seen:
                continue
            seen.add(resolved)
            if issue_number:
                try:
                    payload = json.loads(candidate.read_text())
                except Exception:
                    continue
                if str(payload.get("issue", {}).get("number")) != str(issue_number):
                    continue
            matches.append(resolved)
    return sorted(matches)


def info_payload(repo_root: Path) -> Dict[str, Any]:
    checkout_root = current_checkout_root(repo_root)
    return {
        "canonical_repo_root": str(repo_root),
        "current_checkout_root": str(checkout_root),
        "inside_linked_worktree": checkout_root != repo_root,
        "project": project_name(repo_root),
        "worktree_strategy": "sibling-project-worktrees-v1",
        "worktree_root": str(canonical_worktree_root(repo_root)),
        "worktree_root_relative_hint": f"../{repo_root.name}-worktrees",
    }


def assert_cwd(repo_root: Path, branch: str) -> Dict[str, Any]:
    """Assert that cwd is inside the expected issue worktree."""
    expected = canonical_worktree_path(repo_root, branch)
    cwd = Path.cwd().resolve()
    expected_resolved = expected.resolve()

    inside = False
    try:
        cwd.relative_to(expected_resolved)
        inside = True
    except ValueError:
        pass

    result: Dict[str, Any] = {
        "valid": inside,
        "cwd": str(cwd),
        "expected_worktree": str(expected_resolved),
        "branch": branch,
    }

    if not inside:
        result["error"] = (
            f"Current directory ({cwd}) is NOT inside the expected worktree "
            f"({expected_resolved}). All issue-flow file operations must happen "
            f"inside the issue worktree. cd into the worktree before proceeding."
        )

    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Portable git/worktree helpers for issue-flow")
    subparsers = parser.add_subparsers(dest="command", required=True)

    info_parser = subparsers.add_parser("info")
    info_parser.add_argument("--repo-root")

    path_parser = subparsers.add_parser("path")
    path_parser.add_argument("--repo-root")
    path_parser.add_argument("--branch", required=True)

    create_parser = subparsers.add_parser("create")
    create_parser.add_argument("--repo-root")
    create_parser.add_argument("--branch", required=True)
    create_parser.add_argument("--base-branch", default="main")

    list_parser = subparsers.add_parser("list")
    list_parser.add_argument("--repo-root")

    find_state_parser = subparsers.add_parser("find-state")
    find_state_parser.add_argument("--repo-root")
    find_state_parser.add_argument("--spec-root-rel", required=True)
    find_state_parser.add_argument("--issue-number")

    assert_parser = subparsers.add_parser("assert-cwd")
    assert_parser.add_argument("--repo-root")
    assert_parser.add_argument("--branch", required=True)

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = canonical_repo_root(Path(args.repo_root).resolve() if getattr(args, "repo_root", None) else None)

    if args.command == "info":
        print(json.dumps(info_payload(repo_root), indent=2))
        return 0

    if args.command == "path":
        print(str(canonical_worktree_path(repo_root, args.branch)))
        return 0

    if args.command == "create":
        print(json.dumps(create_worktree(repo_root, args.branch, args.base_branch), indent=2))
        return 0

    if args.command == "list":
        print(json.dumps(parse_worktree_list(repo_root), indent=2))
        return 0

    if args.command == "find-state":
        print(json.dumps(find_state_files(repo_root, args.spec_root_rel, args.issue_number), indent=2))
        return 0

    if args.command == "assert-cwd":
        result = assert_cwd(repo_root, args.branch)
        print(json.dumps(result, indent=2))
        return 0 if result["valid"] else 1

    raise ValueError(f"Unknown command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
