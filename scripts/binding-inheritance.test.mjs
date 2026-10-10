import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { inheritedBindingSources } from "./binding-inheritance.mjs";

const roots = [];
after(() =>
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }))
);

function write(root, file, source) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), source);
}

const BASE = "export class Shell { view = table.rowAttrs(row, index); }";
const BARREL = 'export { Shell as PublicShell } from "./layout/shell";';
const WRAPPER = `import { PublicShell as Base } from "@adapttable/angular/adapter";
export class Table extends Base {}`;

function fixture({
  framework = "angular",
  wrapper = WRAPPER,
  exports = { ".": "./index.js", "./adapter": "./adapter.js" },
  files = {},
} = {}) {
  const root = mkdtempSync(join(tmpdir(), "binding-inheritance-"));
  roots.push(root);
  const binding = `packages/${framework}/${framework}`;
  for (const [file, source] of Object.entries({
    "package.json": JSON.stringify({
      name: `@adapttable/${framework}`,
      exports,
    }),
    "ng-package.json": JSON.stringify({ lib: { entryFile: "src/index.ts" } }),
    "src/index.ts": BARREL,
    "src/adapter.ts": BARREL,
    "src/layout/shell.ts": BASE,
    "adapter/ng-package.json": JSON.stringify({
      lib: { entryFile: "../src/adapter.ts" },
    }),
    ...files,
  })) {
    if (source !== undefined) write(root, `${binding}/${file}`, source);
  }
  const file = join(root, "table.ts");
  write(root, "table.ts", wrapper);
  return {
    root,
    file,
    framework,
    base: join(root, binding, "src/layout/shell.ts"),
  };
}

function inherited(options) {
  const { file, framework, root } = options;
  return inheritedBindingSources(file, framework, root);
}

describe("binding inheritance public entry routing", () => {
  for (const entry of ["", "/adapter", "/features", "/pivot"]) {
    it(`follows named runtime aliases through the declared Angular ${entry || "root"} entry`, () => {
      const subpath = entry.slice(1);
      const options = fixture({
        wrapper: WRAPPER.replace("/adapter", entry),
        exports: { ".": "./index.js", [`./${subpath}`]: "./entry.js" },
        files: subpath
          ? {
              [`${subpath}/ng-package.json`]: JSON.stringify({
                lib: { entryFile: "../src/adapter.ts" },
              }),
              [`${subpath}/index.ts`]: "export class Decoy {}",
            }
          : {},
      });
      assert.deepEqual(inherited(options), [
        { file: options.base, source: BASE },
      ]);
    });
  }

  it("uses the configured root entry and retains the old root fixture fallback", () => {
    for (const files of [
      {
        "ng-package.json": undefined,
        "package.json": '{"name":"@adapttable/angular"}',
      },
      {
        "ng-package.json": JSON.stringify({
          lib: { entryFile: "src/adapter.ts" },
        }),
        "src/index.ts": "export {};",
      },
    ]) {
      const options = fixture({
        wrapper: WRAPPER.replace("/adapter", ""),
        files,
      });
      assert.deepEqual(inherited(options), [
        { file: options.base, source: BASE },
      ]);
    }
  });

  for (const [name, options] of [
    ["an unused import", { wrapper: WRAPPER.replace(" extends Base", "") }],
    [
      "an implements relationship",
      { wrapper: WRAPPER.replace("extends Base", "implements Base") },
    ],
    [
      "a different base",
      { wrapper: WRAPPER.replace("extends Base", "extends Other") },
    ],
    [
      "a type-only import declaration",
      { wrapper: WRAPPER.replace("import {", "import type {") },
    ],
    [
      "a type-only named import",
      { wrapper: WRAPPER.replace("{ PublicShell", "{ type PublicShell") },
    ],
    ["an undeclared secondary entry", { exports: { ".": "./index.js" } }],
    [
      "a blocked secondary export",
      { exports: { ".": "./index.js", "./adapter": null } },
    ],
    [
      "a private source import",
      { wrapper: WRAPPER.replace("/adapter", "/src/adapter") },
    ],
    [
      "a lookalike package",
      {
        wrapper: WRAPPER.replace(
          "@adapttable/angular/adapter",
          "@adapttable/angular-other/adapter"
        ),
      },
    ],
    [
      "an unconfigured declared entry",
      { files: { "adapter/ng-package.json": "{}" } },
    ],
    [
      "an entryFile outside its binding",
      {
        files: {
          "adapter/ng-package.json": JSON.stringify({
            lib: { entryFile: "../../outside.ts" },
          }),
          "../outside.ts": "export class PublicShell {}",
        },
      },
    ],
    [
      "a named type-only reexport",
      {
        files: {
          "src/adapter.ts": BARREL.replace("export {", "export type {"),
        },
      },
    ],
    [
      "a type-only reexport specifier",
      {
        files: { "src/adapter.ts": BARREL.replace("{ Shell", "{ type Shell") },
      },
    ],
    [
      "a type-only star reexport",
      {
        files: {
          "src/adapter.ts": 'export type * from "./runtime";',
          "src/runtime.ts": BARREL,
        },
      },
    ],
    [
      "a transitive type-only reexport",
      {
        files: {
          "src/adapter.ts": 'export * from "./types";',
          "src/types.ts": BARREL.replace("export {", "export type {"),
        },
      },
    ],
  ]) {
    it(`rejects ${name}`, () =>
      assert.deepEqual(inherited(fixture(options)), []));
  }

  it("preserves React and Vue root-only named class inheritance", () => {
    for (const framework of ["react", "vue"]) {
      const wrapper = WRAPPER.replace("angular/adapter", framework);
      const options = fixture({ framework, wrapper });
      assert.deepEqual(inherited(options), [
        { file: options.base, source: BASE },
      ]);
      assert.deepEqual(
        inherited(
          fixture({
            framework,
            wrapper: wrapper.replace(framework, `${framework}/adapter`),
          })
        ),
        []
      );
    }
  });
});
