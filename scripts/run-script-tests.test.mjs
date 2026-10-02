/** Exercise the script-test entry point against real temporary Node tests. */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  watch,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const RUNNER = fileURLToPath(
  new URL("./run-script-tests.mjs", import.meta.url)
);
const HELD_TESTS = ["alpha", "beta", "gamma"];

/** Hold real test-file processes until the parent opens each release gate. */
function barrierFixture(context) {
  const dir = mkdtempSync(join(tmpdir(), "script-test-barrier-"));
  for (const folder of ["scripts", "started", "release"]) {
    mkdirSync(join(dir, folder));
  }
  for (const name of HELD_TESTS) {
    writeFileSync(
      join(dir, "scripts", `${name}.test.mjs`),
      `import { once } from "node:events";
import { appendFileSync, existsSync, renameSync, watch, writeFileSync } from "node:fs";
import { test } from "node:test";
const name = ${JSON.stringify(name)};
test("held-" + name, async () => {
  const gate = watch("release");
  appendFileSync("events", name + ":start\\n");
  writeFileSync(name + ".ready", JSON.stringify(process.execArgv));
  renameSync(name + ".ready", "started/" + name);
  try {
    while (!existsSync("release/" + name)) await once(gate, "change");
  } finally {
    gate.close();
  }
  appendFileSync("events", name + ":end\\n");
});
`
    );
  }
  const watcher = watch(join(dir, "started"));
  const env = { ...process.env, ADAPTTABLE_CHECK_CONCURRENCY: "2" };
  delete env.NODE_TEST_CONTEXT;
  const child = spawn(process.execPath, [RUNNER], {
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
  const release = (name) => writeFileSync(join(dir, "release", name), "");
  const started = (name) => existsSync(join(dir, "started", name));
  context.after(async () => {
    HELD_TESTS.forEach(release);
    try {
      await done;
    } finally {
      watcher.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
  return {
    done,
    release,
    started,
    async waitForStart(names) {
      while (!names.every(started)) {
        await once(watcher, "change", { signal: context.signal });
      }
    },
    argumentsFor: (name) =>
      JSON.parse(readFileSync(join(dir, "started", name), "utf8")),
    events: () => readFileSync(join(dir, "events"), "utf8").trim().split("\n"),
  };
}

/** A fresh inventory, including files the original single-directory glob omits. */
function fixture(context) {
  const dir = mkdtempSync(join(tmpdir(), "run-script-tests-"));
  mkdirSync(join(dir, "scripts", "nested"), { recursive: true });
  const excludedSource =
    'throw new Error("the runner broadened its test glob");';
  writeFileSync(join(dir, "scripts", "helper.mjs"), excludedSource);
  writeFileSync(join(dir, "scripts", "other.test.cjs"), excludedSource);
  writeFileSync(
    join(dir, "scripts", "nested", "nested.test.mjs"),
    excludedSource
  );
  context.after(() => rmSync(dir, { recursive: true, force: true }));
  return {
    add(name, fail = false) {
      writeFileSync(
        join(dir, "scripts", `${name}.test.mjs`),
        `import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { test } from "node:test";
test(${JSON.stringify(`fixture-${name}`)}, () => {
  appendFileSync("events", ${JSON.stringify(`${name}\n`)});
  assert.equal(process.env.RUNNER_MARKER, ${JSON.stringify(fail ? "failure" : "preserved")});
});
`
      );
    },
    run(concurrency) {
      const env = { ...process.env, RUNNER_MARKER: "preserved" };
      delete env.NODE_TEST_CONTEXT;
      delete env.ADAPTTABLE_CHECK_CONCURRENCY;
      if (concurrency !== undefined)
        env.ADAPTTABLE_CHECK_CONCURRENCY = concurrency;
      const result = spawnSync(process.execPath, [RUNNER], {
        cwd: dir,
        env,
        encoding: "utf8",
        timeout: 15000,
      });
      assert.equal(result.error, undefined);
      return { code: result.status, output: result.stdout + result.stderr };
    },
    events: () =>
      existsSync(join(dir, "events"))
        ? readFileSync(join(dir, "events"), "utf8").trim().split("\n")
        : [],
  };
}

describe("script-test runner", () => {
  it("runs exactly the original test glob by default and discovers new files", (context) => {
    const suite = fixture(context);
    suite.add("alpha");
    suite.add("beta");
    const first = suite.run();
    assert.equal(first.code, 0, first.output);
    assert.deepEqual(suite.events().sort(), ["alpha", "beta"]);

    suite.add("gamma");
    const next = suite.run();
    assert.equal(next.code, 0, next.output);
    assert.deepEqual(suite.events().sort(), [
      "alpha",
      "alpha",
      "beta",
      "beta",
      "gamma",
    ]);
  });

  it("keeps every test in the bounded run and returns its failure", (context) => {
    const suite = fixture(context);
    suite.add("alpha", true);
    suite.add("beta");
    suite.add("gamma");
    const result = suite.run("1");
    assert.equal(result.code, 1, result.output);
    assert.deepEqual(suite.events(), ["alpha", "beta", "gamma"]);
    assert.match(result.output, /fixture-alpha/);
    assert.match(result.output, /preserved/);
    assert.match(result.output, /failure/);
  });

  it("runs the complete inventory with a larger positive bound", (context) => {
    const suite = fixture(context);
    suite.add("alpha");
    suite.add("beta");
    suite.add("gamma");
    const result = suite.run("2");
    assert.equal(result.code, 0, result.output);
    assert.deepEqual(suite.events().sort(), ["alpha", "beta", "gamma"]);
  });

  it(
    "holds the third test file until one of two active files finishes",
    { timeout: 30000 },
    async (context) => {
      const suite = barrierFixture(context);
      await suite.waitForStart(["alpha", "beta"]);
      assert.equal(suite.started("gamma"), false);
      assert.deepEqual(suite.events().sort(), ["alpha:start", "beta:start"]);
      // The real child received the explicit bound even when a host's default
      // happens to equal two. The event ledger below proves actual scheduling.
      for (const name of ["alpha", "beta"]) {
        assert.ok(suite.argumentsFor(name).includes("--test-concurrency=2"));
      }

      suite.release("alpha");
      await suite.waitForStart(["gamma"]);
      const waiting = suite.events();
      assert.equal(waiting.includes("beta:end"), false);
      assert.ok(waiting.indexOf("alpha:end") < waiting.indexOf("gamma:start"));
      suite.release("beta");
      suite.release("gamma");
      const result = await suite.done;
      assert.equal(result.code, 0, result.output);

      const events = suite.events();
      assert.deepEqual(
        [...events].sort(),
        HELD_TESTS.flatMap((name) => [`${name}:end`, `${name}:start`])
      );
      let active = 0;
      let peak = 0;
      for (const event of events) {
        active += event.endsWith(":start") ? 1 : -1;
        peak = Math.max(peak, active);
      }
      assert.equal(active, 0);
      assert.equal(peak, 2);
    }
  );

  it("rejects an invalid bound without running any tests", (context) => {
    const suite = fixture(context);
    suite.add("alpha");
    const result = suite.run("-1");
    assert.equal(result.code, 2);
    assert.match(result.output, /must be a positive integer/);
    assert.deepEqual(suite.events(), []);
  });
});
