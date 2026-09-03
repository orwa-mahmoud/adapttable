import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { vitestFileParallelism, vitestMaxWorkers } from "./vitest-workers.mjs";

describe("vitestMaxWorkers", () => {
  it("keeps CI on one thread so a 2-core shard stays deterministic", () => {
    assert.equal(vitestMaxWorkers({ ci: true, turbo: true, cores: 2 }), 1);
    assert.equal(vitestMaxWorkers({ ci: true, turbo: false, cores: 24 }), 1);
  });

  it("gives a turbo suite a slice of a large local machine", () => {
    assert.equal(vitestMaxWorkers({ ci: false, turbo: true, cores: 24 }), 4);
    assert.equal(vitestMaxWorkers({ ci: false, turbo: true, cores: 10 }), 2);
    assert.equal(vitestMaxWorkers({ ci: false, turbo: true, cores: 4 }), 2);
  });

  it("uses half the cores for a solo local package run", () => {
    assert.equal(vitestMaxWorkers({ ci: false, turbo: false, cores: 24 }), 12);
    assert.equal(vitestMaxWorkers({ ci: false, turbo: false, cores: 8 }), 4);
    assert.equal(vitestMaxWorkers({ ci: false, turbo: false, cores: 6 }), 4);
  });
});

describe("vitestFileParallelism", () => {
  it("fans files locally and stays serial on CI", () => {
    assert.equal(vitestFileParallelism({ ci: true }), false);
    assert.equal(vitestFileParallelism({ ci: false }), true);
  });
});
