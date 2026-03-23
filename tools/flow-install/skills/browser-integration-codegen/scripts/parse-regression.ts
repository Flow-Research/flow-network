#!/usr/bin/env npx tsx
/**
 * Parse a regression test document into structured scenario objects.
 *
 * Input:  Path to full-regression.md (positional arg or stdin)
 * Output: JSON array of scenario objects to stdout
 *
 * Usage:
 *   npx tsx parse-regression.ts path/to/browser-regression.md
 *   npx tsx parse-regression.ts path/to/browser-regression.md --suite 02
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Scenario {
  id: string;
  suite: string;
  title: string;
  role: string;
  route: string;
  mode: "read-only" | "destructive";
  type: "positive" | "negative";
  prerequisites: string;
  steps: string[];
  expected: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseRegressionDoc(content: string): Scenario[] {
  const scenarios: Scenario[] = [];
  const lines = content.split("\n");

  let currentSuite = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect suite headers: "# SUITE 01: PUBLIC AUTH & ACCESS"
    const suiteMatch = line.match(/^#\s+SUITE\s+(\d+):/i);
    if (suiteMatch) {
      currentSuite = suiteMatch[1].padStart(2, "0");
      i++;
      continue;
    }

    // Detect scenario headers: "## 1.1 Root redirect to /login when unauthenticated"
    const scenarioMatch = line.match(/^##\s+(\d+\.\d+)\s+(.+)/);
    if (scenarioMatch) {
      const id = scenarioMatch[1];
      const title = scenarioMatch[2].trim();
      const suite = id.split(".")[0].padStart(2, "0");

      // Parse metadata lines following the header
      i++;
      let role = "";
      let route = "";
      let mode: "read-only" | "destructive" = "read-only";
      let type: "positive" | "negative" = "positive";
      let prerequisites = "";
      const steps: string[] = [];
      let expected = "";
      const tags: string[] = [];

      // Extract tags from title
      if (/DESTRUCTIVE/i.test(title)) tags.push("DESTRUCTIVE");
      if (/NEGATIVE/i.test(title)) tags.push("NEGATIVE");
      if (/LLM/i.test(title)) tags.push("LLM");

      // Read metadata and step lines until next heading or EOF
      while (i < lines.length && !lines[i].match(/^##\s+\d+\.\d+/) && !lines[i].match(/^#\s+SUITE/i)) {
        const metaLine = lines[i].trim();

        // Role line
        const roleMatch = metaLine.match(/^Role:\s*(.+)/i);
        if (roleMatch) {
          role = roleMatch[1].trim();
          i++;
          continue;
        }

        // Route line
        const routeMatch = metaLine.match(/^Route:\s*(.+)/i);
        if (routeMatch) {
          route = routeMatch[1].trim();
          i++;
          continue;
        }

        // Mode line
        const modeMatch = metaLine.match(/^Mode:\s*(.+)/i);
        if (modeMatch) {
          mode = modeMatch[1].trim().toLowerCase() as "read-only" | "destructive";
          if (mode === "destructive") tags.push("DESTRUCTIVE");
          i++;
          continue;
        }

        // Type line
        const typeMatch = metaLine.match(/^Type:\s*(.+)/i);
        if (typeMatch) {
          type = typeMatch[1].trim().toLowerCase() as "positive" | "negative";
          if (type === "negative") tags.push("NEGATIVE");
          i++;
          continue;
        }

        // Prerequisites line
        const prereqMatch = metaLine.match(/^Prerequisites?:\s*(.+)/i);
        if (prereqMatch) {
          prerequisites = prereqMatch[1].trim();
          i++;
          continue;
        }

        // Step lines (start with "- ")
        if (metaLine.startsWith("- ")) {
          steps.push(metaLine.replace(/^-\s*/, ""));
          i++;
          continue;
        }

        // Expected line
        const expectedMatch = metaLine.match(/^Expected:\s*(.+)/i);
        if (expectedMatch) {
          expected = expectedMatch[1].trim();
          i++;
          continue;
        }

        // Skip separator lines, empty lines
        i++;
      }

      // Deduplicate tags
      const uniqueTags = [...new Set(tags)];

      scenarios.push({
        id,
        suite: suite || currentSuite,
        title,
        role,
        route,
        mode,
        type,
        prerequisites,
        steps,
        expected,
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
      suiteFilter = args[i + 1].padStart(2, "0");
      i++;
    } else if (!args[i].startsWith("--")) {
      filePath = args[i];
    }
  }

  if (!filePath) {
    console.error("Usage: npx tsx parse-regression.ts <path-to-regression.md> [--suite NN]");
    process.exit(1);
  }

  const resolved = resolve(filePath);
  const content = readFileSync(resolved, "utf-8");
  let scenarios = parseRegressionDoc(content);

  if (suiteFilter) {
    scenarios = scenarios.filter((s) => s.suite === suiteFilter);
  }

  // Output summary to stderr, JSON to stdout
  console.error(`Parsed ${scenarios.length} scenarios from ${resolved}`);
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
