import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  VITEST_TEST_TIMEOUT,
  vitestFileParallelism,
  vitestMaxWorkers,
} from "./vitest-workers.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("vitestMaxWorkers", () => {
  it("keeps CI on one thread per suite", () => {
    assert.equal(
      vitestMaxWorkers({ ci: true, turbo: true, cores: 2, forced: "" }),
      1
    );
    assert.equal(
      vitestMaxWorkers({ ci: true, turbo: false, cores: 24, forced: "" }),
      1
    );
  });

  it("gives a turbo suite a third of a large local machine", () => {
    assert.equal(
      vitestMaxWorkers({ ci: false, turbo: true, cores: 24, forced: "" }),
      8
    );
    assert.equal(
      vitestMaxWorkers({ ci: false, turbo: true, cores: 10, forced: "" }),
      3
    );
    // Small machines keep the floor: a third of four cores would leave a
    // suite running barely wider than CI does.
    assert.equal(
      vitestMaxWorkers({ ci: false, turbo: true, cores: 4, forced: "" }),
      3
    );
  });

  it("gives a solo local package run a worker per core", () => {
    assert.equal(
      vitestMaxWorkers({ ci: false, turbo: false, cores: 24, forced: "" }),
      24
    );
    assert.equal(
      vitestMaxWorkers({ ci: false, turbo: false, cores: 8, forced: "" }),
      8
    );
    assert.equal(
      vitestMaxWorkers({ ci: false, turbo: false, cores: 2, forced: "" }),
      4
    );
  });

  it("takes an explicit worker count over any derived one", () => {
    assert.equal(
      vitestMaxWorkers({ ci: true, turbo: true, cores: 24, forced: "6" }),
      6
    );
  });
});

describe("vitestFileParallelism", () => {
  it("fans files locally and stays serial on CI", () => {
    assert.equal(vitestFileParallelism({ ci: true }), false);
    assert.equal(vitestFileParallelism({ ci: false }), true);
  });
});

describe("VITEST_TEST_TIMEOUT", () => {
  it("is the floor of every package suite's time budget", () => {
    const packageDirs = [
      "apps",
      ...["shared", "react", "vue", "angular"].map(
        (group) => `packages/${group}`
      ),
    ].flatMap((parent) =>
      readdirSync(path.join(ROOT, parent)).map((name) => `${parent}/${name}`)
    );
    const configs = [
      "vitest.shared.ts",
      ...packageDirs
        .map((dir) => `${dir}/vitest.config.ts`)
        .filter((file) => existsSync(path.join(ROOT, file))),
    ];
    assert.ok(configs.length > 30, `found ${configs.length} configs`);
    // A suite may widen the shared budget, never narrow or drop it.
    const drifted = configs.filter((file) => {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      if (/testTimeout: VITEST_TEST_TIMEOUT\b/.test(source)) return false;
      const own = /testTimeout: ([\d_]+)/.exec(source);
      if (own) return Number(own[1].replaceAll("_", "")) < VITEST_TEST_TIMEOUT;
      return !/\bsharedConfig\b/.test(source);
    });
    assert.deepEqual(drifted, []);
  });
});
