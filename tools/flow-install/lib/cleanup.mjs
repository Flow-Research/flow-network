#!/usr/bin/env node

/**
 * Standardized stale-artifact cleanup for Flow skill registration.
 *
 * Uses a registry pattern: each cleanup task is a {name, description, check, clean}
 * object. To add a new cleanup, append to CLEANUP_TASKS.
 *
 * Exported API:
 *   runCleanup(ctx)    — run all registered tasks, return summary
 *   CLEANUP_TASKS      — the task registry (for inspection/testing)
 *   buildCleanupContext — helper to build the ctx object
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  pathExists,
  readJsonSafe,
  writeJson,
  homeDir,
  GLOBAL_SKILLS_DIR,
  GLOBAL_CLAUDE_MARKETPLACE,
  log as defaultLog,
} from "./utils.mjs";

const FLOW_PLUGIN_ID = "flow-network";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PATHS = {
  installedPlugins: path.join(homeDir, ".claude", "plugins", "installed_plugins.json"),
  pluginCache: path.join(homeDir, ".claude", "plugins", "cache", "flow_network"),
  marketplace: GLOBAL_CLAUDE_MARKETPLACE,
  globalSkills: GLOBAL_SKILLS_DIR,
  claudeSkills: path.join(homeDir, ".claude", "skills"),
};

// ---------------------------------------------------------------------------
// Cleanup task registry
// ---------------------------------------------------------------------------

/** @type {Array<{name: string, description: string, check: (ctx) => Promise<{stale: boolean, count?: number, details?: string}>, clean: (ctx) => Promise<{cleaned: number, details?: string}>}>} */
export const CLEANUP_TASKS = [
  {
    name: "installed-plugins",
    description: "Remove individual @flow_network entries from installed_plugins.json",

    check: async (ctx) => {
      const installed = await readJsonSafe(ctx.paths.installedPlugins);
      if (!installed?.plugins) return { stale: false };
      const bundledKey = `${ctx.pluginId}@flow_network`;
      const staleKeys = Object.keys(installed.plugins).filter(
        (k) => k.endsWith("@flow_network") && k !== bundledKey,
      );
      if (staleKeys.length === 0) return { stale: false };
      return { stale: true, count: staleKeys.length, details: `${staleKeys.length} individual plugin entries` };
    },

    clean: async (ctx) => {
      const installed = await readJsonSafe(ctx.paths.installedPlugins);
      if (!installed?.plugins) return { cleaned: 0 };
      const bundledKey = `${ctx.pluginId}@flow_network`;
      const staleKeys = Object.keys(installed.plugins).filter(
        (k) => k.endsWith("@flow_network") && k !== bundledKey,
      );
      for (const key of staleKeys) delete installed.plugins[key];
      await writeJson(ctx.paths.installedPlugins, installed);
      return { cleaned: staleKeys.length, details: "installed_plugins.json" };
    },
  },

  {
    name: "plugin-cache",
    description: "Remove individual skill dirs from plugin cache (keep bundled dir)",

    check: async (ctx) => {
      if (!(await pathExists(ctx.paths.pluginCache))) return { stale: false };
      const entries = await fs.readdir(ctx.paths.pluginCache, { withFileTypes: true });
      const stale = entries.filter((e) => e.isDirectory() && e.name !== ctx.pluginId);
      if (stale.length === 0) return { stale: false };
      return { stale: true, count: stale.length, details: `${stale.length} cache directories` };
    },

    clean: async (ctx) => {
      if (!(await pathExists(ctx.paths.pluginCache))) return { cleaned: 0 };
      const entries = await fs.readdir(ctx.paths.pluginCache, { withFileTypes: true });
      const stale = entries.filter((e) => e.isDirectory() && e.name !== ctx.pluginId);
      for (const entry of stale) {
        await fs.rm(path.join(ctx.paths.pluginCache, entry.name), { recursive: true, force: true });
      }
      return { cleaned: stale.length, details: "plugin cache" };
    },
  },

  {
    name: "marketplace-skills-dir",
    description: "Remove stale marketplace/skills/ directory (superseded by flow-network/skills/)",

    check: async (ctx) => {
      const oldDir = path.join(ctx.paths.marketplace, "skills");
      if (!(await pathExists(oldDir))) return { stale: false };
      return { stale: true, count: 1, details: "~/.agents/claude-marketplace/skills/" };
    },

    clean: async (ctx) => {
      const oldDir = path.join(ctx.paths.marketplace, "skills");
      if (!(await pathExists(oldDir))) return { cleaned: 0 };
      await fs.rm(oldDir, { recursive: true, force: true });
      return { cleaned: 1, details: "marketplace/skills/ removed" };
    },
  },

  {
    name: "per-skill-plugin-manifests",
    description: "Remove .claude-plugin/ dirs from individual skills in ~/.agents/skills/",

    check: async (ctx) => {
      let count = 0;
      for (const skill of ctx.skills) {
        const pluginDir = path.join(skill.skillDir, ".claude-plugin");
        if (await pathExists(pluginDir)) count++;
      }
      if (count === 0) return { stale: false };
      return { stale: true, count, details: `${count} per-skill .claude-plugin/ dirs` };
    },

    clean: async (ctx) => {
      let cleaned = 0;
      for (const skill of ctx.skills) {
        const pluginDir = path.join(skill.skillDir, ".claude-plugin");
        if (await pathExists(pluginDir)) {
          await fs.rm(pluginDir, { recursive: true, force: true });
          cleaned++;
        }
      }
      return { cleaned, details: ".claude-plugin/ dirs" };
    },
  },

  {
    name: "marketplace-plugin-registration",
    description: "Remove flow_network marketplace plugin from settings (symlinks are primary discovery)",

    check: async (ctx) => {
      const settings = await readJsonSafe(path.join(homeDir, ".claude", "settings.json"));
      if (!settings) return { stale: false };
      const hasPlugin = settings.enabledPlugins?.[`${ctx.pluginId}@flow_network`];
      const hasMarketplace = settings.extraKnownMarketplaces?.flow_network;
      if (!hasPlugin && !hasMarketplace) return { stale: false };
      return { stale: true, count: 1, details: "marketplace plugin enabled in settings.json (causes duplicates)" };
    },

    clean: async (ctx) => {
      const settingsPath = path.join(homeDir, ".claude", "settings.json");
      const settings = await readJsonSafe(settingsPath);
      if (!settings) return { cleaned: 0 };
      let changed = false;
      if (settings.enabledPlugins?.[`${ctx.pluginId}@flow_network`]) {
        delete settings.enabledPlugins[`${ctx.pluginId}@flow_network`];
        changed = true;
      }
      if (settings.extraKnownMarketplaces?.flow_network) {
        delete settings.extraKnownMarketplaces.flow_network;
        changed = true;
      }
      if (changed) await writeJson(settingsPath, settings);
      return { cleaned: changed ? 1 : 0, details: "marketplace plugin disabled in settings.json" };
    },
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Build the context object for cleanup tasks.
 */
export const buildCleanupContext = (skills, { dryRun = false, log: logOverride } = {}) => ({
  skills,
  pluginId: FLOW_PLUGIN_ID,
  paths: PATHS,
  dryRun,
  log: logOverride || defaultLog,
});

/**
 * Run all registered cleanup tasks. Returns a summary.
 */
export const runCleanup = async (ctx) => {
  const results = [];

  for (const task of CLEANUP_TASKS) {
    const checkResult = await task.check(ctx);
    if (!checkResult.stale) {
      results.push({ name: task.name, stale: false, cleaned: 0 });
      continue;
    }

    if (ctx.dryRun) {
      ctx.log.dryRun(`Would clean ${task.name}: ${checkResult.details}`);
      results.push({ name: task.name, stale: true, cleaned: 0, dryRun: true, ...checkResult });
      continue;
    }

    const cleanResult = await task.clean(ctx);
    ctx.log.ok(`${task.name}: cleaned ${cleanResult.cleaned} (${cleanResult.details})`);
    results.push({ name: task.name, stale: true, ...cleanResult });
  }

  const totalCleaned = results.reduce((sum, r) => sum + (r.cleaned || 0), 0);
  const totalStale = results.filter((r) => r.stale).length;

  if (totalStale === 0) {
    ctx.log.skip("No stale artifacts found");
  } else if (!ctx.dryRun) {
    ctx.log.ok(`Cleanup complete: ${totalCleaned} artifact(s) across ${totalStale} task(s)`);
  }

  return { results, totalCleaned, totalStale };
};
