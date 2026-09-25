import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  changelogSection,
  latestTag,
  packageDirsInTree,
  plannedReleases,
  releaseTag,
} from "./github-releases.mjs";

const changelog = `# @adapttable/core

## 3.2.1

### Patch Changes

- abc1234: Fix one.

## 3.2.0

### Minor Changes

- def5678: Add two.
`;

describe("changelogSection", () => {
  it("returns the notes under a version heading", () => {
    assert.equal(
      changelogSection(changelog, "3.2.1"),
      "### Patch Changes\n\n- abc1234: Fix one."
    );
  });

  it("reads the last section to the end of the file", () => {
    assert.equal(
      changelogSection(changelog, "3.2.0"),
      "### Minor Changes\n\n- def5678: Add two."
    );
  });

  it("returns null for a version the changelog does not list", () => {
    assert.equal(changelogSection(changelog, "9.9.9"), null);
  });
});

describe("latestTag", () => {
  it("marks core Latest when core is released", () => {
    assert.equal(
      latestTag(["@adapttable/antd@3.2.2", "@adapttable/core@3.2.1"]),
      "@adapttable/core@3.2.1"
    );
  });

  it("marks nothing when core is not released", () => {
    assert.equal(latestTag(["@adapttable/antd@3.2.2"]), undefined);
  });
});

describe("plannedReleases", () => {
  const core = {
    manifest: { name: "@adapttable/core", version: "3.2.1" },
    changelog,
  };

  it("plans a release for a version without one", () => {
    assert.deepEqual(
      plannedReleases({
        packages: [core],
        existing: new Set(),
        ignored: new Set(),
      }),
      [
        {
          tag: releaseTag("@adapttable/core", "3.2.1"),
          notes: "### Patch Changes\n\n- abc1234: Fix one.",
        },
      ]
    );
  });

  it("skips released, private, ignored and unlisted versions", () => {
    assert.deepEqual(
      plannedReleases({
        packages: [
          core,
          {
            manifest: {
              name: "@adapttable/x",
              version: "1.0.0",
              private: true,
            },
            changelog,
          },
          {
            manifest: { name: "@adapttable/docs", version: "3.2.1" },
            changelog,
          },
          {
            manifest: { name: "@adapttable/new", version: "0.1.0" },
            changelog: null,
          },
          {
            manifest: { name: "@adapttable/core-next", version: "4.0.0" },
            changelog,
          },
        ],
        existing: new Set(["@adapttable/core@3.2.1"]),
        ignored: new Set(["@adapttable/docs"]),
      }),
      []
    );
  });
});

describe("packageDirsInTree", () => {
  it("finds every grouped package manifest, sorted by folder name", () => {
    const tree = [
      "packages/shared/core/CHANGELOG.md",
      "packages/shared/core/package.json",
      "packages/shared/core/src/index.ts",
      "packages/react/adapter-mui/package.json",
      "packages/react/react/package.json",
      "packages/shared/ai/package.json",
      "",
    ].join("\n");
    assert.deepEqual(packageDirsInTree(tree), [
      "packages/react/adapter-mui",
      "packages/shared/ai",
      "packages/shared/core",
      "packages/react/react",
    ]);
  });

  it("ignores manifests above or below the package depth", () => {
    const tree = [
      "packages/package.json",
      "packages/shared/package.json",
      "packages/shared/core/fixtures/app/package.json",
      "packages/shared/core/package.json",
    ].join("\n");
    assert.deepEqual(packageDirsInTree(tree), ["packages/shared/core"]);
  });
});
