#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const skillRoot = path.resolve(process.cwd(), ".agents", "skills", "context-sync");

const requiredFiles = [
  "SKILL.md",
  "manifest.yaml",
  "commands/context-sync.md",
  "references/acceptance-contract.md",
  "references/evaluation-process.md",
];

const requiredCommandSections = [
  "## Safety Invariants",
  "## Mode Semantics",
  "## Persistent Run Ledger",
  "## Push Flow",
  "## PR Resolution Loop",
  "## Evaluation Contract",
];

const requiredPhrases = [
  ".git/context-sync",
  "feat/api/refactor-auth -> .git/context-sync/runs/feat__api__refactor-auth.json",
  "MAX_AUTONOMOUS_ATTEMPTS=5",
  "MAX_REPEATED_BLOCKER_ATTEMPTS=3",
  "PR_REPO=<owner>/<repo>",
  "gh pr list -R \"$PR_REPO\" --state open --head",
  "status`: local-only",
  "plan`: local-only",
  "abort_reason=no_eligible_publishable_changes",
  "PUBLISH_MODE=noop_pr_only",
  "chore(sync): update repository changes",
];

const forbiddenLinePatterns = [
  /^\s*git add -A\s*$/m,
  /^\s*gh pr view --base\b.*$/m,
  /^\s*git push --force\b.*$/m,
  /^\s*git reset --hard\b.*$/m,
  /^\s*git checkout --\b.*$/m,
];

const forbiddenExactBlocks = [
  "### Step 7: Monitor CI and optionally trigger CI fix flow\n\nIf PR status is `created` or `updated_existing`, launch a background CI watcher task.\n\nDo not wait for CI completion in `context-sync`; sync finishes immediately after watcher start attempt.",
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const errors = [];

  for (const rel of requiredFiles) {
    const full = path.join(skillRoot, rel);
    if (!(await exists(full))) errors.push(`missing required file: ${rel}`);
  }

  if (errors.length) {
    console.error("context-sync evaluation failed:\n" + errors.map((e) => `- ${e}`).join("\n"));
    process.exit(1);
  }

  const skillMd = await fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8");
  const manifest = await fs.readFile(path.join(skillRoot, "manifest.yaml"), "utf8");
  const commandMd = await fs.readFile(path.join(skillRoot, "commands", "context-sync.md"), "utf8");
  const acceptance = await fs.readFile(path.join(skillRoot, "references", "acceptance-contract.md"), "utf8");
  const evaluation = await fs.readFile(path.join(skillRoot, "references", "evaluation-process.md"), "utf8");

  if (!manifest.includes("status: beta") && !manifest.includes("status: stable")) {
    errors.push("manifest status must be beta or stable");
  }

  if (!skillMd.includes("bounded autonomous") || !skillMd.includes("No failed PR may be left unattended")) {
    errors.push("SKILL.md must describe the bounded autonomous PR-resolution loop");
  }

  for (const section of requiredCommandSections) {
    if (!commandMd.includes(section)) errors.push(`commands/context-sync.md missing section: ${section}`);
  }

  for (const phrase of requiredPhrases) {
    if (!commandMd.includes(phrase)) errors.push(`commands/context-sync.md missing phrase: ${phrase}`);
  }

  for (const pattern of forbiddenLinePatterns) {
    if (pattern.test(commandMd)) errors.push(`commands/context-sync.md contains forbidden command line: ${pattern}`);
  }

  for (const block of forbiddenExactBlocks) {
    if (commandMd.includes(block)) errors.push(`commands/context-sync.md contains forbidden duplicated block: ${block}`);
  }

  if (!acceptance.includes("Forbidden Patterns") || !evaluation.includes("Scenario Matrix")) {
    errors.push("reference files are missing core evaluation sections");
  }

  if (errors.length) {
    console.error("context-sync evaluation failed:\n" + errors.map((e) => `- ${e}`).join("\n"));
    process.exit(1);
  }

  console.log("context-sync evaluation passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
