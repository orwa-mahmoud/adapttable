/**
 * The focused core entries, from the tarball a consumer installs.
 *
 * Same-install aliases are one function. A second installed copy is a
 * different instance: identity is not promised across versions. ESM and
 * CommonJS both resolve, and a type-only import typechecks.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { packedConsumer } from "./packed-consumers.mjs";

const SUBPATHS = ["engine", "grouping", "editing", "selection"];

/** A code-split barrel points at chunks; those chunks carry the maps. */
function assertChunkMaps(file, pattern, mapSuffix) {
  const text = readFileSync(file, "utf8");
  const seen = new Set();
  for (const match of text.matchAll(pattern)) {
    const specifier = match[1];
    if (seen.has(specifier)) continue;
    seen.add(specifier);
    const base = specifier.replace(/\.(?:js|cjs)$/, "").slice(2);
    const map = join(file, "..", `${base}${mapSuffix}`);
    assert.equal(existsSync(map), true, `${file} -> ${base}${mapSuffix}`);
  }
  assert.ok(seen.size > 0, file);
}

describe("focused core entries from a tarball", () => {
  const consumer = packedConsumer(["core"]);
  const root = join(consumer.dir, "node_modules/@adapttable/core");

  it("resolves ESM and CommonJS, and keeps same-install aliases identical", async () => {
    const main = await import(pathToFileURL(join(root, "dist/index.js")).href);
    const engine = await import(
      pathToFileURL(join(root, "dist/engine.js")).href
    );
    const grouping = await import(
      pathToFileURL(join(root, "dist/grouping.js")).href
    );
    const editing = await import(
      pathToFileURL(join(root, "dist/editing.js")).href
    );
    const selection = await import(
      pathToFileURL(join(root, "dist/selection.js")).href
    );
    assert.equal(engine.createTableEngine, main.createTableEngine);
    assert.equal(engine.createBasicTableEngine, main.createBasicTableEngine);
    assert.equal(grouping.buildGroupedFlatModel, main.buildGroupedFlatModel);
    assert.equal(editing.createCellEditSession, main.createCellEditSession);
    assert.equal(selection.createAllMatchingScope, main.createAllMatchingScope);
    assert.equal("createIncrementalView" in engine, false);

    const require = createRequire(join(consumer.dir, "package.json"));
    for (const subpath of SUBPATHS) {
      const loaded = require(`@adapttable/core/${subpath}`);
      assert.equal(typeof loaded, "object", subpath);
      assert.ok(Object.keys(loaded).length > 0, subpath);
    }
    assert.equal(
      require("@adapttable/core/engine").createTableEngine,
      require("@adapttable/core").createTableEngine
    );
  });

  it("does not share function identity across two installed copies", async () => {
    const nested = join(consumer.dir, "app/node_modules/@adapttable/core");
    cpSync(root, nested, { recursive: true });
    const manifest = JSON.parse(
      readFileSync(join(nested, "package.json"), "utf8")
    );
    manifest.version = "0.0.0-other";
    writeFileSync(join(nested, "package.json"), JSON.stringify(manifest));
    const installed = await import(
      pathToFileURL(join(root, "dist/engine.js")).href
    );
    const other = await import(
      pathToFileURL(join(nested, "dist/engine.js")).href
    );
    assert.notEqual(other.createTableEngine, installed.createTableEngine);
    assert.equal(typeof other.createTableEngine, "function");
  });

  it("ships sourcemaps, declarations and the documented runtime floor", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    );
    assert.equal(manifest.sideEffects, false);
    assert.equal(manifest.engines.node, ">=22.12.0");
    for (const subpath of [".", ...SUBPATHS.map((name) => `./${name}`)]) {
      assert.equal(
        manifest.exports[subpath].import.default.endsWith(".js"),
        true
      );
      assert.equal(
        manifest.exports[subpath].require.default.endsWith(".cjs"),
        true
      );
    }
    for (const name of SUBPATHS) {
      const dist = join(root, "dist");
      assert.equal(
        existsSync(join(dist, `${name}.d.ts`)),
        true,
        `${name}.d.ts`
      );
      assert.equal(
        existsSync(join(dist, `${name}.d.cts`)),
        true,
        `${name}.d.cts`
      );
      assert.equal(existsSync(join(dist, `${name}.css`)), false, `${name}.css`);
      assertChunkMaps(
        join(dist, `${name}.js`),
        /from "(\.\/[^"]+\.js)"/g,
        ".js.map"
      );
      assertChunkMaps(
        join(dist, `${name}.cjs`),
        /require\("(\.\/[^"]+\.cjs)"\)/g,
        ".cjs.map"
      );
      assertChunkMaps(
        join(dist, `${name}.d.ts`),
        /from "(\.\/[^"]+\.js)"/g,
        ".d.ts.map"
      );
    }
  });

  it("typechecks a type-only import of each new entry", () => {
    const source = [
      `import type { TableEngine } from "@adapttable/core/engine";`,
      `import type { GroupedFlatEntry } from "@adapttable/core/grouping";`,
      `import type { CellEditSession } from "@adapttable/core/editing";`,
      `import type { SelectionContribution } from "@adapttable/core/selection";`,
      `export type Probe = {`,
      `  engine?: TableEngine<{ id: string }>;`,
      `  group?: GroupedFlatEntry<{ id: string }>;`,
      `  edit?: CellEditSession<{ id: string }>;`,
      `  selection?: SelectionContribution;`,
      `};`,
      ``,
    ].join("\n");
    writeFileSync(join(consumer.dir, "probe.ts"), source);
    writeFileSync(
      join(consumer.dir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            module: "nodenext",
            moduleResolution: "nodenext",
            strict: true,
            noEmit: true,
            skipLibCheck: true,
          },
          files: ["probe.ts"],
        },
        null,
        2
      )
    );
    execFileSync(
      join(process.cwd(), "node_modules/.bin/tsc"),
      ["--project", join(consumer.dir, "tsconfig.json")],
      { stdio: "pipe" }
    );
    assert.equal(existsSync(join(consumer.dir, "probe.ts")), true);
  });

  after(() => {
    assert.equal(existsSync(consumer.dir), true);
    consumer.dispose();
  });
});
