#!/usr/bin/env npx tsx
/**
 * Parse an API regression spec document into structured scenario objects.
 *
 * Input:  Path to an API regression spec document (positional arg)
 * Output: JSON array of ApiScenario objects to stdout
 *
 * Usage:
 *   npx tsx parse-api-regression.ts path/to/api-regression.md
 *   npx tsx parse-api-regression.ts path/to/api-regression.md --suite A
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiScenario {
  id: string;
  suite: string;
  title: string;
  function: string;
  module: string;
  role: string;
  type: "positive" | "negative" | "unauthorized";
  seed: string;
  input: string;
  dbAssert: string;
  expected: string;
  browserRef: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseApiRegressionDoc(content: string): ApiScenario[] {
  const scenarios: ApiScenario[] = [];
  const lines = content.split("\n");

  let currentSuite = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect suite headers: "# SUITE A: COACH MANAGEMENT"
    const suiteMatch = line.match(/^#\s+SUITE\s+([A-Z]+):/i);
    if (suiteMatch) {
      currentSuite = suiteMatch[1].toUpperCase();
      i++;
      continue;
    }

    // Detect scenario headers: "## A.1 createCoach — admin creates coach with valid data"
    const scenarioMatch = line.match(/^##\s+([A-Z]+[\.\-]\d+)\s+(.+)/);
    if (scenarioMatch) {
      const id = scenarioMatch[1];
      const title = scenarioMatch[2].trim();
      const suite = id.split(/[.\-]/)[0].toUpperCase();

      i++;
      let func = "";
      let module = "";
      let role = "";
      let type: "positive" | "negative" | "unauthorized" = "positive";
      let seed = "";
      let input = "";
      let dbAssert = "";
      let expected = "";
      let browserRef = "";
      const tags: string[] = [];

      // Extract tags from title
      if (/LLM/i.test(title)) tags.push("LLM");
      if (/RLS/i.test(title)) tags.push("RLS");

      // Read metadata lines until next heading or EOF
      while (
        i < lines.length &&
        !lines[i].match(/^##\s+[A-Z]+[\.\-]\d+/) &&
        !lines[i].match(/^#\s+SUITE/i)
      ) {
        const metaLine = lines[i].trim();

        const funcMatch = metaLine.match(/^Function:\s*(.+)/i);
        if (funcMatch) { func = funcMatch[1].trim(); i++; continue; }

        const moduleMatch = metaLine.match(/^Module:\s*(.+)/i);
        if (moduleMatch) { module = moduleMatch[1].trim(); i++; continue; }

        const roleMatch = metaLine.match(/^Role:\s*(.+)/i);
        if (roleMatch) { role = roleMatch[1].trim(); i++; continue; }

        const typeMatch = metaLine.match(/^Type:\s*(.+)/i);
        if (typeMatch) {
          const raw = typeMatch[1].trim().toLowerCase();
          if (raw === "unauthorized") type = "unauthorized";
          else if (raw === "negative") type = "negative";
          else type = "positive";
          i++;
          continue;
        }

        const tagsMatch = metaLine.match(/^Tags?:\s*(.+)/i);
        if (tagsMatch) {
          tags.push(...tagsMatch[1].split(",").map((t) => t.trim()));
          i++;
          continue;
        }

        const seedMatch = metaLine.match(/^Seed:\s*(.+)/i);
        if (seedMatch) { seed = seedMatch[1].trim(); i++; continue; }

        const inputMatch = metaLine.match(/^Input:\s*(.+)/i);
        if (inputMatch) { input = inputMatch[1].trim(); i++; continue; }

        const dbAssertMatch = metaLine.match(/^DB Assert:\s*(.+)/i);
        if (dbAssertMatch) { dbAssert = dbAssertMatch[1].trim(); i++; continue; }

        const expectedMatch = metaLine.match(/^Expected:\s*(.+)/i);
        if (expectedMatch) { expected = expectedMatch[1].trim(); i++; continue; }

        const browserRefMatch = metaLine.match(/^Browser Ref:\s*(.+)/i);
        if (browserRefMatch) { browserRef = browserRefMatch[1].trim(); i++; continue; }

        i++;
      }

      // Detect unauthorized from role field
      if (/unauthorized/i.test(role)) {
        type = "unauthorized";
      }

      const uniqueTags = [...new Set(tags)];

      scenarios.push({
        id,
        suite: suite || currentSuite,
        title,
        function: func,
        module,
        role,
        type,
        seed,
        input,
        dbAssert,
        expected,
        browserRef,
        tags: uniqueTags,
      });

      continue;
    }

    i++;
  }

  return scenarios;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  let filePath = "";
  let suiteFilter = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--suite" && args[i + 1]) {
      suiteFilter = args[i + 1].toUpperCase();
      i++;
    } else if (!args[i].startsWith("--")) {
      filePath = args[i];
    }
  }

  if (!filePath) {
    console.error("Usage: npx tsx parse-api-regression.ts <path-to-api-regression.md> [--suite X]");
    process.exit(1);
  }

  const resolved = resolve(filePath);
  const content = readFileSync(resolved, "utf-8");
  let scenarios = parseApiRegressionDoc(content);

  if (suiteFilter) {
    scenarios = scenarios.filter((s) => s.suite === suiteFilter);
  }

  // Output summary to stderr, JSON to stdout
  console.error(`Parsed ${scenarios.length} API scenarios from ${resolved}`);
  if (suiteFilter) {
    console.error(`Filtered to suite ${suiteFilter}`);
  }

  const bySuite = new Map<string, number>();
  for (const s of scenarios) {
    bySuite.set(s.suite, (bySuite.get(s.suite) || 0) + 1);
  }
  for (const [suite, count] of [...bySuite.entries()].sort()) {
    console.error(`  Suite ${suite}: ${count} scenarios`);
  }

  console.log(JSON.stringify(scenarios, null, 2));
}

main();
