# Reusable Script Checklist

- [ ] Decide whether the capability is `script-only`, `skill-wrapped`, or `jarvis-native`
- [ ] Place the script in the correct location (`scripts/` or `.agents/skills/<name>/scripts/`)
- [ ] Add `--help`
- [ ] Add `--json` if an agent or automation may consume output
- [ ] If terminal-callable, name the executable after the final shell command
- [ ] Document required env vars and side effects
- [ ] Write a command contract using `command-contract.md`
- [ ] Add unit tests or at least one repeatable smoke test
- [ ] Verify stdout/stderr separation
- [ ] Verify non-zero exit code behavior on failure
- [ ] Verify installation into the user-local bin directory and PATH availability when applicable
- [ ] Add a skill wrapper if agent targeting is needed
- [ ] Register skills with `pnpm skills:register` if a project-local skill changed
- [ ] Refresh Jarvis docs and installed artifacts if a Jarvis command changed
