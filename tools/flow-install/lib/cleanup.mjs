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

const FLOW_PLUGIN_ID = "harnessy";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const PATHS = {
  installedPlugins: path.join(homeDir, ".claude", "plugins", "installed_plugins.json"),
  pluginCache: path.join(homeDir, ".claude", "plugins", "cache", "harnessy"),
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
    name: "legacy-plugin-id-migration",
    description: "Migrate from old flow-network plugin ID to harnessy (for existing installations)",

    check: async (ctx) => {
      let staleCount = 0;
      const oldMarketplaceDir = path.join(ctx.paths.marketplace, "..", "claude-marketplace", "flow-network");
      if (await pathExists(oldMarketplaceDir)) staleCount++;
      const oldCacheDir = path.join(homeDir, ".claude", "plugins", "cache", "flow_network");
      if (await pathExists(oldCacheDir)) staleCount++;
      const settings = await readJsonSafe(path.join(homeDir, ".claude", "settings.json"));
      if (settings?.enabledPlugins?.["flow-network@flow_network"]) staleCount++;
      if (settings?.extraKnownMarketplaces?.flow_network) staleCount++;
      const known = await readJsonSafe(path.join(homeDir, ".claude", "plugins", "known_marketplaces.json"));
      if (known?.flow_network) staleCount++;
      const installed = await readJsonSafe(ctx.paths.installedPlugins);
      if (installed?.plugins) {
        const oldKeys = Object.keys(installed.plugins).filter(k => k.endsWith("@flow_network"));
        staleCount += oldKeys.length;
      }
      if (staleCount === 0) return { stale: false };
      return { stale: true, count: staleCount, details: `${staleCount} legacy flow-network artifact(s)` };
    },

    clean: async (ctx) => {
      let cleaned = 0;

      // Remove old marketplace dir
      const oldMarketplaceDir = path.join(ctx.paths.marketplace, "..", "claude-marketplace", "flow-network");
      if (await pathExists(oldMarketplaceDir)) {
        await fs.rm(oldMarketplaceDir, { recursive: true, force: true });
        cleaned++;
      }

      // Remove old plugin cache
      const oldCacheDir = path.join(homeDir, ".claude", "plugins", "cache", "flow_network");
      if (await pathExists(oldCacheDir)) {
        await fs.rm(oldCacheDir, { recursive: true, force: true });
        cleaned++;
      }

      // Clean settings.json
      const settingsPath = path.join(homeDir, ".claude", "settings.json");
      const settings = await readJsonSafe(settingsPath);
      if (settings) {
        let changed = false;
        if (settings.enabledPlugins?.["flow-network@flow_network"]) {
          delete settings.enabledPlugins["flow-network@flow_network"];
          changed = true; cleaned++;
        }
        if (settings.extraKnownMarketplaces?.flow_network) {
          delete settings.extraKnownMarketplaces.flow_network;
          changed = true; cleaned++;
        }
        if (changed) await writeJson(settingsPath, settings);
      }

      // Clean known_marketplaces.json
      const knownPath = path.join(homeDir, ".claude", "plugins", "known_marketplaces.json");
      const known = await readJsonSafe(knownPath);
      if (known?.flow_network) {
        delete known.flow_network;
        await writeJson(knownPath, known);
        cleaned++;
      }

      // Clean installed_plugins.json
      const installed = await readJsonSafe(ctx.paths.installedPlugins);
      if (installed?.plugins) {
        const oldKeys = Object.keys(installed.plugins).filter(k => k.endsWith("@flow_network"));
        if (oldKeys.length > 0) {
          for (const k of oldKeys) delete installed.plugins[k];
          await writeJson(ctx.paths.installedPlugins, installed);
          cleaned += oldKeys.length;
        }
      }

      return { cleaned, details: "legacy flow-network artifacts removed" };
    },
  },

  {
    name: "legacy-flow-harness-migration",
    description: "Migrate from old flow-harness plugin ID to harnessy (repo renamed)",

    check: async (ctx) => {
      let staleCount = 0;
      const oldMarketplaceDir = path.join(ctx.paths.marketplace, "..", "claude-marketplace", "flow-harness");
      if (await pathExists(oldMarketplaceDir)) staleCount++;
      const oldCacheDir = path.join(homeDir, ".claude", "plugins", "cache", "flow_harness");
      if (await pathExists(oldCacheDir)) staleCount++;
      const settings = await readJsonSafe(path.join(homeDir, ".claude", "settings.json"));
      if (settings?.enabledPlugins?.["flow-harness@flow_harness"]) staleCount++;
      if (settings?.extraKnownMarketplaces?.flow_harness) staleCount++;
      const known = await readJsonSafe(path.join(homeDir, ".claude", "plugins", "known_marketplaces.json"));
      if (known?.flow_harness) staleCount++;
      const installed = await readJsonSafe(ctx.paths.installedPlugins);
      if (installed?.plugins) {
        const oldKeys = Object.keys(installed.plugins).filter(k => k.endsWith("@flow_harness"));
        staleCount += oldKeys.length;
      }
      // Check for old cache directory
      const oldInstallCache = path.join(homeDir, ".cache", "flow-harness");
      if (await pathExists(oldInstallCache)) staleCount++;
      if (staleCount === 0) return { stale: false };
      return { stale: true, count: staleCount, details: `${staleCount} legacy flow-harness artifact(s)` };
    },

    clean: async (ctx) => {
      let cleaned = 0;

      // Remove old marketplace dir
      const oldMarketplaceDir = path.join(ctx.paths.marketplace, "..", "claude-marketplace", "flow-harness");
      if (await pathExists(oldMarketplaceDir)) {
        await fs.rm(oldMarketplaceDir, { recursive: true, force: true });
        cleaned++;
      }

      // Remove old plugin cache
      const oldCacheDir = path.join(homeDir, ".claude", "plugins", "cache", "flow_harness");
      if (await pathExists(oldCacheDir)) {
        await fs.rm(oldCacheDir, { recursive: true, force: true });
        cleaned++;
      }

      // Clean settings.json
      const settingsPath = path.join(homeDir, ".claude", "settings.json");
      const settings = await readJsonSafe(settingsPath);
      if (settings) {
        let changed = false;
        if (settings.enabledPlugins?.["flow-harness@flow_harness"]) {
          delete settings.enabledPlugins["flow-harness@flow_harness"];
          changed = true; cleaned++;
        }
        // Also clean any individual skill entries under the old marketplace
        if (settings.enabledPlugins) {
          for (const key of Object.keys(settings.enabledPlugins)) {
            if (key.endsWith("@flow_harness")) {
              delete settings.enabledPlugins[key];
              changed = true; cleaned++;
            }
          }
        }
        if (settings.extraKnownMarketplaces?.flow_harness) {
          delete settings.extraKnownMarketplaces.flow_harness;
          changed = true; cleaned++;
        }
        if (changed) await writeJson(settingsPath, settings);
      }

      // Clean known_marketplaces.json
      const knownPath = path.join(homeDir, ".claude", "plugins", "known_marketplaces.json");
      const known = await readJsonSafe(knownPath);
      if (known?.flow_harness) {
        delete known.flow_harness;
        await writeJson(knownPath, known);
        cleaned++;
      }

      // Clean installed_plugins.json
      const installed = await readJsonSafe(ctx.paths.installedPlugins);
      if (installed?.plugins) {
        const oldKeys = Object.keys(installed.plugins).filter(k => k.endsWith("@flow_harness"));
        if (oldKeys.length > 0) {
          for (const k of oldKeys) delete installed.plugins[k];
          await writeJson(ctx.paths.installedPlugins, installed);
          cleaned += oldKeys.length;
        }
      }

      return { cleaned, details: "legacy flow-harness artifacts removed (repo renamed to harnessy)" };
    },
  },

  {
    name: "installed-plugins",
    description: "Remove individual @harnessy entries from installed_plugins.json",

    check: async (ctx) => {
      const installed = await readJsonSafe(ctx.paths.installedPlugins);
      if (!installed?.plugins) return { stale: false };
      const bundledKey = `${ctx.pluginId}@harnessy`;
      const staleKeys = Object.keys(installed.plugins).filter(
        (k) => k.endsWith("@harnessy") && k !== bundledKey,
      );
      if (staleKeys.length === 0) return { stale: false };
      return { stale: true, count: staleKeys.length, details: `${staleKeys.length} individual plugin entries` };
    },

    clean: async (ctx) => {
      const installed = await readJsonSafe(ctx.paths.installedPlugins);
      if (!installed?.plugins) return { cleaned: 0 };
      const bundledKey = `${ctx.pluginId}@harnessy`;
      const staleKeys = Object.keys(installed.plugins).filter(
        (k) => k.endsWith("@harnessy") && k !== bundledKey,
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
    description: "Remove stale marketplace/skills/ directory (superseded by harnessy/skills/)",

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
    description: "Remove harnessy marketplace plugin from settings (symlinks are primary discovery)",

    check: async (ctx) => {
      const settings = await readJsonSafe(path.join(homeDir, ".claude", "settings.json"));
      if (!settings) return { stale: false };
      const hasPlugin = settings.enabledPlugins?.[`${ctx.pluginId}@harnessy`];
      const hasMarketplace = settings.extraKnownMarketplaces?.harnessy;
      if (!hasPlugin && !hasMarketplace) return { stale: false };
      return { stale: true, count: 1, details: "marketplace plugin enabled in settings.json (causes duplicates)" };
    },

    clean: async (ctx) => {
      const settingsPath = path.join(homeDir, ".claude", "settings.json");
      const settings = await readJsonSafe(settingsPath);
      if (!settings) return { cleaned: 0 };
      let changed = false;
      if (settings.enabledPlugins?.[`${ctx.pluginId}@harnessy`]) {
        delete settings.enabledPlugins[`${ctx.pluginId}@harnessy`];
        changed = true;
      }
      if (settings.extraKnownMarketplaces?.harnessy) {
        delete settings.extraKnownMarketplaces.harnessy;
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
