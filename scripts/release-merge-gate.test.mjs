import assert from "node:assert/strict";
import { test } from "node:test";

import { releaseMergeBlock } from "./release-merge-gate.mjs";

const manifest = "packages/shared/core/package.json";

function review(
  files,
  { branch = "feature", before, after, count = files.length } = {}
) {
  return releaseMergeBlock(
    {
      number: 1,
      changed_files: count,
      base: { ref: "main", sha: "base" },
      head: { ref: branch, sha: "head" },
    },
    files,
    async (_path, sha) => (sha === "base" ? before : after)
  );
}

test("ordinary source changes and added changeset notes pass", async () => {
  assert.equal(
    await review([
      { filename: ".changeset/new-work.md", status: "added" },
      { filename: "packages/shared/core/src/index.ts", status: "modified" },
    ]),
    undefined
  );
});

test("a Version Packages pull request is reserved for the release owner", async () => {
  assert.match(
    await review([], { branch: "changeset-release/main" }),
    /Version Packages/
  );
});

test("changed or renamed protected files require the release owner", async () => {
  for (const file of [
    {
      filename: ".github/workflows/release-merge-gate.yml",
      status: "modified",
    },
    { filename: ".github/workflows/other.yml", status: "added" },
    {
      filename: "renamed.yml",
      previous_filename: ".github/workflows/release.yml",
      status: "renamed",
    },
    { filename: ".changeset/config.json", status: "modified" },
    { filename: "packages/shared/core/CHANGELOG.md", status: "modified" },
  ])
    assert.match(await review([file]), /release owner/);
});

test("removing a pending changeset requires the release owner", async () => {
  assert.match(
    await review([{ filename: ".changeset/example.md", status: "removed" }]),
    /Changeset removal/
  );
});

test("dependency edits pass while public package versions require the release owner", async () => {
  const before = { name: "@example/core", version: "1.0.0" };
  const file = [{ filename: manifest, status: "modified" }];
  assert.equal(
    await review(file, {
      before,
      after: { ...before, dependencies: { example: "^2" } },
    }),
    undefined
  );
  for (const after of [
    { ...before, version: "1.1.0" },
    { ...before, private: true },
  ]) {
    assert.match(await review(file, { before, after }), /release metadata/);
  }
});

test("a private package version change passes and a new public package requires the owner", async () => {
  const before = { name: "@example/core", version: "1.0.0", private: true };
  assert.equal(
    await review([{ filename: manifest, status: "modified" }], {
      before,
      after: { ...before, version: "1.1.0" },
    }),
    undefined
  );
  assert.match(
    await review([{ filename: manifest, status: "added" }], {
      after: { name: "@example/core", version: "1.0.0" },
    }),
    /release metadata/
  );
});

test("changing the root publishing command requires the owner", async () => {
  assert.match(
    await review([{ filename: "package.json", status: "modified" }], {
      before: { scripts: { "release:gated": "old" } },
      after: { scripts: { "release:gated": "new" } },
    }),
    /release metadata/
  );
});

test("incomplete diffs fail closed", async () => {
  await assert.rejects(
    review([], { count: 1 }),
    /Incomplete changed-file metadata/
  );
});
