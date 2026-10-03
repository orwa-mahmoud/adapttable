/** Source semantics, complete package coverage and fail-closed worker proofs. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import { entriesOf, packageSurfaceGroups } from "./check-doc-surface.mjs";
import { extractPackageExports } from "./doc-surface-exports.mjs";
import { packageNames, resolvePackagePath } from "./packages.mjs";

const sortNames = (names) => names.sort((a, b) => a.localeCompare(b));
const GROUPS = [
  {
    pkg: "zeta",
    entries: [
      { label: "zeta", entry: "/fixture/zeta/src/index.ts" },
      { label: "zeta/feature", entry: "/fixture/zeta/src/feature.ts" },
    ],
  },
  { pkg: "styles", entries: [] },
  {
    pkg: "alpha",
    entries: [{ label: "alpha", entry: "/fixture/alpha/src/index.ts" }],
  },
];

function outputFor(group, names = ["Exported"]) {
  return {
    pkg: group.pkg,
    entries: group.entries.map((entry) => ({ ...entry, names })),
  };
}

function success(output) {
  return {
    status: 0,
    signal: null,
    stdout: JSON.stringify(output),
    stderr: "",
  };
}

function temporaryRoot(context) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-doc-exports-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(root, file, source) {
  const path = join(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, source);
  return path;
}

function sourceFixture(context) {
  const root = temporaryRoot(context);
  write(
    root,
    "definitions.ts",
    `export const zebra = 1;
export function makeThing() { return zebra; }
export class ValueClass {}
export interface Shape { size: number; }
export type Choice = "a" | "b";
export default zebra;
const hidden = 2;
`
  );
  write(root, "barrel.ts", 'export * from "./definitions.js";');
  write(root, "types.ts", "export interface OnlyType { label: string; }");
  const index = write(
    root,
    "index.ts",
    `export * from "./barrel.js";
export { zebra as Alias } from "./definitions.js";
export type { Shape as ShapeAlias } from "./definitions.js";
export * as nested from "./definitions.js";
export { default } from "./definitions.js";
`
  );
  const feature = write(
    root,
    "feature.ts",
    `export { makeThing as feature } from "./definitions.js";
export type * from "./types.js";
`
  );
  const component = write(
    root,
    "component.tsx",
    "export const Component = () => <div />;"
  );
  const empty = write(root, "empty.ts", "export default 1;");
  return [
    {
      pkg: "zeta",
      entries: [
        { label: "zeta", entry: index },
        { label: "zeta/feature", entry: feature },
      ],
    },
    {
      pkg: "alpha",
      entries: [{ label: "alpha", entry: component }],
    },
    {
      pkg: "empty",
      entries: [{ label: "empty", entry: empty }],
    },
  ];
}

describe("docs source export workers", () => {
  it("does not load TypeScript in the audit parent", () => {
    const require = createRequire(import.meta.url);
    assert.equal(require.cache[require.resolve("typescript")], undefined);
  });

  it("preserves star re-exports, aliases, type-only exports and TSX", (context) => {
    const groups = sourceFixture(context);
    const split = extractPackageExports(groups);
    assert.deepEqual(split, [
      {
        pkg: "zeta",
        names: sortNames([
          "Alias",
          "Choice",
          "makeThing",
          "nested",
          "Shape",
          "ShapeAlias",
          "ValueClass",
          "zebra",
        ]),
      },
      { pkg: "zeta/feature", names: sortNames(["feature", "OnlyType"]) },
      { pkg: "alpha", names: ["Component"] },
      { pkg: "empty", names: [] },
    ]);
    // The former all-entry program and the serial package programs agree.
    assert.deepEqual(
      extractPackageExports([
        { pkg: "all", entries: groups.flatMap((group) => group.entries) },
      ]),
      split
    );
  });

  it("covers all repository packages and source entries in their original order", () => {
    const groups = packageSurfaceGroups();
    assert.deepEqual(
      groups.map((group) => group.pkg),
      packageNames()
    );
    for (const group of groups) {
      assert.deepEqual(
        group.entries,
        entriesOf(group.pkg).map(({ label, entry }) => ({
          label,
          entry: resolvePackagePath(entry),
        }))
      );
    }
  });

  it("includes every fixture framework, private package and advertised subpath", (context) => {
    const root = temporaryRoot(context);
    for (const [framework, pkg] of [
      ["shared", "zeta"],
      ["react", "beta"],
      ["angular", "alpha"],
    ]) {
      write(
        root,
        `packages/${framework}/${pkg}/package.json`,
        JSON.stringify({
          private: pkg === "beta",
          exports: {
            "./later": "./dist/second.js",
            ".": "./dist/index.js",
            "./styles.css": "./dist/styles.css",
          },
        })
      );
      write(root, `packages/${framework}/${pkg}/src/index.ts`, "export {};");
      write(root, `packages/${framework}/${pkg}/src/second.ts`, "export {};");
    }
    const groups = packageSurfaceGroups(root);
    assert.deepEqual(
      groups.map((group) => group.pkg),
      ["alpha", "beta", "zeta"]
    );
    assert.deepEqual(
      groups.flatMap((group) => group.entries.map((entry) => entry.label)),
      ["alpha", "alpha/later", "beta", "beta/later", "zeta", "zeta/later"]
    );
    assert.ok(
      groups.every((group) => group.entries[1].entry.endsWith("second.ts"))
    );
  });

  it("waits for each worker to exit before starting the next, including empty groups", (context) => {
    const root = temporaryRoot(context);
    const worker = write(
      root,
      "worker.mjs",
      `import { appendFileSync, readFileSync } from "node:fs";
const group = JSON.parse(readFileSync(0, "utf8"));
const events = process.argv[2];
appendFileSync(events, group.pkg + ":start\\n");
process.stdout.write(JSON.stringify({
  pkg: group.pkg,
  entries: group.entries.map((entry) => ({ ...entry, names: ["Exported"] })),
}));
setTimeout(() => appendFileSync(events, group.pkg + ":end\\n"), 20);
`
    );
    const calls = [];
    const events = join(root, "events");
    const actual = extractPackageExports(GROUPS, (command, args, options) => {
      assert.equal(command, process.execPath);
      assert.equal(args.length, 1);
      assert.ok(args[0].endsWith("doc-surface-exports.mjs"));
      calls.push(JSON.parse(options.input));
      return spawnSync(command, [worker, events], options);
    });
    assert.deepEqual(calls, GROUPS);
    assert.deepEqual(
      actual,
      GROUPS.flatMap((group) =>
        group.entries.map(({ label }) => ({ pkg: label, names: ["Exported"] }))
      )
    );
    // Read after all workers exit: early results must not release the slot.
    assert.equal(
      readFileSync(events, "utf8"),
      GROUPS.map(({ pkg }) => `${pkg}:start\n${pkg}:end\n`).join("")
    );
  });

  it("returns no surfaces and starts no workers when there are no groups", () => {
    assert.deepEqual(
      extractPackageExports([], () => assert.fail("unexpected worker")),
      []
    );
  });

  it("propagates missing source and non-module source errors from real workers", (context) => {
    const root = temporaryRoot(context);
    const nonModule = write(root, "script.ts", "const privateValue = 1;");
    for (const [entry, message] of [
      [join(root, "missing.ts"), /Missing entry/],
      [nonModule, /No module symbol/],
    ]) {
      assert.throws(
        () =>
          extractPackageExports([
            { pkg: "broken", entries: [{ label: "broken", entry }] },
          ]),
        message
      );
    }
  });
});

describe("docs source export worker failures", () => {
  for (const [name, failure, message] of [
    ["spawn error", { error: new Error("spawn denied") }, /spawn denied/],
    ["buffer overflow", { error: new Error("ENOBUFS") }, /ENOBUFS/],
    [
      "nonzero exit",
      { status: 7, stderr: "checker failed" },
      /exit 7.*checker failed/,
    ],
    ["signal", { status: null, signal: "SIGKILL" }, /signal SIGKILL/],
    ["unknown exit", { status: null }, /exit unknown/],
  ]) {
    it(`rejects ${name} even with valid-looking output and stops the queue`, () => {
      let calls = 0;
      assert.throws(
        () =>
          extractPackageExports(GROUPS, () => {
            calls++;
            return { ...success(outputFor(GROUPS[0])), ...failure };
          }),
        message
      );
      assert.equal(calls, 1);
    });
  }

  it("propagates thrown worker errors", () => {
    assert.throws(
      () =>
        extractPackageExports(GROUPS, () => {
          throw new Error("could not start worker");
        }),
      /could not start worker/
    );
  });

  const output = outputFor(GROUPS[0]);
  for (const [name, stdout] of [
    ["empty stdout", ""],
    ["non-JSON stdout", "worker finished"],
    ["trailing diagnostics", `${JSON.stringify(output)}\nwarning`],
    ["null payload", "null"],
    ["wrong package", JSON.stringify({ ...output, pkg: "other" })],
    [
      "missing entry",
      JSON.stringify({ ...output, entries: output.entries.slice(1) }),
    ],
    [
      "extra entry",
      JSON.stringify({
        ...output,
        entries: [...output.entries, output.entries[0]],
      }),
    ],
    [
      "reordered entries",
      JSON.stringify({ ...output, entries: [...output.entries].reverse() }),
    ],
    ["extra payload field", JSON.stringify({ ...output, skipped: [] })],
  ]) {
    it(`rejects ${name} and stops the queue`, () => {
      let calls = 0;
      assert.throws(
        () =>
          extractPackageExports(GROUPS, () => {
            calls++;
            return { ...success(output), stdout };
          }),
        /returned invalid/
      );
      assert.equal(calls, 1);
    });
  }

  for (const [name, patch] of [
    ["wrong label", { label: "other" }],
    ["wrong source", { entry: "/dist/index.js" }],
    ["missing names", { names: undefined }],
    ["non-array names", { names: "Exported" }],
    ["non-string name", { names: [1] }],
    ["default export", { names: ["default"] }],
    ["duplicate names", { names: ["Exported", "Exported"] }],
    ["unsorted names", { names: ["Zebra", "Alpha"] }],
    ["extra entry field", { skipped: true }],
  ]) {
    it(`rejects ${name} rather than reporting a successful audit`, () => {
      const invalid = {
        ...output,
        entries: [{ ...output.entries[0], ...patch }, output.entries[1]],
      };
      assert.throws(
        () => extractPackageExports(GROUPS, () => success(invalid)),
        /invalid or incomplete export data/
      );
    });
  }
});
