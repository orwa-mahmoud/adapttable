/**
 * Incremental re-evaluation must match a full rebuild. A wrong filter
 * membership, sort position, group bucket or total fails these tests —
 * they compare against the same primitives the table already uses.
 */
import { describe, expect, it, vi } from "vitest";

import { aggregate } from "../aggregate/aggregate";
import { serializeAggregationDerivedKey } from "../aggregate/aggregationModel";
import type { ColumnModel } from "../contracts/columns";
import type { QueryFilterGroup } from "../contracts/query";
import type { RowPatch, RowPatchEvent } from "../contracts/rows";
import type { FilterDef } from "../filters/filterDefs";
import { evaluateFilterTree } from "../filters/filterTree";
import { withGroupAggregateOverrides } from "../grouping/groupAggregateOverrides";
import {
  buildGroupedFlatModel,
  type GroupedFlatEntry,
} from "../grouping/groupRows";
import { sortRows, sortRowsMulti } from "../sort/compare";
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
        locale: config.locale,
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

  it("groups by the locale path and moves a row when that field changes", () => {
    interface Translated {
      id: string;
      team: string;
      teamAr: string;
    }
    const config: IncrementalViewConfig<Translated> = {
      getRowId: (row) => row.id,
      columns: [{ key: "team", i18n: { ar: "teamAr" } }],
      groupBy: "team",
      locale: "ar",
    };
    const labels = (view: IncrementalView<Translated>) =>
      (view.groups ?? []).flatMap((entry) =>
        entry.kind === "group" ? [entry.label] : []
      );
    const start = createIncrementalView<Translated>(
      [
        { id: "1", team: "Core", teamAr: "النواة" },
        { id: "2", team: "Web", teamAr: "الويب" },
      ],
      config
    );
    expect(labels(start)).toEqual(["النواة", "الويب"]);

    const moved = applyRowPatchesToView(start, [
      updateRow<Translated>("1", { teamAr: "الويب" }),
    ]);
    expect(labels(moved)).toEqual(["الويب"]);
    expect(labels(moved)).toEqual(
      labels(createIncrementalView(moved.rows, config))
    );

    const english = configureIncrementalView(moved, { locale: "en" });
    expect(labels(english)).toEqual(["Core", "Web"]);
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
  it("retains computed subtotals when an attached snapshot is configured again", () => {
    const view = createIncrementalView(ROWS, {
      getRowId: byId,
      columns: COLS,
      groupBy: "team",
    });
    const options = {
      groupAggregates: (rows: readonly Person[]) => ({ n: rows.length }),
      derivedKey: "count",
    };
    const withTotals = configureIncrementalView(view, options);
    const again = configureIncrementalView(view, options);
    expect(again.groups).toEqual(withTotals.groups);
    expect(
      again.groups?.find((entry) => entry.kind === "group")?.aggregateCells
    ).toEqual({ n: expect.any(Number) });
  });

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

  it("rebuilds the groups when the derived key says the answer changed", () => {
    // A host rebuilds its aggregate mapper every render, so identity says
    // nothing. The key is what says a reader picked a different aggregation:
    // without it the choice is stored and the groups never show it.
    const view = createIncrementalView(ROWS, {
      getRowId: byId,
      columns: COLS,
      groupBy: "team",
      groupAggregates: (rows) => ({ n: rows.length }),
      derivedKey: "n",
    });
    const first = view.groups?.find((entry) => entry.kind === "group");
    expect(first?.kind === "group" && first.aggregateCells).toEqual({
      n: expect.any(Number),
    });

    const chosen = configureIncrementalView(view, {
      groupAggregates: (rows) => ({ total: rows.length * 2 }),
      derivedKey: "total",
    });
    const rebuilt = chosen.groups?.find((entry) => entry.kind === "group");
    expect(rebuilt?.kind === "group" && rebuilt.aggregateCells).toEqual({
      total: expect.any(Number),
    });
    // Only the groups are rebuilt; the rows underneath keep their identity.
    expect(chosen.sorted).toBe(view.sorted);
  });

  it("rebuilds totals when a column default changes and keeps them when it does not", () => {
    const withBudget = (
      aggregatable: NonNullable<ColumnModel<Person>["aggregatable"]>
    ): ColumnModel<Person>[] =>
      COLS.map((column) =>
        column.key === "budget" ? { ...column, aggregatable } : column
      );
    const sumColumns = withBudget({
      default: "sum",
      operations: ["sum", "avg"],
    });
    const avgColumns = withBudget({
      default: "avg",
      operations: ["sum", "avg"],
    });
    const sumOnlyColumns = withBudget({
      default: "sum",
      operations: ["sum"],
    });
    const keyOf = (columns: ColumnModel<Person>[]) =>
      serializeAggregationDerivedKey({ columns, overrides: {} });
    const mapperOf = (columns: ColumnModel<Person>[]) =>
      withGroupAggregateOverrides(undefined, {}, columns);

    const view = createIncrementalView(ROWS, {
      getRowId: byId,
      columns: sumColumns,
      groupBy: "team",
      groupAggregates: mapperOf(sumColumns),
      derivedKey: keyOf(sumColumns),
    });
    const core = view.groups?.find(
      (entry) => entry.kind === "group" && entry.label === "Core"
    );
    expect(core?.kind === "group" && core.aggregateCells).toEqual({
      budget: 180,
    });

    const sameOffer = configureIncrementalView(view, {
      columns: [...sumColumns],
      groupAggregates: mapperOf([...sumColumns]),
      derivedKey: keyOf([...sumColumns]),
    });
    expect(sameOffer.groups).toBe(view.groups);

    const narrowed = configureIncrementalView(view, {
      columns: sumOnlyColumns,
      groupAggregates: mapperOf(sumOnlyColumns),
      derivedKey: keyOf(sumOnlyColumns),
    });
    expect(narrowed.groups).toBe(view.groups);

    const averaged = configureIncrementalView(view, {
      columns: avgColumns,
      groupAggregates: mapperOf(avgColumns),
      derivedKey: keyOf(avgColumns),
    });
    expect(averaged.groups).not.toBe(view.groups);
    const avgCore = averaged.groups?.find(
      (entry) => entry.kind === "group" && entry.label === "Core"
    );
    expect(avgCore?.kind === "group" && avgCore.aggregateCells).toEqual({
      budget: 90,
    });
    expect(averaged.sorted).toBe(view.sorted);
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

describe("createIncrementalView — localized sort", () => {
  interface Named {
    id: string;
    name: string;
    nameAr: string;
    rank: number;
  }
  const named: Named[] = [
    { id: "1", name: "Alpha", nameAr: "ياء", rank: 2 },
    { id: "2", name: "Beta", nameAr: "ألف", rank: 1 },
  ];
  const idOf = (row: Named) => row.id;

  it("sorts by the column's i18n path for the active locale", () => {
    const view = createIncrementalView(named, {
      getRowId: idOf,
      columns: [{ key: "name", i18n: { ar: "nameAr" } }],
      locale: "ar",
      sortBy: "name",
      sortDir: "asc",
    });
    expect(view.sorted.map(idOf)).toEqual(["2", "1"]);
  });

  it("sorts by the key when no locale is active", () => {
    const view = createIncrementalView(named, {
      getRowId: idOf,
      columns: [{ key: "name", i18n: { ar: "nameAr" } }],
      sortBy: "name",
      sortDir: "asc",
    });
    expect(view.sorted.map(idOf)).toEqual(["1", "2"]);
  });

  it("leaves a column's own sortValue in charge", () => {
    const view = createIncrementalView(named, {
      getRowId: idOf,
      columns: [
        { key: "name", i18n: { ar: "nameAr" }, sortValue: (row) => row.rank },
      ],
      locale: "ar",
      sortBy: "name",
      sortDir: "desc",
    });
    expect(view.sorted.map(idOf)).toEqual(["1", "2"]);
  });

  it("re-sorts when the locale changes", () => {
    const view = createIncrementalView(named, {
      getRowId: idOf,
      columns: [{ key: "name", i18n: { ar: "nameAr" } }],
      sortBy: "name",
      sortDir: "asc",
    });
    const arabic = configureIncrementalView(view, { locale: "ar" });
    expect(arabic.sorted.map(idOf)).toEqual(["2", "1"]);
  });
});

describe("group cells from aggregateSpec", () => {
  interface Score {
    id: string;
    team: string;
    v: number;
  }
  const scores: Score[] = [
    { id: "a", team: "x", v: 1 },
    { id: "b", team: "x", v: 2 },
    { id: "c", team: "y", v: 5 },
  ];
  const config: IncrementalViewConfig<Score> = {
    getRowId: (row) => row.id,
    columns: [{ key: "v" }, { key: "team" }],
    groupBy: "team",
    aggregateSpec: { v: "sum" },
  };
  const totals = (view: IncrementalView<Score>) =>
    Object.fromEntries(
      (view.groups ?? []).flatMap((entry) =>
        entry.kind === "group" ? [[entry.key, entry.aggregateCells]] : []
      )
    );

  it("draws each group's totals on the first build, after a patch and after a rebuild", () => {
    const initial = createIncrementalView(scores, config);
    expect(totals(initial)).toEqual({
      "group:team:s:x": { v: 3 },
      "group:team:s:y": { v: 5 },
    });

    const patched = applyRowPatchesToView(initial, [
      updateRow<Score>("a", { v: 10 }),
    ]);
    expect(totals(patched)).toEqual({
      "group:team:s:x": { v: 12 },
      "group:team:s:y": { v: 5 },
    });

    expect(totals(createIncrementalView(patched.rows, config))).toEqual(
      totals(patched)
    );
  });

  it("recomputes the totals when the aggregate changes", () => {
    const view = configureIncrementalView(
      createIncrementalView(scores, config),
      {
        aggregateSpec: { v: "min" },
      }
    );
    expect(totals(view)).toEqual({
      "group:team:s:x": { v: 1 },
      "group:team:s:y": { v: 5 },
    });
  });

  it("keeps the host's groupAggregates ahead of aggregateSpec", () => {
    const initial = createIncrementalView(scores, {
      ...config,
      groupAggregates: (rows) => ({ v: `${String(rows.length)} rows` }),
    });
    expect(totals(initial)).toEqual({
      "group:team:s:x": { v: "2 rows" },
      "group:team:s:y": { v: "1 rows" },
    });
    const patched = applyRowPatchesToView(initial, [
      updateRow<Score>("a", { v: 10 }),
    ]);
    expect(totals(patched)).toEqual(totals(initial));
  });
});

/** Fixed-seed stream, so a failing batch replays exactly. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

const TEAMS = ["Core", "Web", "Net", "Labs"];

function people(count: number, budget: (index: number) => number): Person[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `r${String(index)}`,
    name: `Name ${String(index)}`,
    team: TEAMS[index % TEAMS.length]!,
    budget: budget(index),
    status: index % 3 === 0 ? "blocked" : "active",
  }));
}

function randomPatches(
  rows: readonly Person[],
  rand: () => number,
  label: string
): RowPatch<Person>[] {
  const patches: RowPatch<Person>[] = [];
  const count = 1 + Math.floor(rand() * 8);
  for (let j = 0; j < count; j++) {
    const row = rows[Math.floor(rand() * rows.length)];
    const op = Math.floor(rand() * 7);
    const budget = Math.floor(rand() * 20);
    if (op === 0 || !row) {
      const id = `${label}-${String(j)}`;
      const at = Math.floor(rand() * (rows.length + 1));
      const team = TEAMS[j % TEAMS.length]!;
      patches.push(
        insertRow({ id, name: id, team, budget, status: "active" }, at)
      );
    } else if (op === 1) {
      patches.push(removeRow(row.id));
    } else if (op === 2) {
      patches.push(updateRow<Person>(row.id, { budget: row.budget }));
    } else if (op === 3) {
      patches.push(
        updateRow<Person>(row.id, { team: TEAMS[j % TEAMS.length]! })
      );
    } else if (op === 4) {
      const status = rand() < 0.5 ? "active" : "blocked";
      patches.push(updateRow<Person>(row.id, { status }));
    } else if (op === 5) {
      patches.push(upsertRow({ ...row, budget }));
    } else {
      patches.push(updateRow<Person>(row.id, { budget }));
    }
  }
  return patches;
}

type TracedProfile = (trace: string[]) => IncrementalViewConfig<Person>;

function tracedFilter(trace: string[]) {
  return (row: Person) => {
    trace.push(`filter:${row.id}:${String(row.budget)}`);
    return row.budget % 3 !== 0;
  };
}

function tracedSortValue(trace: string[]) {
  return (row: Person, key: string) => {
    trace.push(`sort:${row.id}:${key}`);
    return row[key as keyof Person];
  };
}

const sumBudget = (rows: readonly Person[]) => ({
  budget: rows.reduce((sum, row) => sum + row.budget, 0),
});

const TRACED_PROFILES: [string, TracedProfile][] = [
  [
    "built-in totals",
    () => ({
      getRowId: byId,
      columns: COLS,
      aggregateSpec: { budget: "sum" },
      aggregateOptions: { columns: COLS },
    }),
  ],
  ["custom summary row", () => ({ getRowId: byId, summaryRow: sumBudget })],
  ["search", () => ({ getRowId: byId, search: "1" })],
  [
    "filter",
    (trace) => ({ getRowId: byId, filterFn: tracedFilter(trace), extra: {} }),
  ],
  [
    "sort with ties",
    (trace) => ({
      getRowId: byId,
      columns: COLS,
      getSortValue: tracedSortValue(trace),
      sortBy: "budget",
      sortDir: "asc",
    }),
  ],
  [
    "filter + multi-sort",
    (trace) => ({
      getRowId: byId,
      columns: COLS,
      filterFn: tracedFilter(trace),
      extra: {},
      getSortValue: tracedSortValue(trace),
      sortLevels: [
        { key: "team", dir: "asc" },
        { key: "budget", dir: "desc" },
      ],
    }),
  ],
  [
    "grouping with custom aggregates",
    () => ({
      getRowId: byId,
      columns: COLS,
      groupBy: "team",
      groupFooters: true,
      groupAggregates: sumBudget,
    }),
  ],
  [
    "nested grouping, filtered, sorted, min total",
    (trace) => ({
      getRowId: byId,
      columns: COLS,
      filterFn: tracedFilter(trace),
      extra: {},
      getSortValue: tracedSortValue(trace),
      sortBy: "budget",
      sortDir: "desc",
      groupBy: ["team", "status"],
      groupAggregates: (rows) => ({ budget: rows.length }),
      aggregateSpec: { budget: "min" },
      aggregateOptions: { columns: COLS },
    }),
  ],
];

/** One predicate call per row an event brought in — nothing else re-tested. */
function expectedFilterCalls(
  events: readonly RowPatchEvent<Person>[],
  config: IncrementalViewConfig<Person>
): string[] {
  if (!config.filterFn) return [];
  return events.flatMap((event) => {
    if (event.type === "remove") return [];
    const row = event.type === "insert" ? event.row : event.next;
    return [`filter:${row.id}:${String(row.budget)}`];
  });
}

describe("applyRowPatchesToView — seeded batches", () => {
  it.each(TRACED_PROFILES)(
    "%s: a batch, the same patches one by one and a full rebuild agree",
    (_, profile) => {
      for (let seed = 1; seed <= 6; seed++) {
        const rand = seeded(seed);
        const batchTrace: string[] = [];
        const sparseTrace: string[] = [];
        const config = profile(batchTrace);
        const start = people(60, (index) => (index * 7) % 20);
        let batch = createIncrementalView(start, config);
        let sparse = createIncrementalView(start, profile(sparseTrace));
        for (let step = 0; step < 10; step++) {
          const label = `s${String(seed)}-${String(step)}`;
          const patches = randomPatches(batch.rows, rand, label);
          const events = applyRowPatchesWithLog(
            batch.rows,
            patches,
            byId
          ).events;
          batchTrace.length = 0;
          sparseTrace.length = 0;
          batch = applyRowPatchesToView(batch, patches);
          for (const patch of patches) {
            sparse = applyRowPatchesToView(sparse, [patch]);
          }
          expect(ids(sparse.rows)).toEqual(ids(batch.rows));
          expect(ids(sparse.sorted)).toEqual(ids(batch.sorted));
          expect(groupShape(sparse.groups)).toEqual(groupShape(batch.groups));
          expect(sparse.aggregates).toEqual(batch.aggregates);
          expect(sparseTrace).toEqual(batchTrace);
          expect(
            batchTrace.filter((call) => call.startsWith("filter:"))
          ).toEqual(expectedFilterCalls(events, config));
          expectMatch(batch, batch.rows, config);
        }
      }
    }
  );
});

interface PatchWork {
  rowIds: number;
  mappedSlots: number;
  filterCalls: number;
  sortCalls: number;
}

type WorkProfile = (work: PatchWork) => IncrementalViewConfig<Person>;

const WORK_PROFILES: [string, WorkProfile][] = [
  [
    "built-in totals",
    (work) => ({
      getRowId: (row) => (work.rowIds++, row.id),
      columns: COLS,
      aggregateSpec: { budget: "sum" },
      aggregateOptions: { columns: COLS },
    }),
  ],
  [
    "filter",
    (work) => ({
      getRowId: (row) => (work.rowIds++, row.id),
      filterFn: (row) => (work.filterCalls++, row.budget % 2 === 0),
      extra: {},
    }),
  ],
  [
    "sort",
    (work) => ({
      getRowId: (row) => (work.rowIds++, row.id),
      getSortValue: (row) => (work.sortCalls++, row.budget),
      sortBy: "budget",
      sortDir: "asc",
    }),
  ],
  [
    "filter + sort",
    (work) => ({
      getRowId: (row) => (work.rowIds++, row.id),
      filterFn: (row) => (work.filterCalls++, row.budget % 2 === 0),
      extra: {},
      getSortValue: (row) => (work.sortCalls++, row.budget),
      sortBy: "budget",
      sortDir: "asc",
    }),
  ],
];

const WORK_ROWS = 4000;

/** Array slots `Array.prototype.map` walks while `run` is on the stack. */
function mappedSlots(run: () => void): number {
  const map = Array.prototype.map;
  let slots = 0;
  const spy = vi.spyOn(Array.prototype, "map").mockImplementation(function (
    this: unknown[],
    ...args
  ) {
    slots += this.length;
    return map.apply(this, args);
  } as typeof map);
  try {
    run();
  } finally {
    spy.mockRestore();
  }
  return slots;
}

/**
 * Process `batch` updates on even-budget rows that lead both the source and
 * the sort order. They pass every profile's filter, so locating a row stays
 * short and any remaining cost that grows with the row count is index work.
 * `perEventBatches` is the planted regression: the same patches, one batch
 * per event.
 */
function patchWork(
  profile: WorkProfile,
  batch: number,
  perEventBatches = false
): PatchWork {
  const work: PatchWork = {
    rowIds: 0,
    mappedSlots: 0,
    filterCalls: 0,
    sortCalls: 0,
  };
  const rows = people(WORK_ROWS, (index) => index);
  const view = createIncrementalView(rows, profile(work));
  const patches = rows
    .filter((row) => row.budget % 2 === 0)
    .slice(0, batch)
    .map((row) =>
      updateRow<Person>(row.id, { budget: row.budget + WORK_ROWS })
    );
  let base: readonly Person[] = rows;
  const logs = perEventBatches
    ? patches.map((patch) => {
        const log = applyRowPatchesWithLog(base, [patch], byId);
        base = log.rows;
        return log;
      })
    : [applyRowPatchesWithLog(rows, patches, byId)];
  Object.assign(work, { rowIds: 0, filterCalls: 0, sortCalls: 0 });
  work.mappedSlots = mappedSlots(() => {
    let next = view;
    for (const log of logs) next = applyRowPatchLogToView(next, log);
  });
  return work;
}

/**
 * Work is row-id reads plus array slots mapped, and one pass over the rows
 * costs `WORK_ROWS` of it. Each event past the first may cost under an eighth
 * of a pass: locating and moving one row, never re-indexing the set. Grouping
 * is left out — its tree reads a fresh sorted-position map after every event.
 */
function expectNoPerEventIndexPass(
  profile: WorkProfile,
  perEventBatches = false
): void {
  const one = patchWork(profile, 1, perEventBatches);
  const many = patchWork(profile, 32, perEventBatches);
  const total = (work: PatchWork) => work.rowIds + work.mappedSlots;
  const perExtraEvent = (total(many) - total(one)) / 31;
  expect(perExtraEvent).toBeLessThan(WORK_ROWS / 8);
}

describe("applyRowPatchLogToView — index work per event", () => {
  it.each(WORK_PROFILES)(
    "%s: an extra event in the batch costs no pass over the rows",
    (_, profile) => {
      expectNoPerEventIndexPass(profile);
    }
  );

  it.each(WORK_PROFILES)(
    "%s: the guard fails when every event rebuilds the indexes",
    (_, profile) => {
      expect(() => {
        expectNoPerEventIndexPass(profile, true);
      }).toThrow();
    }
  );

  it.each(WORK_PROFILES)(
    "%s: predicates and sort values run once per touched row",
    (_, profile) => {
      const one = patchWork(profile, 1);
      const many = patchWork(profile, 32);
      const filtered = profile(many).filterFn !== undefined;
      expect(many.filterCalls).toBe(filtered ? 32 : 0);
      expect(many.sortCalls).toBe(32 * one.sortCalls);
    }
  );
});
