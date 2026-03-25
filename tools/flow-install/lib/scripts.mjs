#!/usr/bin/env node

/**
 * flow-install — lifecycle script installation to ~/.scripts/
 *                plus optional repo-local lifecycle scripts for CI-safe project installs
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  readJsonSafe,
  writeJson,
  ensureDir,
  GLOBAL_SCRIPTS_DIR,
  log,
} from "./utils.mjs";

// ---------------------------------------------------------------------------
// Scripts to install globally
// ---------------------------------------------------------------------------

const SCRIPT_TEMPLATES = {
  "register-skills.mjs": generateRegisterSkills,
  "validate-skills.mjs": generateValidateSkills,
  "register-claude-skills.mjs": generateRegisterClaudeSkills,
  "cleanup-stale-plugins.mjs": generateCleanupStalePlugins,
  "verify-harness.mjs": generateVerifyHarness,
  "sync-rules.mjs": generateSyncRules,
  "skills-root.mjs": generateSkillsRoot,
  "skills-root.config.json": generateSkillsRootConfig,
  "parse-frontmatter.mjs": generateParseFrontmatter,
};

// ---------------------------------------------------------------------------
// Install scripts to ~/.scripts/
// ---------------------------------------------------------------------------

export const installScripts = async ({ dryRun = false } = {}) => {
  await ensureDir(GLOBAL_SCRIPTS_DIR);

  let installed = 0;

  for (const [filename, generator] of Object.entries(SCRIPT_TEMPLATES)) {
    const targetPath = path.join(GLOBAL_SCRIPTS_DIR, filename);
    const content = generator();
    if (dryRun) {
      log.dryRun(`Would generate ${filename} in ~/.scripts/`);
    } else {
      await fs.writeFile(targetPath, content, "utf8");
      log.ok(`${filename} generated -> ~/.scripts/`);
    }
    installed++;
  }

  const pathEntries = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  if (!pathEntries.includes(GLOBAL_SCRIPTS_DIR)) {
    log.warn(`~/.scripts is not currently on PATH (${GLOBAL_SCRIPTS_DIR})`);
  }

  return { installed };
};

export const installProjectScripts = async (projectRoot, { dryRun = false, scriptsDirRel = "scripts/flow" } = {}) => {
  const targetDir = path.join(projectRoot, scriptsDirRel);
  await ensureDir(targetDir);

  const projectTemplates = {
    "register-skills.mjs": generateRegisterSkills,
    "validate-skills.mjs": generateValidateSkills,
    "register-claude-skills.mjs": generateRegisterClaudeSkills,
    "cleanup-stale-plugins.mjs": generateCleanupStalePlugins,
    "verify-harness.mjs": generateVerifyHarness,
    "sync-rules.mjs": generateSyncRules,
  };

  for (const [filename, generator] of Object.entries(projectTemplates)) {
    const targetPath = path.join(targetDir, filename);
    const content = generator();
    if (dryRun) {
      log.dryRun(`Would write ${path.join(scriptsDirRel, filename)}`);
    } else {
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.writeFile(targetPath, content, "utf8");
      log.ok(`${path.join(scriptsDirRel, filename)}`);
    }
  }
};

// ---------------------------------------------------------------------------
// Patch project package.json to reference ~/.scripts/
// ---------------------------------------------------------------------------

export const patchPackageJson = async (projectRoot, { dryRun = false, scriptsDirRel = "scripts/flow" } = {}) => {
  const pkgPath = path.join(projectRoot, "package.json");
  const pkg = await readJsonSafe(pkgPath);
  if (!pkg) {
    log.warn("No package.json found. Skipping script patching.");
    return;
  }

  if (!pkg.scripts) pkg.scripts = {};

  const scriptsDirRef = scriptsDirRel.replace(/\\/g, "/").replace(/\/$/, "");

  const desired = {
    "skills:validate": `node ${scriptsDirRef}/validate-skills.mjs`,
    "skills:register": `node ${scriptsDirRef}/register-skills.mjs`,
    "skills:register:claude": `node ${scriptsDirRef}/register-claude-skills.mjs`,
    "flow:cleanup": `node ${scriptsDirRef}/cleanup-stale-plugins.mjs`,
    "harness:verify": `node ${scriptsDirRef}/verify-harness.mjs`,
    "postinstall": `node ${scriptsDirRef}/sync-rules.mjs`,
  };

  let changed = false;
  for (const [name, command] of Object.entries(desired)) {
    if (pkg.scripts[name] === command) continue;

    if (dryRun) {
      if (pkg.scripts[name]) {
        log.dryRun(`Would update script "${name}": ${pkg.scripts[name]} -> ${command}`);
      } else {
        log.dryRun(`Would add script "${name}": ${command}`);
      }
    } else {
      pkg.scripts[name] = command;
    }
    changed = true;
  }

  if (changed && !dryRun) {
    await writeJson(pkgPath, pkg);
    log.ok("package.json scripts updated");
  } else if (!changed) {
    log.skip("package.json scripts already current");
  }
};

// ---------------------------------------------------------------------------
// Script generators (fallback if Flow Harness scripts/ not available)
// ---------------------------------------------------------------------------

function generateRegisterSkills() {
  return `#!/usr/bin/env node
/**
 * Register project-local skills from .agents/skills/ to ~/.agents/skills/
 * and refresh both Claude Code and OpenCode registration.
 * Auto-generated by flow-install. Do not edit manually.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const GLOBAL_SKILLS_DIR = path.join(HOME, ".agents", "skills");
const GLOBAL_COMMANDS_DIR = (process.env.XDG_BIN_HOME || "").trim() || path.join(HOME, ".local", "bin");
const GLOBAL_CLAUDE_MARKETPLACE = path.join(HOME, ".agents", "claude-marketplace");
const GLOBAL_CLAUDE_SETTINGS = path.join(HOME, ".claude", "settings.json");
const GLOBAL_CLAUDE_INSTALLED_PLUGINS = path.join(HOME, ".claude", "plugins", "installed_plugins.json");
const GLOBAL_CLAUDE_PLUGIN_CACHE = path.join(HOME, ".claude", "plugins", "cache", "flow_harness");
const GLOBAL_OPENCODE_CONFIG = path.join(HOME, ".config", "opencode", "opencode.json");
const projectRoot = process.cwd();
const RESERVED_SCRIPT_NAMES = new Set(["register-skills.mjs", "validate-skills.mjs", "register-claude-skills.mjs", "cleanup-stale-plugins.mjs", "verify-harness.mjs", "sync-rules.mjs", "skills-root.mjs", "skills-root.config.json", "parse-frontmatter.mjs"]);
const DEFAULT_INSTALL_PATHS = {
  agentsFile: "AGENTS.md",
  contextDir: ".jarvis/context",
  skillsDir: ".agents/skills",
  scriptsDir: "scripts/flow",
};

const pathExists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };
const readFileSafe = async (p) => { try { return await fs.readFile(p, "utf8"); } catch (e) { if (e.code === "ENOENT") return null; throw e; } };
const readJsonSafe = async (p) => { const raw = await readFileSafe(p); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };
const resolveInstallPaths = async () => {
  const lockfile = await readJsonSafe(path.join(projectRoot, "flow-install.lock.json"));
  return { ...DEFAULT_INSTALL_PATHS, ...(lockfile?.installPaths || {}) };
};
const resolveProjectPath = (relativePath) => path.resolve(projectRoot, relativePath);
const copyDir = async (src, dest) => {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name), d = path.join(dest, entry.name);
    entry.isDirectory() ? await copyDir(s, d) : await fs.copyFile(s, d);
  }
};
const writeJson = async (p, data) => {
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(data, null, 2) + "\\n", "utf8");
};
const parseSimpleYaml = (content) => {
  const data = {};
  if (!content) return data;
  for (const line of content.split(/\\r?\\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    data[trimmed.slice(0, idx).trim()] = value;
  }
  return data;
};
const parseFrontmatter = (content) => {
  if (!content || !content.startsWith("---")) return null;
  const endIdx = content.indexOf("\\n---", 3);
  if (endIdx === -1) return null;
  return { data: parseSimpleYaml(content.slice(4, endIdx)), body: content.slice(endIdx + 4).trim() };
};
const installSkillExecutables = async (skillDir) => {
  const scriptsDir = path.join(skillDir, "scripts");
  if (!(await pathExists(scriptsDir))) return 0;
  await fs.mkdir(GLOBAL_COMMANDS_DIR, { recursive: true });
  let installed = 0;
  const entries = await fs.readdir(scriptsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".md")) continue;
    if (path.extname(entry.name) !== "") continue;
    if (RESERVED_SCRIPT_NAMES.has(entry.name)) {
      console.log("  WARN skipping command shim " + entry.name + "; reserved by Flow lifecycle scripts");
      continue;
    }
    const sourcePath = path.join(scriptsDir, entry.name);
    const targetPath = path.join(GLOBAL_COMMANDS_DIR, entry.name);
    try {
      const existingStats = await fs.lstat(targetPath);
      if (existingStats.isSymbolicLink()) {
        const existingTarget = await fs.readlink(targetPath);
        const resolvedExisting = path.resolve(path.dirname(targetPath), existingTarget);
        if (resolvedExisting === sourcePath) {
          installed += 1;
          continue;
        }
      }
      console.log("  WARN skipping command shim " + entry.name + "; " + GLOBAL_COMMANDS_DIR + "/" + entry.name + " already exists");
      continue;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await fs.chmod(sourcePath, 0o755).catch(() => {});
    await fs.symlink(sourcePath, targetPath);
    console.log("  OK linked command shim " + entry.name);
    installed += 1;
  }
  return installed;
};

const FLOW_CLAUDE_PLUGIN_ID = "flow-harness";

const registerClaude = async () => {
  const entries = await fs.readdir(GLOBAL_SKILLS_DIR, { withFileTypes: true }).catch(() => []);
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(GLOBAL_SKILLS_DIR, entry.name);
    const skillMd = await readFileSafe(path.join(skillDir, "SKILL.md"));
    if (!skillMd) continue;
    const frontmatter = parseFrontmatter(skillMd);
    const description = frontmatter?.data?.description || "";
    if (!description) continue;
    const body = frontmatter?.body || skillMd;
    skills.push({ name: entry.name, description, skillDir, body });
  }

  await fs.mkdir(path.join(GLOBAL_CLAUDE_MARKETPLACE, ".claude-plugin"), { recursive: true });
  await fs.mkdir(path.join(GLOBAL_CLAUDE_MARKETPLACE, FLOW_CLAUDE_PLUGIN_ID, ".claude-plugin"), { recursive: true });
  await fs.mkdir(path.join(GLOBAL_CLAUDE_MARKETPLACE, FLOW_CLAUDE_PLUGIN_ID, "skills"), { recursive: true });
  for (const skill of skills) {
    const targetPath = path.join(GLOBAL_CLAUDE_MARKETPLACE, FLOW_CLAUDE_PLUGIN_ID, "skills", skill.name);
    try {
      const existing = await fs.lstat(targetPath);
      if (existing.isSymbolicLink()) {
        const existingTarget = await fs.readlink(targetPath);
        const resolvedExisting = path.resolve(path.dirname(targetPath), existingTarget);
        if (resolvedExisting === skill.skillDir) {
          continue;
        }
      }
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch {}
    try {
      await fs.symlink(skill.skillDir, targetPath, 'dir');
    } catch {
      await fs.cp(skill.skillDir, targetPath, { recursive: true });
    }
  }
  await writeJson(path.join(GLOBAL_CLAUDE_MARKETPLACE, FLOW_CLAUDE_PLUGIN_ID, ".claude-plugin", "plugin.json"), {
    name: FLOW_CLAUDE_PLUGIN_ID,
    version: "1.0.0",
    description: "Flow harness skills bundle",
  });
  await writeJson(path.join(GLOBAL_CLAUDE_MARKETPLACE, ".claude-plugin", "marketplace.json"), {
    name: "flow_harness",
    owner: {
      name: "Flow Research",
      email: "support@flowresearch.dev",
    },
    plugins: [{
      name: FLOW_CLAUDE_PLUGIN_ID,
      description: "Flow harness skills bundle",
      version: "1.0.0",
      category: "productivity",
      source: "./" + FLOW_CLAUDE_PLUGIN_ID,
    }],
  });

  const settings = (await readJsonSafe(GLOBAL_CLAUDE_SETTINGS)) || {};
  if (!settings.extraKnownMarketplaces) settings.extraKnownMarketplaces = {};
  settings.extraKnownMarketplaces.flow_harness = {
    source: { source: "directory", path: GLOBAL_CLAUDE_MARKETPLACE },
  };
  delete settings.extraKnownMarketplaces.duru_claude_plugins;
  if (!settings.enabledPlugins) settings.enabledPlugins = {};
  settings.enabledPlugins[FLOW_CLAUDE_PLUGIN_ID + "@flow_harness"] = true;
  delete settings.enabledPlugins["flow-skills@flow_harness"];
  for (const skill of skills) delete settings.enabledPlugins[skill.name + "@flow_harness"];
  await writeJson(GLOBAL_CLAUDE_SETTINGS, settings);

  // --- Clean stale artifacts from old per-skill registration approach ---
  const bundledKey = FLOW_CLAUDE_PLUGIN_ID + "@flow_harness";

  // Clean individual @flow_harness entries from installed_plugins.json
  const installed = await readJsonSafe(GLOBAL_CLAUDE_INSTALLED_PLUGINS);
  if (installed?.plugins) {
    const staleKeys = Object.keys(installed.plugins).filter(k => k.endsWith("@flow_harness") && k !== bundledKey);
    if (staleKeys.length > 0) {
      for (const k of staleKeys) delete installed.plugins[k];
      await writeJson(GLOBAL_CLAUDE_INSTALLED_PLUGINS, installed);
      console.log("  Removed " + staleKeys.length + " stale entries from installed_plugins.json");
    }
  }

  // Clean individual skill dirs from plugin cache (keep only flow-harness/)
  if (await pathExists(GLOBAL_CLAUDE_PLUGIN_CACHE)) {
    const cacheEntries = await fs.readdir(GLOBAL_CLAUDE_PLUGIN_CACHE, { withFileTypes: true });
    const staleEntries = cacheEntries.filter(e => e.isDirectory() && e.name !== FLOW_CLAUDE_PLUGIN_ID);
    for (const entry of staleEntries) await fs.rm(path.join(GLOBAL_CLAUDE_PLUGIN_CACHE, entry.name), { recursive: true, force: true });
    if (staleEntries.length > 0) console.log("  Removed " + staleEntries.length + " stale dirs from plugin cache");
  }

  // Remove old marketplace/skills/ directory (superseded by flow-harness/skills/)
  const oldMarketplaceSkills = path.join(GLOBAL_CLAUDE_MARKETPLACE, "skills");
  if (await pathExists(oldMarketplaceSkills)) {
    await fs.rm(oldMarketplaceSkills, { recursive: true, force: true });
    console.log("  Removed stale marketplace/skills/ directory");
  }

  // Remove per-skill .claude-plugin/ dirs from ~/.agents/skills/
  for (const skill of skills) {
    const perSkillPluginDir = path.join(skill.skillDir, ".claude-plugin");
    if (await pathExists(perSkillPluginDir)) await fs.rm(perSkillPluginDir, { recursive: true, force: true });
  }

  return skills.length;
};

const registerOpenCode = async () => {
  const config = (await readJsonSafe(GLOBAL_OPENCODE_CONFIG)) || { $schema: "https://opencode.ai/config.json" };
  const installPaths = await resolveInstallPaths();
  const projectSkillsRoot = resolveProjectPath(installPaths.skillsDir);
  if (!config.skills) config.skills = {};
  if (!Array.isArray(config.skills.paths)) config.skills.paths = [];
  const normalizePath = async (candidate) => {
    try {
      return await fs.realpath(candidate);
    } catch {
      return path.resolve(candidate);
    }
  };
  const normalizedPaths = [];
  for (const existingPath of config.skills.paths) {
    const normalized = await normalizePath(existingPath);
    if (!normalizedPaths.includes(normalized)) normalizedPaths.push(normalized);
  }
  for (const p of [GLOBAL_SKILLS_DIR, projectSkillsRoot]) {
    const normalized = await normalizePath(p);
    if (!normalizedPaths.includes(normalized)) normalizedPaths.push(normalized);
  }
  config.skills.paths = normalizedPaths;
  await writeJson(GLOBAL_OPENCODE_CONFIG, config);
  return normalizedPaths.length;
};

const run = async () => {
  const installPaths = await resolveInstallPaths();
  const projectSkillsRoot = resolveProjectPath(installPaths.skillsDir);
  await fs.mkdir(GLOBAL_SKILLS_DIR, { recursive: true });
  let copied = 0;
  let commandShims = 0;

  if (await pathExists(projectSkillsRoot)) {
    const entries = await fs.readdir(projectSkillsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillDir = path.join(projectSkillsRoot, entry.name);
      if (!(await pathExists(path.join(skillDir, "SKILL.md")))) continue;
      const target = path.join(GLOBAL_SKILLS_DIR, entry.name);
      if (await pathExists(target)) await fs.rm(target, { recursive: true });
      await copyDir(skillDir, target);
      commandShims += await installSkillExecutables(target);
      copied += 1;
      console.log("  OK copied " + entry.name);
    }
  } else {
    console.log("No project-local skills found at " + projectSkillsRoot + ". Skipping local skill copy.");
  }

  const claudeCount = await registerClaude();
  const opencodePathCount = await registerOpenCode();

  console.log("Copied " + copied + " project skill(s) into " + GLOBAL_SKILLS_DIR);
  console.log("Installed " + commandShims + " command shim(s) into " + GLOBAL_COMMANDS_DIR);
  console.log("Claude Code refreshed for " + claudeCount + " skill(s)");
  console.log("OpenCode skills.paths configured (" + opencodePathCount + " path(s))");
};

run().catch((e) => { console.error("Registration failed:", e); process.exitCode = 1; });
`;
}

function generateValidateSkills() {
  return `#!/usr/bin/env node
/**
 * Validate project-local skills in .agents/skills/.
 * Auto-generated by flow-install.
 */
import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const DEFAULT_INSTALL_PATHS = {
  agentsFile: "AGENTS.md",
  contextDir: ".jarvis/context",
  skillsDir: ".agents/skills",
  scriptsDir: "scripts/flow",
};
const required = ["name","type","version","owner","status","blast_radius","description","permissions","data_categories","egress","invoke","location"];
const readJsonSafe = async (p) => { try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; } };
const resolveInstallPaths = async () => {
  const lockfile = await readJsonSafe(path.join(projectRoot, "flow-install.lock.json"));
  return { ...DEFAULT_INSTALL_PATHS, ...(lockfile?.installPaths || {}) };
};

const run = async () => {
  const installPaths = await resolveInstallPaths();
  const skillsRoot = path.resolve(projectRoot, installPaths.skillsDir);
  const errors = [];
  let entries;
  try { entries = await fs.readdir(skillsRoot, { withFileTypes: true }); } catch { console.log("No project-local skills found at " + skillsRoot + "."); return; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const mPath = path.join(skillsRoot, entry.name, "manifest.yaml");
    let content; try { content = await fs.readFile(mPath, "utf8"); } catch { errors.push("Missing manifest.yaml in " + entry.name); continue; }
    const data = {};
    for (const line of content.split("\\n")) {
      const i = line.indexOf(":"); if (i === -1) continue;
      data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
    for (const f of required) { if (!data[f]) errors.push(entry.name + ": missing " + f); }
  }
  if (errors.length) { console.error("Validation failed:\\n" + errors.map(e => "- " + e).join("\\n")); process.exitCode = 1; }
  else console.log("Skill validation passed.");
};

run().catch((e) => { console.error(e); process.exitCode = 1; });
`;
}

function generateRegisterClaudeSkills() {
  return `#!/usr/bin/env node
/**
 * Register Claude Code skills from ~/.agents/skills/.
 * Auto-generated by flow-install.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const HOME = os.homedir();
const GLOBAL_SKILLS_DIR = path.join(HOME, ".agents", "skills");
const GLOBAL_CLAUDE_MARKETPLACE = path.join(HOME, ".agents", "claude-marketplace");
const GLOBAL_CLAUDE_SETTINGS = path.join(HOME, ".claude", "settings.json");
const GLOBAL_CLAUDE_INSTALLED_PLUGINS = path.join(HOME, ".claude", "plugins", "installed_plugins.json");
const GLOBAL_CLAUDE_PLUGIN_CACHE = path.join(HOME, ".claude", "plugins", "cache", "flow_harness");
const FLOW_CLAUDE_PLUGIN_ID = "flow-harness";

const readFileSafe = async (p) => { try { return await fs.readFile(p, "utf8"); } catch (e) { if (e.code === "ENOENT") return null; throw e; } };
const readJsonSafe = async (p) => { const raw = await readFileSafe(p); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };
const writeJson = async (p, data) => { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, JSON.stringify(data, null, 2) + "\\n", "utf8"); };
const pathExists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };
const parseSimpleYaml = (content) => {
  const data = {};
  if (!content) return data;
  for (const line of content.split(/\\r?\\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    data[trimmed.slice(0, idx).trim()] = value;
  }
  return data;
};
const parseFrontmatter = (content) => {
  if (!content || !content.startsWith("---")) return null;
  const endIdx = content.indexOf("\\n---", 3);
  if (endIdx === -1) return null;
  return { data: parseSimpleYaml(content.slice(4, endIdx)), body: content.slice(endIdx + 4).trim() };
};

const run = async () => {
  const entries = await fs.readdir(GLOBAL_SKILLS_DIR, { withFileTypes: true }).catch(() => []);
  const skills = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(GLOBAL_SKILLS_DIR, entry.name);
    const skillMd = await readFileSafe(path.join(skillDir, "SKILL.md"));
    if (!skillMd) continue;
    const frontmatter = parseFrontmatter(skillMd);
    const description = frontmatter?.data?.description || "";
    if (!description) continue;
    const body = frontmatter?.body || skillMd;
    skills.push({ name: entry.name, description, skillDir, body });
  }

  await fs.mkdir(path.join(GLOBAL_CLAUDE_MARKETPLACE, ".claude-plugin"), { recursive: true });
  await fs.mkdir(path.join(GLOBAL_CLAUDE_MARKETPLACE, FLOW_CLAUDE_PLUGIN_ID, ".claude-plugin"), { recursive: true });
  await fs.mkdir(path.join(GLOBAL_CLAUDE_MARKETPLACE, FLOW_CLAUDE_PLUGIN_ID, "skills"), { recursive: true });
  for (const skill of skills) {
    const targetPath = path.join(GLOBAL_CLAUDE_MARKETPLACE, FLOW_CLAUDE_PLUGIN_ID, "skills", skill.name);
    try {
      const existing = await fs.lstat(targetPath);
      if (existing.isSymbolicLink()) {
        const existingTarget = await fs.readlink(targetPath);
        const resolvedExisting = path.resolve(path.dirname(targetPath), existingTarget);
        if (resolvedExisting === skill.skillDir) continue;
      }
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch {}
    try {
      await fs.symlink(skill.skillDir, targetPath, 'dir');
    } catch {
      await fs.cp(skill.skillDir, targetPath, { recursive: true });
    }
  }
  await writeJson(path.join(GLOBAL_CLAUDE_MARKETPLACE, FLOW_CLAUDE_PLUGIN_ID, ".claude-plugin", "plugin.json"), {
    name: FLOW_CLAUDE_PLUGIN_ID,
    version: "1.0.0",
    description: "Flow harness skills bundle",
  });
  await writeJson(path.join(GLOBAL_CLAUDE_MARKETPLACE, ".claude-plugin", "marketplace.json"), {
    name: "flow_harness",
    plugins: [{
      name: FLOW_CLAUDE_PLUGIN_ID,
      description: "Flow harness skills bundle",
      version: "1.0.0",
      category: "productivity",
      source: "./" + FLOW_CLAUDE_PLUGIN_ID,
    }],
  });

  const settings = (await readJsonSafe(GLOBAL_CLAUDE_SETTINGS)) || {};
  if (!settings.extraKnownMarketplaces) settings.extraKnownMarketplaces = {};
  settings.extraKnownMarketplaces.flow_harness = {
    source: { source: "directory", path: GLOBAL_CLAUDE_MARKETPLACE },
  };
  delete settings.extraKnownMarketplaces.duru_claude_plugins;
  if (!settings.enabledPlugins) settings.enabledPlugins = {};
  settings.enabledPlugins[FLOW_CLAUDE_PLUGIN_ID + "@flow_harness"] = true;
  delete settings.enabledPlugins["flow-skills@flow_harness"];
  for (const skill of skills) delete settings.enabledPlugins[skill.name + "@flow_harness"];
  await writeJson(GLOBAL_CLAUDE_SETTINGS, settings);

  const knownMarketplacesPath = path.join(HOME, ".claude", "plugins", "known_marketplaces.json");
  const knownMarketplaces = (await readJsonSafe(knownMarketplacesPath)) || {};
  knownMarketplaces.flow_harness = {
    source: { source: "directory", path: GLOBAL_CLAUDE_MARKETPLACE },
    installLocation: GLOBAL_CLAUDE_MARKETPLACE,
    lastUpdated: new Date().toISOString(),
  };
  await writeJson(knownMarketplacesPath, knownMarketplaces);

  // --- Clean stale artifacts from old per-skill registration approach ---
  const bundledKey = FLOW_CLAUDE_PLUGIN_ID + "@flow_harness";

  const installed = await readJsonSafe(GLOBAL_CLAUDE_INSTALLED_PLUGINS);
  if (installed?.plugins) {
    const staleKeys = Object.keys(installed.plugins).filter(k => k.endsWith("@flow_harness") && k !== bundledKey);
    if (staleKeys.length > 0) {
      for (const k of staleKeys) delete installed.plugins[k];
      await writeJson(GLOBAL_CLAUDE_INSTALLED_PLUGINS, installed);
      console.log("Removed " + staleKeys.length + " stale entries from installed_plugins.json");
    }
  }

  if (await pathExists(GLOBAL_CLAUDE_PLUGIN_CACHE)) {
    const cacheEntries = await fs.readdir(GLOBAL_CLAUDE_PLUGIN_CACHE, { withFileTypes: true });
    const staleEntries = cacheEntries.filter(e => e.isDirectory() && e.name !== FLOW_CLAUDE_PLUGIN_ID);
    for (const entry of staleEntries) await fs.rm(path.join(GLOBAL_CLAUDE_PLUGIN_CACHE, entry.name), { recursive: true, force: true });
    if (staleEntries.length > 0) console.log("Removed " + staleEntries.length + " stale dirs from plugin cache");
  }

  const oldMarketplaceSkills = path.join(GLOBAL_CLAUDE_MARKETPLACE, "skills");
  if (await pathExists(oldMarketplaceSkills)) {
    await fs.rm(oldMarketplaceSkills, { recursive: true, force: true });
    console.log("Removed stale marketplace/skills/ directory");
  }

  for (const skill of skills) {
    const perSkillPluginDir = path.join(skill.skillDir, ".claude-plugin");
    if (await pathExists(perSkillPluginDir)) await fs.rm(perSkillPluginDir, { recursive: true, force: true });
  }

  console.log("Claude Code refreshed for " + skills.length + " skill(s)");
};

run().catch((e) => { console.error("Claude registration failed:", e); process.exitCode = 1; });
`;
}

function generateCleanupStalePlugins() {
  return `#!/usr/bin/env node
/**
 * Clean stale Claude Code plugin artifacts from old per-skill registration.
 * Run: node scripts/flow/cleanup-stale-plugins.mjs [--dry-run]
 * Auto-generated by flow-install.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const dryRun = process.argv.includes("--dry-run");
const HOME = os.homedir();
const PLUGIN_ID = "flow-harness";
const GLOBAL_SKILLS_DIR = path.join(HOME, ".agents", "skills");
const GLOBAL_CLAUDE_MARKETPLACE = path.join(HOME, ".agents", "claude-marketplace");
const GLOBAL_CLAUDE_INSTALLED_PLUGINS = path.join(HOME, ".claude", "plugins", "installed_plugins.json");
const GLOBAL_CLAUDE_PLUGIN_CACHE = path.join(HOME, ".claude", "plugins", "cache", "flow_harness");

const readFileSafe = async (p) => { try { return await fs.readFile(p, "utf8"); } catch (e) { if (e.code === "ENOENT") return null; throw e; } };
const readJsonSafe = async (p) => { const raw = await readFileSafe(p); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };
const writeJson = async (p, data) => { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, JSON.stringify(data, null, 2) + "\\n", "utf8"); };
const pathExists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };
const parseSimpleYaml = (content) => {
  const data = {};
  if (!content) return data;
  for (const line of content.split(/\\r?\\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    data[trimmed.slice(0, idx).trim()] = value;
  }
  return data;
};
const parseFrontmatter = (content) => {
  if (!content || !content.startsWith("---")) return null;
  const endIdx = content.indexOf("\\n---", 3);
  if (endIdx === -1) return null;
  return { data: parseSimpleYaml(content.slice(4, endIdx)), body: content.slice(endIdx + 4).trim() };
};

const main = async () => {
  console.log("Flow cleanup" + (dryRun ? " (dry run)" : "") + "\\n");

  const entries = await fs.readdir(GLOBAL_SKILLS_DIR, { withFileTypes: true }).catch(() => []);
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(GLOBAL_SKILLS_DIR, entry.name);
    const skillMd = await readFileSafe(path.join(skillDir, "SKILL.md"));
    if (!skillMd) continue;
    const fm = parseFrontmatter(skillMd);
    if (!fm?.data?.description) continue;
    skills.push({ name: entry.name, skillDir });
  }

  const bundledKey = PLUGIN_ID + "@flow_harness";

  // 1. installed_plugins.json
  const installed = await readJsonSafe(GLOBAL_CLAUDE_INSTALLED_PLUGINS);
  if (installed?.plugins) {
    const staleKeys = Object.keys(installed.plugins).filter(k => k.endsWith("@flow_harness") && k !== bundledKey);
    if (staleKeys.length > 0) {
      if (dryRun) { console.log("  Would remove " + staleKeys.length + " stale entries from installed_plugins.json"); }
      else { for (const k of staleKeys) delete installed.plugins[k]; await writeJson(GLOBAL_CLAUDE_INSTALLED_PLUGINS, installed); console.log("  Removed " + staleKeys.length + " stale entries from installed_plugins.json"); }
    }
  }

  // 2. plugin cache
  if (await pathExists(GLOBAL_CLAUDE_PLUGIN_CACHE)) {
    const cacheEntries = await fs.readdir(GLOBAL_CLAUDE_PLUGIN_CACHE, { withFileTypes: true });
    const stale = cacheEntries.filter(e => e.isDirectory() && e.name !== PLUGIN_ID);
    if (stale.length > 0) {
      if (dryRun) { console.log("  Would remove " + stale.length + " stale dirs from plugin cache"); }
      else { for (const e of stale) await fs.rm(path.join(GLOBAL_CLAUDE_PLUGIN_CACHE, e.name), { recursive: true, force: true }); console.log("  Removed " + stale.length + " stale dirs from plugin cache"); }
    }
  }

  // 3. marketplace/skills/
  const oldDir = path.join(GLOBAL_CLAUDE_MARKETPLACE, "skills");
  if (await pathExists(oldDir)) {
    if (dryRun) { console.log("  Would remove stale marketplace/skills/ directory"); }
    else { await fs.rm(oldDir, { recursive: true, force: true }); console.log("  Removed stale marketplace/skills/ directory"); }
  }

  // 4. per-skill .claude-plugin/
  let perSkillCleaned = 0;
  for (const skill of skills) {
    const pluginDir = path.join(skill.skillDir, ".claude-plugin");
    if (await pathExists(pluginDir)) {
      if (!dryRun) await fs.rm(pluginDir, { recursive: true, force: true });
      perSkillCleaned++;
    }
  }
  if (perSkillCleaned > 0) {
    console.log("  " + (dryRun ? "Would remove" : "Removed") + " " + perSkillCleaned + " per-skill .claude-plugin/ dirs");
  }

  console.log("\\nDone");
};

main().catch((e) => { console.error("Cleanup failed:", e); process.exitCode = 1; });
`;
}

function generateVerifyHarness() {
  return `#!/usr/bin/env node
/**
 * Verify Flow harness parity for repo, OpenCode, and Claude Code.
 * Auto-generated by flow-install.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const home = os.homedir();
const GLOBAL_SKILLS_DIR = path.join(home, ".agents", "skills");
const GLOBAL_COMMUNITY_METADATA = path.join(home, ".agents", "community-install.json");
const GLOBAL_CLAUDE_MARKETPLACE = path.join(home, ".agents", "claude-marketplace", ".claude-plugin", "marketplace.json");
const GLOBAL_CLAUDE_SKILLS_DIR = path.join(home, ".claude", "skills");
const GLOBAL_CLAUDE_SETTINGS = path.join(home, ".claude", "settings.json");
const GLOBAL_OPENCODE_CONFIG = path.join(home, ".config", "opencode", "opencode.json");
const DEFAULT_INSTALL_PATHS = {
  agentsFile: "AGENTS.md",
  contextDir: ".jarvis/context",
  skillsDir: ".agents/skills",
  scriptsDir: "scripts/flow",
};

const pathExists = async (p) => { try { await fs.access(p); return true; } catch { return false; } };
const readFileSafe = async (p) => { try { return await fs.readFile(p, "utf8"); } catch (e) { if (e.code === "ENOENT") return null; throw e; } };
const readJsonSafe = async (p) => { const raw = await readFileSafe(p); if (!raw) return null; try { return JSON.parse(raw); } catch { return null; } };
const normalizePath = async (candidate) => { try { return await fs.realpath(candidate); } catch { return path.resolve(candidate); } };
const resolveInstallPaths = async () => {
  const lockfile = await readJsonSafe(path.join(projectRoot, "flow-install.lock.json"));
  return { ...DEFAULT_INSTALL_PATHS, ...(lockfile?.installPaths || {}) };
};
const resolveProjectPath = (relativePath) => path.resolve(projectRoot, relativePath);
const checks = [];
const pass = (label, detail = "") => checks.push({ ok: true, label, detail });
const warn = (label, detail = "") => checks.push({ ok: true, level: "WARN", label, detail });
const fail = (label, detail = "") => checks.push({ ok: false, label, detail });

const requirePath = async (label, target) => (await pathExists(target)) ? pass(label, target) : fail(label, target);
const findExecutable = async (name) => {
  const pathEntries = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const entry of pathEntries) {
    const candidate = path.join(entry, name);
    try {
      await fs.access(candidate, fs.constants.X_OK);
      return candidate;
    } catch {}
  }
  return null;
};

const run = async () => {
  const installPaths = await resolveInstallPaths();
  const agentsPath = resolveProjectPath(installPaths.agentsFile);
  const contextDir = resolveProjectPath(installPaths.contextDir);
  const projectSkillsRoot = resolveProjectPath(installPaths.skillsDir);
  const scriptsDir = resolveProjectPath(installPaths.scriptsDir);
  const expectedContextAgentsRef = installPaths.contextDir.replace(/\\\\/g, "/") + "/AGENTS.md";
  const expectedRegisterScript = "node " + installPaths.scriptsDir.replace(/\\\\/g, "/") + "/register-skills.mjs";
  const expectedVerifyScript = "node " + installPaths.scriptsDir.replace(/\\\\/g, "/") + "/verify-harness.mjs";

  await requirePath("AGENTS.md exists", agentsPath);
  const agents = await readFileSafe(agentsPath);
  if (agents?.includes("<!-- flow:start -->") && agents?.includes("<!-- flow:end -->")) pass("AGENTS.md Flow section present");
  else fail("AGENTS.md Flow section present");

  await requirePath("Context README exists", path.join(contextDir, "README.md"));
  await requirePath("Context AGENTS exists", path.join(contextDir, "AGENTS.md"));
  await requirePath("Memory scopes exist", path.join(contextDir, "scopes", "_scopes.yaml"));
  if (agents?.includes(expectedContextAgentsRef)) pass("AGENTS.md points to context AGENTS", expectedContextAgentsRef);
  else fail("AGENTS.md points to context AGENTS");
  await requirePath("Install lockfile exists", path.join(projectRoot, "flow-install.lock.json"));
  await requirePath("register-skills script exists", path.join(scriptsDir, "register-skills.mjs"));
  await requirePath("validate-skills script exists", path.join(scriptsDir, "validate-skills.mjs"));
  await requirePath("register-claude-skills script exists", path.join(scriptsDir, "register-claude-skills.mjs"));
  await requirePath("verify-harness script exists", path.join(scriptsDir, "verify-harness.mjs"));
  await requirePath("sync-rules script exists", path.join(scriptsDir, "sync-rules.mjs"));

  const jarvisPath = await findExecutable("jarvis");
  if (jarvisPath) pass("jarvis is available in PATH", jarvisPath);
  else fail("jarvis is available in PATH");

  const pkg = await readJsonSafe(path.join(projectRoot, "package.json"));
  if (pkg?.scripts?.["skills:register"] === expectedRegisterScript) pass("package.json skills:register configured", pkg.scripts["skills:register"]);
  else fail("package.json skills:register configured", pkg?.scripts?.["skills:register"] || "missing");
  if (pkg?.scripts?.["harness:verify"] === expectedVerifyScript) pass("package.json harness:verify configured", pkg.scripts["harness:verify"]);
  else fail("package.json harness:verify configured", pkg?.scripts?.["harness:verify"] || "missing");

  await requirePath("Global skills directory exists", GLOBAL_SKILLS_DIR);

  // Verify ~/.claude/skills/ symlinks (primary discovery mechanism)
  const claudeSkillsDir = path.join(home, ".claude", "skills");
  if (await pathExists(claudeSkillsDir)) {
    const claudeSkillEntries = await fs.readdir(claudeSkillsDir).catch(() => []);
    if (claudeSkillEntries.length > 0) pass("Claude skills symlinks exist", String(claudeSkillEntries.length) + " symlinks in ~/.claude/skills/");
    else fail("Claude skills symlinks exist", "~/.claude/skills/ is empty");
  } else {
    fail("Claude skills symlinks exist", "~/.claude/skills/ directory missing");
  }

  const opencode = await readJsonSafe(GLOBAL_OPENCODE_CONFIG);
  const opencodePaths = [];
  for (const configuredPath of opencode?.skills?.paths || []) opencodePaths.push(await normalizePath(configuredPath));
  const normalizedGlobal = await normalizePath(GLOBAL_SKILLS_DIR);
  if (opencodePaths.includes(normalizedGlobal)) pass("OpenCode has global skills path", normalizedGlobal);
  else fail("OpenCode has global skills path", normalizedGlobal);
  if (!(await pathExists(projectSkillsRoot))) pass("Project-local skills path optional", projectSkillsRoot);
  else {
    const normalizedProjectSkillsRoot = await normalizePath(projectSkillsRoot);
    if (opencodePaths.includes(normalizedProjectSkillsRoot)) pass("OpenCode has project-local skills path", normalizedProjectSkillsRoot);
    else fail("OpenCode has project-local skills path", normalizedProjectSkillsRoot);
  }

  const localEntries = await fs.readdir(projectSkillsRoot, { withFileTypes: true }).catch(() => []);
  const localSkills = localEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const lockfile = await readJsonSafe(path.join(projectRoot, "flow-install.lock.json"));
  const globalCommunityMetadata = await readJsonSafe(GLOBAL_COMMUNITY_METADATA);
  const components = lockfile?.components || {};
  for (const component of ["skills", "claude", "opencode", "scripts", "context", "memory", "agentsMd"]) {
    if (components[component] === true) pass("Lockfile component recorded", component);
    else fail("Lockfile component recorded", component);
  }
  if (lockfile?.contextAgents?.path === expectedContextAgentsRef) pass("Lockfile context AGENTS path recorded", lockfile.contextAgents.path);
  else fail("Lockfile context AGENTS path recorded", lockfile?.contextAgents?.path || "missing");
  if (lockfile?.contextAgents?.version) pass("Lockfile context AGENTS version recorded", lockfile.contextAgents.version);
  else fail("Lockfile context AGENTS version recorded");

  const flowCoreSkills = Array.isArray(lockfile?.flowCoreSkills) ? lockfile.flowCoreSkills : [];
  if (flowCoreSkills.length === 0) {
    warn("Flow core skills inventory unavailable", "No flowCoreSkills recorded in flow-install.lock.json");
  }
  for (const skill of flowCoreSkills) {
    const globalSkillDir = path.join(GLOBAL_SKILLS_DIR, skill);
    const claudeSkillLink = path.join(GLOBAL_CLAUDE_SKILLS_DIR, skill);
    const skillMdPath = path.join(globalSkillDir, "SKILL.md");
    if (await pathExists(globalSkillDir)) pass("Flow core skill installed globally", skill);
    else fail("Flow core skill installed globally", skill);
    if (await pathExists(skillMdPath)) pass("Flow core skill has SKILL.md", skill);
    else fail("Flow core skill has SKILL.md", skill);
    if (opencodePaths.includes(normalizedGlobal) && await pathExists(skillMdPath)) pass("OpenCode can resolve Flow core skill", skill);
    else fail("OpenCode can resolve Flow core skill", skill);
    if (await pathExists(claudeSkillLink)) pass("Claude skill symlink exists", skill);
    else fail("Claude skill symlink exists", skill);
  }

  const communityConfig = (lockfile?.communitySkills && lockfile.communitySkills.mode !== "none")
    ? { ...(globalCommunityMetadata || {}), ...lockfile.communitySkills }
    : (globalCommunityMetadata || { mode: "none", expected: [], strict: false });
  let expectedCommunitySkills = Array.isArray(communityConfig.expected) ? [...communityConfig.expected] : [];
  if (communityConfig.mode === "full" && expectedCommunitySkills.length === 0 && communityConfig.sourceDir) {
    const communityEntries = await fs.readdir(communityConfig.sourceDir, { withFileTypes: true }).catch(() => []);
    expectedCommunitySkills = communityEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  }
  if (communityConfig.mode === "none") {
    pass("Community skills not required", "mode=none");
  } else if (communityConfig.mode === "full") {
    if (communityConfig.sourceDir) {
      if (await pathExists(communityConfig.sourceDir)) pass("Community source inventory available", communityConfig.sourceDir);
      else fail("Community source inventory available", communityConfig.sourceDir);
    } else {
      fail("Community source inventory available", "mode=full but sourceDir missing");
    }
    if (expectedCommunitySkills.length > 0) pass("Community expected inventory recorded", String(expectedCommunitySkills.length));
    else fail("Community expected inventory recorded", "mode=full but no expected skills recorded");
    if (typeof communityConfig.expectedCount === "number") {
      if (communityConfig.expectedCount === expectedCommunitySkills.length) pass("Community expected count matches inventory", String(communityConfig.expectedCount));
      else fail("Community expected count matches inventory", communityConfig.expectedCount + " != " + expectedCommunitySkills.length);
    }
  } else if (expectedCommunitySkills.length === 0) {
    warn("Community skill expectations not declared", "mode=" + String(communityConfig.mode || "unknown"));
  }
  for (const skill of expectedCommunitySkills) {
    const globalSkillDir = path.join(GLOBAL_SKILLS_DIR, skill);
    const claudeSkillLink = path.join(GLOBAL_CLAUDE_SKILLS_DIR, skill);
    const skillMdPath = path.join(globalSkillDir, "SKILL.md");
    const missing = !(await pathExists(globalSkillDir));
    if (missing && communityConfig.strict) fail("Required community skill installed globally", skill);
    else if (missing) warn("Optional community skill missing globally", skill);
    else pass("Community skill installed globally", skill);

    if (!missing) {
      if (await pathExists(skillMdPath)) pass("Community skill has SKILL.md", skill);
      else if (communityConfig.strict) fail("Community skill has SKILL.md", skill);
      else warn("Community skill has SKILL.md", skill);

      if (opencodePaths.includes(normalizedGlobal) && await pathExists(skillMdPath)) pass("OpenCode can resolve community skill", skill);
      else if (communityConfig.strict) fail("OpenCode can resolve community skill", skill);
      else warn("OpenCode can resolve community skill", skill);

      if (await pathExists(claudeSkillLink)) pass("Claude skill symlink for community skill", skill);
      else if (communityConfig.strict) fail("Claude skill symlink for community skill", skill);
      else warn("Claude skill symlink for community skill", skill);
    }
  }

  for (const skill of localSkills) {
    if (await pathExists(path.join(GLOBAL_SKILLS_DIR, skill))) pass("Global copy exists for local skill", skill);
    else fail("Global copy exists for local skill", skill);
    if (await pathExists(path.join(GLOBAL_CLAUDE_SKILLS_DIR, skill))) pass("Claude skill symlink for local skill", skill);
    else fail("Claude skill symlink for local skill", skill);
    if (opencodePaths.includes(await normalizePath(projectSkillsRoot))) pass("OpenCode can resolve local skill", skill);
    else fail("OpenCode can resolve local skill", skill);
  }

  const failures = checks.filter((check) => !check.ok);
  for (const check of checks) {
    const prefix = check.ok ? (check.level || "PASS") : "FAIL";
    console.log(prefix + " " + check.label + (check.detail ? ": " + check.detail : ""));
  }

  if (failures.length) {
    console.error("\\nHarness verification failed with " + failures.length + " issue(s).");
    process.exitCode = 1;
    return;
  }

  console.log("\\nHarness verification passed.");
};

run().catch((e) => { console.error("Harness verification failed:", e); process.exitCode = 1; });
`;
}

function generateSyncRules() {
  return `#!/usr/bin/env node
/**
 * Postinstall: ensure harness global directories exist.
 * Auto-generated by flow-install.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const home = os.homedir();
await fs.mkdir(path.join(home, ".agents", "skills"), { recursive: true }).catch(() => {});
await fs.mkdir(path.join(home, ".agents", "claude-marketplace", ".claude-plugin"), { recursive: true }).catch(() => {});
await fs.mkdir(path.join(home, ".claude", "skills"), { recursive: true }).catch(() => {});
`;
}

function generateSkillsRoot() {
  return `import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const defaultConfig = { placeholder: "\${AGENTS_SKILLS_ROOT}", envVar: "AGENTS_SKILLS_ROOT", defaultRelativeToHome: ".agents/skills" };

export const getSkillsRootConfig = async (projectRoot) => {
  const configPath = path.join(os.homedir(), ".scripts", "skills-root.config.json");
  let config = defaultConfig;
  try { config = { ...defaultConfig, ...JSON.parse(await fs.readFile(configPath, "utf8")) }; } catch {}
  const envValue = process.env[config.envVar];
  const skillsRoot = envValue?.trim() || path.join(os.homedir(), config.defaultRelativeToHome);
  return { ...config, skillsRoot };
};
`;
}

function generateSkillsRootConfig() {
  return JSON.stringify({
    placeholder: "${AGENTS_SKILLS_ROOT}",
    envVar: "AGENTS_SKILLS_ROOT",
    defaultRelativeToHome: ".agents/skills",
  }, null, 2) + "\n";
}

function generateParseFrontmatter() {
  return `/**
 * Simple YAML frontmatter parser.
 * Auto-generated by flow-install.
 */
export const parseFrontmatter = (content) => {
  if (!content?.startsWith("---")) return null;
  const end = content.indexOf("\\n---", 3);
  if (end === -1) return null;
  const fm = content.slice(4, end);
  const body = content.slice(end + 4).trim();
  const data = {};
  for (const line of fm.split("\\n")) {
    const i = line.indexOf(":"); if (i === -1) continue;
    let val = line.slice(i+1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1,-1);
    data[line.slice(0,i).trim()] = val;
  }
  return { data, body };
};
`;
}
