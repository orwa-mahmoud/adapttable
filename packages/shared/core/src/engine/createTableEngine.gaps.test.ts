/**
 * The engine's own mutation surface: the operations a binding dispatches, the
 * configuration it replays, and the invalidations a host reports. Two rules
 * decide whether a table shows the truth after any of them — a view change
 * resets to page 1, because staying on page 9 of a set that is now three rows
 * long shows nothing; and replacing data has to rebuild the derived view, or
 * the rows on screen belong to the previous array.
 */
import { describe, expect, it, vi } from "vitest";

import { createTableEngine } from "./createTableEngine";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "core" },
  { id: "2", name: "Grace", team: "web" },
  { id: "3", name: "Lin", team: "core" },
];

function engineOf(data: Row[] = ROWS) {
  return createTableEngine({
    data,
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "team", header: "Team" },
    ],
    rowKey: (row: Row) => row.id,
    defaults: { page: 1, limit: 2 },
  });
}

describe("dispatch", () => {
  it("records the filters, and comes back to the first page", () => {
    const engine = engineOf();
    engine.dispatch({ type: "setPage", page: 2 });
    expect(engine.snapshot().page).toBe(2);
    engine.dispatch({ type: "setFilters", filters: { team: "core" } });
    expect(engine.snapshot().page).toBe(1);
    expect(engine.snapshot().extra).toEqual({ team: "core" });
  });

  it("groups, and comes back to the first page", () => {
    const engine = engineOf();
    engine.dispatch({ type: "setPage", page: 2 });
    engine.dispatch({ type: "setGroupBy", key: "team" });
    expect(engine.snapshot().groupBy).toBe("team");
    expect(engine.snapshot().page).toBe(1);
  });

  it("records a selection without disturbing the rows", () => {
    const engine = engineOf();
    engine.dispatch({ type: "setSelection", ids: ["1", "3"] });
    expect(engine.snapshot().selectedIds).toEqual(["1", "3"]);
    engine.dispatch({ type: "setSelection" });
    expect(engine.snapshot().selectedIds).toEqual([]);
  });

  it("ignores an operation it does not know", () => {
    const engine = engineOf();
    const before = engine.snapshot().revisions;
    engine.dispatch({ type: "setTheme" } as never);
    expect(engine.snapshot().revisions).toEqual(before);
  });
});

describe("getColumn / cellValue", () => {
  it("finds a declared column and answers nothing for an unknown one", () => {
    const engine = engineOf();
    expect(engine.getColumn("name")?.header).toBe("Name");
    expect(engine.getColumn("gone")).toBeUndefined();
    expect(engine.cellValue(ROWS[0]!, "name")).toBe("Ada");
    expect(engine.cellValue(ROWS[0]!, "gone")).toBeUndefined();
  });
});

describe("configure", () => {
  it("ignores an empty replacement for columns, identity and paging", () => {
    const engine = engineOf();
    const before = engine.snapshot();
    engine.configure({
      columns: undefined,
      getRowId: undefined,
      paginationMode: undefined,
    });
    expect(engine.snapshot().columns).toBe(before.columns);
    expect(engine.snapshot().revisions).toEqual(before.revisions);
  });

  it("takes a real replacement for each of them", () => {
    const engine = engineOf();
    engine.configure({
      columns: [{ key: "team", header: "Squad" }],
      getRowId: (row: Row) => `x${row.id}`,
      paginationMode: "infinite",
    });
    expect(engine.snapshot().columns.map((column) => column.key)).toEqual([
      "team",
    ]);
    expect(engine.rowKey(ROWS[0]!)).toBe("x1");
    // Infinite paging accumulates: page 2 is the first two pages together.
    engine.dispatch({ type: "setPage", page: 2 });
    expect(engine.rows("page")).toHaveLength(3);
  });
});

describe("invalidate", () => {
  it("rebuilds the view from a replacement array", () => {
    const engine = engineOf();
    const listener = vi.fn();
    engine.subscribe("all", listener);
    engine.invalidate([], { data: [ROWS[0]!] });
    expect(engine.rows("full")).toHaveLength(1);
    expect(listener).toHaveBeenCalled();
  });

  it("rebuilds from the array it already holds when it was mutated in place", () => {
    const data = [...ROWS];
    const engine = engineOf(data);
    data.push({ id: "4", name: "Kay", team: "web" });
    engine.invalidate(["data"]);
    expect(engine.rows("full")).toHaveLength(4);
  });

  it("takes a new schema and says the schema changed", () => {
    const engine = engineOf();
    const listener = vi.fn();
    engine.subscribe(["schema"], listener);
    engine.invalidate([], { columns: [{ key: "team", header: "Squad" }] });
    expect(engine.snapshot().columns).toHaveLength(1);
    expect(listener).toHaveBeenCalled();
  });

  it("publishes nothing when there was nothing to invalidate", () => {
    const engine = engineOf();
    const listener = vi.fn();
    engine.subscribe("all", listener);
    engine.invalidate([]);
    expect(listener).not.toHaveBeenCalled();
  });
});
