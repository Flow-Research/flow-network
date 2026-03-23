#!/usr/bin/env npx tsx
/**
 * Generate a Playwright-style .spec.ts file from parsed browser regression scenarios.
 *
 * Usage:
 *   npx tsx generate-suite.ts /tmp/browser-scenarios.json --suite 01 --profile .flow/delivery-profile.json
 */

import { openSync, readFileSync, readSync } from "fs";

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

interface BrowserFixtureConfig {
  fixture: string;
  extraFixtures?: string[];
}

interface DeliveryProfile {
  roles?: {
    browserFixtures?: Record<string, BrowserFixtureConfig>;
  };
  browser?: {
    suiteNames?: Record<string, string>;
    supportImports?: {
      testFixtureModule?: string;
      snapshotModule?: string;
      dbAssertionsModule?: string;
    };
    dbHelperRules?: Array<{ match: string[]; helpers: string[] }>;
  };
}

const DEFAULT_FIXTURE_MAP: Record<string, BrowserFixtureConfig> = {
  unauthenticated: { fixture: "page", extraFixtures: ["db"] },
};

function parseArgs(argv: string[]) {
  let input = "";
  let suiteFilter = "";
  let profilePath = "";

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--suite" && argv[i + 1]) {
      suiteFilter = argv[i + 1].padStart(2, "0");
      i++;
      continue;
    }
    if (argv[i] === "--profile" && argv[i + 1]) {
      profilePath = argv[i + 1];
      i++;
      continue;
    }
    if (!argv[i].startsWith("--")) {
      input = readFileSync(argv[i], "utf-8");
    }
  }

  return { input, suiteFilter, profilePath };
}

function loadProfile(profilePath: string): DeliveryProfile {
  if (!profilePath) return {};
  return JSON.parse(readFileSync(profilePath, "utf-8")) as DeliveryProfile;
}

function readStdin(): string {
  const chunks: Buffer[] = [];
  const fd = openSync("/dev/stdin", "r");
  const buf = Buffer.alloc(65536);
  let bytesRead;
  while ((bytesRead = readSync(fd, buf, 0, buf.length, null)) > 0) {
    chunks.push(Buffer.from(buf.subarray(0, bytesRead)));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function requireProfileValue(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label} in .flow/delivery-profile.json`);
  }
  return value;
}

function resolveFixture(role: string, profile: DeliveryProfile): BrowserFixtureConfig {
  const normalized = role.toLowerCase().trim();
  return profile.roles?.browserFixtures?.[normalized] || DEFAULT_FIXTURE_MAP[normalized] || DEFAULT_FIXTURE_MAP.unauthenticated;
}

function inferDbHelpers(scenarios: Scenario[], profile: DeliveryProfile): string[] {
  const helpers = new Set<string>();
  const rules = profile.browser?.dbHelperRules || [];
  const haystack = scenarios.map((scenario) => [scenario.title, scenario.prerequisites, scenario.expected, ...scenario.steps].join(" ").toLowerCase()).join(" ");

  for (const rule of rules) {
    const matches = rule.match.every((term) => haystack.includes(term.toLowerCase()));
    if (matches) {
      for (const helper of rule.helpers) helpers.add(helper);
    }
  }

  return [...helpers].sort();
}

function generateImports(scenarios: Scenario[], profile: DeliveryProfile): string {
  const support = profile.browser?.supportImports || {};
  const fixtureModule = requireProfileValue(support.testFixtureModule, "browser.supportImports.testFixtureModule");
  const snapshotModule = requireProfileValue(support.snapshotModule, "browser.supportImports.snapshotModule");
  const dbAssertionsModule = support.dbAssertionsModule || "";
  const hasDestructive = scenarios.some((scenario) => scenario.mode === "destructive");
  const hasCredentialCheck = scenarios.some((scenario) => scenario.role.toLowerCase() !== "unauthenticated");
  const fixtureImports = ["test", "expect"];
  if (hasCredentialCheck) fixtureImports.push("hasCredentials");
  if (hasDestructive) fixtureImports.push("destructiveAllowed");

  const lines = [
    `import { ${fixtureImports.join(", ")} } from "${fixtureModule}";`,
    `import { guardReadOnly } from "${snapshotModule}";`,
  ];

  const dbHelpers = inferDbHelpers(scenarios, profile);
  if (dbHelpers.length > 0 && dbAssertionsModule) {
    lines.push(`import {\n  ${dbHelpers.join(",\n  ")},\n} from "${dbAssertionsModule}";`);
  }

  return lines.join("\n");
}

function generateTestBlock(scenario: Scenario, profile: DeliveryProfile): string {
  const resolved = resolveFixture(scenario.role, profile);
  const allFixtures = [resolved.fixture, ...(resolved.extraFixtures || [])].join(", ");
  const isReadOnly = scenario.mode === "read-only";
  const isDestructive = scenario.mode === "destructive";
  const lines: string[] = [];

  lines.push(`  // ${scenario.id} ${scenario.title}`);
  if (scenario.prerequisites) lines.push(`  // Prerequisites: ${scenario.prerequisites}`);
  lines.push(`  test("${scenario.id} ${scenario.title.toLowerCase()}", async ({ ${allFixtures} }) => {`);

  if (isDestructive) {
    lines.push('    test.skip(!destructiveAllowed, "BROWSER_QA_ALLOW_DESTRUCTIVE not set.");');
    lines.push("");
  }
  if (isReadOnly) {
    lines.push("    const verify = await guardReadOnly(db);");
    lines.push("");
  }

  lines.push("    // Steps from regression spec:");
  for (const step of scenario.steps) lines.push(`    // - ${step}`);
  lines.push(`    // Expected: ${scenario.expected}`);
  lines.push("    // TODO: Implement using source-verified selectors or DOM inspection artifacts.");
  if (scenario.route && !scenario.route.includes("->") && !scenario.route.includes("→")) {
    const route = scenario.route.split("?")[0].trim();
    lines.push(`    await ${resolved.fixture}.goto("${route}");`);
    lines.push(`    await ${resolved.fixture}.waitForLoadState("networkidle");`);
  }
  if (isReadOnly) {
    lines.push("");
    lines.push("    await verify();");
  }
  lines.push("  });");
  return lines.join("\n");
}

function generateSuiteFile(scenarios: Scenario[], profile: DeliveryProfile): string {
  if (scenarios.length === 0) {
    throw new Error("No scenarios provided.");
  }

  const suiteNum = scenarios[0].suite;
  const suiteName = profile.browser?.suiteNames?.[suiteNum] || `Suite ${suiteNum}`;
  const readOnly = scenarios.filter((scenario) => scenario.mode === "read-only");
  const destructive = scenarios.filter((scenario) => scenario.mode === "destructive");
  const header = [
    "/**",
    ` * Suite ${suiteNum}: ${suiteName} — Browser + DB Integration`,
    " *",
    ` * ${scenarios.length} scenarios (${readOnly.length} read-only, ${destructive.length} destructive).`,
    " * Generated by browser-integration-codegen.",
    " */",
    "",
  ].join("\n");

  const body: string[] = [header, generateImports(scenarios, profile), "", `test.describe("Suite ${suiteNum}: ${suiteName} (Browser + DB)", () => {`, ""];

  if (readOnly.length > 0) {
    body.push("  // -----------------------------------------------------------------------");
    body.push("  // READ-ONLY");
    body.push("  // -----------------------------------------------------------------------");
    body.push("");
    for (const scenario of readOnly) {
      body.push(generateTestBlock(scenario, profile));
      body.push("");
    }
  }

  if (destructive.length > 0) {
    body.push("  // -----------------------------------------------------------------------");
    body.push("  // DESTRUCTIVE");
    body.push("  // -----------------------------------------------------------------------");
    body.push("");
    for (const scenario of destructive) {
      body.push(generateTestBlock(scenario, profile));
      body.push("");
    }
  }

  body.push("});", "");
  return body.join("\n");
}

function main() {
  const { input: directInput, suiteFilter, profilePath } = parseArgs(process.argv.slice(2));
  const input = directInput || readStdin();
  const profile = loadProfile(profilePath);
  if (!profilePath) {
    console.error("browser-integration-codegen requires --profile .flow/delivery-profile.json");
    process.exit(1);
  }
  let scenarios = JSON.parse(input) as Scenario[];

  if (suiteFilter) {
    scenarios = scenarios.filter((scenario) => scenario.suite === suiteFilter);
  }

  if (scenarios.length === 0) {
    console.error("No scenarios to generate.");
    process.exit(1);
  }

  console.error(`Generating suite for ${scenarios.length} scenarios (Suite ${scenarios[0].suite})`);
  console.log(generateSuiteFile(scenarios, profile));
}

main();
