import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_E2E_PROJECTS,
  e2ePlan,
  isE2eRelated,
  isE2eSpec,
  projectsFor,
  VISUAL_E2E_PROJECTS,
} from "./e2e-if-needed.mjs";

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

describe("projectsFor", () => {
  it("keeps the per-PR Chromium projects for the default suite", () => {
    assert.deepEqual(projectsFor([]), DEFAULT_E2E_PROJECTS);
    assert.deepEqual(projectsFor(["e2e/rtl.spec.ts"]), DEFAULT_E2E_PROJECTS);
    assert.ok(DEFAULT_E2E_PROJECTS.includes("--project=chromium"));
    assert.ok(DEFAULT_E2E_PROJECTS.includes("--project=chromium-dev"));
  });

  it("routes visual specs to the Chromium visual project", () => {
    assert.deepEqual(
      projectsFor(["e2e/visual/v3-ui.spec.ts"]),
      VISUAL_E2E_PROJECTS
    );
    assert.deepEqual(VISUAL_E2E_PROJECTS, ["--project=chromium-visual"]);
  });
});
