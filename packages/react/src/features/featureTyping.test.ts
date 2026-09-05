/**
 * What the documented `features` array is allowed to look like.
 *
 * Every example in the docs is written without type arguments —
 * `features={[grouping("team"), virtualize(), rowReorder(fn)]}` — and for most
 * of v2 that did not compile: a factory with nothing row-shaped to infer from
 * resolved `TRow` to `unknown`, and `TableFeature<unknown>` was not a
 * `TableFeature<Row>`, so every example needed a `grouping("team")`
 * annotation the docs never showed.
 *
 * The fix is variance, not looseness: the phantom row markers are read
 * contravariantly, so a feature that says nothing about rows fits every table
 * while one built for the WRONG row still does not.
 *
 * These assertions are ASSIGNMENTS, because an assignment is what a caller
 * writes. A conditional type is not a stand-in — `[A] extends [B]` disagrees
 * with assignability here in both directions — and the compile-failure half of
 * the contract lives in `scripts/check-feature-typing.mjs`, which runs the real
 * compiler over a fixture and requires the diagnostic to name the feature.
 */
import { describe, expect, it } from "vitest";

import { columnMenu, multiSort } from "./factories";
import { grouping } from "./grouping";
import { rowReorder } from "./row-reorder";
import type { StaticTableFeature, TableFeature } from "./tableFeature";
import { virtualize } from "./virtualize";

interface Row {
  id: string;
  team: string;
}
interface Other {
  sku: number;
}

describe("a feature that says nothing about rows fits any table", () => {
  it("is the type the row-independent factories return", () => {
    const composed: readonly StaticTableFeature[] = [
      columnMenu(),
      multiSort(),
      virtualize(),
    ];
    expect(composed.map((feature) => feature.id)).toEqual([
      "column-menu",
      "multi-sort",
      "virtualize",
    ]);
  });

  it("composes into a table of any row type", () => {
    const intoRow: readonly TableFeature<Row>[] = [columnMenu(), virtualize()];
    const intoOther: readonly TableFeature<Other>[] = [
      columnMenu(),
      virtualize(),
    ];
    expect([intoRow.length, intoOther.length]).toEqual([2, 2]);
  });
});

describe("the documented examples compile with no type arguments", () => {
  it("takes grouping by key, virtualization and a row-aware handler together", () => {
    const features: readonly TableFeature<Row>[] = [
      grouping("team"),
      virtualize(),
      rowReorder(() => undefined),
    ];
    expect(features).toHaveLength(3);
  });

  it("keeps a row-aware factory's own row type", () => {
    // `editing`-shaped: the callback names the row, so the feature is pinned
    // to it and the compiler still has something to check.
    const forRow: TableFeature<Row> = {
      id: "pinned",
      apply: () => ({ marker: true }),
    };
    const alsoForRow: readonly TableFeature<Row>[] = [forRow, columnMenu()];
    expect(alsoForRow).toHaveLength(2);
  });
});
