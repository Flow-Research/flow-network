#!/usr/bin/env npx tsx
/**
 * Validate test correctness — detect false-green risks and pattern violations.
 *
 * Input:  Paths to test directories (API routes + browser suites)
 * Output: Correctness report JSON to stdout
 *
 * Usage:
 *   npx tsx validate-correctness.ts \
 *     tests/integration/api-routes/ \
 *     tests/browser-integration/suites/ \
 *     --profile .flow/delivery-profile.json
 */

import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Issue {
  file: string;
  line: number;
  severity: "error" | "warning";
  rule: string;
  message: string;
}

interface DeliveryProfile {
  validators?: {
    api?: {
      backendGuardFunction?: string;
      requiresClearAuth?: boolean;
    };
    browser?: {
      requireGuardReadOnly?: boolean;
      disallowedPatterns?: string[];
    };
  };
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

function checkFile(filePath: string, content: string, profile: DeliveryProfile): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split("\n");
  const fileName = filePath.split("/").pop() || filePath;
  const isApiTest = fileName.endsWith(".api.test.ts");
  const isBrowserTest = fileName.endsWith(".spec.ts");
  const backendGuardFunction = profile.validators?.api?.backendGuardFunction || "";
  const requiresClearAuth = profile.validators?.api?.requiresClearAuth !== false;
  const requireGuardReadOnly = profile.validators?.browser?.requireGuardReadOnly === true;
  const disallowedPatterns = profile.validators?.browser?.disallowedPatterns || ["data-testid"];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Rule: Missing await on expect(...).rejects
    if (line.includes(".rejects.toThrow") && !line.trim().startsWith("await") && !lines[i - 1]?.trim().startsWith("await")) {
      // Check if there's an await on the line or the line before
      const context = (lines[i - 1] || "") + line;
      if (!context.includes("await")) {
        issues.push({
          file: fileName,
          line: lineNum,
          severity: "error",
          rule: "missing-await-rejects",
          message: "rejects.toThrow without await — test will always pass",
        });
      }
    }

    // Rule: Empty toThrow() with no pattern
    if (/\.toThrow\(\s*\)/.test(line)) {
      issues.push({
        file: fileName,
        line: lineNum,
        severity: "warning",
        rule: "empty-toThrow",
        message: "toThrow() with no pattern — catches any error, may mask wrong errors",
      });
    }

    // Rule: it() block without expect()
    if (/^\s*it\(/.test(line)) {
      // Scan ahead to find the closing of this test block
      let depth = 0;
      let hasExpect = false;
      let hasReturn = false;
      for (let j = i; j < Math.min(i + 50, lines.length); j++) {
        depth += (lines[j].match(/\{/g) || []).length;
        depth -= (lines[j].match(/\}/g) || []).length;
        if (lines[j].includes("expect(") || lines[j].includes("expect.")) hasExpect = true;
        if (backendGuardFunction && lines[j].includes("return;") && lines[j].includes(backendGuardFunction)) hasReturn = true;
        if (depth <= 0 && j > i) break;
      }
      if (!hasExpect && !hasReturn) {
        issues.push({
          file: fileName,
          line: lineNum,
          severity: "warning",
          rule: "no-expect-in-test",
          message: "Test block has no expect() — may pass without asserting anything",
        });
      }
    }

    // API-specific rules
    if (isApiTest) {
        // Rule: Missing backend guard helper when configured
        if (/^\s*it\(/.test(line)) {
          let hasGuard = false;
          for (let j = i; j < Math.min(i + 5, lines.length); j++) {
          if (backendGuardFunction && lines[j].includes(backendGuardFunction)) { hasGuard = true; break; }
          }
        if (backendGuardFunction && !hasGuard) {
          issues.push({
            file: fileName,
            line: lineNum,
            severity: "warning",
            rule: "missing-backend-guard",
            message: `API test without ${backendGuardFunction} guard`,
          });
        }
      }
    }

    // Browser-specific rules
    if (isBrowserTest) {
      // Rule: Raw CSS class selector
      if (/locator\(['"]\.[\w-]/.test(line)) {
        issues.push({
          file: fileName,
          line: lineNum,
          severity: "warning",
          rule: "raw-css-selector",
          message: "Raw CSS class selector — fragile, use getByRole/getByLabel/getByText instead",
        });
      }

      // Rule: configured disallowed selector/content patterns
      for (const pattern of disallowedPatterns) {
        if (line.includes(pattern)) {
          issues.push({
            file: fileName,
            line: lineNum,
            severity: "warning",
            rule: "disallowed-pattern",
            message: `Disallowed pattern detected: ${pattern}`,
          });
        }
      }
    }
  }

  // File-level rules for API tests
  if (isApiTest) {
    // Rule: setupApiMocks must be before app imports
    const setupLine = lines.findIndex((l) => l.includes("setupApiMocks"));
    const firstAppImport = lines.findIndex((l) =>
      l.includes("@/lib/") || l.includes("@/app/"),
    );
    if (setupLine >= 0 && firstAppImport >= 0 && setupLine > firstAppImport) {
      issues.push({
        file: fileName,
        line: setupLine + 1,
        severity: "error",
        rule: "mock-after-import",
        message: "setupApiMocks() called after application imports — mocks won't take effect",
      });
    }

    // Rule: clearAuth in afterEach when configured
    if (requiresClearAuth && !content.includes("clearAuth")) {
      issues.push({
        file: fileName,
        line: 0,
        severity: "warning",
        rule: "missing-clearAuth",
        message: "No clearAuth() in file — auth state may leak between tests",
      });
    }
  }

  // File-level rules for browser tests
  if (isBrowserTest) {
    // Check read-only tests have guardReadOnly
    const readOnlyTests = lines.filter((l) => l.includes("read-only") || l.includes("no DB mutation"));
    if (requireGuardReadOnly && readOnlyTests.length > 0 && !content.includes("guardReadOnly")) {
      issues.push({
        file: fileName,
        line: 0,
        severity: "warning",
        rule: "missing-guardReadOnly",
        message: "File has read-only tests but no guardReadOnly usage",
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function findTestFiles(dirs: string[]): string[] {
  const files: string[] = [];
  const visit = (dirPath: string) => {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }
      if (entry.isFile() && (entry.name.endsWith(".test.ts") || entry.name.endsWith(".spec.ts"))) {
        files.push(fullPath);
      }
    }
  };

  for (const dir of dirs) {
    const resolved = resolve(dir);
    try {
      visit(resolved);
    } catch {
      console.error(`Warning: could not read directory ${resolved}`);
    }
  }
  return files;
}

function loadProfile(profilePath?: string): DeliveryProfile {
  if (!profilePath) return {};
  return JSON.parse(readFileSync(resolve(profilePath), "utf-8")) as DeliveryProfile;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const profileIndex = args.indexOf("--profile");
  const profilePath = profileIndex >= 0 ? args[profileIndex + 1] : "";
  const dirs = args.filter((arg, index) => {
    if (arg === "--profile") return false;
    if (profileIndex >= 0 && index === profileIndex + 1) return false;
    return !arg.startsWith("--");
  });

  if (dirs.length === 0) {
    console.error("Usage: npx tsx validate-correctness.ts <test-dir1> [test-dir2] ... [--profile .flow/delivery-profile.json]");
    process.exit(1);
  }

  const profile = loadProfile(profilePath);
  const testFiles = findTestFiles(dirs);
  console.error(`Scanning ${testFiles.length} test files...`);

  const allIssues: Issue[] = [];

  for (const file of testFiles) {
    const content = readFileSync(file, "utf-8");
    const issues = checkFile(file, content, profile);
    allIssues.push(...issues);
  }

  const errors = allIssues.filter((i) => i.severity === "error");
  const warnings = allIssues.filter((i) => i.severity === "warning");

  console.error(`Found ${errors.length} errors, ${warnings.length} warnings`);

  // Group by rule
  const byRule = new Map<string, number>();
  for (const issue of allIssues) {
    byRule.set(issue.rule, (byRule.get(issue.rule) || 0) + 1);
  }
  for (const [rule, count] of [...byRule.entries()].sort()) {
    console.error(`  ${rule}: ${count}`);
  }

  console.log(JSON.stringify({
    filesScanned: testFiles.length,
    totalIssues: allIssues.length,
    errors: errors.length,
    warnings: warnings.length,
    issues: allIssues,
  }, null, 2));
}

main();
