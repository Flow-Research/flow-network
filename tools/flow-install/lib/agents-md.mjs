#!/usr/bin/env node

/**
 * flow-install — AGENTS.md marker-based merge
 *
 * Injects or updates a Flow framework section in the project's AGENTS.md
 * using <!-- flow:start --> and <!-- flow:end --> markers.
 * All existing project content outside the markers is preserved.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { pathExists, readFileSafe, log } from "./utils.mjs";

// ---------------------------------------------------------------------------
// Flow framework section markers
// ---------------------------------------------------------------------------

const FLOW_START = "<!-- flow:start -->";
const FLOW_END = "<!-- flow:end -->";

// ---------------------------------------------------------------------------
// Generate the Flow framework section
// ---------------------------------------------------------------------------

const generateFlowSection = (installPaths) => `${FLOW_START}
## Flow Framework

> \`FLOW_SKIP_SUBPROJECTS=true\`

This repo is Flow-managed.

- Read \`${installPaths.contextDir}/README.md\`
- Read \`${installPaths.contextDir}/AGENTS.md\`
- Global skills: \`~/.agents/skills/\`
- Project skills: \`${installPaths.skillsDir}/\` (if present)
- If inside a sub-project, prefer its local \`.jarvis/context/\`
${FLOW_END}`;

// ---------------------------------------------------------------------------
// Merge Flow section into existing AGENTS.md
// ---------------------------------------------------------------------------

export const mergeAgentsMd = async (projectRoot, { dryRun = false, agentsFileRel = "AGENTS.md", installPaths = { contextDir: ".jarvis/context", skillsDir: ".agents/skills" } } = {}) => {
  const agentsPath = path.join(projectRoot, agentsFileRel);
  const flowSection = generateFlowSection(installPaths);

  const existing = await readFileSafe(agentsPath);

  if (!existing) {
    // No AGENTS.md exists — create one with just the Flow section
    if (dryRun) {
      log.dryRun("Would create AGENTS.md with Flow framework section");
      return;
    }
    await fs.writeFile(agentsPath, flowSection + "\n", "utf8");
    log.ok("AGENTS.md created with Flow framework section");
    return;
  }

  // Check for existing markers
  const startIdx = existing.indexOf(FLOW_START);
  const endIdx = existing.indexOf(FLOW_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Update existing Flow section
    const before = existing.slice(0, startIdx);
    const after = existing.slice(endIdx + FLOW_END.length);

    const updated = before + flowSection + after;

    if (updated === existing) {
      log.skip("AGENTS.md (Flow section already current)");
      return;
    }

    if (dryRun) {
      log.dryRun("Would update Flow section in AGENTS.md");
      return;
    }

    await fs.writeFile(agentsPath, updated, "utf8");
    log.ok("AGENTS.md: Flow section updated");
    return;
  }

  // No markers found — append Flow section
  if (dryRun) {
    log.dryRun("Would append Flow framework section to AGENTS.md");
    return;
  }

  const appended = existing.trimEnd() + "\n\n" + flowSection + "\n";
  await fs.writeFile(agentsPath, appended, "utf8");
  log.ok("AGENTS.md: Flow section appended");
};
