#!/usr/bin/env node
/** Run the complete Node script-test glob with optional bounded concurrency. */
import { spawnSync } from "node:child_process";

import { checkConcurrency } from "./check-concurrency.mjs";

let concurrency;
try {
  concurrency = checkConcurrency();
} catch (error) {
  console.error(`run-script-tests: ${error.message}`);
  process.exit(2);
}

const args = ["--test"];
if (concurrency !== undefined) args.push(`--test-concurrency=${concurrency}`);
args.push("scripts/*.test.mjs", ...process.argv.slice(2));

const result = spawnSync(process.execPath, args, { stdio: "inherit" });
if (result.error) console.error(`run-script-tests: ${result.error.message}`);
process.exit(result.status ?? 1);
