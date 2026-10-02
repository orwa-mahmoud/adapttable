#!/usr/bin/env node
/**
 * Run several package scripts at once and fail if any of them does.
 *
 * `pnpm check` was eighteen stages chained with `&&`, so a ten-core machine
 * ran them one at a time and stopped at the first failure — which also meant
 * one formatting complaint hid every other problem behind it. The stages that
 * do not depend on each other run together here instead, and every failure is
 * reported, not just the first.
 *
 * Output is buffered per task and printed when that task ends, so two suites
 * writing at once do not interleave into nonsense.
 * ADAPTTABLE_CHECK_CONCURRENCY optionally bounds the active scripts, including
 * nested runner calls. An unset value keeps every independent task parallel.
 *
 *   node scripts/run-parallel.mjs lint typecheck test:coverage
 */
import { spawn } from "node:child_process";

import { checkConcurrency } from "./check-concurrency.mjs";

const tasks = process.argv.slice(2);
if (tasks.length === 0) {
  console.error("run-parallel: name at least one script to run");
  process.exit(2);
}

let concurrency;
try {
  concurrency = checkConcurrency() ?? tasks.length;
} catch (error) {
  console.error(`run-parallel: ${error.message}`);
  process.exit(2);
}

const PM = process.env.npm_execpath?.includes("pnpm") ? "pnpm" : "npm";

/**
 * @param {string} task
 * @returns {Promise<{ task: string, code: number, output: string, ms: number }>}
 */
function run(task) {
  const started = Date.now();
  return new Promise((resolve) => {
    const child = spawn(PM, ["run", task], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    let output = "";
    child.stdout.on("data", (chunk) => (output += String(chunk)));
    child.stderr.on("data", (chunk) => (output += String(chunk)));
    child.on("error", (error) => (output += `${error.message}\n`));
    child.on("close", (code) => {
      resolve({ task, code: code ?? 1, output, ms: Date.now() - started });
    });
  });
}

const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;

const started = Date.now();
const results = new Array(tasks.length);
let next = 0;

async function worker() {
  while (next < tasks.length) {
    const index = next++;
    const result = await run(tasks[index]);
    results[index] = result;
    const mark = result.code === 0 ? "✓" : "✗";
    process.stdout.write(
      `\n${mark} ${result.task} (${seconds(result.ms)})\n${result.output}`
    );
  }
}

await Promise.all(
  Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
);

const failed = results.filter((result) => result.code !== 0);
const total = Date.now() - started;
process.stdout.write(
  `\nrun-parallel: ${String(results.length)} task(s) in ${seconds(total)}` +
    (failed.length > 0
      ? ` — ${String(failed.length)} failed: ${failed.map((f) => f.task).join(", ")}\n`
      : " — all passed\n")
);
process.exit(failed.length > 0 ? 1 : 0);
