# Flow Install Evaluation

This directory contains the executable evaluation harness for Flow installation.

## Local evaluation

Run the fixture-based acceptance checks in an isolated temp HOME:

```bash
bash tests/harness/run-flow-install-eval.sh
```

This validates:

- Jarvis CLI installation in an isolated user home
- OpenCode CLI installation in an isolated user home
- Claude CLI installation in an isolated user home
- Flow install into a base fixture repo
- rerun behavior against the same fixture
- local project skill registration and parity
- custom install path support for AGENTS, context, skills, and scripts
- OpenCode can execute a Flow core slash skill
- Claude can execute a Flow core slash skill
- OpenCode can execute a project-local installed skill
- Claude can execute a project-local installed slash skill

Optional heavier mode:

```bash
FLOW_EVAL_FULL_COMMUNITY=1 bash tests/harness/run-flow-install-eval.sh
```

That installs and verifies the full community skill inventory in the isolated HOME before running `harness:verify`.

## Remote-install docker evaluation

Run a clean-room bootstrap using `curl ... install.sh` inside Docker:

```bash
bash tests/harness/run-remote-install-docker.sh
```

How it works:

- scaffolds an external `dev-container` bundle under `~/containers/harnessy/install-eval`
- builds a container image from that bundle
- snapshots the current working tree into a temporary git repo
- serves the snapshot over a local HTTP server so the bootstrap path uses `curl`
- points `FLOW_REPO_URL` at the git snapshot for remote-style cloning
- runs `jarvis --help` and `pnpm harness:verify` inside the container
- installs `opencode` and `claude` inside the container
- verifies OpenCode can execute both a Flow core skill and a community skill
- verifies Claude can execute both a Flow core slash skill and a community slash skill

Optional heavier mode:

```bash
FLOW_REMOTE_EVAL_FULL_COMMUNITY=1 bash tests/harness/run-remote-install-docker.sh
```

That additionally installs the full community skill set in the container before re-running `harness:verify`.

## Notes

- The remote docker evaluator does not require pushing this repo to GitHub.
- OpenCode loadability is verified by actual slash execution.
- Claude slash execution is verified through `claude -p "/skill-name"` after registration.
- True hosted remote-install validation against GitHub should still be run before release.
