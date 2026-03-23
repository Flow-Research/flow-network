#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const runDir = process.argv[2];

if (!runDir) {
  process.stderr.write("Usage: summarize-artifacts.js <run-dir>\n");
  process.exit(1);
}

const absoluteRunDir = path.resolve(runDir);

const collect = (relativeDir, extensions) => {
  const dir = path.join(absoluteRunDir, relativeDir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => extensions.some((extension) => file.endsWith(extension)))
    .map((file) => path.join(relativeDir, file));
};

const summary = {
  runDir: absoluteRunDir,
  screenshots: collect("screenshots", [".png", ".jpg", ".jpeg"]),
  traces: collect("traces", [".zip", ".trace"]),
  videos: collect("videos", [".webm", ".mp4"]),
  consoleLog: fs.existsSync(path.join(absoluteRunDir, "console.json")) ? "console.json" : null,
  networkLog: fs.existsSync(path.join(absoluteRunDir, "network.json")) ? "network.json" : null,
  summaryFile: fs.existsSync(path.join(absoluteRunDir, "summary.json")) ? "summary.json" : null,
};

process.stdout.write(JSON.stringify(summary, null, 2));
