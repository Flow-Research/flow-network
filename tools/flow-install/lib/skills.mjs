#!/usr/bin/env node

/**
 * flow-install — skill installation to ~/.agents/skills/ + Claude registration
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  pathExists,
  readFileSafe,
  readJsonSafe,
  writeJson,
  copyDir,
  ensureDir,
  parseSimpleYaml,
  parseFrontmatter,
  compareSemver,
  GLOBAL_SKILLS_DIR,
  GLOBAL_COMMANDS_DIR,
  GLOBAL_CLAUDE_MARKETPLACE,
  GLOBAL_CLAUDE_SETTINGS,
  GLOBAL_OPENCODE_CONFIG,
  log,
} from "./utils.mjs";

const RESERVED_SCRIPT_NAMES = new Set([
  "register-skills.mjs",
  "validate-skills.mjs",
  "register-claude-skills.mjs",
  "verify-harness.mjs",
  "sync-rules.mjs",
  "skills-root.mjs",
  "skills-root.config.json",
  "parse-frontmatter.mjs",
]);

const installSkillExecutables = async (skillDir, { dryRun = false } = {}) => {
  const scriptsDir = path.join(skillDir, "scripts");
  if (!(await pathExists(scriptsDir))) return 0;

  await ensureDir(GLOBAL_COMMANDS_DIR);
  let installed = 0;
  const entries = await fs.readdir(scriptsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".md")) continue;
    if (path.extname(entry.name) !== "") continue;
    if (RESERVED_SCRIPT_NAMES.has(entry.name)) {
      log.warn(`Skipping command shim ${entry.name}; reserved by Flow lifecycle scripts`);
      continue;
    }

    const sourcePath = path.join(scriptsDir, entry.name);
    const targetPath = path.join(GLOBAL_COMMANDS_DIR, entry.name);

    if (dryRun) {
      log.dryRun(`Would link ${entry.name} -> ~/.local/bin/${entry.name}`);
      installed++;
      continue;
    }

    try {
      const existingStats = await fs.lstat(targetPath);
      if (existingStats.isSymbolicLink()) {
        const existingTarget = await fs.readlink(targetPath);
        const resolvedExisting = path.resolve(path.dirname(targetPath), existingTarget);
        if (resolvedExisting === sourcePath) {
          installed++;
          continue;
        }
      }
      log.warn(`Skipping command shim ${entry.name}; ~/.local/bin/${entry.name} already exists`);
      continue;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }

    await fs.chmod(sourcePath, 0o755).catch(() => {});
    await fs.symlink(sourcePath, targetPath);
    log.ok(`command shim installed -> ~/.local/bin/${entry.name}`);
    installed++;
  }

  return installed;
};

// ---------------------------------------------------------------------------
// Collect skills from the flow-install skills/ source directory
// ---------------------------------------------------------------------------

const collectSourceSkills = async (flowInstallRoot) => {
  const skillsDir = path.join(flowInstallRoot, "skills");
  if (!(await pathExists(skillsDir))) return [];

  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(skillsDir, entry.name);
    const skillMd = path.join(skillDir, "SKILL.md");
    const manifestPath = path.join(skillDir, "manifest.yaml");

    if (!(await pathExists(skillMd))) continue;

    const manifestContent = await readFileSafe(manifestPath);
    const manifest = manifestContent ? parseSimpleYaml(manifestContent) : {};

    skills.push({
      name: entry.name,
      version: manifest.version || "0.0.0",
      sourceDir: skillDir,
      manifest,
    });
  }

  return skills;
};

// ---------------------------------------------------------------------------
// Install skills to ~/.agents/skills/ with version comparison
// ---------------------------------------------------------------------------

export const installSkills = async (flowInstallRoot, { dryRun = false } = {}) => {
  const sourceSkills = await collectSourceSkills(flowInstallRoot);
  if (sourceSkills.length === 0) {
    log.warn("No skills found in flow-install skills/ directory.");
    return { installed: 0, skipped: 0, upgraded: 0 };
  }

  await ensureDir(GLOBAL_SKILLS_DIR);

  let installed = 0;
  let skipped = 0;
  let upgraded = 0;
  let commandShims = 0;

  for (const skill of sourceSkills) {
    const targetDir = path.join(GLOBAL_SKILLS_DIR, skill.name);
    const targetManifest = path.join(targetDir, "manifest.yaml");

    if (await pathExists(targetDir)) {
      // Check version
      const existingContent = await readFileSafe(targetManifest);
      const existing = existingContent ? parseSimpleYaml(existingContent) : {};
      const cmp = compareSemver(skill.version, existing.version || "0.0.0");

      if (cmp <= 0) {
        log.skip(`${skill.name} (${existing.version || "unknown"} >= ${skill.version})`);
        skipped++;
        commandShims += await installSkillExecutables(targetDir, { dryRun });
        continue;
      }

      // Upgrade
      if (dryRun) {
        log.dryRun(`Would upgrade ${skill.name}: ${existing.version} -> ${skill.version}`);
        upgraded++;
        continue;
      }

      await fs.rm(targetDir, { recursive: true });
      await copyDir(skill.sourceDir, targetDir);
      log.ok(`${skill.name} upgraded: ${existing.version} -> ${skill.version}`);
      upgraded++;
      commandShims += await installSkillExecutables(targetDir, { dryRun });
    } else {
      // Fresh install
      if (dryRun) {
        log.dryRun(`Would install ${skill.name} v${skill.version}`);
        installed++;
        continue;
      }

      await copyDir(skill.sourceDir, targetDir);
      log.ok(`${skill.name} v${skill.version} installed`);
      installed++;
      commandShims += await installSkillExecutables(targetDir, { dryRun });
    }
  }

  return { installed, skipped, upgraded, commandShims, total: sourceSkills.length };
};

// ---------------------------------------------------------------------------
// Claude Code skill registration
// ---------------------------------------------------------------------------

export const registerClaudeSkills = async ({ dryRun = false } = {}) => {
  // Scan all skills in ~/.agents/skills/ (both shared and any already there)
  if (!(await pathExists(GLOBAL_SKILLS_DIR))) {
    log.warn("No skills directory at ~/.agents/skills/. Skipping Claude registration.");
    return;
  }

  const entries = await fs.readdir(GLOBAL_SKILLS_DIR, { withFileTypes: true });
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(GLOBAL_SKILLS_DIR, entry.name);
    const skillMdPath = path.join(skillDir, "SKILL.md");
    const content = await readFileSafe(skillMdPath);
    if (!content) continue;

    const fm = parseFrontmatter(content);
    const name = entry.name;
    const description = fm?.data?.description || "";

    if (!description) continue; // Skip skills without description frontmatter

    skills.push({ name, description, skillDir, body: fm?.body || content });
  }

  if (skills.length === 0) {
    log.warn("No skills with description frontmatter found.");
    return;
  }

  if (dryRun) {
    log.dryRun(`Would register ${skills.length} skills with Claude Code`);
    return;
  }

  // Generate per-skill .claude-plugin/plugin.json
  for (const skill of skills) {
    const pluginDir = path.join(skill.skillDir, ".claude-plugin");
    await ensureDir(pluginDir);
    await writeJson(path.join(pluginDir, "plugin.json"), {
      name: skill.name,
      version: "1.0.0",
      description: skill.description,
    });

    // Auto-create commands/ if missing
    const commandsDir = path.join(skill.skillDir, "commands");
    if (!(await pathExists(commandsDir))) {
      await ensureDir(commandsDir);
      const commandContent = `---\ndescription: ${skill.description}\n---\n\n${skill.body}`;
      await fs.writeFile(path.join(commandsDir, `${skill.name}.md`), commandContent, "utf8");
    }
  }

  // Generate marketplace.json
  const marketplaceDir = path.join(GLOBAL_CLAUDE_MARKETPLACE, ".claude-plugin");
  await ensureDir(marketplaceDir);

  const plugins = skills.map((s) => ({
    name: s.name,
    description: s.description.slice(0, 120),
    version: "1.0.0",
    category: "productivity",
    source: `../skills/${s.name}`,
  }));

  await writeJson(path.join(marketplaceDir, "marketplace.json"), {
    name: "flow_network",
    plugins,
  });

  // Update ~/.claude/settings.json
  await updateClaudeSettings(skills);

  log.ok(`Registered ${skills.length} skills with Claude Code`);
};

const updateClaudeSettings = async (skills) => {
  const settingsPath = GLOBAL_CLAUDE_SETTINGS;
  const existing = await readJsonSafe(settingsPath) || {};

  // Ensure extraKnownMarketplaces
  if (!existing.extraKnownMarketplaces) existing.extraKnownMarketplaces = {};
  existing.extraKnownMarketplaces.flow_network = {
    source: { source: "directory", path: GLOBAL_CLAUDE_MARKETPLACE }
  };

  // Remove old marketplace references
  delete existing.extraKnownMarketplaces.duru_claude_plugins;

  // Enable all skills
  if (!existing.enabledPlugins) existing.enabledPlugins = {};
  for (const skill of skills) {
    existing.enabledPlugins[`${skill.name}@flow_network`] = true;
  }

  // Clean up old monolithic plugin references
  delete existing.enabledPlugins["flow-skills@flow_network"];

  await ensureDir(path.dirname(settingsPath));
  await writeJson(settingsPath, existing);
};

// ---------------------------------------------------------------------------
// OpenCode skill registration
// ---------------------------------------------------------------------------

export const registerOpenCodeSkills = async (projectRoot, { dryRun = false } = {}) => {
  const config = await readJsonSafe(GLOBAL_OPENCODE_CONFIG);
  if (!config) {
    log.skip("No OpenCode config found at ~/.config/opencode/opencode.json");
    return;
  }

  if (!config.skills) config.skills = {};
  if (!Array.isArray(config.skills.paths)) config.skills.paths = [];

  const normalizePath = async (candidate) => {
    try {
      return await fs.realpath(candidate);
    } catch {
      return path.resolve(candidate);
    }
  };

  const normalizedExisting = [];
  for (const existingPath of config.skills.paths) {
    const normalized = await normalizePath(existingPath);
    if (!normalizedExisting.includes(normalized)) normalizedExisting.push(normalized);
  }

  const paths = normalizedExisting;
  let changed = false;

  // Ensure global skills dir is registered
  const normalizedGlobal = await normalizePath(GLOBAL_SKILLS_DIR);
  if (!paths.includes(normalizedGlobal)) {
    if (dryRun) {
      log.dryRun(`Would add ${normalizedGlobal} to OpenCode skills.paths`);
    } else {
      paths.push(normalizedGlobal);
      changed = true;
    }
  }

  // Ensure project-local skills dir is registered (if it exists)
  const projectSkillsDir = path.join(projectRoot, ".agents", "skills");
  if (await pathExists(projectSkillsDir)) {
    const normalizedProjectSkillsDir = await normalizePath(projectSkillsDir);
    if (!paths.includes(normalizedProjectSkillsDir)) {
      if (dryRun) {
        log.dryRun(`Would add ${normalizedProjectSkillsDir} to OpenCode skills.paths`);
      } else {
        paths.push(normalizedProjectSkillsDir);
        changed = true;
      }
    }
  }

  if (changed) {
    config.skills.paths = paths;
    await writeJson(GLOBAL_OPENCODE_CONFIG, config);
    log.ok(`OpenCode skills.paths updated (${paths.length} paths)`);
  } else if (!dryRun) {
    config.skills.paths = paths;
    await writeJson(GLOBAL_OPENCODE_CONFIG, config);
    log.skip("OpenCode skills.paths already current");
  }
};
