import { describe, expect, it, vi } from "vitest";

import { aggregate } from "../aggregate/aggregate";
import type { ColumnMetadata } from "../contracts/columns";
import type { QueryGroupRow } from "../source/queryGroups";
import { createControllableStore } from "../state/controllableStore";
import { groupCollapseActions } from "./groupCollapse";
import {
  groupedRowModel,
  groupedViewSource,
  groupingAggregates,
  groupingAggregationSource,
  groupingIgnoredWarning,
  groupingPanelAggregations,
  type GroupingRuntimeSource,
  groupShowMoreRequest,
} from "./groupingRuntime";
import { advanceGroupPaging, createGroupPagingController } from "./groupPaging";

interface Row {
  id: string;
  team: string;
  budget: number;
}

const rows: Row[] = [
  { id: "1", team: "a", budget: 10 },
  { id: "2", team: "b", budget: 20 },
  { id: "3", team: "a", budget: 30 },
];

const columns: ColumnMetadata<Row>[] = [
  { key: "team", header: "Team" },
  { key: "budget", header: "Budget", aggregatable: true, filter: "number" },
];

const getRowId = (row: Row) => row.id;

describe("groupingAggregationSource", () => {
  it("reads where grouping runs and what the backend lists", () => {
    expect(groupingAggregationSource({ allFilteredRows: rows })).toEqual({
      grouping: "client",
      aggregateOperations: undefined,
    });
    expect(
      groupingAggregationSource({
        capabilities: { grouping: "server" } as never,
        aggregateOperations: ["sum"],
      })
    ).toEqual({ grouping: "server", aggregateOperations: ["sum"] });
    expect(
      groupingAggregationSource({
        aggregateOperations: ["sum"],
        honorsAggregates: false,
      }).aggregateOperations
    ).toEqual([]);
  });
});

describe("groupingIgnoredWarning", () => {
  it("warns only when keys are asked for and the source cannot group", () => {
    expect(groupingIgnoredWarning([], {})).toBeUndefined();
    expect(
      groupingIgnoredWarning(["team"], { allFilteredRows: rows })
    ).toBeUndefined();
    expect(groupingIgnoredWarning(["team"], {})).toMatch(
      /^groupBy is ignored: .* Grouping needs either the full filtered set/
    );
  });
});

describe("groupingAggregates", () => {
  it("applies reader overrides and keys the result on them", () => {
    const source: GroupingRuntimeSource<Row> = {
      allFilteredRows: rows,
      groupAggregateOverrides: { budget: "sum" },
    };
    const resolved = groupingAggregates({ source, columns });
    expect(resolved.aggregates?.(rows)).toMatchObject({ budget: 60 });
    expect(resolved.declared).toEqual({ budget: "sum" });
    expect(resolved.derivedKey).toContain("budget:sum");
    expect(resolved.source.grouping).toBe("client");
  });

  it("takes the mapper's declaration, else the panel's", () => {
    const fromMapper = groupingAggregates({
      source: { allFilteredRows: rows },
      columns,
      groupAggregates: aggregate({ budget: "max" }),
      panelDeclared: { budget: "min" },
    });
    expect(fromMapper.declared).toEqual({ budget: "max" });
    const fromPanel = groupingAggregates({
      source: {},
      columns,
      panelDeclared: { budget: "min" },
    });
    expect(fromPanel.declared).toEqual({ budget: "min" });
  });
});

describe("groupedRowModel", () => {
  const base = {
    columns,
    getRowId,
    collapsedGroupIds: new Set<string>(),
  };

  it("builds nothing without keys or a source that can group", () => {
    const aggregates = groupingAggregates({ source: {}, columns });
    expect(
      groupedRowModel({ ...base, groupByKeys: [], source: {}, aggregates })
    ).toBeUndefined();
    expect(
      groupedRowModel({
        ...base,
        groupByKeys: ["team"],
        source: {},
        aggregates,
      })
    ).toBeUndefined();
  });

  it("groups the full filtered set with the applied operations", () => {
    const source: GroupingRuntimeSource<Row> = {
      allFilteredRows: rows,
      groupAggregateOverrides: { budget: "sum" },
    };
    const model = groupedRowModel({
      ...base,
      groupByKeys: ["team"],
      source,
      aggregates: groupingAggregates({ source, columns }),
      groupFooters: true,
      extraRows: [{ key: "sep", kind: "separator" }],
    });
    expect(model?.openGroups).toEqual([
      { key: expect.stringContaining("a"), level: 0 },
      { key: expect.stringContaining("b"), level: 0 },
    ]);
    const kinds = model?.entries.map((entry) => entry.kind);
    expect(kinds).toContain("group");
    expect(kinds).toContain("groupFooter");
    expect(kinds?.at(-1)).toBe("separator");
    const group = model?.entries.find((entry) => entry.kind === "group") as {
      aggregateCells?: Record<string, unknown>;
      aggregateOps?: Record<string, string>;
    };
    expect(group.aggregateCells).toMatchObject({ budget: 40 });
  });

  it("reads server groups and their response's operations", () => {
    const groups: QueryGroupRow<Row>[] = [
      {
        value: "a",
        count: 2,
        rows: [rows[0]!, rows[2]!],
        aggregates: { budget: 40 },
      },
    ];
    const source: GroupingRuntimeSource<Row> = {
      groups,
      capabilities: { grouping: "server" } as never,
      groupAggregations: { budget: "sum" },
    };
    const model = groupedRowModel({
      ...base,
      groupByKeys: ["team"],
      source,
      aggregates: groupingAggregates({ source, columns }),
    });
    expect(model?.entries.length).toBeGreaterThan(0);
    expect(model?.openGroups.length).toBe(1);
  });
});

describe("show more and the widened source", () => {
  it("pages groups or one group's rows, fetching the rows' rest", () => {
    expect(
      groupShowMoreRequest({ scope: "groups" }, { groupPageSize: 5 })
    ).toEqual({ pageSize: 5, groupKey: undefined, loadMoreKey: undefined });
    expect(
      groupShowMoreRequest(
        { scope: "rows", groupKey: "team:a" },
        { groupRowPageSize: 3 }
      )
    ).toEqual({ pageSize: 3, groupKey: "team:a", loadMoreKey: "team:a" });
    expect(groupShowMoreRequest({ scope: "rows" }, {})).toEqual({
      pageSize: 0,
      groupKey: undefined,
      loadMoreKey: undefined,
    });
    expect(groupShowMoreRequest({ scope: "groups" }, {}).pageSize).toBe(0);
  });

  it("renders a grouped table from the full filtered set as one page", () => {
    const source = {
      rows: [rows[0]!],
      allFilteredRows: rows,
      page: 3,
      limit: 1,
    };
    expect(groupedViewSource(source)).toMatchObject({
      rows,
      page: 1,
      limit: 3,
      total: 3,
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    expect(groupedViewSource({ allFilteredRows: [] })).toMatchObject({
      limit: 1,
    });
    const paged: { rows: Row[]; allFilteredRows?: Row[] } = {
      rows: [rows[0]!],
    };
    expect(groupedViewSource(paged)).toBe(paged);
  });
});

describe("groupingPanelAggregations", () => {
  it("lists active aggregations from the model's computed keys", () => {
    const source: GroupingRuntimeSource<Row> = {
      allFilteredRows: rows,
      groupAggregateOverrides: { budget: "sum" },
    };
    const model = groupingPanelAggregations({ source, columns });
    expect(model.items.map((item) => item.columnKey)).toEqual(["budget"]);
    const withEntries = groupingPanelAggregations({
      source: {},
      columns,
      entries: [{ kind: "group", aggregateCells: { budget: 1 } }],
    });
    expect(withEntries.items.map((item) => item.columnKey)).toEqual(["budget"]);
  });
});

describe("group paging", () => {
  it("advances the top level or one group", () => {
    expect(advanceGroupPaging({}, 5)).toEqual({ groups: 5 });
    expect(advanceGroupPaging({ groups: 5 }, 5)).toEqual({ groups: 10 });
    expect(advanceGroupPaging({}, 2, "g")).toEqual({ rows: { g: 2 } });
    expect(advanceGroupPaging({ rows: { g: 2 } }, 2, "g")).toEqual({
      rows: { g: 4 },
    });
  });

  it("notifies on every change and resets to the first page", () => {
    const controller = createGroupPagingController();
    const listener = vi.fn();
    const stop = controller.subscribe(listener);
    controller.showMore(5);
    controller.showMore(2, "g");
    expect(controller.getSnapshot()).toEqual({ groups: 5, rows: { g: 2 } });
    controller.reset();
    expect(controller.getSnapshot()).toEqual({});
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    controller.showMore(1);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

describe("group collapse actions", () => {
  it("toggles, opens, closes and closes to a depth", () => {
    const store = createControllableStore<ReadonlySet<string>>(new Set());
    const actions = groupCollapseActions(store);
    actions.toggle("a");
    expect([...store.getSnapshot()]).toEqual(["a"]);
    actions.toggle("a");
    expect(store.getSnapshot().size).toBe(0);
    actions.collapseAll(["a", "b"]);
    expect([...store.getSnapshot()]).toEqual(["a", "b"]);
    actions.expandAll();
    expect(store.getSnapshot().size).toBe(0);
    actions.collapseToDepth(1, [
      { key: "a", level: 0 },
      { key: "a/x", level: 1 },
    ]);
    expect([...store.getSnapshot()]).toEqual(["a/x"]);
  });
});
