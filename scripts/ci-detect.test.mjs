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

  it("treats the root README as docs, not a library gate", () => {
    const f = classify(["README.md"]);
    assert.equal(f.runLint, false);
    assert.equal(f.runUnit, false);
    assert.equal(f.runPackage, false);
    assert.equal(f.runPreview, false);
    assert.equal(f.runPlaywright, false);
    assert.equal(f.runKitsDocs, true);
    assert.equal(f.needBuild, false);
  });

  it("skips unit, package and Playwright on docs-only diffs", () => {
    const f = classify(["docs/filtering.md", ".github/ISSUE_TEMPLATE/bug.yml"]);
    assert.equal(f.runLint, false);
    assert.equal(f.runUnit, false);
    assert.equal(f.runPlaywright, false);
    assert.equal(f.needBuild, false);
    assert.equal(f.runKitsDocs, false);
  });

  it("does not lint adapters for a workflow-only change", () => {
    const f = classify([".github/workflows/pr.yml"]);
    assert.equal(f.runLint, false);
    assert.equal(f.runLintRoot, false);
    assert.equal(f.runUnit, false);
    assert.equal(f.runPackage, false);
    assert.equal(f.runPreview, false);
    assert.equal(f.needBuild, false);
  });

  it("does not run the library gate for CI + README + scripts", () => {
    const f = classify([
      ".github/workflows/pr.yml",
      "README.md",
      "scripts/ci-detect.mjs",
      "package.json",
    ]);
    assert.equal(f.runLint, false);
    assert.equal(f.runUnit, false);
    assert.equal(f.runPackage, false);
    assert.equal(f.runPreview, false);
    assert.equal(f.runPlaywright, false);
    assert.equal(f.runLintRoot, true);
    assert.equal(f.runKitsDocs, true);
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
    assert.equal(f.runPreview, true);
    assert.equal(f.runPlaywright, true);
    assert.equal(f.runBench, true);
    assert.equal(f.runKitsDocs, false);
  });

  it("runs Playwright when only e2e specs change, not the packed harness", () => {
    const f = classify(["e2e/filtering-page.spec.ts"]);
    assert.equal(f.runPlaywright, true);
    assert.equal(f.runPackage, false);
    assert.equal(f.runUnit, false);
    assert.equal(f.runLint, false);
    assert.equal(f.needBuild, false);
  });

  it("lints packages when the root ESLint config changes", () => {
    const f = classify(["eslint.config.mjs"]);
    assert.equal(f.runLint, true);
    assert.equal(f.runLintRoot, true);
    assert.equal(f.runUnit, false);
    assert.equal(f.needBuild, false);
  });

  it("runs unit shards when the shared vitest config changes", () => {
    const f = classify(["vitest.shared.ts"]);
    assert.equal(f.runUnit, true);
    assert.equal(f.runPackage, false);
    assert.equal(f.runPlaywright, false);
  });

  it("lints root tooling when only a script changes", () => {
    const f = classify(["scripts/ci-detect.mjs"]);
    assert.equal(f.runLintRoot, true);
    assert.equal(f.runLint, false);
    assert.equal(f.runUnit, false);
    assert.equal(f.needBuild, false);
  });
});
