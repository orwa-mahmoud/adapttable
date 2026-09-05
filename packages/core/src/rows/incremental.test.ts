/**
 * Incremental re-evaluation must match a full rebuild. A wrong filter
 * membership, sort position, group bucket or total fails these tests —
 * they compare against the same primitives the table already uses.
 */
import { describe, expect, it, vi } from "vitest";

import { aggregate } from "../aggregate/aggregate";
import type { ColumnModel } from "../columnModel";
import type { FilterDef } from "../filters/filterDefs";
import { evaluateFilterTree } from "../filters/filterTree";
import {
  buildGroupedFlatModel,
  type GroupedFlatEntry,
} from "../grouping/groupRows";
import { sortRows, sortRowsMulti } from "../sort/compare";
import type { QueryFilterGroup } from "../source/queryContract";
import {
  applyRowPatchesToView,
  applyRowPatchLogToView,
  attachIncrementalView,
  configureIncrementalView,
  createIncrementalView,
  incrementalSearchText,
  type IncrementalView,
  type IncrementalViewConfig,
  incrementalViewConfig,
  incrementalViewOf,
} from "./incremental";
import {
  applyRowPatches,
  applyRowPatchesWithLog,
  insertRow,
  removeRow,
  rowPatchLog,
  updateRow,
  upsertRow,
} from "./patch";

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
  status: string;
}

const ADA: Person = {
  id: "1",
  name: "Ada",
  team: "Core",
  budget: 100,
  status: "active",
};
const ALAN: Person = {
  id: "2",
  name: "Alan",
  team: "Web",
  budget: 40,
  status: "blocked",
};
const GRACE: Person = {
  id: "3",
  name: "Grace",
  team: "Core",
  budget: 80,
  status: "active",
};
const KATE: Person = {
  id: "4",
  name: "Kate",
  team: "Web",
  budget: 60,
  status: "active",
};

const ROWS: readonly Person[] = [ADA, ALAN, GRACE, KATE];
const byId = (row: Person) => row.id;
const COLS: ColumnModel<Person>[] = [
  { key: "name", sortValue: (row) => row.name },
  { key: "team", sortValue: (row) => row.team },
  { key: "budget", sortValue: (row) => row.budget },
  { key: "status", sortValue: (row) => row.status },
];

const FILTER_DEFS: FilterDef<Person>[] = [
  { key: "team", type: "select" },
  { key: "name", type: "text" },
];

function ids(rows: readonly Person[]): string[] {
  return rows.map((row) => row.id);
}

function groupShape(entries: readonly GroupedFlatEntry<Person>[] | undefined) {
  return (entries ?? []).map((entry) => {
    if (entry.kind === "group") {
      return {
        kind: entry.kind,
        key: entry.key,
        label: entry.label,
        leafIds: entry.leafIds,
        aggregateCells: entry.aggregateCells,
      };
    }
    if (entry.kind === "row") {
      return { kind: entry.kind, key: entry.key, groupKey: entry.groupKey };
    }
    if (entry.kind === "groupFooter") {
      return {
        kind: entry.kind,
        key: entry.key,
        aggregateCells: entry.aggregateCells,
      };
    }
    return { kind: entry.kind, key: entry.key };
  });
}

/** Independent full pipeline — not the incremental create path. */
function oracle(
  rows: readonly Person[],
  config: IncrementalViewConfig<Person>
): Pick<
  IncrementalView<Person>,
  "filtered" | "sorted" | "groups" | "aggregates"
> {
  const term = config.search?.trim().toLowerCase() ?? "";
  const getText = config.getSearchText ?? incrementalSearchText;
  let filtered: Person[] = term
    ? rows.filter((row) => getText(row).toLowerCase().includes(term))
    : [...rows];
  if (config.filterFn) {
    filtered = filtered.filter((row) =>
      config.filterFn!(row, config.extra ?? {})
    );
  }
  if (config.filterTree && config.filterTreeFn) {
    filtered = filtered.filter((row) =>
      config.filterTreeFn!(row, config.filterTree!)
    );
  }
  let sorted = filtered;
  if (config.sortLevels && config.sortLevels.length > 0) {
    sorted = sortRowsMulti(filtered, config.sortLevels, (row, key) =>
      config.getSortValue
        ? config.getSortValue(row, key)
        : (config.columns
            ?.find((column) => column.key === key)
            ?.sortValue?.(row) ?? null)
    );
  } else if (config.sortBy && config.sortDir) {
    sorted = sortRows(
      filtered,
      (row) =>
        config.getSortValue
          ? config.getSortValue(row, config.sortBy!)
          : (config.columns
              ?.find((column) => column.key === config.sortBy)
              ?.sortValue?.(row) ?? null),
      config.sortDir
    );
  }
  const groups = config.groupBy
    ? buildGroupedFlatModel({
        rows: sorted,
        groupBy: config.groupBy,
        columns: config.columns ?? [],
        getRowId: config.getRowId,
        collapsedGroupIds: config.collapsedGroupIds ?? new Set(),
        aggregates: config.groupAggregates,
        footers: config.groupFooters === true,
        sort: config.groupSort,
        filter: config.groupFilter,
      })
    : undefined;
  const aggregates = oracleAggregates(sorted, config);
  return { filtered, sorted, groups, aggregates };
}

function oracleAggregates(
  rows: readonly Person[],
  config: IncrementalViewConfig<Person>
): IncrementalView<Person>["aggregates"] {
  if (config.summaryRow) return config.summaryRow(rows);
  if (config.aggregateSpec) {
    return aggregate(config.aggregateSpec, config.aggregateOptions)(rows);
  }
  return undefined;
}

function expectMatch(
  incremental: IncrementalView<Person>,
  rows: readonly Person[],
  config: IncrementalViewConfig<Person>
): void {
  const rebuilt = createIncrementalView(rows, config);
  const full = oracle(rows, config);
  expect(ids(incremental.filtered)).toEqual(ids(full.filtered));
  expect(ids(incremental.sorted)).toEqual(ids(full.sorted));
  expect(ids(incremental.filtered)).toEqual(ids(rebuilt.filtered));
  expect(ids(incremental.sorted)).toEqual(ids(rebuilt.sorted));
  expect(groupShape(incremental.groups)).toEqual(groupShape(full.groups));
  expect(groupShape(incremental.groups)).toEqual(groupShape(rebuilt.groups));
  expect(incremental.aggregates).toEqual(full.aggregates);
  expect(incremental.aggregates).toEqual(rebuilt.aggregates);
}

function apply(
  view: IncrementalView<Person>,
  patches: Parameters<typeof applyRowPatchesToView<Person>>[1]
): IncrementalView<Person> {
  return applyRowPatchesToView(view, patches);
}

describe("createIncrementalView / applyRowPatchesToView", () => {
  it("returns the same snapshot when nothing changed", () => {
    const config = { getRowId: byId };
    const view = createIncrementalView(ROWS, config);
    expect(apply(view, [updateRow("1", { team: "Core" })])).toBe(view);
    expect(apply(view, [])).toBe(view);
  });

  it("keeps untouched row identity after an update", () => {
    const view = apply(createIncrementalView(ROWS, { getRowId: byId }), [
      updateRow("2", { budget: 41 }),
    ]);
    expect(view.rows[0]).toBe(ADA);
    expect(view.rows[2]).toBe(GRACE);
    expect(view.rows[1]).not.toBe(ALAN);
    expect(view.rows[1]?.budget).toBe(41);
  });

  it("matches a full rebuild after a filter enter, leave and stay", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      filterFn: (row) => row.team === "Core",
      extra: {},
    };
    const start = createIncrementalView(ROWS, config);
    expect(ids(start.filtered)).toEqual(["1", "3"]);

    const left = apply(start, [updateRow("1", { team: "Web" })]);
    expectMatch(left, left.rows, config);
    expect(ids(left.filtered)).toEqual(["3"]);

    const entered = apply(left, [updateRow("2", { team: "Core" })]);
    expectMatch(entered, entered.rows, config);
    expect(ids(entered.filtered)).toEqual(["2", "3"]);

    const stayed = apply(entered, [updateRow("3", { budget: 81 })]);
    expectMatch(stayed, stayed.rows, config);
    expect(ids(stayed.filtered)).toEqual(["2", "3"]);
    expect(stayed.filtered[1]?.budget).toBe(81);
  });

  it("matches a full rebuild after search enter and leave", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      search: "ada",
    };
    const start = createIncrementalView(ROWS, config);
    expect(ids(start.filtered)).toEqual(["1"]);

    const left = apply(start, [updateRow("1", { name: "Augusta" })]);
    expectMatch(left, left.rows, config);
    expect(ids(left.filtered)).toEqual([]);

    const entered = apply(left, [updateRow("2", { name: "Adaline" })]);
    expectMatch(entered, entered.rows, config);
    expect(ids(entered.filtered)).toEqual(["2"]);
  });

  it("matches a full rebuild after a filter-tree membership change", () => {
    const tree: QueryFilterGroup = {
      combinator: "and",
      conditions: [{ key: "team", op: "eq", value: "Core" }],
    };
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      filterTree: tree,
      filterTreeFn: (row, active) =>
        evaluateFilterTree(active, row, FILTER_DEFS),
    };
    const start = createIncrementalView(ROWS, config);
    expect(ids(start.filtered)).toEqual(["1", "3"]);
    const next = apply(start, [updateRow("4", { team: "Core" })]);
    expectMatch(next, next.rows, config);
    expect(ids(next.filtered)).toEqual(["1", "3", "4"]);
  });

  it("repositions a row whose sort key changed, and leaves equals stable", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      sortBy: "budget",
      sortDir: "asc",
    };
    const start = createIncrementalView(ROWS, config);
    expect(ids(start.sorted)).toEqual(["2", "4", "3", "1"]);

    const moved = apply(start, [updateRow("2", { budget: 200 })]);
    expectMatch(moved, moved.rows, config);
    expect(ids(moved.sorted)).toEqual(["4", "3", "1", "2"]);

    const tied = apply(moved, [updateRow("3", { name: "Grace H." })]);
    expectMatch(tied, tied.rows, config);
    expect(ids(tied.sorted)).toEqual(["4", "3", "1", "2"]);
  });

  it("breaks a full multi-sort tie with filtered order", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      sortLevels: [
        { key: "team", dir: "asc" },
        { key: "budget", dir: "asc" },
      ],
    };
    const start = createIncrementalView(ROWS, config);
    const next = apply(start, [
      insertRow({
        id: "5",
        name: "Twin",
        team: "Core",
        budget: 100,
        status: "active",
      }),
    ]);
    expectMatch(next, next.rows, config);
  });

  it("matches multi-sort after a secondary-key change", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      sortLevels: [
        { key: "team", dir: "asc" },
        { key: "budget", dir: "desc" },
      ],
    };
    const start = createIncrementalView(ROWS, config);
    const next = apply(start, [updateRow("1", { budget: 10 })]);
    expectMatch(next, next.rows, config);
  });

  it("inserts, upserts and removes in the same batch as a full rebuild", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      filterFn: (row) => row.budget >= 50,
      extra: {},
      sortBy: "budget",
      sortDir: "desc",
    };
    const start = createIncrementalView(ROWS, config);
    const next = apply(start, [
      removeRow("1"),
      insertRow(
        { id: "5", name: "Radia", team: "Net", budget: 90, status: "active" },
        0
      ),
      upsertRow({
        id: "2",
        name: "Alan T.",
        team: "Web",
        budget: 70,
        status: "blocked",
      }),
      upsertRow({
        id: "6",
        name: "New",
        team: "Core",
        budget: 15,
        status: "active",
      }),
    ]);
    expectMatch(next, next.rows, config);
  });

  it("matches grouping after a same-group update, a group change and an empty group", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      groupBy: "team",
      groupAggregates: (rows) => ({
        budget: rows.reduce((sum, row) => sum + row.budget, 0),
      }),
    };
    const start = createIncrementalView(ROWS, config);
    const same = apply(start, [updateRow("1", { budget: 150 })]);
    expectMatch(same, same.rows, config);

    const moved = apply(same, [updateRow("3", { team: "Web" })]);
    expectMatch(moved, moved.rows, config);

    const emptied = apply(moved, [
      updateRow("1", { team: "Web" }),
      // Core is gone; a full rebuild must not keep a Core header.
    ]);
    expectMatch(emptied, emptied.rows, config);
    expect(
      emptied.groups?.some(
        (entry) => entry.kind === "group" && entry.label === "Core"
      )
    ).toBe(false);
  });

  it("matches nested grouping and first-seen order after an insert at the front", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      groupBy: ["team", "status"],
      groupFooters: true,
      groupAggregates: (rows) => ({ budget: rows.length }),
    };
    const start = createIncrementalView(ROWS, config);
    const next = apply(start, [
      insertRow(
        {
          id: "0",
          name: "First",
          team: "Labs",
          budget: 1,
          status: "active",
        },
        0
      ),
    ]);
    expectMatch(next, next.rows, config);
    expect(next.groups?.[0]).toMatchObject({ kind: "group", label: "Labs" });
  });

  it("matches incremental built-in aggregates, including a min eviction", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      aggregateSpec: { budget: "sum" },
      aggregateOptions: { columns: COLS },
    };
    const start = createIncrementalView(ROWS, config);
    expect(start.aggregates).toEqual({ budget: 280 });
    const summed = apply(start, [updateRow("2", { budget: 50 })]);
    expectMatch(summed, summed.rows, config);

    const minConfig: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      aggregateSpec: { budget: "min" },
      aggregateOptions: { columns: COLS },
    };
    const withMin = createIncrementalView(ROWS, minConfig);
    const evicted = apply(withMin, [updateRow("2", { budget: 90 })]);
    expectMatch(evicted, evicted.rows, minConfig);
    expect(evicted.aggregates).toEqual({ budget: 60 });
  });

  it("matches a custom summaryRow and a custom aggregator", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      summaryRow: (rows) => ({
        budget: rows.reduce((sum, row) => sum + row.budget, 0),
      }),
    };
    const next = apply(createIncrementalView(ROWS, config), [
      updateRow("1", { budget: 1 }),
    ]);
    expectMatch(next, next.rows, config);

    const specConfig: IncrementalViewConfig<Person> = {
      getRowId: byId,
      aggregateSpec: {
        team: (values) => new Set(values).size,
      },
    };
    const custom = apply(createIncrementalView(ROWS, specConfig), [
      updateRow("2", { team: "Core" }),
    ]);
    expectMatch(custom, custom.rows, specConfig);
  });

  it("does not re-test untouched rows — a full re-eval would, and that is the bug", () => {
    const filterFn = vi.fn((row: Person) => row.team === "Core");
    const getSortValue = vi.fn((row: Person) => row.budget);
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      filterFn,
      extra: {},
      getSortValue,
      sortBy: "budget",
      sortDir: "asc",
    };
    const view = createIncrementalView(ROWS, config);
    filterFn.mockClear();
    getSortValue.mockClear();
    apply(view, [updateRow("1", { budget: 250 })]);
    expect(filterFn).toHaveBeenCalledTimes(1);
    expect(filterFn.mock.calls[0]?.[0].id).toBe("1");
    expect(getSortValue.mock.calls.every((call) => call[0].id === "1")).toBe(
      true
    );
  });

  it("continues from applyRowPatches via the attached log", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      sortBy: "budget",
      sortDir: "asc",
    };
    const view = createIncrementalView(ROWS, config);
    const nextRows = applyRowPatches(
      view.rows,
      [updateRow("4", { budget: 5 })],
      byId
    );
    const log = rowPatchLog(nextRows);
    expect(log?.events).toHaveLength(1);
    const next = applyRowPatchLogToView(view, log!);
    expectMatch(next, nextRows, config);
    expect(ids(next.sorted)[0]).toBe("4");
  });

  it("drops the log when the host spreads the patched array", () => {
    const next = [
      ...applyRowPatches(ROWS, [updateRow("1", { budget: 1 })], byId),
    ];
    expect(rowPatchLog(next)).toBeUndefined();
  });

  it("attaches the snapshot to derived arrays", () => {
    const view = createIncrementalView(ROWS, { getRowId: byId });
    expect(incrementalViewOf(view.sorted)).toBe(view);
    expect(incrementalViewConfig(view)?.getRowId).toBe(byId);
    const slice = view.sorted.slice(0, 1);
    attachIncrementalView(slice, view);
    expect(incrementalViewOf(slice)).toBe(view);
  });
});

describe("configureIncrementalView", () => {
  it("keeps the same view when only columns / callbacks change identity", () => {
    const view = createIncrementalView(ROWS, {
      getRowId: byId,
      columns: COLS,
      groupBy: "team",
    });
    const next = configureIncrementalView(view, {
      columns: [...COLS],
      getRowId: (row) => row.id,
      groupAggregates: (rows) => ({ n: rows.length }),
    });
    const again = configureIncrementalView(next, {
      columns: [...COLS],
      getRowId: (row) => row.id,
      groupAggregates: (rows) => ({ n: rows.length }),
    });
    expect(again).toBe(next);
    expect(again.sorted).toBe(view.sorted);
  });

  it("rebuilds groups without replacing filtered / sorted", () => {
    const view = createIncrementalView(ROWS, {
      getRowId: byId,
      columns: COLS,
    });
    expect(view.groups).toBeUndefined();
    const grouped = configureIncrementalView(view, { groupBy: "team" });
    expect(grouped.groups?.some((entry) => entry.kind === "group")).toBe(true);
    expect(grouped.filtered).toBe(view.filtered);
    expect(grouped.sorted).toBe(view.sorted);
  });

  it("refuses a snapshot it did not create", () => {
    const fake = {
      rows: ROWS,
      filtered: ROWS,
      sorted: ROWS,
      groups: undefined,
      aggregates: undefined,
    };
    expect(() => configureIncrementalView(fake, { groupBy: "team" })).toThrow(
      /createIncrementalView/
    );
  });
});

describe("applyRowPatchesWithLog", () => {
  it("records insert, update and remove events in order", () => {
    const log = applyRowPatchesWithLog(
      ROWS,
      [
        insertRow({ ...KATE, id: "9", name: "New" }),
        updateRow("2", { budget: 8 }),
        removeRow("3"),
      ],
      byId
    );
    expect(log.events.map((event) => event.type)).toEqual([
      "insert",
      "update",
      "remove",
    ]);
    expect(ids(log.rows)).toEqual(["1", "2", "4", "9"]);
  });
});

describe("applyRowPatchesToView — misuse", () => {
  it("refuses a snapshot it did not create", () => {
    const fake = {
      rows: ROWS,
      filtered: ROWS,
      sorted: ROWS,
      groups: undefined,
      aggregates: undefined,
    };
    expect(() => apply(fake, [updateRow("1", { budget: 1 })])).toThrow(
      /createIncrementalView/
    );
  });
});
