import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { exportedNames, missingNames, NAMEABLE } from "./packed-names.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** An installed `@adapttable/<pkg>` maps to `packages/<dir>` in the tree. */
const DIRS = { core: "core", shadcn: "adapter-shadcn" };
const distOf = (pkg) => join(REPO_ROOT, "packages", DIRS[pkg], "dist");

/** The shape a rolled-up entry ends with: one long export block. */
const ROLLUP = `
type ColumnDef<TRow> = { key: string };
type ColumnDef$1<TRow> = { key: string };
declare function pivot(): void;
export { type ColumnDef, pivot, type PivotConfig, type ColumnDef$1 as InternalColumnDef };
`;

describe("exportedNames", () => {
  it("reads a rolled-up export block, with and without the type keyword", () => {
    const names = exportedNames(ROLLUP);
    assert.ok(names.has("ColumnDef"));
    assert.ok(names.has("pivot"));
    assert.ok(names.has("PivotConfig"));
  });

  it("credits a renamed specifier to the name a consumer writes", () => {
    const names = exportedNames(ROLLUP);
    assert.ok(names.has("InternalColumnDef"));
    assert.ok(!names.has("ColumnDef$1"));
  });

  it("reads a directly exported declaration", () => {
    const names = exportedNames(
      [
        "export declare function buildTableXlsx(): void;",
        "export interface ExportWriter {}",
        "export type PrintPageBreak = 'auto' | 'group';",
        "export declare abstract class Base {}",
      ].join("\n")
    );
    assert.deepEqual([...names].sort(), [
      "Base",
      "ExportWriter",
      "PrintPageBreak",
      "buildTableXlsx",
    ]);
  });

  it("does not credit a declaration that is never exported", () => {
    const names = exportedNames(
      "interface ColumnHeaderContext {}\ndeclare const hidden: number;\n"
    );
    assert.equal(names.size, 0);
  });
});

describe("missingNames", () => {
  it("says nothing is missing when every name is exported", () => {
    assert.deepEqual(missingNames(ROLLUP, ["ColumnDef", "PivotConfig"]), []);
  });

  it("reports a type the declaration bundler dropped", () => {
    assert.deepEqual(missingNames(ROLLUP, ["ColumnDef", "CellEditor"]), [
      "CellEditor",
    ]);
  });

  it("reports a type that survived only under a generated name", () => {
    // `ColumnDef$1` is in the file, but no consumer can write it. Asking for
    // the bare name must fail rather than match the duplicate.
    const dropped = "type BulkAction$1 = { key: string };\nexport {};\n";
    assert.deepEqual(missingNames(dropped, ["BulkAction"]), ["BulkAction"]);
  });
});

// The manifest is only worth as much as its agreement with the real build.
// Skipped rather than failed when dist is absent: `pnpm test:scripts` runs
// before `pnpm build` in the gate's order, and a missing artifact is not a
// finding about the code.
describe("the built declarations honour NAMEABLE", () => {
  for (const [pkg, entry, names] of NAMEABLE) {
    const dts = join(distOf(pkg), `${entry}.d.ts`);
    it(
      `${pkg}/${entry} names ${names.join(", ")}`,
      { skip: !existsSync(dts) },
      () => {
        assert.deepEqual(missingNames(readFileSync(dts, "utf8"), names), []);
      }
    );
  }

  const sparkline = join(distOf("core"), "sparkline.d.ts");
  it(
    "and the reader is strict enough to fail",
    { skip: !existsSync(sparkline) },
    () => {
      // `pivot` is the engine behind a different subpath, and `/sparkline` has
      // no business exporting it. A control that names a member type would not
      // hold any more: closing the member-type closure made every one of those
      // reachable from the entry that hands it back.
      assert.deepEqual(
        missingNames(readFileSync(sparkline, "utf8"), [
          "pivot",
          "useDataTable",
        ]),
        ["pivot", "useDataTable"]
      );
    }
  );
});
