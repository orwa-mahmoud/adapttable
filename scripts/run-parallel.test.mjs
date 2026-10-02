/** Package-runner proofs for task inventory, bounded scheduling and failures. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { setTimeout } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { checkConcurrency } from "./check-concurrency.mjs";

const RUNNER = fileURLToPath(new URL("./run-parallel.mjs", import.meta.url));
const TASKS = ["alpha", "beta", "gamma"];
const TASK_SOURCE = `
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
const name = process.argv[2];
appendFileSync("events", name + ":start\\n");
writeFileSync("started/" + name, "");
const deadline = Date.now() + 15000;
while (!existsSync("release/" + name)) {
  if (Date.now() > deadline) throw new Error("task was never released: " + name);
  await setTimeout(10);
}
appendFileSync("events", name + ":end\\n");
process.exit(name === "beta" ? Number(process.env.RUNNER_BETA_EXIT ?? 0) : 0);
`;

/** Run real npm scripts in a dependency-free temporary package. */
function fixture(
  context,
  { concurrency, fail = false, hold = false, tasks = TASKS } = {}
) {
  const dir = mkdtempSync(join(tmpdir(), "run-parallel-"));
  mkdirSync(join(dir, "started"));
  mkdirSync(join(dir, "release"));
  writeFileSync(join(dir, "task.mjs"), TASK_SOURCE);
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      private: true,
      scripts: Object.fromEntries(
        TASKS.map((name) => [name, `node task.mjs ${name}`])
      ),
    })
  );
  const release = (name) => writeFileSync(join(dir, "release", name), "");
  if (!hold) TASKS.forEach(release);
  const env = {
    ...process.env,
    npm_execpath: "npm",
    npm_config_cache: join(dir, "npm-cache"),
    RUNNER_BETA_EXIT: fail ? "7" : "0",
  };
  delete env.ADAPTTABLE_CHECK_CONCURRENCY;
  if (concurrency !== undefined) env.ADAPTTABLE_CHECK_CONCURRENCY = concurrency;
  const child = spawn(process.execPath, [RUNNER, ...tasks], {
    cwd: dir,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => (output += String(chunk)));
  child.stderr.on("data", (chunk) => (output += String(chunk)));
  const done = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
  context.after(async () => {
    TASKS.forEach(release);
    await done;
    rmSync(dir, { recursive: true, force: true });
  });
  return {
    done,
    release,
    started: (name) => existsSync(join(dir, "started", name)),
    events: () =>
      existsSync(join(dir, "events"))
        ? readFileSync(join(dir, "events"), "utf8").trim().split("\n")
        : [],
  };
}

async function waitForStart(run, names) {
  const deadline = Date.now() + 10000;
  while (!names.every(run.started)) {
    assert.ok(
      Date.now() < deadline,
      `scripts did not start: ${names.join(", ")}`
    );
    await setTimeout(10);
  }
}

describe("check concurrency", () => {
  it("accepts positive safe integers", () => {
    assert.equal(checkConcurrency("1"), 1);
    assert.equal(checkConcurrency("12"), 12);
  });

  it("rejects malformed, zero, negative and unsafe counts", () => {
    for (const value of [
      "",
      "0",
      "-1",
      "1.5",
      "1e2",
      " 2",
      "NaN",
      "Infinity",
      "9007199254740992",
    ]) {
      assert.throws(
        () => checkConcurrency(value),
        /ADAPTTABLE_CHECK_CONCURRENCY must be a positive integer/
      );
    }
  });
});

describe("package script scheduling", () => {
  it("starts every task together when the control is absent", async (context) => {
    const run = fixture(context, { hold: true });
    await waitForStart(run, TASKS);
    assert.deepEqual(
      run.events().sort(),
      TASKS.map((name) => `${name}:start`)
    );
    TASKS.forEach(run.release);
    const result = await run.done;
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /3 task\(s\).*all passed/);
  });

  it("holds later scripts until capacity opens and never overlaps more than two", async (context) => {
    const run = fixture(context, { concurrency: "2", hold: true });
    await waitForStart(run, ["alpha", "beta"]);
    assert.equal(run.started("gamma"), false);
    run.release("beta");
    await waitForStart(run, ["gamma"]);
    assert.equal(run.events().includes("alpha:end"), false);
    run.release("alpha");
    run.release("gamma");
    const result = await run.done;
    assert.equal(result.code, 0, result.output);
    let active = 0;
    let peak = 0;
    for (const event of run.events()) {
      active += event.endsWith(":start") ? 1 : -1;
      peak = Math.max(peak, active);
    }
    assert.equal(active, 0);
    assert.equal(peak, 2);
    assert.equal(run.events().length, 6);
  });

  it("runs every script in order at one worker, including after a failure", async (context) => {
    const run = fixture(context, { concurrency: "1", fail: true });
    const result = await run.done;
    assert.equal(result.code, 1, result.output);
    assert.deepEqual(
      run.events(),
      TASKS.flatMap((name) => [`${name}:start`, `${name}:end`])
    );
    assert.match(result.output, /3 task\(s\).*1 failed: beta/);
    assert.match(result.output, /✓ gamma/);
  });

  it("reports every failed script while completing the remaining queue", async (context) => {
    const run = fixture(context, {
      concurrency: "1",
      fail: true,
      tasks: ["beta", "alpha", "beta"],
    });
    const result = await run.done;
    assert.equal(result.code, 1, result.output);
    assert.deepEqual(run.events(), [
      "beta:start",
      "beta:end",
      "alpha:start",
      "alpha:end",
      "beta:start",
      "beta:end",
    ]);
    assert.match(result.output, /3 task\(s\).*2 failed: beta, beta/);
  });

  it("rejects invalid configuration before starting any script", async (context) => {
    const run = fixture(context, { concurrency: "0" });
    const result = await run.done;
    assert.equal(result.code, 2);
    assert.match(result.output, /must be a positive integer/);
    assert.deepEqual(run.events(), []);
  });
});
