#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const filePath = process.argv[2];

if (!filePath) {
  process.stderr.write("Usage: parse-qa-script.js <script-path>\n");
  process.exit(1);
}

const absolutePath = path.resolve(filePath);
const raw = fs.readFileSync(absolutePath, "utf8");

if (absolutePath.endsWith(".json")) {
  const parsed = JSON.parse(raw);
  process.stdout.write(JSON.stringify(parsed, null, 2));
  process.exit(0);
}

const scenarios = [];
let current = null;

for (const line of raw.split(/\r?\n/)) {
  const heading = line.match(/^##\s+(.*)$/);
  if (heading) {
    if (current) scenarios.push(current);
    current = {
      name: heading[1].trim(),
      role: null,
      route: null,
      mode: "read-only",
      steps: [],
      expected: [],
      notes: [],
      destructive: false,
    };
    continue;
  }

  if (!current) continue;

  const role = line.match(/^Role:\s*(.*)$/i);
  if (role) {
    current.role = role[1].trim();
    continue;
  }

  const route = line.match(/^Route:\s*(.*)$/i);
  if (route) {
    current.route = route[1].trim();
    continue;
  }

  const mode = line.match(/^Mode:\s*(.*)$/i);
  if (mode) {
    current.mode = mode[1].trim();
    continue;
  }

  const checkbox = line.match(/^- \[( |x)\]\s+(.*)$/i);
  if (checkbox) {
    current.steps.push(checkbox[2].trim());
    continue;
  }

  const expected = line.match(/^Expected:\s*(.*)$/i);
  if (expected) {
    current.expected.push(expected[1].trim());
    continue;
  }

  const note = line.match(/^Note:\s*(.*)$/i);
  if (note) {
    current.notes.push(note[1].trim());
    continue;
  }

  if (/destructive:\s*true/i.test(line)) {
    current.destructive = true;
    current.mode = "destructive";
  }
}

if (current) scenarios.push(current);

process.stdout.write(
  JSON.stringify(
    {
      path: absolutePath,
      format: path.extname(absolutePath).replace(/^\./, "") || "md",
      scenarios,
    },
    null,
    2,
  ),
);
