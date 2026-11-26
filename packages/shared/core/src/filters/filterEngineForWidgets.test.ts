import { describe, expect, it } from "vitest";

import type { ColumnMetadata } from "../contracts/columns";
import {
  type FilterDef,
  rangeFilterSpecs,
  textFilterSpecs,
} from "./filterDefs";
import { FILTER_ENGINE_IMPL, filterEngineForWidgets } from "./filterEngine";
import type { FilterTypeSpec } from "./filterRegistry";

interface Row {
  name: string;
  age: number;
}
const rows: Row[] = [
  { name: "Ada", age: 36 },
  { name: "Grace", age: 85 },
];
const columns: ColumnMetadata<Row>[] = [{ key: "name" }, { key: "age" }];

function runtime(
  engine: typeof FILTER_ENGINE_IMPL,
  defs: FilterDef<Row>[],
  filterTypes?: FilterTypeSpec[]
) {
  return engine.buildRuntime({
    columns,
    declaredFilters: defs,
    locale: undefined,
    data: rows,
    loadedOptions: {},
    filterTypes,
    featureHost: undefined,
    optionCache: new Map(),
  });
}

describe("filterEngineForWidgets", () => {
  it("holds only the types the widgets carry", () => {
    const engine = filterEngineForWidgets([{ specs: textFilterSpecs() }]);
    const built = runtime(engine, [{ key: "name", type: "text" }]);
    expect(built.registry.types()).toEqual(["text"]);
    expect(rows.filter((row) => built.filterFn(row, { name: "gra" }))).toEqual([
      rows[1],
    ]);
  });

  it("joins the types of every widget, and a widget without rules adds none", () => {
    const engine = filterEngineForWidgets([
      { specs: textFilterSpecs() },
      {},
      { specs: rangeFilterSpecs() },
    ]);
    const built = runtime(engine, [{ key: "age", type: "numberRange" }]);
    expect(new Set(built.registry.types())).toEqual(
      new Set(["text", "dateRange", "numberRange"])
    );
  });

  it("still layers the host's own filter types on top", () => {
    const custom: FilterTypeSpec = {
      ...textFilterSpecs()[0]!,
      type: "initial",
      match: (def, extra, row) =>
        String((row as Row)[def.key as keyof Row]).startsWith(
          String(extra[def.key] ?? "")
        ),
    };
    const engine = filterEngineForWidgets([{ specs: textFilterSpecs() }]);
    const built = runtime(engine, [{ key: "name", type: "initial" }], [custom]);
    expect(built.registry.types()).toEqual(["text", "initial"]);
    expect(rows.filter((row) => built.filterFn(row, { name: "A" }))).toEqual([
      rows[0],
    ]);
  });

  it("matches the full engine on the types it holds", () => {
    const defs: FilterDef<Row>[] = [{ key: "name", type: "text" }];
    const lean = runtime(
      filterEngineForWidgets([{ specs: textFilterSpecs() }]),
      defs
    );
    const full = runtime(FILTER_ENGINE_IMPL, defs);
    for (const extra of [{ name: "a" }, { name: "x" }, {}]) {
      expect(rows.map((row) => lean.filterFn(row, extra))).toEqual(
        rows.map((row) => full.filterFn(row, extra))
      );
    }
    expect(Object.keys(lean.filterLabels)).toEqual(
      Object.keys(full.filterLabels)
    );
  });
});
