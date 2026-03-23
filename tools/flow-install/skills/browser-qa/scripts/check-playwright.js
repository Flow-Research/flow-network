#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const target = process.argv[3] ? path.resolve(root, process.argv[3]) : root;

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
};

const pkg = readJson(path.join(target, "package.json")) || readJson(path.join(root, "package.json")) || {};
const deps = {
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {}),
};

const modulePaths = [
  path.join(target, "node_modules", "@playwright", "test", "package.json"),
  path.join(root, "node_modules", "@playwright", "test", "package.json"),
];

const browserPaths = [
  path.join(process.env.HOME || "", ".cache", "ms-playwright"),
  path.join(process.env.HOME || "", "Library", "Caches", "ms-playwright"),
];

const playwrightPackage = deps["@playwright/test"] || null;
const packageInstalled = modulePaths.some((filePath) => fs.existsSync(filePath));
const browsersInstalled = browserPaths.some((dirPath) => fs.existsSync(dirPath));

const payload = {
  root,
  target,
  playwrightPackage,
  packageInstalled,
  browsersInstalled,
  recommendedInstallCommand: !playwrightPackage
    ? `pnpm --dir ${path.relative(root, target) || "."} add -D @playwright/test`
    : null,
  recommendedBrowserCommand: packageInstalled && !browsersInstalled ? "pnpm exec playwright install" : null,
};

process.stdout.write(JSON.stringify(payload, null, 2));
