import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkPlan, checkReason } from "./check-if-needed.mjs";
import { classify } from "./ci-detect.mjs";

function labels(files) {
  return checkPlan(classify(files)).map((step) => step.label);
}

describe("checkPlan", () => {
  it("keeps format and doc guards when the root README changes", () => {
    assert.deepEqual(labels(["README.md"]), [
      "format:check",
      "check:readmes",
      "check:docsurface",
      "test:scripts",
    ]);
    assert.equal(checkReason(classify(["README.md"])), "docs/meta-only");
    assert.equal(classify(["README.md"]).runPlaywright, false);
  });

  it("keeps format and doc guards on docs-only diffs", () => {
    assert.deepEqual(labels(["docs/filtering.md"]), [
      "format:check",
      "check:readmes",
      "check:docsurface",
      "test:scripts",
    ]);
    assert.equal(
      checkReason(classify(["docs/filtering.md"])),
      "docs/meta-only"
    );
  });

  it("runs publint on a version-only bump, not unit tests", () => {
    assert.deepEqual(
      labels([
        "packages/core/package.json",
        "packages/core/CHANGELOG.md",
        ".changeset/x.md",
      ]),
      [
        "format:check",
        "check:readmes",
        "check:docsurface",
        "test:scripts",
        "publint",
      ]
    );
    assert.equal(
      checkReason(
        classify([
          "packages/core/package.json",
          "packages/core/CHANGELOG.md",
          ".changeset/x.md",
        ])
      ),
      "version-only bump"
    );
  });

  it("skips package lint and coverage on a workflow-only diff", () => {
    assert.deepEqual(labels([".github/workflows/pr.yml"]), [
      "format:check",
      "check:readmes",
      "check:docsurface",
      "test:scripts",
    ]);
    assert.equal(
      checkReason(classify([".github/workflows/pr.yml"])),
      "docs/meta-only"
    );
  });

  it("lints root tooling when only a script changes", () => {
    assert.deepEqual(labels(["scripts/ci-detect.mjs"]), [
      "format:check",
      "lint:root",
      "check:readmes",
      "check:docsurface",
      "test:scripts",
    ]);
    assert.equal(
      checkReason(classify(["scripts/ci-detect.mjs"])),
      "root tooling"
    );
  });

  it("does not run pnpm check for CI + README + scripts", () => {
    const files = [
      ".github/workflows/pr.yml",
      "README.md",
      "scripts/ci-detect.mjs",
      "package.json",
    ];
    assert.deepEqual(labels(files), [
      "format:check",
      "lint:root",
      "check:readmes",
      "check:docsurface",
      "test:scripts",
    ]);
    assert.equal(checkReason(classify(files)), "root tooling");
  });

  it("runs the full pnpm check when an adapter changes", () => {
    assert.deepEqual(labels(["packages/adapter-mantine/src/DataTable.tsx"]), [
      "check",
    ]);
    assert.equal(
      checkReason(classify(["packages/adapter-mantine/src/DataTable.tsx"])),
      "package code changed"
    );
  });
});
