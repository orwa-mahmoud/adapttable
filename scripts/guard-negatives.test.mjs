/**
 * Prove the repository's own guards still fail when they should.
 *
 * A guard can stay green while verifying nothing. One that derives a
 * package's files from a subpath NAME rather than its exports map silently
 * skips a module whose filename differs from its subpath; one that reads `dist`
 * from a stage scheduled before the build audits the previous build's output.
 * That decay is invisible in a green run, because a guard that reads nothing
 * reports nothing wrong.
 *
 * So each guard here is aimed at a broken fixture and must reject it. The
 * fixtures are built in a temporary directory and removed afterwards — never a
 * defect planted in the working repository, which would be a real defect for as
 * long as the test took to run and a lie if it crashed halfway.
 *
 * `bundle-budget.mjs` already works this way (`provePlantedLeak`); this is that
 * pattern applied to the guards below.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { entrypoints } from "./api-entrypoints.mjs";
import { entriesOf } from "./check-doc-surface.mjs";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const temps = [];

/** A throwaway repository root. Removed when this file finishes. */
function tempRoot() {
  const dir = mkdtempSync(join(tmpdir(), "adapttable-guard-"));
  temps.push(dir);
  return dir;
}

/** Write one fixture package with the manifest it is given. */
function fixturePackage(root, name, manifest, files = {}) {
  const dir = join(root, "packages", "shared", name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), JSON.stringify(manifest, null, 2));
  for (const [relative, body] of Object.entries(files)) {
    const target = join(dir, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
  return dir;
}

after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

describe("check-doc-surface reads the exports map, not the subpath name", () => {
  it("finds a module whose filename differs from the subpath that exports it", () => {
    // The subpath `./ag-ui` is served by `agui.ts`, not `ag-ui.ts`; a guard that
    // derives the filename from the subpath crashes before auditing anything.
    const root = tempRoot();
    fixturePackage(
      root,
      "ai",
      {
        name: "@adapttable/ai",
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
          "./ag-ui": { types: "./dist/agui.d.ts", import: "./dist/agui.js" },
        },
      },
      { "src/index.ts": "export {};\n", "src/agui.ts": "export {};\n" }
    );

    const entries = entriesOf("ai", root);
    const agui = entries.find((entry) => entry.label === "ai/ag-ui");

    assert.ok(agui, "the ./ag-ui subpath was dropped entirely");
    // Named from the target the manifest gives, never from the key.
    assert.match(agui.entry, /ai[/\\]src[/\\]agui\.ts$/);
    assert.doesNotMatch(agui.entry, /ag-ui/);
  });

  it("does not quietly skip a subpath whose source is missing", () => {
    // A guard that resolves to a path nothing wrote must still name the entry.
    // Reporting nothing here is how it stayed green over a package it could
    // not read.
    const root = tempRoot();
    fixturePackage(
      root,
      "ai",
      {
        name: "@adapttable/ai",
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
          "./gone": { types: "./dist/gone.d.ts", import: "./dist/gone.js" },
        },
      },
      { "src/index.ts": "export {};\n" }
    );

    const labels = entriesOf("ai", root).map((entry) => entry.label);
    assert.deepEqual(labels.sort(), ["ai", "ai/gone"]);
  });
});

describe("check-doc-surface still runs as the command", () => {
  it("audits when invoked, rather than importing to nothing", () => {
    // `main()` is now behind an `import.meta.url === argv[1]` guard so a test
    // can import `entriesOf` without running the whole audit. That guard is
    // itself the failure mode this file exists for: if the comparison ever
    // stops matching, `pnpm check:docsurface` does nothing and says nothing.
    const result = spawnSync(
      process.execPath,
      [join(SCRIPTS, "check-doc-surface.mjs"), "--report"],
      { cwd: join(SCRIPTS, ".."), encoding: "utf8" }
    );

    assert.match(
      `${result.stdout}${result.stderr}`,
      /exports/,
      "the command produced no audit — the main guard no longer matches"
    );
  });
});

describe("api-entrypoints derives from each manifest", () => {
  it("covers a subpath no naming convention would have guessed", () => {
    const root = tempRoot();
    fixturePackage(root, "ai", {
      name: "@adapttable/ai",
      exports: {
        ".": { types: "./dist/index.d.ts" },
        "./ag-ui": { types: "./dist/agui.d.ts" },
      },
    });

    const entries = entrypoints(root);
    const agui = entries.find((entry) => entry.subpath === "./ag-ui");

    assert.ok(agui, "the ./ag-ui entry point was not derived");
    // One report per subpath, and the entry follows the manifest's own types
    // target rather than a path built from the key.
    assert.equal(agui.report, "ai-ag-ui.api.md");
    assert.match(agui.entry, /dist[/\\]agui\.d\.ts$/);
  });

  it("marks a private package unpublished instead of dropping it", () => {
    const root = tempRoot();
    fixturePackage(root, "bootstrap", {
      name: "@adapttable/bootstrap",
      private: true,
      exports: { ".": { types: "./dist/index.d.ts" } },
    });

    const entries = entrypoints(root);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].published, false);
  });
});

describe("smoke-dist fails on what it cannot read", () => {
  const run = (cwd) =>
    spawnSync(process.execPath, [join(SCRIPTS, "smoke-dist.mjs")], {
      cwd,
      encoding: "utf8",
    });

  it("rejects an exports target the build never emitted", () => {
    // The failure it exists to catch: a path in the manifest with no file
    // behind it. Packing that ships a package nobody can import.
    const root = tempRoot();
    fixturePackage(
      root,
      "core",
      {
        name: "@adapttable/core",
        exports: {
          ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        },
      },
      { "dist/index.d.ts": "export {};\n" }
    );

    const result = run(root);
    assert.notEqual(
      result.status,
      0,
      "a missing exports target was reported as clean"
    );
    assert.match(`${result.stdout}${result.stderr}`, /index\.js/);
  });

  it("names an absent dist rather than passing over it", () => {
    // Stale or absent input is the failure mode that hides in a green run: a
    // guard with nothing to read reports nothing wrong. It must say so.
    const root = tempRoot();
    fixturePackage(root, "core", {
      name: "@adapttable/core",
      exports: {
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
      },
    });

    const result = run(root);
    assert.notEqual(result.status, 0, "an unbuilt package was reported clean");
  });
});
