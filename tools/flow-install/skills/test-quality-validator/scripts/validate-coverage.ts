#!/usr/bin/env npx tsx
/**
 * Validate test coverage against acceptance criteria.
 *
 * Input:  criteria.json (from extract-criteria.ts) + api-scenarios.json + optional browser-scenarios.json
 * Output: Coverage report JSON to stdout
 *
 * Usage:
 *   npx tsx validate-coverage.ts /tmp/criteria.json /tmp/api-scenarios.json
 */

import { readFileSync } from "fs";
import { resolve } from "path";

interface Criterion {
  feature: string;
  criterion: string;
  testScenarios: Array<{ type: string; role: string; scenario: string; layer: string }>;
  edgeCases: string[];
}

interface ExtractResult {
  epicName: string;
  features: Array<{ name: string; criteria: Criterion[] }>;
  totalCriteria: number;
}

interface ScenarioRef {
  id: string;
  suite: string;
  title: string;
  function?: string;
  type?: string;
  role?: string;
}

interface CoverageIssue {
  severity: "error" | "warning";
  criterion: string;
  message: string;
}

interface FunctionCoverage {
  function: string;
  hasPositive: boolean;
  hasNegative: boolean;
  unauthorizedRoles: string[];
  missingUnauthorized: string[];
}

interface CoverageReport {
  epicName: string;
  totalCriteria: number;
  coveredCriteria: number;
  coveragePercent: number;
  issues: CoverageIssue[];
  functionCoverage: FunctionCoverage[];
  grade: string;
}

interface DeliveryProfile {
  roles?: {
    all?: string[];
  };
}

const DEFAULT_ROLES: string[] = [];

function loadProfile(profilePath?: string): DeliveryProfile {
  if (!profilePath) return {};
  return JSON.parse(readFileSync(resolve(profilePath), "utf-8")) as DeliveryProfile;
}

function main() {
  const criteriaPath = process.argv[2];
  const scenariosPath = process.argv[3];
  const browserScenariosPath = process.argv[4] && !process.argv[4].startsWith("--") ? process.argv[4] : "";
  const profileArgIndex = process.argv.indexOf("--profile");
  const profilePath = profileArgIndex >= 0 ? process.argv[profileArgIndex + 1] : "";

  if (!criteriaPath || !scenariosPath) {
    console.error("Usage: npx tsx validate-coverage.ts <criteria.json> <api-scenarios.json> [browser-scenarios.json] [--profile .flow/delivery-profile.json]");
    process.exit(1);
  }

  const criteriaData: ExtractResult = JSON.parse(readFileSync(resolve(criteriaPath), "utf-8"));
  const scenarios: ScenarioRef[] = JSON.parse(readFileSync(resolve(scenariosPath), "utf-8"));
  const browserScenarios: ScenarioRef[] = browserScenariosPath
    ? JSON.parse(readFileSync(resolve(browserScenariosPath), "utf-8"))
    : [];
  const allScenarioRefs = [...scenarios, ...browserScenarios];
  const profile = loadProfile(profilePath);
  const allRoles = profile.roles?.all || DEFAULT_ROLES;

  const issues: CoverageIssue[] = [];
  let coveredCount = 0;

  // Check each criterion against scenarios
  const allCriteria = criteriaData.features.flatMap((f) => f.criteria);
  for (const criterion of allCriteria) {
    const criterionLower = criterion.criterion.toLowerCase();

    // Find matching scenarios by keyword overlap
    const matching = allScenarioRefs.filter((s) => {
      const titleLower = s.title.toLowerCase();
      // Simple keyword matching — check if key terms from criterion appear in scenario title
      const keywords = criterionLower
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .filter((w) => !["admin", "system", "user", "can", "the", "for", "with", "from"].includes(w));

      return keywords.some((kw) => titleLower.includes(kw));
    });

    if (matching.length > 0) {
      coveredCount++;
    } else {
      issues.push({
        severity: "error",
        criterion: criterion.criterion,
        message: "No matching test scenario found",
      });
    }
  }

  // Check function coverage matrix
  const functionNames = [...new Set(scenarios.map((s) => s.function).filter(Boolean))];
  const functionCoverage: FunctionCoverage[] = [];

  for (const funcName of functionNames) {
    const funcScenarios = scenarios.filter((s) => s.function === funcName);
    const hasPositive = funcScenarios.some((s) => s.type === "positive");
    const hasNegative = funcScenarios.some((s) => s.type === "negative");

    const unauthorizedRoles = funcScenarios
      .filter((s) => s.type === "unauthorized")
      .map((s) => s.role.replace(/\s*\(unauthorized\)/, ""));

    // Determine which roles SHOULD be unauthorized
    const authorizedRoles = funcScenarios
      .filter((s) => s.type === "positive")
      .map((s) => s.role);
    const expectedUnauthorized = allRoles.filter(
      (r) => !authorizedRoles.includes(r) && !authorizedRoles.includes(r.replace("_", " ")),
    );
    const missingUnauthorized = expectedUnauthorized.filter(
      (r) => !unauthorizedRoles.includes(r),
    );

    functionCoverage.push({
      function: funcName,
      hasPositive,
      hasNegative,
      unauthorizedRoles,
      missingUnauthorized,
    });

    if (!hasPositive) {
      issues.push({
        severity: "error",
        criterion: funcName,
        message: "No positive test case",
      });
    }
    if (!hasNegative) {
      issues.push({
        severity: "warning",
        criterion: funcName,
        message: "No negative test case (bad input or missing prerequisite)",
      });
    }
    if (missingUnauthorized.length > 0) {
      issues.push({
        severity: "warning",
        criterion: funcName,
        message: `Missing unauthorized tests for: ${missingUnauthorized.join(", ")}`,
      });
    }
  }

  const coveragePercent = allCriteria.length > 0
    ? Math.round((coveredCount / allCriteria.length) * 100)
    : 0;

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  let grade = "A";
  if (coveragePercent < 75 || errorCount > 5) grade = "D";
  else if (coveragePercent < 90 || errorCount > 2) grade = "C";
  else if (errorCount > 0 || warningCount > 2) grade = "B";

  const report: CoverageReport = {
    epicName: criteriaData.epicName,
    totalCriteria: allCriteria.length,
    coveredCriteria: coveredCount,
    coveragePercent,
    issues,
    functionCoverage,
    grade,
  };

  console.error(`Coverage: ${coveredCount}/${allCriteria.length} (${coveragePercent}%)`);
  console.error(`Issues: ${errorCount} errors, ${warningCount} warnings`);
  console.error(`Grade: ${grade}`);

  console.log(JSON.stringify(report, null, 2));
}

main();
