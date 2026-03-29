#!/usr/bin/env node

/**
 * flow-install — Idempotent installer for the Flow framework
 *
 * Installs skills, context vault, memory system, lifecycle scripts,
 * and AGENTS.md section into any project. Registers skills with both
 * Claude Code and OpenCode for cross-agent consistency.
 *
 * Usage:
 *   npx flow-install              # Full install (or upgrade)
 *   npx flow-install --yes        # Non-interactive (CI-safe)
 *   npx flow-install --skills     # Skills + Claude registration
 *   npx flow-install --memory     # Memory system
 *   npx flow-install --agents-md  # Host AGENTS.md merge
 *   npx flow-install --update-context-agents  # Update .jarvis/context/AGENTS.md managed block
 *   npx flow-install --force      # Force-sync all skills (bypass version check)
 *   npx flow-install --dry-run    # Preview changes
 *   npx flow-install --version    # Show version
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { log, readJsonSafe, writeJson, pathExists, ensureDir, promptConfirm } from "./lib/utils.mjs";
import { detectProject } from "./lib/detect.mjs";
import { installSkills, registerClaudeSkills, registerOpenCodeSkills } from "./lib/skills.mjs";
import { installProjectScripts, installScripts, patchPackageJson } from "./lib/scripts.mjs";
import { scaffoldContext } from "./lib/context.mjs";
import { CONTEXT_AGENTS_VERSION, syncContextAgents } from "./lib/context-agents.mjs";
import { installMemory } from "./lib/memory.mjs";
import { mergeAgentsMd } from "./lib/agents-md.mjs";
import { resolveInstallPaths } from "./lib/install-paths.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOTAL_STEPS = 9;

const collectFlowCoreSkillNames = async () => {
  const skillsDir = path.join(__dirname, "skills");
  const entries = await fs.readdir(skillsDir, { withFileTypes: true }).catch(() => []);
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillMd = path.join(skillsDir, entry.name, "SKILL.md");
    try {
      await fs.access(skillMd);
      skills.push(entry.name);
    } catch {}
  }

  return skills.sort();
};

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const args = new Set(argv);

const getArgValue = (flag) => {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
};

const showVersion = args.has("--version") || args.has("-v");
const dryRun = args.has("--dry-run");
const yesAll = args.has("--yes");
const targetArg = getArgValue("--target");
const forceSync = args.has("--force");
const reconfigure = args.has("--reconfigure");
const updateContextAgents = args.has("--update-context-agents");

if (args.has("--target") && !targetArg) {
  console.error("Missing value for --target");
  process.exit(1);
}

// Specific step flags (run all if none specified)
const onlySkills = args.has("--skills");
const onlyMemory = args.has("--memory");
const onlyAgentsMd = args.has("--agents-md");
const hasSpecific = onlySkills || onlyMemory || onlyAgentsMd || updateContextAgents;
const runAll = !hasSpecific;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const main = async () => {
  const pkg = await readJsonSafe(path.join(__dirname, "package.json"));
  const version = pkg?.version || "1.0.0";

  if (showVersion) {
    console.log(`flow-install v${version}`);
    return;
  }

  console.log(`\nflow-install v${version}${dryRun ? " (dry run)" : ""}\n`);

  const projectRoot = targetArg ? path.resolve(targetArg) : process.cwd();

  // ── Step 1: Detect project structure ────────────────────────────────────
  log.step(1, TOTAL_STEPS, "Detecting project structure");
  const projectInfo = await detectProject(projectRoot);
  const installPaths = await resolveInstallPaths(projectRoot, projectInfo, {
    yesAll,
    reconfigure,
  });

  log.info(`Project: ${projectInfo.name}`);
  log.info(`Type: ${projectInfo.monorepo ? `${projectInfo.monorepo.type} monorepo` : "single app"}`);
  if (projectInfo.gitOrg) log.info(`Git org: ${projectInfo.gitOrg}`);
  if (projectInfo.apps.length > 0) log.info(`Apps: ${projectInfo.apps.map((a) => a.dirName).join(", ")}`);
  if (projectInfo.existing.lockfile) {
    log.info(`Previous install: v${projectInfo.existing.lockfile.version} (${projectInfo.existing.lockfile.timestamp})`);
  }

  // ── Step 2: Install shared skills to ~/.agents/skills/ ──────────────────
  if (runAll || onlySkills) {
    log.step(2, TOTAL_STEPS, "Installing shared skills to ~/.agents/skills/");
    const result = await installSkills(__dirname, { dryRun, force: forceSync });
    if (!dryRun) {
      log.info(`Skills: ${result.installed} installed, ${result.upgraded} upgraded, ${result.skipped} current`);
      log.info(`Command shims: ${result.commandShims} linked into user-local bin`);
    }
  }

  // ── Step 3: Register skills with Claude Code + OpenCode ─────────────────
  if (runAll || onlySkills) {
    log.step(3, TOTAL_STEPS, "Registering skills with agents");
    await registerClaudeSkills({ dryRun });
    await registerOpenCodeSkills(projectRoot, {
      dryRun,
      skillsDirRel: installPaths.skillsDir,
    });
  }

  // ── Step 4: Install lifecycle scripts to ~/.scripts/ ────────────────────
  if (runAll) {
    log.step(4, TOTAL_STEPS, "Installing lifecycle scripts to ~/.scripts/");
    await installScripts({ dryRun });
    await installProjectScripts(projectRoot, {
      dryRun,
      scriptsDirRel: installPaths.scriptsDir,
    });
  }

  // ── Step 5: Patch project package.json ──────────────────────────────────
  if (runAll) {
    log.step(5, TOTAL_STEPS, "Patching project package.json");
    await patchPackageJson(projectRoot, {
      dryRun,
      scriptsDirRel: installPaths.scriptsDir,
    });
  }

  // ── Step 6: Scaffold .jarvis/context/ vault ─────────────────────────────
  if (runAll) {
    log.step(6, TOTAL_STEPS, "Scaffolding .jarvis/context/ vault");
    await scaffoldContext(projectRoot, {
      dryRun,
      contextDirRel: installPaths.contextDir,
    });
    projectInfo.existing.contextAgentsResult = await syncContextAgents(projectRoot, {
      dryRun,
      contextDirRel: installPaths.contextDir,
      installPaths,
      forceUpdate: true,
      promptOnUpdate: false,
    });
  } else if (updateContextAgents) {
    log.step(6, TOTAL_STEPS, "Updating .jarvis/context/AGENTS.md");
    projectInfo.existing.contextAgentsResult = await syncContextAgents(projectRoot, {
      dryRun,
      contextDirRel: installPaths.contextDir,
      installPaths,
      forceUpdate: true,
      promptOnUpdate: false,
    });
  }

  // ── Step 7: Install memory system ───────────────────────────────────────
  if (runAll || onlyMemory) {
    log.step(7, TOTAL_STEPS, "Installing memory system");
    await installMemory(projectRoot, projectInfo, {
      dryRun,
      contextDirRel: installPaths.contextDir,
    });
  }

  // ── Step 8: Merge AGENTS.md ─────────────────────────────────────────────
  if (runAll || onlyAgentsMd) {
    log.step(8, TOTAL_STEPS, "Merging AGENTS.md");
    await mergeAgentsMd(projectRoot, {
      dryRun,
      agentsFileRel: installPaths.agentsFile,
      installPaths,
    });
  }

  // ── Step 9: Autoflow CI setup (optional) ────────────────────────────────
  let autoflowInstalled = projectInfo.existing.lockfile?.components?.autoflow ?? null;
  if (runAll && !dryRun) {
    log.step(9, TOTAL_STEPS, "Autoflow CI setup");
    const alreadyInstalled = autoflowInstalled === true;
    const previouslyDeclined = autoflowInstalled === false;

    if (alreadyInstalled && !reconfigure) {
      // Previously accepted — silently update templates (supports flow:sync with --yes)
      const templatesDir = path.join(__dirname, "templates");
      const workflowTarget = path.join(projectRoot, ".github", "workflows", "autoflow.yml");
      const templateSource = path.join(templatesDir, "autoflow.yml");
      if (await pathExists(templateSource)) {
        await ensureDir(path.join(projectRoot, ".github", "workflows"));
        await fs.copyFile(templateSource, workflowTarget);
      }
      log.skip("Autoflow CI already installed (templates updated)");
    } else if (previouslyDeclined && !reconfigure) {
      log.skip("Autoflow CI previously declined (use --reconfigure to re-ask)");
    } else if (yesAll) {
      log.skip("Autoflow CI skipped in non-interactive mode (run flow-install --reconfigure to enable)");
      if (autoflowInstalled === null) autoflowInstalled = false;
    } else {
      const wantAutoflow = await promptConfirm(
        "Install autoflow GitHub Actions workflow? (enables autonomous issue processing)",
        false,
      );
      if (wantAutoflow) {
        const templatesDir = path.join(__dirname, "templates");
        // Copy autoflow.yml
        const workflowDir = path.join(projectRoot, ".github", "workflows");
        await ensureDir(workflowDir);
        await fs.copyFile(
          path.join(templatesDir, "autoflow.yml"),
          path.join(workflowDir, "autoflow.yml"),
        );
        log.ok("Installed .github/workflows/autoflow.yml");

        // Copy program.md (only if not already present)
        const programPath = path.join(projectRoot, "program.md");
        if (!(await pathExists(programPath))) {
          await fs.copyFile(path.join(templatesDir, "program.md"), programPath);
          log.ok("Installed program.md (customize objectives and thresholds)");
        } else {
          log.skip("program.md already exists");
        }

        autoflowInstalled = true;
      } else {
        log.skip("Autoflow CI declined");
        autoflowInstalled = false;
      }
    }
  }

  // ── Write lockfile ──────────────────────────────────────────────────────
  if ((runAll || updateContextAgents) && !dryRun) {
    const flowCoreSkills = await collectFlowCoreSkillNames();
    const previousCommunitySkills = projectInfo.existing.lockfile?.communitySkills || {
      mode: "none",
      expected: [],
      strict: false,
    };
    const lockfile = {
      version,
      timestamp: new Date().toISOString(),
      project: projectInfo.name,
      monorepo: projectInfo.monorepo?.type || null,
      apps: projectInfo.apps.map((a) => a.dirName),
      gitOrg: projectInfo.gitOrg,
      components: {
        ...(projectInfo.existing.lockfile?.components || {}),
        skills: true,
        claude: true,
        opencode: true,
        scripts: true,
        context: true,
        memory: true,
        agentsMd: true,
        ...(autoflowInstalled !== null ? { autoflow: autoflowInstalled } : {}),
      },
      flowCoreSkills,
      communitySkills: previousCommunitySkills,
      contextAgents: {
        version: CONTEXT_AGENTS_VERSION,
        templateHash: projectInfo.existing.contextAgentsResult?.templateHash || projectInfo.existing.lockfile?.contextAgents?.templateHash || null,
        status: projectInfo.existing.contextAgentsResult?.status || projectInfo.existing.lockfile?.contextAgents?.status || "unknown",
        path: `${installPaths.contextDir}/AGENTS.md`,
      },
      installPaths,
    };
    await writeJson(path.join(projectRoot, "flow-install.lock.json"), lockfile);
    log.ok("flow-install.lock.json written");
  }

  // ── Configure git merge strategy for auto-generated files ───────────────
  if (runAll && !dryRun) {
    try {
      const { execFileSync } = await import("node:child_process");
      execFileSync("git", ["config", "merge.ours.driver", "true"], { cwd: projectRoot, stdio: "ignore" });
      log.ok("git merge.ours driver configured (prevents lock/AGENTS conflicts on rebase)");
    } catch {
      // Not a git repo or git not available — skip silently
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("");
  if (dryRun) {
    log.header("Dry run complete — no files were changed");
  } else {
    log.header("Installation complete");
    console.log("  Next steps:");
    console.log("    1. Review .jarvis/context/ and fill in project context files");
    console.log("    2. Review .jarvis/context/AGENTS.md and add any project notes outside the Flow-managed block");
    console.log("    3. Review .jarvis/context/scopes/_scopes.yaml and customize scopes");
    console.log("    4. Review AGENTS.md Flow section");
    console.log("    5. Re-run with --update-context-agents when you want to apply newer Flow protocol updates");
    console.log("    6. Commit: flow-install.lock.json, .jarvis/, AGENTS.md changes");
    console.log("    7. Run: pnpm skills:register (to sync project-specific skills and refresh agent registration)");
    console.log("    8. Run: pnpm harness:verify");
    console.log("");
  }
};

main().catch((error) => {
  log.error(error.message);
  if (process.env.DEBUG) console.error(error);
  process.exitCode = 1;
});
