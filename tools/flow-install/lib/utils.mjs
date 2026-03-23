#!/usr/bin/env node

/**
 * flow-install — shared utilities
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

export const pathExists = async (target) => {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
};

export const readFileSafe = async (filePath) => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

export const readJsonSafe = async (filePath) => {
  const raw = await readFileSafe(filePath);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const writeJson = async (filePath, data) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
};

export const copyDir = async (src, dest) => {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
};

export const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

export const writeIfMissing = async (filePath, content) => {
  if (await pathExists(filePath)) return false;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return true;
};

export const promptWithDefault = async (label, defaultValue) => {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(`${label} [${defaultValue}]: `);
    return answer.trim() || defaultValue;
  } finally {
    rl.close();
  }
};

export const promptConfirm = async (label, defaultValue = false) => {
  const rl = readline.createInterface({ input, output });
  const suffix = defaultValue ? "[Y/n]" : "[y/N]";
  try {
    const answer = (await rl.question(`${label} ${suffix}: `)).trim().toLowerCase();
    if (!answer) return defaultValue;
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
};

// ---------------------------------------------------------------------------
// YAML helpers (minimal, no dependency)
// ---------------------------------------------------------------------------

/**
 * Parse a simple flat YAML file (key: value pairs, no nesting).
 * Handles quoted strings, arrays like [a, b, c], and comments.
 */
export const parseSimpleYaml = (content) => {
  const data = {};
  if (!content) return data;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value = trimmed.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    data[key] = value;
  }
  return data;
};

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns { data, body } or null if no frontmatter.
 */
export const parseFrontmatter = (content) => {
  if (!content || !content.startsWith("---")) return null;
  const endIdx = content.indexOf("\n---", 3);
  if (endIdx === -1) return null;
  const frontmatterStr = content.slice(4, endIdx);
  const body = content.slice(endIdx + 4).trim();
  return { data: parseSimpleYaml(frontmatterStr), body };
};

// ---------------------------------------------------------------------------
// Semver helpers (minimal)
// ---------------------------------------------------------------------------

/**
 * Compare two semver strings. Returns -1, 0, or 1.
 */
export const compareSemver = (a, b) => {
  const pa = (a || "0.0.0").split(".").map(Number);
  const pb = (b || "0.0.0").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va < vb) return -1;
    if (va > vb) return 1;
  }
  return 0;
};

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

export const homeDir = os.homedir();

export const resolveHome = (p) => {
  if (p.startsWith("~/")) return path.join(homeDir, p.slice(2));
  return p;
};

export const GLOBAL_SKILLS_DIR = path.join(homeDir, ".agents", "skills");
export const GLOBAL_SCRIPTS_DIR = path.join(homeDir, ".scripts");
export const GLOBAL_COMMANDS_DIR = process.env.XDG_BIN_HOME?.trim() || path.join(homeDir, ".local", "bin");
export const GLOBAL_CLAUDE_MARKETPLACE = path.join(homeDir, ".agents", "claude-marketplace");
export const GLOBAL_CLAUDE_SETTINGS = path.join(homeDir, ".claude", "settings.json");
export const GLOBAL_OPENCODE_CONFIG = path.join(homeDir, ".config", "opencode", "opencode.json");

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

export const log = {
  info: (msg) => console.log(`  ${msg}`),
  ok: (msg) => console.log(`  ${COLORS.green}OK${COLORS.reset} ${msg}`),
  skip: (msg) => console.log(`  ${COLORS.dim}SKIP${COLORS.reset} ${msg}`),
  warn: (msg) => console.log(`  ${COLORS.yellow}WARN${COLORS.reset} ${msg}`),
  error: (msg) => console.error(`  ${COLORS.red}ERR${COLORS.reset} ${msg}`),
  header: (msg) => console.log(`\n${COLORS.cyan}=== ${msg} ===${COLORS.reset}\n`),
  step: (n, total, msg) => console.log(`\n${COLORS.blue}[${n}/${total}]${COLORS.reset} ${msg}`),
  dryRun: (msg) => console.log(`  ${COLORS.yellow}DRY${COLORS.reset} ${msg}`),
};
