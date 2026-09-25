/**
 * `@adapttable/core/query` — the narrow door, not a second room.
 *
 * The entry exists so a backend can decode a shared link without loading a
 * table, and the way it earns that is by exporting the SAME functions the main
 * entry does rather than a copy of them. A copy is the failure mode worth a
 * test: two codecs drift, and the day they do, a link the table wrote parses
 * into a different query on the server — silently, and only for the parameter
 * that changed.
 *
 * That the built entry carries no React and no `"use client"` boundary is
 * asserted where it can be seen at all — against `dist/`, by
 * `scripts/smoke-dist.mjs`, which walks the whole graph.
 */
import { describe, expect, it } from "vitest";

import * as formula from "./formula";
import * as core from "./index";
import * as pivot from "./pivot";
import * as query from "./query";

describe("@adapttable/core/query", () => {
  it("re-exports the main entry's own functions, not copies", () => {
    expect(query.parseFilterTree).toBe(core.parseFilterTree);
    expect(query.serializeFilterTree).toBe(core.serializeFilterTree);
    expect(query.isActiveFilterTree).toBe(core.isActiveFilterTree);
    expect(query.isFilterGroup).toBe(core.isFilterGroup);
    expect(query.FILTER_TREE_PARAM).toBe(core.FILTER_TREE_PARAM);
    expect(query.FILTER_TREE_VERSION).toBe(core.FILTER_TREE_VERSION);
  });

  it("re-exports the pivot entry's own codec, not a copy", () => {
    expect(query.serializePivot).toBe(pivot.serializePivot);
    expect(query.deserializePivot).toBe(pivot.deserializePivot);
  });

  it("re-exports the formula entry's own codec, not a copy", () => {
    expect(query.serializeFormulaColumns).toBe(formula.serializeFormulaColumns);
    expect(query.deserializeFormulaColumns).toBe(
      formula.deserializeFormulaColumns
    );
  });

  it("reads a formula column as text, and never as something to run", () => {
    // The whole point of decoding a link on a server: a route handler can see
    // WHICH columns a link asks for without the parser — or anything that could
    // run one — being anywhere in the process.
    const raw = query.serializeFormulaColumns([
      { key: "total", header: "Total", formula: "=[Unit Price] * Quantity" },
    ]);
    expect(query.deserializeFormulaColumns(raw)).toEqual([
      { key: "total", header: "Total", formula: "=[Unit Price] * Quantity" },
    ]);
    expect(query).not.toHaveProperty("parseFormula");
    expect(query).not.toHaveProperty("evaluateFormula");
  });

  it("decodes what the table encodes", () => {
    // End to end through the one entry a route handler has: a tree and a pivot
    // written by the table's own serializers, read back by this entry alone.
    const tree = query.serializeFilterTree({
      combinator: "and",
      conditions: [
        { key: "team", op: "eq", value: "ops" },
        {
          combinator: "or",
          conditions: [{ key: "amount", op: "gt", value: 5 }],
        },
      ],
    });
    const config = query.serializePivot({
      rows: ["team"],
      columns: ["quarter"],
      measures: [{ key: "amount", agg: "sum" }],
    });

    const parsed = query.parseFilterTree(tree);
    expect(parsed?.conditions).toHaveLength(2);
    expect(parsed?.conditions.filter(query.isFilterGroup)).toHaveLength(1);
    expect(query.deserializePivot(config)).toEqual({
      rows: ["team"],
      columns: ["quarter"],
      measures: [{ key: "amount", agg: "sum" }],
    });
  });
});
