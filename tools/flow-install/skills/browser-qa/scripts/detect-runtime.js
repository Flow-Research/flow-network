#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();

const readText = (filePath) => {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
};

const readJson = (filePath) => {
  const text = readText(filePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const exists = (filePath) => fs.existsSync(filePath);

const rootReadme = readText(path.join(root, "README.md"));
const rootPackage = readJson(path.join(root, "package.json"));

function collectPackageDirs(baseDir, prefixes = ["apps", "packages", "services", "frontend", "backend"]) {
  const discovered = [];

  for (const prefix of prefixes) {
    const prefixPath = path.join(baseDir, prefix);
    if (!exists(prefixPath)) continue;
    for (const entry of fs.readdirSync(prefixPath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const relativePath = path.join(prefix, entry.name);
      if (exists(path.join(baseDir, relativePath, "package.json"))) discovered.push(relativePath);
    }
  }

  // Also consider the root package itself as a runnable app candidate.
  if (exists(path.join(baseDir, "package.json"))) discovered.push(".");

  return [...new Set(discovered)];
}

const appEntries = collectPackageDirs(root)
  .map((relativePath) => {
    const absolutePath = relativePath === "." ? root : path.join(root, relativePath);
    const pkg = readJson(path.join(absolutePath, "package.json"));
    const readme = readText(path.join(absolutePath, "README.md"));
    return {
      path: relativePath,
      packageName: pkg?.name || null,
      scripts: pkg?.scripts || {},
      hasReadme: Boolean(readme),
      readmeHints: readme
        ? readme
            .split(/\r?\n/)
            .filter((line) => /dev|start|playwright|port|localhost/i.test(line))
            .slice(0, 10)
        : [],
    };
  })
  .filter(Boolean);

const startupCandidates = [];

const packageManager = exists(path.join(root, "pnpm-lock.yaml"))
  ? "pnpm"
  : exists(path.join(root, "yarn.lock"))
    ? "yarn"
    : exists(path.join(root, "package-lock.json"))
      ? "npm"
      : null;

const runDevCommand = packageManager === "yarn" ? "yarn dev" : packageManager === "pnpm" ? "pnpm dev" : "npm run dev";

if (rootPackage?.scripts?.dev) {
  startupCandidates.push({
    source: "root-package",
    command: runDevCommand,
    note: rootPackage.scripts.dev,
  });
}

for (const app of appEntries) {
  if (app.path === ".") continue;
  if (app.scripts.dev) {
    startupCandidates.push({
      source: app.path,
      command: packageManager === "yarn"
        ? `yarn --cwd ${app.path} dev`
        : packageManager === "npm"
          ? `npm --prefix ${app.path} run dev`
          : `pnpm --dir ${app.path} dev`,
      note: app.scripts.dev,
    });
  }
}

if (rootReadme && /turbo run dev/i.test(rootReadme)) {
  startupCandidates.push({
    source: "README.md",
    command: "pnpm turbo run dev --filter=<app>",
    note: "README references turborepo dev startup",
  });
}

const likelyApp = appEntries.find((entry) => entry.path !== ".") || appEntries[0] || null;

const payload = {
  root,
  hasRootReadme: Boolean(rootReadme),
  rootReadmeHints: rootReadme
    ? rootReadme
        .split(/\r?\n/)
        .filter((line) => /dev|start|playwright|port|localhost/i.test(line))
        .slice(0, 12)
    : [],
  packageManager,
  likelyApp: likelyApp?.path || null,
  startupCandidates,
  apps: appEntries,
};

process.stdout.write(JSON.stringify(payload, null, 2));
