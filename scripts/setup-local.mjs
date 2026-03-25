#!/usr/bin/env node

/**
 * Flow Harness — Local setup wizard
 *
 * Creates personal context files, verifies Jarvis CLI, and registers skills.
 * Adapted from Accelerate Africa's setup-local.mjs for the Flow Harness workspace.
 *
 * Usage:
 *   pnpm setup              # interactive wizard
 *   pnpm setup -- --yes-all # accept all defaults
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { getSkillsRootConfig } from "./skills-root.mjs";

const projectRoot = process.cwd();
const contextDir = path.join(projectRoot, ".jarvis", "context");
const args = process.argv.slice(2);
const yesAll = args.includes("--yes-all");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (question, defaultValue = "") =>
  new Promise((resolve) => {
    if (yesAll) {
      resolve(defaultValue);
      return;
    }
    const suffix = defaultValue ? ` [${defaultValue}]` : "";
    rl.question(`${question}${suffix}: `, (answer) => {
      resolve(answer.trim() || defaultValue);
    });
  });

const confirm = async (question, defaultYes = true) => {
  if (yesAll) return defaultYes;
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await ask(`${question} ${hint}`, defaultYes ? "y" : "n");
  return answer.toLowerCase().startsWith("y");
};

const pathExists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

const log = (msg) => console.log(`  ${msg}`);
const header = (msg) => console.log(`\n=== ${msg} ===\n`);

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const ensureContextDirs = async () => {
  header("Context directories");
  const dirs = [
    ".jarvis/context/docs",
    ".jarvis/context/skills",
    ".jarvis/context/specs",
    ".jarvis/context/plans",
    ".jarvis/context/runbooks",
    ".jarvis/context/templates",
    ".jarvis/context/meetings",
    ".jarvis/context/partnerships",
    ".jarvis/context/private",
  ];

  for (const dir of dirs) {
    const full = path.join(projectRoot, dir);
    await fs.mkdir(full, { recursive: true });
    log(`OK: ${dir}/`);
  }
};

const setupLocalMd = async () => {
  header("Personal context: local.md");
  const localMdPath = path.join(contextDir, "local.md");
  const examplePath = path.join(contextDir, "local.md.example");

  if (await pathExists(localMdPath)) {
    log("local.md already exists — skipping.");
    return;
  }

  if (!(await pathExists(examplePath))) {
    log("local.md.example not found — skipping. (Will be created in Phase 3.)");
    return;
  }

  const template = await fs.readFile(examplePath, "utf8");

  const jarvisPath = await ask(
    "Jarvis CLI path",
    path.join(projectRoot, "Jarvis")
  );

  const content = template.replace(
    /\| Jarvis CLI \|.*\|/,
    `| Jarvis CLI | ${jarvisPath} | Python 3.11+ AI assistant CLI. Use \`uv run jarvis <command>\` |`
  );

  await fs.writeFile(localMdPath, content, "utf8");
  log(`Created local.md with Jarvis path: ${jarvisPath}`);
};

const setupPrivateNamespace = async () => {
  header("Private contributor namespace");
  const username = os.userInfo().username;
  const privateDir = path.join(contextDir, "private", username);

  if (await pathExists(privateDir)) {
    log(`private/${username}/ already exists — skipping.`);
    return;
  }

  await fs.mkdir(privateDir, { recursive: true });
  log(`Created private/${username}/`);
};

const setupPersonalContextFiles = async () => {
  header("Personal private context files");

  const wantPersonal = await confirm(
    "Create personal private context files under .jarvis/context/private/<username>/ (preferences, patterns, calendar, recurring, focus)?",
    true
  );

  if (!wantPersonal) {
    log("Skipped.");
    return;
  }

  const files = [
    { name: "preferences.md", content: "# Preferences\n\nPersonal work preferences and tool settings.\n" },
    { name: "patterns.md", content: "# Patterns\n\nRecurring patterns Jarvis has observed in your work.\n" },
    { name: "calendar.md", content: "# Calendar\n\nUpcoming events and deadlines.\n" },
    { name: "recurring.md", content: "# Recurring\n\nRecurring tasks and reminders.\n" },
    { name: "focus.md", content: "# Focus\n\nCurrent focus areas and active work streams.\n" },
  ];

  for (const file of files) {
    const filePath = path.join(privateDir, file.name);
    if (await pathExists(filePath)) {
      log(`private/${username}/${file.name} already exists — skipping.`);
      continue;
    }
    await fs.writeFile(filePath, file.content, "utf8");
    log(`Created private/${username}/${file.name}`);
  }
};

const registerSkills = async () => {
  header("Skill registration");
  const skillsRootConfig = await getSkillsRootConfig(projectRoot);
  await fs.mkdir(skillsRootConfig.skillsRoot, { recursive: true });
  log(`Skills root: ${skillsRootConfig.skillsRoot}`);

  const sharedSkillsDir = path.join(projectRoot, "tools", "flow-install", "skills");
  const projectSkillsDir = path.join(projectRoot, ".agents", "skills");
  const sharedEntries = await fs.readdir(sharedSkillsDir, { withFileTypes: true }).catch(() => []);
  const projectEntries = await fs.readdir(projectSkillsDir, { withFileTypes: true }).catch(() => []);
  const skillCount =
    sharedEntries.filter((e) => e.isDirectory()).length +
    projectEntries.filter((e) => e.isDirectory()).length;

  if (skillCount === 0) {
    log("No skills found in tools/flow-install/skills/ or .agents/skills/ — skipping registration.");
    return;
  }

  log(`Found ${skillCount} skill(s). Run \`pnpm skills:register\` to install them.`);
  log(`  (includes optional Claude Code marketplace registration)`);
};

const printSummary = async () => {
  header("Setup complete");
  log("What was configured:");
  log("  - Context directory structure");
  log("  - Personal private context files (gitignored)");
  log("  - Private contributor namespace (gitignored)");
  log("");
  log("Next steps:");
  log("  1. Review .jarvis/context/local.md and fill in any missing values");
  log("  2. Review .jarvis/context/AGENTS.md and keep any custom notes outside the Flow-managed block");
  log("  3. Run `pnpm skills:register` to sync project skills and refresh agent registration");
  log("  4. Run `pnpm harness:verify` to confirm OpenCode + Claude parity");
  log("  5. Verify Jarvis CLI: `uv run jarvis status`");
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  console.log("Flow Harness — Local Setup\n");

  await ensureContextDirs();
  await setupLocalMd();
  await setupPrivateNamespace();
  await setupPersonalContextFiles();
  await registerSkills();
  await printSummary();

  rl.close();
};

main().catch((error) => {
  console.error("Setup failed:", error);
  rl.close();
  process.exitCode = 1;
});
