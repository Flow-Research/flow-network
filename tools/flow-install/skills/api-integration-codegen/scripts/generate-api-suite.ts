#!/usr/bin/env npx tsx
/**
 * Generate a Vitest-style .api.test.ts file from parsed API regression scenarios.
 *
 * Usage:
 *   npx tsx generate-api-suite.ts /tmp/api-scenarios.json --suite A --profile .flow/delivery-profile.json
 */

import { readFileSync } from "fs";
import { resolve } from "path";

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

interface ApiSuiteMeta {
  name?: string;
  file?: string;
  description?: string;
}

interface DeliveryProfile {
  api?: {
    suiteMeta?: Record<string, ApiSuiteMeta>;
    supportImports?: {
      apiUtilsModule?: string;
      testDatabaseModule?: string;
      fixturesModule?: string;
      dbAssertionsModule?: string;
    };
    apiUtilImports?: string[];
    rlsApiUtilImports?: string[];
    testDatabaseImports?: string[];
    defaultFixtureImports?: string[];
    fixtureSeedRules?: Array<{ match: string; imports: string[] }>;
    dbHelperRules?: Array<{ match: string[]; helpers: string[] }>;
  };
}

const DEFAULT_API_IMPORTS = ["setupApiMocks", "setAuthUser", "clearAuth"];
const DEFAULT_RLS_IMPORTS = ["setupApiMocks", "clearAuth"];
const DEFAULT_DB_IMPORTS = ["setupTestDatabase", "teardownTestDatabase", "cleanTestData"];
const DEFAULT_FIXTURE_IMPORTS = ["FIXTURE_IDS"];

function requireProfileValue(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label} in .flow/delivery-profile.json`);
  }
  return value;
}

function parseArgs(argv: string[]) {
  let filePath = "";
  let suiteFilter = "";
  let profilePath = "";

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--suite" && argv[i + 1]) {
      suiteFilter = argv[i + 1].toUpperCase();
      i++;
      continue;
    }
    if (argv[i] === "--profile" && argv[i + 1]) {
      profilePath = argv[i + 1];
      i++;
      continue;
    }
    if (!argv[i].startsWith("--")) {
      filePath = argv[i];
    }
  }

  return { filePath, suiteFilter, profilePath };
}

function loadProfile(profilePath: string): DeliveryProfile {
  if (!profilePath) return {};
  return JSON.parse(readFileSync(resolve(profilePath), "utf-8")) as DeliveryProfile;
}

function escapeString(value: string): string {
  return value.replace(/"/g, '\\"');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSuiteMeta(profile: DeliveryProfile, suite: string): Required<ApiSuiteMeta> {
  const meta = profile.api?.suiteMeta?.[suite] || {};
  return {
    name: meta.name || `Suite ${suite}`,
    file: meta.file || `suite-${suite.toLowerCase()}.api.test.ts`,
    description: meta.description || `Generated API suite for regression group ${suite}`,
  };
}

function inferFixtureImports(scenarios: ApiScenario[], profile: DeliveryProfile): string[] {
  const imports = new Set(profile.api?.defaultFixtureImports || DEFAULT_FIXTURE_IMPORTS);
  const rules = profile.api?.fixtureSeedRules || [];
  const seedText = scenarios.map((scenario) => scenario.seed).join(" ");

  for (const rule of rules) {
    if (seedText.includes(rule.match)) {
      for (const entry of rule.imports) imports.add(entry);
    }
  }

  return [...imports];
}

function inferDbHelpers(scenarios: ApiScenario[], profile: DeliveryProfile): string[] {
  const rules = profile.api?.dbHelperRules || [];
  const helpers = new Set<string>();
  const haystack = scenarios
    .map((scenario) => [scenario.title, scenario.seed, scenario.dbAssert, scenario.expected].join(" ").toLowerCase())
    .join(" ");

  for (const rule of rules) {
    const matches = rule.match.every((term) => haystack.includes(term.toLowerCase()));
    if (matches) {
      for (const helper of rule.helpers) helpers.add(helper);
    }
  }

  return [...helpers].sort();
}

function generateImports(scenarios: ApiScenario[], profile: DeliveryProfile): string {
  const support = profile.api?.supportImports || {};
  const isRls = scenarios.some((scenario) => scenario.tags.includes("RLS"));
  const apiUtilImports = isRls
    ? profile.api?.rlsApiUtilImports || DEFAULT_RLS_IMPORTS
    : profile.api?.apiUtilImports || DEFAULT_API_IMPORTS;
  const testDatabaseImports = profile.api?.testDatabaseImports || DEFAULT_DB_IMPORTS;
  const fixtureImports = inferFixtureImports(scenarios, profile);
  const dbHelpers = inferDbHelpers(scenarios, profile);

  const lines = [
    'import { vi, describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";',
    `import { ${apiUtilImports.join(", ")} } from "${requireProfileValue(support.apiUtilsModule, "api.supportImports.apiUtilsModule")}";`,
    "",
    "setupApiMocks(vi);",
    "",
    `import {\n  ${testDatabaseImports.join(",\n  ")},\n} from "${requireProfileValue(support.testDatabaseModule, "api.supportImports.testDatabaseModule")}";`,
    `import {\n  ${fixtureImports.join(",\n  ")},\n} from "${requireProfileValue(support.fixturesModule, "api.supportImports.fixturesModule")}";`,
  ];

  if (dbHelpers.length > 0 && support.dbAssertionsModule) {
    lines.push(
      `import {\n  ${dbHelpers.join(",\n  ")},\n} from "${support.dbAssertionsModule}";`,
    );
  }

  return lines.join("\n");
}

function generateTestBlock(scenario: ApiScenario): string {
  const browserComment = scenario.browserRef ? ` // Browser Ref: ${scenario.browserRef}` : "";
  const lines: string[] = [];

  lines.push(`  it("${scenario.id}: ${escapeString(scenario.title)}", async () => {${browserComment}`);
  lines.push("    // TODO: Seed required data");
  if (scenario.seed) lines.push(`    // Seed hint: ${scenario.seed}`);
  lines.push(`    // TODO: Authenticate as ${scenario.role}`);

  if (scenario.type === "positive") {
    lines.push(`    // TODO: Call ${scenario.function || "targetFunction"}(${scenario.input || "..."})`);
    lines.push(`    // TODO: Assert expected DB changes: ${scenario.dbAssert || "verify expected changes"}`);
    lines.push(`    // TODO: Assert success condition: ${scenario.expected || "No error thrown"}`);
  } else if (scenario.type === "negative") {
    lines.push(`    // TODO: Call ${scenario.function || "targetFunction"} with invalid or missing state`);
    lines.push("    // await expect(targetCall).rejects.toThrow(...);");
    lines.push(`    // TODO: Assert no unintended DB changes: ${scenario.dbAssert || "no changes"}`);
  } else {
    lines.push(`    // TODO: Authenticate as unauthorized role: ${scenario.role}`);
    lines.push(`    // TODO: Call ${scenario.function || "targetFunction"} and assert access is blocked`);
  }

  lines.push("  });");
  return lines.join("\n");
}

function generateSuite(scenarios: ApiScenario[], suite: string, profile: DeliveryProfile): string {
  const meta = getSuiteMeta(profile, suite);
  const suiteScenarios = scenarios.filter((scenario) => scenario.suite === suite);
  if (suiteScenarios.length === 0) {
    throw new Error(`No scenarios found for suite ${suite}`);
  }

  const code: string[] = [];
  code.push("/**");
  code.push(` * ${meta.name} API tests.`);
  code.push(" *");
  code.push(` * ${meta.description}`);
  code.push(` * Generated from regression suite ${suite}.`);
  code.push(" */");
  code.push("");
  code.push(generateImports(suiteScenarios, profile));
  code.push("");
  code.push(`describe("${meta.name} API", () => {`);
  code.push("  beforeAll(async () => {");
  code.push("    await setupTestDatabase();");
  code.push("  }, 120_000);");
  code.push("");
  code.push("  afterAll(async () => {");
  code.push("    await teardownTestDatabase();");
  code.push("  });");
  code.push("");
  code.push("  afterEach(async () => {");
  code.push("    clearAuth();");
  code.push("    await cleanTestData();");
  code.push("  });");
  code.push("");

  for (const scenario of suiteScenarios) {
    code.push(generateTestBlock(scenario));
    code.push("");
  }

  code.push("});");
  code.push("");
  return code.join("\n");
}

function main() {
  const { filePath, suiteFilter, profilePath } = parseArgs(process.argv.slice(2));
  if (!filePath) {
    console.error("Usage: npx tsx generate-api-suite.ts <scenarios.json> [--suite X] [--profile .flow/delivery-profile.json]");
    process.exit(1);
  }
  if (!profilePath) {
    console.error("api-integration-codegen requires --profile .flow/delivery-profile.json");
    process.exit(1);
  }

  const scenarios = JSON.parse(readFileSync(resolve(filePath), "utf-8")) as ApiScenario[];
  const profile = loadProfile(profilePath);

  if (suiteFilter) {
    console.log(generateSuite(scenarios, suiteFilter, profile));
    console.error(`Generated suite ${suiteFilter}: ${scenarios.filter((scenario) => scenario.suite === suiteFilter).length} scenarios`);
    return;
  }

  const suites = [...new Set(scenarios.map((scenario) => scenario.suite))].sort();
  for (const suite of suites) {
    const meta = getSuiteMeta(profile, suite);
    console.error(`Suite ${suite} (${meta.file}): ${scenarios.filter((scenario) => scenario.suite === suite).length} scenarios`);
    console.log(`// === Suite ${suite} ===\n`);
    console.log(generateSuite(scenarios, suite, profile));
    console.log("\n");
  }
}

main();
