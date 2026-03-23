#!/usr/bin/env npx tsx
/**
 * Resolve Playwright-compatible selectors from DOM inspection artifacts.
 *
 * Reads .dom-inspection/<role>/<page>.elements.json files and produces
 * a selector map keyed by role + route.
 *
 * Input:  Path to .dom-inspection/ directory (positional arg)
 * Output: JSON selector map to stdout
 *
 * Usage:
 *   npx tsx resolve-selectors.ts tests/browser-integration/.dom-inspection
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve, join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ElementEntry {
  text?: string;
  label?: string;
  selector: string;
  role?: string;
  type?: string;
  href?: string;
  ariaLabel?: string;
  level?: number;
  id?: string;
}

interface ElementInventory {
  url: string;
  title: string;
  role: string;
  capturedAt: string;
  elements: {
    headings: ElementEntry[];
    buttons: ElementEntry[];
    links: ElementEntry[];
    inputs: ElementEntry[];
    tabs: ElementEntry[];
    tables: Array<{ caption: string | null; rowCount: number; columnHeaders: string[] }>;
    text: string[];
  };
}

interface SelectorMap {
  [roleAndRoute: string]: {
    url: string;
    capturedAt: string;
    headings: Record<string, string>;
    buttons: Record<string, string>;
    links: Record<string, string>;
    inputs: Record<string, string>;
    tabs: Record<string, string>;
    visibleText: string[];
  };
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

function resolveSelectors(inspectionDir: string): SelectorMap {
  const selectorMap: SelectorMap = {};

  if (!existsSync(inspectionDir)) {
    console.error(`Directory not found: ${inspectionDir}`);
    console.error("Run 'pnpm test:browser-integration:inspect' first.");
    process.exit(1);
  }

  const roles = readdirSync(inspectionDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const role of roles) {
    const roleDir = join(inspectionDir, role);
    const files = readdirSync(roleDir).filter((f) => f.endsWith(".elements.json"));

    for (const file of files) {
      const filePath = join(roleDir, file);
      const inventory: ElementInventory = JSON.parse(readFileSync(filePath, "utf-8"));

      // Extract route from URL
      const url = new URL(inventory.url);
      const route = url.pathname + url.search;
      const key = `${role}:${route}`;

      const entry: SelectorMap[string] = {
        url: inventory.url,
        capturedAt: inventory.capturedAt,
        headings: {},
        buttons: {},
        links: {},
        inputs: {},
        tabs: {},
        visibleText: inventory.elements.text as string[],
      };

      // Map headings by text
      for (const h of inventory.elements.headings) {
        if (h.text) entry.headings[h.text] = h.selector;
      }

      // Map buttons by text or aria-label
      for (const b of inventory.elements.buttons) {
        const label = b.ariaLabel || b.text || "";
        if (label) entry.buttons[label] = b.selector;
      }

      // Map links by text
      for (const l of inventory.elements.links) {
        if (l.text) entry.links[l.text] = l.selector;
      }

      // Map inputs by label
      for (const inp of inventory.elements.inputs) {
        const label = inp.label || inp.id || "";
        if (label) entry.inputs[label] = inp.selector;
      }

      // Map tabs by text
      for (const t of inventory.elements.tabs) {
        if (t.text) entry.tabs[t.text] = t.selector;
      }

      selectorMap[key] = entry;
    }
  }

  return selectorMap;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const inspectionDir = process.argv[2];

  if (!inspectionDir) {
    console.error("Usage: npx tsx resolve-selectors.ts <path-to-.dom-inspection>");
    process.exit(1);
  }

  const resolved = resolve(inspectionDir);
  const selectorMap = resolveSelectors(resolved);

  const routeCount = Object.keys(selectorMap).length;
  let totalSelectors = 0;
  for (const entry of Object.values(selectorMap)) {
    totalSelectors +=
      Object.keys(entry.headings).length +
      Object.keys(entry.buttons).length +
      Object.keys(entry.links).length +
      Object.keys(entry.inputs).length +
      Object.keys(entry.tabs).length;
  }

  console.error(`Resolved selectors for ${routeCount} pages, ${totalSelectors} total selectors`);
  console.log(JSON.stringify(selectorMap, null, 2));
}

main();
