import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { e2ePlan, isE2eRelated, isE2eSpec } from "./e2e-if-needed.mjs";

describe("e2ePlan", () => {
  it("skips docs-only diffs", () => {
    assert.deepEqual(
      e2ePlan(["docs/api.md", "README.md", ".changeset/foo.md"]),
      {
        kind: "skip",
      }
    );
  });

  it("runs the full suite when a package changes", () => {
    assert.deepEqual(e2ePlan(["packages/core/src/index.ts"]), { kind: "full" });
  });

  it("runs only the spec files when those are all that changed", () => {
    assert.deepEqual(e2ePlan(["e2e/checklist-filter.spec.ts", "docs/x.md"]), {
      kind: "specs",
      specs: ["e2e/checklist-filter.spec.ts"],
    });
  });

  it("runs the full suite when an e2e helper changes, not just specs", () => {
    assert.deepEqual(e2ePlan(["e2e/feature-lab.ts", "e2e/nav.ts"]), {
      kind: "full",
    });
  });
});

describe("path matchers", () => {
  it("treats the lockfile and playwright config as related", () => {
    assert.equal(isE2eRelated("pnpm-lock.yaml"), true);
    assert.equal(isE2eRelated("playwright.config.ts"), true);
    assert.equal(isE2eRelated("scripts/serve-showcase.mjs"), true);
    assert.equal(isE2eRelated("apps/showcase/src/Demo.tsx"), true);
  });

  it("does not treat a helper as a spec", () => {
    assert.equal(isE2eSpec("e2e/feature-lab.ts"), false);
    assert.equal(isE2eSpec("e2e/rtl.spec.ts"), true);
  });
});
