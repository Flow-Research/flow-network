#!/usr/bin/env npx tsx
/**
 * Extract acceptance criteria from a product_spec.md file.
 *
 * Input:  Path to product_spec.md (positional arg)
 * Output: JSON array of Criterion objects to stdout
 *
 * Usage:
 *   npx tsx extract-criteria.ts .jarvis/context/specs/47_example-epic/product_spec.md
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestScenarioRow {
  type: string;      // positive, negative, unauthorized, rls, edge-case
  role: string;      // admin, founder, coach, super_admin, unauthenticated
  scenario: string;  // description
  layer: string;     // browser, API, browser + API, API (RLS), DB/workflow
}

interface Criterion {
  feature: string;
  criterion: string;
  testScenarios: TestScenarioRow[];
  edgeCases: string[];
  rawSection: string;
}

interface ExtractResult {
  epicName: string;
  features: Array<{
    name: string;
    criteria: Criterion[];
  }>;
  totalCriteria: number;
  totalTestScenarios: number;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function extractCriteria(content: string): ExtractResult {
  const lines = content.split("\n");
  const features: ExtractResult["features"] = [];

  let currentFeature = "";
  let currentCriteria: Criterion[] = [];
  let i = 0;

  // Try to extract epic name from title
  const titleMatch = content.match(/^#\s+(.+)/m);
  const epicName = titleMatch?.[1]?.trim() || "Unknown Epic";

  while (i < lines.length) {
    const line = lines[i];

    // Detect feature headers (## or ### level with feature-like names)
    const featureMatch = line.match(/^#{2,3}\s+(?:\d+\.\s+)?(?:Feature\s*\d*:?\s*)?(.+)/i);
    if (featureMatch && !line.match(/acceptance criteria|edge cases|test scenarios|priority|scope/i)) {
      // Save previous feature if it had criteria
      if (currentFeature && currentCriteria.length > 0) {
        features.push({ name: currentFeature, criteria: currentCriteria });
      }
      currentFeature = featureMatch[1].trim();
      currentCriteria = [];
      i++;
      continue;
    }

    // Detect "Acceptance Criteria:" header
    if (line.match(/\*?\*?acceptance criteria\*?\*?:?/i)) {
      i++;

      const criteria: string[] = [];
      // Read checklist items until next section
      while (i < lines.length) {
        const criterionLine = lines[i].trim();

        // Stop at next section header or blank line followed by non-criterion content
        if (criterionLine.match(/^\*?\*?(edge cases|test scenarios|priority|scope)\*?\*?:?/i)) break;
        if (criterionLine.match(/^#{2,3}\s/)) break;

        // Criterion line: "- [ ] Something" or "- Something"
        const criterionMatch = criterionLine.match(/^-\s+(?:\[.\]\s+)?(.+)/);
        if (criterionMatch) {
          criteria.push(criterionMatch[1].trim());
        }

        i++;
      }

      // Read edge cases if present
      const edgeCases: string[] = [];
      if (i < lines.length && lines[i].match(/edge cases/i)) {
        i++;
        while (i < lines.length) {
          const edgeLine = lines[i].trim();
          if (edgeLine.match(/^#{2,3}\s/) || edgeLine.match(/\*?\*?(test scenarios|acceptance criteria)\*?\*?/i)) break;
          const edgeMatch = edgeLine.match(/^-\s+(.+)/);
          if (edgeMatch) edgeCases.push(edgeMatch[1].trim());
          i++;
        }
      }

      // Read test scenarios table if present
      const testScenarios: TestScenarioRow[] = [];
      if (i < lines.length && lines[i].match(/test scenarios/i)) {
        i++;
        // Skip table header and separator
        while (i < lines.length && (lines[i].trim().startsWith("|") || lines[i].trim() === "")) {
          const tableLine = lines[i].trim();
          if (tableLine.includes("---")) { i++; continue; }
          if (tableLine.toLowerCase().includes("type") && tableLine.toLowerCase().includes("role")) { i++; continue; }

          const cells = tableLine.split("|").map(c => c.trim()).filter(Boolean);
          if (cells.length >= 4) {
            testScenarios.push({
              type: cells[0].toLowerCase(),
              role: cells[1].toLowerCase(),
              scenario: cells[2],
              layer: cells[3],
            });
          }
          i++;
        }
      }

      // Create Criterion objects
      for (const criterion of criteria) {
        currentCriteria.push({
          feature: currentFeature,
          criterion,
          testScenarios,
          edgeCases,
          rawSection: criteria.join("\n"),
        });
      }

      continue;
    }

    i++;
  }

  // Save last feature
  if (currentFeature && currentCriteria.length > 0) {
    features.push({ name: currentFeature, criteria: currentCriteria });
  }

  const totalCriteria = features.reduce((sum, f) => sum + f.criteria.length, 0);
  const totalTestScenarios = features.reduce(
    (sum, f) => sum + f.criteria.reduce((s, c) => s + c.testScenarios.length, 0),
    0,
  );

  return { epicName, features, totalCriteria, totalTestScenarios };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx extract-criteria.ts <path-to-product_spec.md>");
    process.exit(1);
  }

  const resolved = resolve(filePath);
  const content = readFileSync(resolved, "utf-8");
  const result = extractCriteria(content);

  console.error(`Extracted from: ${resolved}`);
  console.error(`Epic: ${result.epicName}`);
  console.error(`Features: ${result.features.length}`);
  console.error(`Total criteria: ${result.totalCriteria}`);
  console.error(`Test scenario rows: ${result.totalTestScenarios}`);

  for (const feature of result.features) {
    console.error(`  ${feature.name}: ${feature.criteria.length} criteria`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main();
