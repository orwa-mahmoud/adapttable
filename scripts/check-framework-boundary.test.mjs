import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkNeutralEntry,
  checkSourceEngineModules,
  checkTransitiveGraph,
} from "./check-framework-boundary.mjs";
import { buildPkgDirByName } from "./module-graph.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEGATIVE = join(ROOT, "scripts", "boundary-fixtures", "negative");

describe("framework boundary checker", () => {
  it("rejects neutral → helper → React", () => {
    const violations = checkTransitiveGraph({
      entryFiles: [join(NEGATIVE, "neutral-via-helper.js")],
      pkgDirByName: buildPkgDirByName(),
      label: "planted neutral-via-helper",
    });
    assert.ok(
      violations.some((v) => /react/.test(v)),
      violations.join("\n")
    );
  });

  it("rejects dynamic React imports", () => {
    const violations = checkTransitiveGraph({
      entryFiles: [join(NEGATIVE, "dynamic-react.js")],
      pkgDirByName: buildPkgDirByName(),
      label: "planted dynamic-react",
    });
    assert.ok(
      violations.some((v) => /react/.test(v)),
      violations.join("\n")
    );
  });

  it("rejects React types in neutral declarations", () => {
    // Written here rather than checked in: a declaration file inside the
    // repo is real typed source, and this one is a planted defect — the
    // inline `import("react")` shape tsc emits when a React type leaks
    // into a neutral d.ts.
    const dir = mkdtempSync(join(tmpdir(), "adapttable-boundary-"));
    const file = join(dir, "react-type.d.ts");
    writeFileSync(
      file,
      'export type LeakedCell = import("react").ReactNode;\n'
    );
    try {
      const violations = checkTransitiveGraph({
        entryFiles: [file],
        pkgDirByName: buildPkgDirByName(),
        label: "planted react-type",
      });
      assert.ok(
        violations.some((v) => /React/.test(v)),
        violations.join("\n")
      );
      assert.ok(
        violations.some((v) => v.includes('import("react")')),
        violations.join("\n")
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags unresolved @adapttable/core/adapter from a neutral graph", () => {
    const violations = checkTransitiveGraph({
      entryFiles: [join(NEGATIVE, "missing-entry.js")],
      pkgDirByName: buildPkgDirByName(),
      label: "missing entry",
    });
    assert.ok(
      violations.some((v) => /unresolved|adapter/.test(v)),
      violations.join("\n")
    );
  });
});

function fixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-framework-boundary-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, source] of Object.entries(files)) {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, source);
  }
  return root;
}

describe("framework-neutral sources and shipped entries", () => {
  for (const spec of [
    "vue",
    "vue/server-renderer",
    "@vue/runtime-core",
    "@angular/core",
    "@angular/common",
    "@tanstack/vue-query",
    "@tanstack/angular-query-experimental",
    "@adapttable/vue/adapter",
    "@adapttable/angular/adapter",
    "@adapttable/react/adapter",
  ]) {
    it(`rejects source, transitive runtime and declaration leakage from ${spec}`, (t) => {
      const root = fixture(t, {
        "packages/shared/core/package.json": '{"name":"@adapttable/core"}',
        "packages/shared/core/src/index.ts": `import "${spec}";`,
        "index.js": 'export * from "./helper.js";',
        "helper.js": `export const load = () => import("${spec}");`,
        "index.d.ts": 'export type { Cell } from "./helper.js";',
        "helper.d.ts": `export type Cell = import("${spec}").Cell;`,
      });
      const source = checkSourceEngineModules({
        modules: ["core/src/index.ts"],
        root,
      });
      assert.deepEqual(source.missing, []);
      assert.deepEqual(source.violations, [
        { relative: "core/src/index.ts", banned: [spec] },
      ]);
      for (const entry of ["index.js", "index.d.ts"]) {
        const violations = checkTransitiveGraph({
          entryFiles: [join(root, entry)],
          pkgDirByName: new Map(),
          label: "neutral fixture",
        });
        assert.ok(
          violations.some((v) => v.includes(spec)),
          violations.join("\n")
        );
      }
    });
  }

  it("rejects a workspace binding import even when its runtime has no framework imports", (t) => {
    const root = fixture(t, {
      "index.js": 'export * from "@adapttable/vue";',
      "vue/package.json": '{"exports":{".":"./index.js"}}',
      "vue/index.js": 'export const framework = "vue";',
    });
    const violations = checkTransitiveGraph({
      entryFiles: [join(root, "index.js")],
      pkgDirByName: new Map([["@adapttable/vue", join(root, "vue")]]),
      label: "neutral fixture",
    });
    assert.ok(
      violations.some((v) => v.includes("@adapttable/vue")),
      violations.join("\n")
    );
  });

  it("checks every advertised runtime and declaration branch, including transitive declarations", (t) => {
    const root = fixture(t, {
      "package.json": JSON.stringify({
        exports: {
          ".": {
            import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
            require: {
              types: "./dist/index.d.cts",
              default: "./dist/index.cjs",
            },
          },
        },
      }),
      "dist/index.js": "export {};",
      "dist/index.cjs": 'module.exports = require("@angular/core");',
      "dist/index.d.ts": 'export type { Cell } from "./helper.js";',
      "dist/helper.d.ts": 'export type Cell = import("vue").VNode;',
      "dist/helper.js": "export {};",
      "dist/index.d.cts":
        'export type Cell = import("@vue/runtime-core").VNode;',
    });
    const violations = checkNeutralEntry(
      "@adapttable/neutral",
      ".",
      new Map([["@adapttable/neutral", root]])
    );
    for (const expected of ["@angular/core", "vue", "@vue/runtime-core"]) {
      assert.ok(
        violations.some((v) => v.includes(expected)),
        violations.join("\n")
      );
    }
  });

  it("reports a missing advertised declaration rather than silently passing runtime-only proof", (t) => {
    const root = fixture(t, {
      "package.json":
        '{"exports":{".":{"types":"./dist/index.d.ts","default":"./dist/index.js"}}}',
      "dist/index.js": "export {};",
    });
    const violations = checkNeutralEntry(
      "@adapttable/neutral",
      ".",
      new Map([["@adapttable/neutral", root]])
    );
    assert.ok(
      violations.some((v) => v.includes("missing") && v.includes("index.d.ts")),
      violations.join("\n")
    );
  });

  it("keeps framework-neutral dependencies and documentation examples admissible", (t) => {
    const root = fixture(t, {
      "packages/shared/core/package.json": '{"name":"@adapttable/core"}',
      "packages/shared/core/src/index.ts":
        '// import "vue";\nexport { Virtualizer } from "@tanstack/virtual-core";',
      "index.js": 'export { Virtualizer } from "@tanstack/virtual-core";',
    });
    assert.deepEqual(
      checkSourceEngineModules({ modules: ["core/src/index.ts"], root }),
      { missing: [], violations: [] }
    );
    assert.deepEqual(
      checkTransitiveGraph({
        entryFiles: [join(root, "index.js")],
        pkgDirByName: new Map(),
        label: "neutral fixture",
      }),
      []
    );
  });
});

describe("declaration syntax", () => {
  it("ignores framework names in explanatory comments and literal data", (t) => {
    const root = fixture(t, {
      "index.d.ts":
        '/** A ReactNode or import("vue").VNode is adapted by its binding. */\nexport type RenderingExample = "ReactElement";\nexport type Cell = string;',
    });
    assert.deepEqual(
      checkTransitiveGraph({
        entryFiles: [join(root, "index.d.ts")],
        pkgDirByName: new Map(),
        label: "neutral fixture",
      }),
      []
    );
  });

  it("still rejects unimported React identifiers in every declaration format", (t) => {
    const root = fixture(
      t,
      Object.fromEntries(
        ["ts", "mts", "cts"].map((extension) => [
          `index.d.${extension}`,
          "export type Cell = React.ReactNode;",
        ])
      )
    );
    for (const extension of ["ts", "mts", "cts"]) {
      const violations = checkTransitiveGraph({
        entryFiles: [join(root, `index.d.${extension}`)],
        pkgDirByName: new Map(),
        label: "neutral fixture",
      });
      assert.ok(
        violations.some((v) => v.includes("React.* type name")),
        violations.join("\n")
      );
    }
  });
});
