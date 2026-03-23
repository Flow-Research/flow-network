#!/usr/bin/env npx tsx
/**
 * Generate regression test scenarios from extracted criteria + function metadata.
 *
 * Input:  Path to criteria.json (from extract-criteria.ts) + optional functions.json
 * Output: JSON with browser and API scenarios to stdout
 *
 * Usage:
 *   npx tsx generate-scenarios.ts /tmp/criteria.json
 *   npx tsx generate-scenarios.ts /tmp/criteria.json --functions-file /tmp/functions.json
 *   npx tsx generate-scenarios.ts /tmp/criteria.json --dry-run
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestScenarioRow {
  type: string;
  role: string;
  scenario: string;
  layer: string;
}

interface Criterion {
  feature: string;
  criterion: string;
  testScenarios: TestScenarioRow[];
  edgeCases: string[];
}

interface ExtractResult {
  epicName: string;
  features: Array<{
    name: string;
    criteria: Criterion[];
  }>;
}

interface FunctionMeta {
  name: string;
  module: string;
  authorizedRoles: string[];
  tables: string[];
  prerequisites: string[];
  inputSchema: string;
  route?: string; // Browser route where this action is triggered
}

interface BrowserScenario {
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

interface ApiScenario {
  title: string;
  function: string;
  module: string;
  role: string;
  type: "positive" | "negative" | "unauthorized";
  seed: string;
  input: string;
  dbAssert: string;
  expected: string;
  tags: string[];
}

interface GeneratedOutput {
  epicName: string;
  browser: BrowserScenario[];
  api: ApiScenario[];
  summary: {
    totalBrowser: number;
    totalApi: number;
    criteriaCount: number;
    coveredCriteria: number;
  };
}

interface DeliveryProfile {
  roles?: {
    all?: string[];
  };
  browser?: {
    defaultRoute?: string;
  };
  api?: {
    defaultModule?: string;
  };
}

const DEFAULT_ROLES: string[] = [];

// ---------------------------------------------------------------------------
// Scenario generators
// ---------------------------------------------------------------------------

function generateFromExplicitTable(
  criterion: Criterion,
  func: FunctionMeta | null,
  profile: DeliveryProfile,
): { browser: BrowserScenario[]; api: ApiScenario[] } {
  const browser: BrowserScenario[] = [];
  const api: ApiScenario[] = [];

  for (const row of criterion.testScenarios) {
    const layer = row.layer.toLowerCase();
    const isApi = layer.includes("api");
    const isBrowser = layer.includes("browser");
    const isRls = layer.includes("rls");

    if (isBrowser) {
      browser.push({
        title: `${criterion.feature} — ${row.scenario}`,
        role: normalizeRole(row.role),
        route: func?.route || profile.browser?.defaultRoute || "/",
        mode: row.type === "positive" ? "destructive" : "destructive",
        type: row.type === "unauthorized" ? "negative" : (row.type as "positive" | "negative"),
        prerequisites: row.type === "positive" ? "BROWSER_QA_ALLOW_DESTRUCTIVE=1" : "",
        steps: [`Perform: ${row.scenario}`],
        expected: row.type === "positive" ? "Action succeeds" : "Error shown or action blocked",
        tags: row.type === "negative" ? ["NEGATIVE"] : [],
      });
    }

    if (isApi || isRls) {
      api.push({
        title: `${func?.name || criterion.feature} — ${row.scenario}`,
        function: func?.name || "",
        module: func?.module || profile.api?.defaultModule || "@/lib/workflow",
        role: normalizeRole(row.role),
        type: row.type as "positive" | "negative" | "unauthorized",
        seed: func?.prerequisites.join(", ") || "",
        input: func?.inputSchema || "",
        dbAssert: func?.tables.map((t) => `${t} changes`).join(", ") || "",
        expected:
          row.type === "positive"
            ? "No error thrown"
            : row.type === "unauthorized"
              ? 'Throws "access is required"'
              : "Throws validation error",
        tags: isRls ? ["RLS"] : [],
      });
    }
  }

  return { browser, api };
}

function generateFromHeuristic(
  criterion: Criterion,
  func: FunctionMeta | null,
  profile: DeliveryProfile,
): { browser: BrowserScenario[]; api: ApiScenario[] } {
  const browser: BrowserScenario[] = [];
  const api: ApiScenario[] = [];

  if (!func) {
    // No function metadata — generate a basic browser positive scenario
    browser.push({
      title: `${criterion.feature} — ${criterion.criterion}`,
      role: "admin",
      route: profile.browser?.defaultRoute || "/",
      mode: "read-only",
      type: "positive",
      prerequisites: "",
      steps: [`Verify: ${criterion.criterion}`],
      expected: criterion.criterion,
      tags: [],
    });
    return { browser, api };
  }

  const authorized = func.authorizedRoles;
  const unauthorized = (profile.roles?.all || DEFAULT_ROLES).filter((r) => !authorized.includes(r));

  // Positive: one per authorized role (just the primary one for browser)
  const primaryRole = authorized[0] || "admin";

  // Browser positive
  if (func.route) {
    browser.push({
      title: `${criterion.feature} — ${criterion.criterion}`,
      role: normalizeRole(primaryRole),
      route: func.route,
      mode: "destructive",
      type: "positive",
      prerequisites: "BROWSER_QA_ALLOW_DESTRUCTIVE=1",
      steps: [`Perform action: ${criterion.criterion}`],
      expected: "Action succeeds, UI updates",
      tags: ["DESTRUCTIVE"],
    });
  }

  // API positive
  api.push({
    title: `${func.name} — ${criterion.criterion}`,
    function: func.name,
    module: func.module,
    role: primaryRole,
    type: "positive",
    seed: func.prerequisites.join(", "),
    input: func.inputSchema,
    dbAssert: func.tables.map((t) => `${t} +1 row`).join(", "),
    expected: "No error thrown",
    tags: [],
  });

  // Negative: bad input
  api.push({
    title: `${func.name} — rejects invalid input`,
    function: func.name,
    module: func.module,
    role: primaryRole,
    type: "negative",
    seed: func.prerequisites.join(", "),
    input: "{ invalid or empty fields }",
    dbAssert: "no new rows",
    expected: "Throws validation error",
    tags: [],
  });

  // Unauthorized: one per unauthorized role
  for (const wrongRole of unauthorized) {
    api.push({
      title: `${func.name} — ${wrongRole} unauthorized`,
      function: func.name,
      module: func.module,
      role: `${wrongRole} (unauthorized)`,
      type: "unauthorized",
      seed: func.prerequisites.join(", "),
      input: func.inputSchema,
      dbAssert: "no new rows",
      expected: 'Throws "access is required"',
      tags: [],
    });
  }

  // Edge cases from spec
  for (const edge of criterion.edgeCases) {
    api.push({
      title: `${func.name} — edge: ${edge}`,
      function: func.name,
      module: func.module,
      role: primaryRole,
      type: "negative",
      seed: func.prerequisites.join(", "),
      input: `Edge case: ${edge}`,
      dbAssert: "varies",
      expected: "Handles gracefully",
      tags: [],
    });
  }

  return { browser, api };
}

function normalizeRole(role: string): string {
  const lower = role.toLowerCase().trim();
  if (lower.includes("super")) return "super_admin";
  if (lower.includes("admin")) return "admin";
  if (lower.includes("founder")) return "founder";
  if (lower.includes("coach")) return "coach";
  if (lower.includes("unauth")) return "unauthenticated";
  return lower;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  let criteriaPath = "";
  let functionsPath = "";
  let profilePath = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--functions-file" && args[i + 1]) {
      functionsPath = args[i + 1];
      i++;
    } else if (args[i] === "--profile" && args[i + 1]) {
      profilePath = args[i + 1];
      i++;
    } else if (!args[i].startsWith("--")) {
      criteriaPath = args[i];
    }
  }

  if (!criteriaPath) {
    console.error("Usage: npx tsx generate-scenarios.ts <criteria.json> [--functions-file <functions.json>] [--profile .flow/delivery-profile.json]");
    process.exit(1);
  }

  const criteriaData: ExtractResult = JSON.parse(
    readFileSync(resolve(criteriaPath), "utf-8"),
  );

  let functions: FunctionMeta[] = [];
  if (functionsPath) {
    functions = JSON.parse(readFileSync(resolve(functionsPath), "utf-8"));
  }

  const profile: DeliveryProfile = profilePath
    ? JSON.parse(readFileSync(resolve(profilePath), "utf-8"))
    : {};

  // Build function lookup by name (partial match on criterion text)
  const funcByKeyword = new Map<string, FunctionMeta>();
  for (const f of functions) {
    funcByKeyword.set(f.name.toLowerCase(), f);
    // Also index by table names for matching
    for (const t of f.tables) {
      funcByKeyword.set(t.toLowerCase(), f);
    }
  }

  const allBrowser: BrowserScenario[] = [];
  const allApi: ApiScenario[] = [];
  let coveredCriteria = 0;
  let totalCriteria = 0;

  for (const feature of criteriaData.features) {
    for (const criterion of feature.criteria) {
      totalCriteria++;

      // Try to match criterion to a function
      const criterionLower = criterion.criterion.toLowerCase();
      let matchedFunc: FunctionMeta | null = null;
      for (const [keyword, func] of funcByKeyword) {
        if (criterionLower.includes(keyword)) {
          matchedFunc = func;
          break;
        }
      }

      // Generate scenarios
      let generated;
      if (criterion.testScenarios.length > 0) {
        // Use explicit Test Scenarios table from product spec
        generated = generateFromExplicitTable(criterion, matchedFunc, profile);
      } else {
        // Generate heuristically from criterion + function metadata
        generated = generateFromHeuristic(criterion, matchedFunc, profile);
      }

      if (generated.browser.length > 0 || generated.api.length > 0) {
        coveredCriteria++;
      }

      allBrowser.push(...generated.browser);
      allApi.push(...generated.api);
    }
  }

  const output: GeneratedOutput = {
    epicName: criteriaData.epicName,
    browser: allBrowser,
    api: allApi,
    summary: {
      totalBrowser: allBrowser.length,
      totalApi: allApi.length,
      criteriaCount: totalCriteria,
      coveredCriteria,
    },
  };

  console.error(`Generated scenarios for: ${criteriaData.epicName}`);
  console.error(`  Criteria: ${totalCriteria} (${coveredCriteria} covered)`);
  console.error(`  Browser scenarios: ${allBrowser.length}`);
  console.error(`  API scenarios: ${allApi.length}`);
  console.error(`  Total: ${allBrowser.length + allApi.length}`);

  console.log(JSON.stringify(output, null, 2));
}

main();
