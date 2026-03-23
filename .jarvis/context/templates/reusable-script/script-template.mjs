#!/usr/bin/env node

import process from "node:process";

const HELP = `Usage: script-name [options]

Options:
  --json       Emit machine-readable JSON
  --help       Show this help text
`;

function parseArgs(argv) {
  const args = new Set(argv);
  return {
    json: args.has("--json"),
    help: args.has("--help"),
  };
}

function printJson(payload, exitCode = 0) {
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  process.exit(exitCode);
}

function fail(message, { json = false, code = 1, details = null } = {}) {
  if (json) {
    printJson({ ok: false, error: { message, details } }, code);
  }
  process.stderr.write(message + "\n");
  process.exit(code);
}

async function run({ json }) {
  const result = {
    message: "Replace this stub with deterministic logic.",
  };

  if (json) {
    printJson({ ok: true, result });
  }

  process.stdout.write(result.message + "\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(HELP);
    return;
  }

  try {
    await run(options);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), {
      json: options.json,
      details: error instanceof Error ? { stack: error.stack } : null,
    });
  }
}

main();
