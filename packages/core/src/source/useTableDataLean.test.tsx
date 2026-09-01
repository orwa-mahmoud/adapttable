import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import { useTableDataLean } from "./useTableDataLean";

/**
 * The data tier of a table that composed no filtering feature.
 *
 * `useTableDataLean` is what `<DataTable>` calls, and it takes its filter
 * engine from whatever `filters()` published rather than importing one — which
 * is how a three-prop table avoids downloading the engine at all. Nothing
 * publishes one here, so this is the shape every unfiltered table gets: an
 * adapter still asks for `defs`, `filterLabels` and a registry lookup, and each
 * has to answer.
 */
interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [{ key: "name" }];

const lean = () =>
  renderHook(() =>
    useTableDataLean<Row>({
      data: ROWS,
      columns,
      urlAdapter: createMemoryAdapter(""),
    })
  );

describe("useTableDataLean — no filter engine published", () => {
  it("hands back an empty runtime that keeps every row", () => {
    const { runtime, source } = lean().result.current;

    expect(runtime.defs).toEqual([]);
    expect(runtime.filterLabels).toEqual({});
    expect(runtime.arrayExtraKeys).toEqual([]);
    expect(runtime.numberExtraKeys).toEqual([]);
    expect(runtime.filterFn(ROWS[0]!, {})).toBe(true);
    expect(source.rows).toHaveLength(ROWS.length);
  });

  it("knows no filter types at all", () => {
    const { registry } = lean().result.current.runtime;

    expect(registry.types()).toEqual([]);
    expect(registry.has("text")).toBe(false);
    expect(registry.get("text")).toBeUndefined();
  });
});
