import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { removedPathProblems } from "./check-removed-paths.mjs";
import { REPO_ROOT } from "./packages.mjs";

const dir = mkdtempSync(join(tmpdir(), "removed-paths-"));
after(() => rmSync(dir, { recursive: true, force: true }));

function write(root, path, text) {
  const file = join(root, path);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, text);
}

describe("removed paths", () => {
  it("accepts the repo as it stands", () => {
    assert.deepEqual(removedPathProblems(REPO_ROOT), []);
  });

  it("accepts a binding /features entry and a report that never names a removed export", () => {
    const clean = join(dir, "clean");
    write(
      clean,
      "packages/react/react/package.json",
      JSON.stringify({
        name: "@adapttable/react",
        exports: { ".": "./dist/index.js", "./features": "./dist/features.js" },
      })
    );
    write(clean, "etc/core.api.md", "export function aggregate() {}\n");
    write(
      clean,
      "packages/shared/core/src/index.ts",
      "export function aggregate() {}\n"
    );
    assert.deepEqual(removedPathProblems(clean), []);
  });

  it("rejects a kit /features barrel, a /export-csv entry, a deprecated tag and a removed name", () => {
    const planted = join(dir, "planted");
    write(
      planted,
      "packages/react/adapter-mui/package.json",
      JSON.stringify({
        name: "@adapttable/mui",
        exports: {
          ".": "./dist/index.js",
          "./features": "./dist/features.js",
          "./export-csv": "./dist/export-csv.js",
        },
      })
    );
    write(
      planted,
      "packages/shared/core/src/old.ts",
      "/** @deprecated use the feature */\nexport const sortRows = 1;\n"
    );
    write(
      planted,
      "etc/server.api.md",
      "export function splitFilterValues() {}\n"
    );
    const problems = removedPathProblems(planted);
    assert.ok(
      problems.some((problem) =>
        problem.includes("@adapttable/mui publishes ./features")
      ),
      problems.join("\n")
    );
    assert.ok(
      problems.some((problem) => problem.includes("./export-csv")),
      problems.join("\n")
    );
    assert.ok(
      problems.some((problem) => problem.includes("@deprecated")),
      problems.join("\n")
    );
    assert.ok(
      problems.some((problem) => problem.includes("splitFilterValues")),
      problems.join("\n")
    );
  });
});
