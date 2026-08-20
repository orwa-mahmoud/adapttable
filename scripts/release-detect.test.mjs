import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classifyRelease, pendingChangesets } from "./release-detect.mjs";

describe("pendingChangesets", () => {
  it("ignores the folder README and non-markdown files", () => {
    assert.deepEqual(
      pendingChangesets(["README.md", "config.json", "cool-fish.md"]),
      ["cool-fish.md"]
    );
  });
});

describe("classifyRelease", () => {
  const core = { name: "@adapttable/core", version: "2.6.0" };

  it("opens a Version PR when a changeset is pending, even if npm matches", () => {
    const plan = classifyRelease({
      changesetFiles: ["README.md", "neat-fox.md"],
      packages: [core],
      published: { "@adapttable/core": "2.6.0" },
    });
    assert.equal(plan.needVersion, true);
    assert.equal(plan.needPublish, false);
  });

  it("skips when nothing is pending and every version is on npm", () => {
    const plan = classifyRelease({
      changesetFiles: ["README.md"],
      packages: [core],
      published: { "@adapttable/core": "2.6.0" },
    });
    assert.equal(plan.needVersion, false);
    assert.equal(plan.needPublish, false);
    assert.equal(plan.reason, "nothing to version or publish");
  });

  it("publishes when a package version is not the registry latest", () => {
    const plan = classifyRelease({
      changesetFiles: ["README.md"],
      packages: [core],
      published: { "@adapttable/core": "2.5.0" },
    });
    assert.equal(plan.needVersion, false);
    assert.equal(plan.needPublish, true);
    assert.equal(plan.reason, "unpublished versions");
  });

  it("publishes a never-published package", () => {
    const plan = classifyRelease({
      changesetFiles: [],
      packages: [core],
      published: { "@adapttable/core": null },
    });
    assert.equal(plan.needPublish, true);
  });

  it("fail-opens to publish when the registry lookup failed", () => {
    const plan = classifyRelease({
      changesetFiles: ["README.md"],
      packages: [core],
      published: { "@adapttable/core": undefined },
    });
    assert.equal(plan.needPublish, true);
    assert.match(plan.reason, /fail-open/);
  });
});
