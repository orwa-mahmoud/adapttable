import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import { importsOf, resolveImport, walkGraph } from "./module-graph.mjs";

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-module-graph-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, source] of Object.entries(files)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, source);
  }
  return root;
}

describe("declaration module graphs", () => {
  it("follows declaration re-exports and import types through JavaScript specifiers", (t) => {
    const root = fixture(t, {
      "index.d.ts": 'export type { Cell } from "./helper.js";',
      "helper.d.ts": 'export type Cell = import("./leaf.js").Cell;',
      "leaf.d.ts": 'export type Cell = import("vue").VNode;',
      "helper.js": "export {};",
      "leaf.js": "export {};",
    });
    const graph = walkGraph([join(root, "index.d.ts")], new Map());
    assert.deepEqual(
      [...graph.files].sort(),
      ["index.d.ts", "helper.d.ts", "leaf.d.ts"]
        .map((file) => join(root, file))
        .sort()
    );
    assert.deepEqual([...graph.externals], ["vue"]);
    assert.deepEqual([...graph.unresolved], []);
  });

  it("resolves declaration formats without changing runtime resolution", (t) => {
    const root = fixture(t, {
      "esm.d.mts": "export {};",
      "cjs.d.cts": "export {};",
      "plain.d.ts": "export {};",
      "plain.js": "export {};",
    });
    for (const [specifier, expected] of [
      ["./esm.mjs", "esm.d.mts"],
      ["./cjs.cjs", "cjs.d.cts"],
      ["./plain.js", "plain.d.ts"],
      ["./plain", "plain.d.ts"],
    ]) {
      assert.deepEqual(
        resolveImport(specifier, join(root, "index.d.ts"), new Map()),
        { file: join(root, expected) }
      );
    }
    assert.deepEqual(
      resolveImport("./plain.js", join(root, "index.js"), new Map()),
      { file: join(root, "plain.js") }
    );
  });

  it("selects workspace package declarations for import and require conditions", (t) => {
    const root = fixture(t, {
      "dependency/package.json": JSON.stringify({
        exports: {
          ".": {
            import: {
              types: "./dist/import.d.ts",
              default: "./dist/import.js",
            },
            require: {
              types: "./dist/require.d.cts",
              default: "./dist/require.cjs",
            },
          },
        },
      }),
    });
    const packages = new Map([
      ["@adapttable/dependency", join(root, "dependency")],
    ]);
    for (const [from, target] of [
      ["index.d.ts", "import.d.ts"],
      ["index.d.cts", "require.d.cts"],
      ["index.js", "import.js"],
      ["index.cjs", "require.cjs"],
    ]) {
      assert.deepEqual(
        resolveImport("@adapttable/dependency", join(root, from), packages),
        { file: join(root, "dependency/dist", target) }
      );
    }
  });

  it("includes triple-slash type and local references in declarations", (t) => {
    const root = fixture(t, {
      "index.d.ts":
        '/// <reference types="vue" />\n/// <reference path="helper.d.ts" />\nexport {};',
      "helper.d.ts":
        'export type Cell = import("@angular/core").Signal<string>;',
    });
    assert.deepEqual(importsOf(join(root, "index.d.ts")).sort(), [
      "./helper.d.ts",
      "vue",
    ]);
    const graph = walkGraph([join(root, "index.d.ts")], new Map());
    assert.deepEqual([...graph.externals].sort(), ["@angular/core", "vue"]);
  });
});
