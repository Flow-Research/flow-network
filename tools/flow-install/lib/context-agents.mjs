#!/usr/bin/env node

/**
 * flow-install — .jarvis/context/AGENTS.md management
 *
 * Scaffolds a full Flow protocol file on first install and only updates the
 * Flow-managed block when explicitly requested or accepted interactively.
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { log, pathExists, promptConfirm, readFileSafe } from "./utils.mjs";

const FLOW_CONTEXT_START = "<!-- flow-context:start -->";
const FLOW_CONTEXT_END = "<!-- flow-context:end -->";
export const CONTEXT_AGENTS_VERSION = "1.0.0";

const generateManagedSection = (installPaths) => `${FLOW_CONTEXT_START}
## Flow Protocol

This repo is Flow-managed. Use this file as the canonical Flow agent protocol for the installed project.

### Session Start

1. Read \`${installPaths.contextDir}/README.md\`
2. Load context in order: \`projects.md\` -> \`focus.md\` -> \`priorities.md\` -> \`goals.md\` -> \`decisions.md\`
3. Check \`${installPaths.contextDir}/skills/_catalog.md\` for project catalog entries
4. Prefer deeper sub-project context when working inside a nested app with its own \`.jarvis/context/\`

### Skills

- Global skills live in \`~/.agents/skills/\`
- Project-local skills live in \`${installPaths.skillsDir}/\` when present
- Run \`pnpm skills:register\` after adding or updating project-local skills
- Run \`pnpm harness:verify\` to confirm Flow, community, OpenCode, and Claude parity

### Context Vault

- Canonical context root: \`${installPaths.contextDir}/\`
- Memory scope registry: \`${installPaths.contextDir}/scopes/_scopes.yaml\`
- Technical debt register: \`${installPaths.contextDir}/technical-debt.md\`
- Template token \`{{global}}\` is Jarvis templating; treat it as a no-op in raw files

### Conventions

- Never commit \`.env\` files; use \`.env.example\`
- Personal context belongs in \`${installPaths.contextDir}/private/<username>/\`
- Keep debt tracked in the debt registers, not only in chat or TODO comments
${FLOW_CONTEXT_END}`;

const generateInitialFile = (installPaths) => `# Flow Context AGENTS

This file contains Flow's installed agent protocol for this repository.

- Flow manages only the dedicated managed block below.
- You can add project-specific notes above or below the managed block.
- Future Flow updates should merge only the managed block, never replace this file.

${generateManagedSection(installPaths)}
`;

const managedHash = (content) => crypto.createHash("sha256").update(content).digest("hex");

const extractManagedBlock = (content) => {
  if (!content) return null;
  const startMarker = `\n${FLOW_CONTEXT_START}\n`;
  const endMarker = `\n${FLOW_CONTEXT_END}`;
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker, startIdx === -1 ? 0 : startIdx + startMarker.length);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;
  return content.slice(startIdx + 1, endIdx + endMarker.length - 1);
};

const mergeManagedBlock = (existing, managedSection) => {
  const startMarker = `\n${FLOW_CONTEXT_START}\n`;
  const endMarker = `\n${FLOW_CONTEXT_END}`;
  const startIdx = existing.indexOf(startMarker);
  const endIdx = existing.indexOf(endMarker, startIdx === -1 ? 0 : startIdx + startMarker.length);
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return existing.slice(0, startIdx + 1) + managedSection + existing.slice(endIdx + endMarker.length - 1);
  }
  return existing.trimEnd() + "\n\n" + managedSection + "\n";
};

export const syncContextAgents = async (
  projectRoot,
  {
    dryRun = false,
    contextDirRel = ".jarvis/context",
    installPaths = { contextDir: ".jarvis/context", skillsDir: ".agents/skills" },
    forceUpdate = false,
    promptOnUpdate = false,
  } = {},
) => {
  const contextAgentsPath = path.join(projectRoot, contextDirRel, "AGENTS.md");
  const managedSection = generateManagedSection(installPaths);
  const templateHash = managedHash(managedSection);
  const existing = await readFileSafe(contextAgentsPath);

  if (!existing) {
    if (dryRun) {
      log.dryRun(`Would create ${contextDirRel}/AGENTS.md`);
      return { status: "create", version: CONTEXT_AGENTS_VERSION, templateHash, changed: true };
    }
    await fs.mkdir(path.dirname(contextAgentsPath), { recursive: true });
    await fs.writeFile(contextAgentsPath, generateInitialFile(installPaths), "utf8");
    log.ok(`${contextDirRel}/AGENTS.md created`);
    return { status: "created", version: CONTEXT_AGENTS_VERSION, templateHash, changed: true };
  }

  const currentBlock = extractManagedBlock(existing);
  if (currentBlock === managedSection) {
    log.skip(`${contextDirRel}/AGENTS.md (managed section already current)`);
    return { status: "current", version: CONTEXT_AGENTS_VERSION, templateHash, changed: false };
  }

  let shouldUpdate = forceUpdate;
  if (!shouldUpdate && promptOnUpdate && process.stdout.isTTY && process.stdin.isTTY) {
    shouldUpdate = await promptConfirm(
      `Flow update available for ${contextDirRel}/AGENTS.md. Apply managed-section update now?`,
      false,
    );
  }

  if (!shouldUpdate) {
    log.warn(`${contextDirRel}/AGENTS.md has a Flow update available. Re-run flow-install with --update-context-agents to apply it.`);
    return { status: "update_available", version: CONTEXT_AGENTS_VERSION, templateHash, changed: false };
  }

  const merged = mergeManagedBlock(existing, managedSection);
  if (dryRun) {
    log.dryRun(`Would update managed block in ${contextDirRel}/AGENTS.md`);
    return { status: "update", version: CONTEXT_AGENTS_VERSION, templateHash, changed: true };
  }

  await fs.writeFile(contextAgentsPath, merged, "utf8");
  log.ok(`${contextDirRel}/AGENTS.md managed section updated`);
  return { status: currentBlock ? "updated" : "appended", version: CONTEXT_AGENTS_VERSION, templateHash, changed: true };
};
