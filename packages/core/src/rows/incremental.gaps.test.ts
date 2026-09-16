/**
 * Remaining incremental branches: a wrong answer here is still a failed
 * comparison against the full rebuild, plus the edges a happy-path patch
 * never walks (empty totals, a miss in the group tree, a primitive search).
 */
import { describe, expect, it } from "vitest";

import type { ColumnModel } from "../columnModel";
import { partitionGroupedRows } from "../grouping/groupRows";
import {
  applyRowPatchesToView,
  applyRowPatchLogToView,
  createIncrementalView,
  incrementalSearchText,
  type IncrementalViewConfig,
} from "./incremental";
import {
  addAggregateRow,
  createIncrementalAggregate,
  readIncrementalAggregate,
  removeAggregateRow,
} from "./incrementalAggregate";
import {
  addGroupedRow,
  incrementalGroupTree,
  removeGroupedRow,
  rowGroupPath,
  snapshotPartitions,
} from "./incrementalGroup";
import {
  applyRowPatchesWithLog,
  insertRow,
  removeRow,
  updateRow,
} from "./patch";

interface Person {
  id: string;
  name: string;
  team: string;
  budget: number;
  status: string;
}

const ROWS: Person[] = [
  { id: "1", name: "Ada", team: "Core", budget: 100, status: "active" },
  { id: "2", name: "Alan", team: "Web", budget: 40, status: "blocked" },
  { id: "3", name: "Grace", team: "Core", budget: 80, status: "active" },
];
const byId = (row: Person) => row.id;
const COLS: ColumnModel<Person>[] = [
  { key: "team" },
  { key: "budget", exportValue: (row) => row.budget },
  { key: "name", exportValue: (row) => row.name },
];

describe("incrementalSearchText", () => {
  it("flattens objects, stringifies nested values, and stringifies primitives", () => {
    expect(incrementalSearchText({ a: 1, b: null, c: { d: 2 } })).toContain(
      '{"d":2}'
    );
    expect(incrementalSearchText("Ada")).toBe("Ada");
    expect(incrementalSearchText(undefined)).toBe("");
  });
});

function apply(
  view: ReturnType<typeof createIncrementalView<Person>>,
  patches: Parameters<typeof applyRowPatchesToView<Person>>[1]
) {
  return applyRowPatchesToView<Person>(view, patches);
}

describe("applyRowPatchesToView — remaining branches", () => {
  it("refuses applyRowPatchLogToView on a snapshot it did not create", () => {
    const fake = {
      rows: ROWS,
      filtered: ROWS,
      sorted: ROWS,
      groups: undefined,
      aggregates: undefined,
    };
    const log = applyRowPatchesWithLog(
      ROWS,
      [updateRow<Person>("1", { budget: 1 })],
      byId
    );
    expect(() => applyRowPatchLogToView(fake, log)).toThrow(
      /createIncrementalView/
    );
  });

  it("inserts a non-matching row without letting it into the filtered set", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      filterFn: (row) => row.team === "Core",
      extra: {},
    };
    const view = createIncrementalView(ROWS, config);
    const next = apply(view, [
      insertRow<Person>({
        id: "9",
        name: "Out",
        team: "Labs",
        budget: 1,
        status: "active",
      }),
    ]);
    expect(next.filtered.map((row) => row.id)).toEqual(["1", "3"]);
    expect(next.rows.map((row) => row.id)).toContain("9");
  });

  it("removing a row that was already filtered out is a no-op on filtered", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      filterFn: (row) => row.team === "Core",
      extra: {},
    };
    const view = createIncrementalView(ROWS, config);
    const next = apply(view, [removeRow("2")]);
    expect(next.filtered.map((row) => row.id)).toEqual(["1", "3"]);
    expect(next.rows.map((row) => row.id)).toEqual(["1", "3"]);
  });

  it("an update that stays outside the filter does not sneak in", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      filterFn: (row) => row.team === "Core",
      extra: {},
    };
    const view = createIncrementalView(ROWS, config);
    const next = apply(view, [updateRow("2", { budget: 99 })]);
    expect(next.filtered.map((row) => row.id)).toEqual(["1", "3"]);
  });

  it("resolves sort through getSortValue and through a non-primitive accessor", () => {
    const byBudget: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      getSortValue: (row) => row.budget,
      sortBy: "budget",
      sortDir: "asc",
    };
    const moved = apply(createIncrementalView(ROWS, byBudget), [
      updateRow("1", { budget: 10 }),
    ]);
    expect(moved.sorted.map((row) => row.id)[0]).toBe("1");

    const byAccessor: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      sortBy: "name",
      sortDir: "asc",
    };
    const named = apply(createIncrementalView(ROWS, byAccessor), [
      updateRow("3", { name: "Aardvark" }),
    ]);
    expect(named.sorted.map((row) => row.id)).toEqual(["3", "1", "2"]);
  });

  it("uses a custom search projector and paints group cells from aggregateSpec", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      getSearchText: (row) => row.team,
      search: "web",
      groupBy: "team",
      aggregateSpec: { budget: "sum" },
      aggregateOptions: { columns: COLS },
    };
    const view = createIncrementalView(ROWS, config);
    expect(view.filtered.map((row) => row.id)).toEqual(["2"]);
    const next = apply(view, [updateRow("1", { team: "Web" })]);
    expect(next.filtered.map((row) => row.id)).toEqual(["1", "2"]);
    const header = next.groups?.find((entry) => entry.kind === "group");
    expect(header?.kind === "group" && header.aggregateCells).toEqual({
      budget: 140,
    });
  });

  it("removes a grouped row and drops an emptied bucket", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      groupBy: "team",
      groupAggregates: (rows) => ({ n: rows.length }),
    };
    const view = createIncrementalView(ROWS, config);
    const next = apply(view, [removeRow("2")]);
    expect(
      next.groups?.some(
        (entry) => entry.kind === "group" && entry.label === "Web"
      )
    ).toBe(false);
    expect(
      next.groups?.find(
        (entry) => entry.kind === "group" && entry.label === "Core"
      )
    ).toMatchObject({ aggregateCells: { n: 2 } });
  });

  it("honours groupSort, groupFilter, collapse and a custom search miss", () => {
    const config: IncrementalViewConfig<Person> = {
      getRowId: byId,
      columns: COLS,
      groupBy: "team",
      groupSort: "label",
      groupFilter: (group) => group.label !== "Web",
      collapsedGroupIds: new Set(["group:team:s:Core"]),
      blankLabel: "—",
      groupPageSize: 10,
      rowPageSize: 10,
    };
    const view = createIncrementalView(ROWS, config);
    const next = apply(view, [updateRow("1", { budget: 1 })]);
    expect(
      next.groups?.some(
        (entry) => entry.kind === "group" && entry.label === "Web"
      )
    ).toBe(false);
    expect(
      next.groups?.find(
        (entry) => entry.kind === "group" && entry.label === "Core"
      )
    ).toMatchObject({ collapsed: true });
  });
});

describe("incremental aggregates — built-ins and rescans", () => {
  it("computes avg, count and max, then empties them when the last row leaves", () => {
    const spec = { budget: "avg", team: "count", score: "max" } as const;
    const rows = ROWS.map((row) => ({ ...row, score: row.budget }));
    const state = createIncrementalAggregate(spec, rows, {
      columns: [{ key: "budget" }, { key: "team" }, { key: "score" }],
      format: (value) => value,
    });
    expect(readIncrementalAggregate(state, rows)).toEqual({
      budget: 220 / 3,
      team: 3,
      score: 100,
    });
    for (const row of rows) removeAggregateRow(state, row);
    expect(readIncrementalAggregate(state, [])).toEqual({
      budget: undefined,
      team: 0,
      score: undefined,
    });
  });

  it("skips a non-numeric value and rescans when the min leaves", () => {
    const rows = [
      { id: "a", budget: 5 },
      { id: "b", budget: "x" },
      { id: "c", budget: 9 },
    ];
    const state = createIncrementalAggregate({ budget: "min" }, rows);
    expect(readIncrementalAggregate(state, rows)).toEqual({ budget: 5 });
    removeAggregateRow(state, rows[0]!);
    addAggregateRow(state, { id: "d", budget: 2 });
    expect(
      readIncrementalAggregate(state, [
        { id: "b", budget: "x" },
        { id: "c", budget: 9 },
        { id: "d", budget: 2 },
      ])
    ).toEqual({ budget: 2 });
  });

  it("keeps ISO date min/max consistent with a full aggregate pass", () => {
    const rows = [
      { id: "a", started: "2024-03-01" },
      { id: "b", started: "2024-01-15" },
      { id: "c", started: "2024-02-01" },
    ];
    const state = createIncrementalAggregate({ started: "min" }, rows);
    expect(readIncrementalAggregate(state, rows)).toEqual({
      started: "2024-01-15",
    });
    removeAggregateRow(state, rows[1]!);
    expect(readIncrementalAggregate(state, [rows[0]!, rows[2]!])).toEqual({
      started: "2024-02-01",
    });
  });

  it("falls back to a full pass for a custom aggregator", () => {
    const rows = [
      { id: "a", team: "Core" },
      { id: "b", team: "Web" },
    ];
    const state = createIncrementalAggregate(
      { team: (values) => new Set(values).size },
      rows
    );
    addAggregateRow(state, { id: "c", team: "Core" });
    expect(
      readIncrementalAggregate(state, [...rows, { id: "c", team: "Core" }])
    ).toEqual({ team: 2 });
  });
});

describe("incremental group tree — misses and empty buckets", () => {
  it("is a no-op when the path is not in the tree", () => {
    const columns = [{ key: "team" }];
    const tree = incrementalGroupTree(
      partitionGroupedRows(ROWS, "team", columns),
      "team",
      columns
    );
    const before = snapshotPartitions(tree);
    removeGroupedRow(
      tree,
      "missing",
      [{ valueKey: "s:Nowhere" }],
      new Map(),
      byId
    );
    expect(snapshotPartitions(tree)).toEqual(before);
  });

  it("places a new group by first-seen when the sorted index is missing", () => {
    const columns = [{ key: "team" }];
    const tree = incrementalGroupTree(
      partitionGroupedRows(ROWS, "team", columns),
      "team",
      columns
    );
    const row = {
      id: "9",
      name: "New",
      team: "Labs",
      budget: 1,
      status: "active",
    };
    addGroupedRow(
      tree,
      row,
      rowGroupPath(row, ["team"], columns),
      new Map(),
      byId
    );
    expect(snapshotPartitions(tree).map((part) => part.valueKey)).toContain(
      "s:Labs"
    );
  });

  it("drops a leaf that is not in the bucket without throwing", () => {
    const columns = [{ key: "team" }];
    const tree = incrementalGroupTree(
      partitionGroupedRows(ROWS, "team", columns),
      "team",
      columns
    );
    removeGroupedRow(
      tree,
      "missing",
      [{ valueKey: "s:Core" }],
      new Map([["1", 0]]),
      byId
    );
    expect(
      snapshotPartitions(tree).find((part) => part.valueKey === "s:Core")?.rows
    ).toHaveLength(2);
  });
});
