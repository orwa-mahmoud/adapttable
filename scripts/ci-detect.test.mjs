import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { classify } from "./ci-detect.mjs";

describe("classify", () => {
  it("treats an empty list as fail-open to the full gate", () => {
    const f = classify([]);
    assert.equal(f.runUnit, true);
    assert.equal(f.runPlaywright, true);
    assert.equal(f.needBuild, true);
  });

  it("runs unit tests when the root README changes, not Playwright", () => {
    const f = classify(["README.md"]);
    assert.equal(f.runUnit, true);
    assert.equal(f.runPackage, true);
    assert.equal(f.runPlaywright, false);
    assert.equal(f.runBench, false);
  });

  it("skips unit, package and Playwright on docs-only diffs", () => {
    const f = classify(["docs/filtering.md", ".github/ISSUE_TEMPLATE/bug.yml"]);
    assert.equal(f.runLint, false);
    assert.equal(f.runUnit, false);
    assert.equal(f.runPlaywright, false);
    assert.equal(f.needBuild, false);
  });

  it("treats version-only bumps as publint without unit or Playwright", () => {
    const f = classify([
      "packages/core/package.json",
      "packages/core/CHANGELOG.md",
      ".changeset/some-thing.md",
    ]);
    assert.equal(f.versionOnly, true);
    assert.equal(f.runPublint, true);
    assert.equal(f.runUnit, false);
    assert.equal(f.runPlaywright, false);
    assert.equal(f.runLint, false);
    assert.equal(f.needBuild, true);
  });

  it("runs unit and Playwright when an adapter changes", () => {
    const f = classify(["packages/adapter-mantine/src/DataTable.tsx"]);
    assert.equal(f.runLint, true);
    assert.equal(f.runUnit, true);
    assert.equal(f.runPackage, true);
    assert.equal(f.runPlaywright, true);
    assert.equal(f.runBench, true);
  });

  it("runs Playwright when only e2e specs change, not the packed harness", () => {
    const f = classify(["e2e/filtering-page.spec.ts"]);
    assert.equal(f.runPlaywright, true);
    assert.equal(f.runPackage, false);
    assert.equal(f.runUnit, false);
    assert.equal(f.runLint, false);
    assert.equal(f.needBuild, false);
  });

  it("runs package lint on a workflow change, not the unit shards", () => {
    const f = classify([".github/workflows/pr.yml"]);
    assert.equal(f.runLint, true);
    assert.equal(f.runLintRoot, true);
    assert.equal(f.runUnit, false);
    assert.equal(f.runPlaywright, false);
    assert.equal(f.needBuild, true);
  });

  it("lints root tooling when only a script changes", () => {
    const f = classify(["scripts/ci-detect.mjs"]);
    assert.equal(f.runLintRoot, true);
    assert.equal(f.runLint, false);
    assert.equal(f.runUnit, false);
    assert.equal(f.needBuild, false);
  });
});
