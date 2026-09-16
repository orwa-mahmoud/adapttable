/**
 * The filter engine only exists once the filters feature is composed, which is
 * the point: the base table's graph never imports it. What it does when it IS
 * composed is resolve declarations into a runtime — deriving option lists from
 * the rows, and calling an async loader exactly once no matter how often the
 * table re-renders around it.
 */
import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { FILTER_ENGINE_IMPL } from "./filterEngine";

interface Row {
  id: string;
  team: string;
  city: string;
}

const ROWS: Row[] = [
  { id: "1", team: "core", city: "Paris" },
  { id: "2", team: "web", city: "Lyon" },
  { id: "3", team: "core", city: "Paris" },
];

const COLUMNS: ColumnMetadata<Row>[] = [
  { key: "team", header: "Team", filter: "text" },
  { key: "city", header: "City" },
];

function build(
  declaredFilters: Parameters<
    typeof FILTER_ENGINE_IMPL.buildRuntime<Row>
  >[0]["declaredFilters"],
  loadedOptions: Record<
    string,
    readonly { value: string; label: string }[]
  > = {},
  optionCache = new Map<
    string,
    () => Promise<readonly { value: string; label: string }[]>
  >()
) {
  return FILTER_ENGINE_IMPL.buildRuntime<Row>({
    columns: COLUMNS,
    declaredFilters,
    locale: undefined,
    data: ROWS,
    loadedOptions,
    filterTypes: undefined,
    featureHost: undefined,
    optionCache,
  });
}

describe("FILTER_ENGINE_IMPL.buildRuntime", () => {
  it("resolves a column's shorthand into a real definition", () => {
    const runtime = build(undefined);
    expect(runtime.defs.map((def) => def.key)).toEqual(["team"]);
  });

  it("derives an auto option list from the rows themselves", () => {
    const runtime = build([{ key: "city", type: "select", options: "auto" }]);
    const city = runtime.defs.find((def) => def.key === "city");
    expect(city?.options).toEqual([
      { value: "Lyon", label: "Lyon" },
      { value: "Paris", label: "Paris" },
    ]);
  });

  it("prefers an already-loaded list over calling the loader again", () => {
    const options = vi.fn(() => Promise.resolve([]));
    const runtime = build([{ key: "city", type: "select", options }], {
      city: [{ value: "Paris", label: "Paris" }],
    });
    expect(runtime.defs[1]?.options).toEqual([
      { value: "Paris", label: "Paris" },
    ]);
    expect(options).not.toHaveBeenCalled();
  });

  it("calls an async loader once, however often the table rebuilds", async () => {
    const options = vi.fn(() =>
      Promise.resolve([{ value: "Paris", label: "Paris" }])
    );
    const optionCache = new Map<
      string,
      () => Promise<readonly { value: string; label: string }[]>
    >();
    const defs = [{ key: "city", type: "select" as const, options }];
    const first = build(defs, {}, optionCache);
    const second = build(defs, {}, optionCache);
    const load = first.defs[1]?.options as () => Promise<unknown>;
    const again = second.defs[1]?.options as () => Promise<unknown>;
    await Promise.all([load(), again(), load()]);
    expect(options).toHaveBeenCalledTimes(1);
  });
});

describe("the engine's evaluation halves", () => {
  it("evaluates a filter tree against one row", () => {
    const runtime = build(undefined);
    expect(
      FILTER_ENGINE_IMPL.evaluateTree(
        {
          combinator: "and",
          conditions: [{ key: "team", op: "eq", value: "core" }],
        },
        ROWS[0]!,
        runtime.defs,
        runtime.registry
      )
    ).toBe(true);
  });

  it("counts the facets a checklist offers", () => {
    const runtime = build([{ key: "team", type: "checklist" }]);
    const facets = FILTER_ENGINE_IMPL.computeFacets(
      runtime.defs,
      ROWS,
      {},
      () => true,
      runtime.registry
    );
    expect(facets.team?.find((item) => item.value === "core")?.count).toBe(2);
  });
});
