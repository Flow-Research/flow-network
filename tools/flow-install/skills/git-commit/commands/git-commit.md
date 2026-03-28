---
description: Guided local git commit with branch choice and generated message
argument-hint: "[--branch current|new] [--name <branch-name>]"
---

# Git Commit Command

Create a local commit with a friendly branch-selection step and a deterministic commit-message generator.

## User Request

$ARGUMENTS

## Flow

1. Run the inspector first:

```bash
node "${AGENTS_SKILLS_ROOT}/git-commit/scripts/git-commit.js" inspect
```

2. Parse user arguments if present:
   - `--branch current` means commit on the current branch.
   - `--branch new` means ask for or use `--name <branch-name>`.
   - If no branch mode is provided, ask the user whether to commit to the current branch or a new branch.

3. The branch-selection question must display the current branch explicitly.
   - Example option labels:
     - `Current: <branch>`
     - `New branch`
   - Recommendation rules:
     - if current branch is not protected, recommend current branch
     - if current branch is `main` or `dev`, recommend new branch

4. If the selected mode is `new` and no branch name is already provided, ask one targeted follow-up question for the branch name.
   - Prefill or recommend the inspector's `suggestedBranchName`.
   - Validate with:

```bash
git check-ref-format --branch "<branch-name>"
```

5. Refuse to continue when any candidate commit path looks secret-bearing.
   - Block on `.env`, `.env.*`, `*.pem`, `*.key`, `credentials.json`, `secrets.*`.
   - Explain that these files should be excluded or moved before retrying.

6. Execute the deterministic commit wrapper:

```bash
node "${AGENTS_SKILLS_ROOT}/git-commit/scripts/git-commit.js" commit --branch-mode "<current|new>" [--branch-name "<branch-name>"]
```

7. The commit wrapper must perform this exact sequence:
   - verify repository state
   - switch/create the selected branch
   - stage all changes with `git add -A`
   - generate the commit message from staged changes
   - create the commit
   - return JSON describing the outcome

8. If the first commit attempt fails because a hook reformats or edits files, inspect the failure message.
   - If the hook changed files without producing a commit, run the same `commit` command again so the skill creates a new commit from the updated staged content.
   - If the hook fails for another reason, stop and report the hook output plainly.

9. After success, run:

```bash
git status --short
```

10. Return a concise, human-readable result including:
   - current branch before the commit
   - selected branch after the commit
   - whether a new branch was created
   - generated commit subject
   - commit hash
   - final working tree state

## Feedback Capture

After completion, ask the user: **"Any feedback on this run? (skip to finish)"**
If provided, capture it:
```bash
python3 "${AGENTS_SKILLS_ROOT}/_shared/trace_capture.py" capture \
    --skill "git-commit" --gate "run_retrospective" --gate-type "retrospective" \
    --outcome "approved" --feedback "<user's feedback>"
```

