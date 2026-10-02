import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { entrySource, featureEntryProblems } from "./feature-entry-source.mjs";
import { REPO_ROOT } from "./packages.mjs";

const roots = [];
after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

function fixture(group, manifest, files) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-feature-source-"));
  roots.push(root);
  const dir = join(root, "packages", group, "adapter-fixture");
  for (const [file, body] of Object.entries({
    "package.json": JSON.stringify(manifest),
    ...files,
  })) {
    const path = join(dir, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
  }
  return { root, dir };
}

function angularFixture(files = {}) {
  return fixture(
    "angular",
    {
      name: "@adapttable/fixture",
      exports: {
        ".": { default: "./dist/fesm2022/root.mjs" },
        "./features": { default: "./dist/fesm2022/features.mjs" },
        "./features/navigation": {
          default: "./dist/fesm2022/arbitrary-bundle-name.mjs",
        },
      },
    },
    {
      "ng-package.json": JSON.stringify({
        lib: { entryFile: "src/public.ts" },
      }),
      "src/public.ts": "export const AdaptDataTable = {};\n",
      "features/ng-package.json": JSON.stringify({
        lib: { entryFile: "index.ts" },
      }),
      "features/index.ts":
        'export { cellNavigation } from "@adapttable/fixture/features/navigation";\n',
      "features/navigation/ng-package.json": JSON.stringify({
        lib: { entryFile: "entry.ts" },
      }),
      "features/navigation/entry.ts": "export const cellNavigation = {};\n",
      ...files,
    }
  );
}

describe("feature entry source resolution", () => {
  it("reads the configured Angular root source instead of guessing index.ts", () => {
    const { root, dir } = angularFixture();
    assert.equal(
      entrySource("@adapttable/fixture", root),
      join(dir, "src/public.ts")
    );
  });

  it("follows a nested Angular secondary entry rather than its FESM filename", () => {
    const { root, dir } = angularFixture();
    assert.equal(
      entrySource("@adapttable/fixture/features/navigation", root),
      join(dir, "features/navigation/entry.ts")
    );
  });

  it("rejects a missing configured source even when a guessed fallback exists", () => {
    const { root } = angularFixture({
      "features/navigation/ng-package.json": JSON.stringify({
        lib: { entryFile: "missing.ts" },
      }),
      "src/features/navigation.ts": "export const cellNavigation = {};\n",
    });
    assert.equal(
      entrySource("@adapttable/fixture/features/navigation", root),
      undefined
    );
  });

  it("does not treat a source without a public export as an entry", () => {
    const { root } = angularFixture({
      "private/ng-package.json": JSON.stringify({
        lib: { entryFile: "index.ts" },
      }),
      "private/index.ts": "export const hidden = {};\n",
    });
    assert.equal(entrySource("@adapttable/fixture/private", root), undefined);
  });

  it("rejects an Angular secondary entry with no ng-packagr source configuration", () => {
    const { root } = angularFixture({
      "features/navigation/ng-package.json": "{}",
    });
    assert.equal(
      entrySource("@adapttable/fixture/features/navigation", root),
      undefined
    );
  });

  it("uses the non-Angular export target when the subpath and filename differ", () => {
    const { root, dir } = fixture(
      "react",
      {
        name: "@adapttable/fixture",
        exports: { "./navigation": { import: "./dist/features/grid.js" } },
      },
      { "src/features/grid.tsx": "export const cellNavigation = {};\n" }
    );
    assert.equal(
      entrySource("@adapttable/fixture/navigation", root),
      join(dir, "src/features/grid.tsx")
    );
  });

  it("resolves declaration-only exports without retaining the .d suffix", () => {
    const { root, dir } = fixture(
      "shared",
      {
        name: "@adapttable/fixture",
        exports: { ".": { types: "./dist/index.d.ts" } },
      },
      { "src/index.ts": "export const value = {};\n" }
    );
    assert.equal(
      entrySource("@adapttable/fixture", root),
      join(dir, "src/index.ts")
    );
  });

  it("checks an Angular factory at its own canonical secondary entry", () => {
    const { root } = angularFixture();
    assert.deepEqual(
      featureEntryProblems(
        "@adapttable/fixture",
        {
          cellNavigation: { subpath: "react-only-path" },
        },
        root
      ),
      []
    );
  });

  it("rejects a missing Angular factory without accepting the secondary entry alone", () => {
    const { root } = angularFixture({
      "features/navigation/entry.ts": "export const anotherFeature = {};\n",
    });
    assert.deepEqual(
      featureEntryProblems(
        "@adapttable/fixture",
        {
          cellNavigation: { subpath: "react-only-path" },
        },
        root
      ),
      [
        "feature classification: @adapttable/fixture/features/navigation does not export cellNavigation",
      ]
    );
  });

  it("keeps the inventory check active across all published kit entries", () => {
    const result = spawnSync(
      process.execPath,
      [join(REPO_ROOT, "scripts/check-feature-classification.mjs")],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
      }
    );
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    assert.match(
      result.stdout,
      /feature classification.*every module, prop and signature reconciled/
    );
  });
});
