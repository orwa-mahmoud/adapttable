import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { vitestFileParallelism, vitestMaxWorkers } from "./vitest-workers.mjs";

describe("vitestMaxWorkers", () => {
  it("keeps CI on one thread so a 2-core shard stays deterministic", () => {
    assert.equal(vitestMaxWorkers({ ci: true, turbo: true, cores: 2 }), 1);
    assert.equal(vitestMaxWorkers({ ci: true, turbo: false, cores: 24 }), 1);
  });

  it("gives a turbo suite a third of a large local machine", () => {
    assert.equal(vitestMaxWorkers({ ci: false, turbo: true, cores: 24 }), 8);
    assert.equal(vitestMaxWorkers({ ci: false, turbo: true, cores: 10 }), 3);
    // Small machines keep the floor: a third of four cores would leave a
    // suite running barely wider than CI does.
    assert.equal(vitestMaxWorkers({ ci: false, turbo: true, cores: 4 }), 3);
  });

  it("gives a solo local package run a worker per core", () => {
    assert.equal(vitestMaxWorkers({ ci: false, turbo: false, cores: 24 }), 24);
    assert.equal(vitestMaxWorkers({ ci: false, turbo: false, cores: 8 }), 8);
    assert.equal(vitestMaxWorkers({ ci: false, turbo: false, cores: 2 }), 4);
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
