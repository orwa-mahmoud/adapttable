import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../contracts/columns";
import type { QueryGroupRow } from "../source/queryGroups";
import { createControllableStore } from "../state/controllableStore";
import { groupCollapseActions } from "./groupCollapse";
import {
  groupingCollapseCommands,
  groupingProjectionBundle,
  groupingShowMoreAction,
  groupingSourceOf,
  projectedGroupingSource,
  projectGrouping,
} from "./groupingProjection";
import { createGroupPagingController } from "./groupPaging";

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

const pageSlice: Row[] = [{ id: "9", team: "z", budget: 1 }];

const columns: ColumnMetadata<Row>[] = [
  { key: "team", header: "Team" },
  { key: "budget", header: "Budget", aggregatable: true, filter: "number" },
];

const getRowId = (row: Row) => row.id;

function project(
  overrides: Partial<Parameters<typeof projectGrouping<Row>>[0]> = {}
) {
  return projectGrouping({
    groupByKeys: ["team"],
    source: { allFilteredRows: rows },
    columns,
    getRowId,
    collapsedGroupIds: new Set<string>(),
    ...overrides,
  });
}

describe("projectGrouping", () => {
  it("groups the full filtered set and warns only when the source cannot", () => {
    const open = project({
      source: {
        allFilteredRows: rows,
        groupAggregateOverrides: { budget: "sum" },
      },
    });
    expect(open.ignoredWarning).toBeUndefined();
    expect(open.model?.openGroups).toHaveLength(2);
    const group = open.model?.entries.find((entry) => entry.kind === "group");
    expect(
      group && "aggregateCells" in group ? group.aggregateCells : {}
    ).toMatchObject({
      budget: 40,
    });

    const denied = project({ source: {} });
    expect(denied.model).toBeUndefined();
    expect(denied.ignoredWarning).toMatch(/groupBy is ignored/);
    expect(project({ groupByKeys: [] }).model).toBeUndefined();
  });

  it("reads server groups and does not regroup a loaded page", () => {
    const groups: QueryGroupRow<Row>[] = [
      {
        value: "a",
        count: 2,
        rows: [rows[0]!, rows[2]!],
        aggregates: { budget: 40 },
      },
    ];
    const source = groupingSourceOf({
      allFilteredRows: pageSlice,
      groups,
      capabilities: { grouping: "server" } as never,
      groupAggregations: { budget: "sum" },
    });
    expect(source.allFilteredRows).toBe(pageSlice);
    const projected = project({ source });
    const values = projected.model?.entries.flatMap((entry) =>
      entry.kind === "group" ? [entry.value] : []
    );
    expect(values).toEqual(["a"]);

    const unanswered = project({
      source: groupingSourceOf({
        allFilteredRows: pageSlice,
        capabilities: { grouping: "server" } as never,
      }),
    });
    expect(unanswered.model).toBeUndefined();
  });

  it("follows the collapse store and the paging controller it is given", () => {
    const store = createControllableStore<ReadonlySet<string>>(new Set());
    const collapse = groupCollapseActions(store);
    const paging = createGroupPagingController();
    const listener = vi.fn();
    const stop = paging.subscribe(listener);

    const open = project({ collapsedGroupIds: store.getSnapshot() });
    const commands = groupingCollapseCommands(
      open.model?.openGroups ?? [],
      collapse
    );
    expect(commands.expandAll).toBe(collapse.expandAll);
    commands.collapseAll();
    const closed = project({ collapsedGroupIds: store.getSnapshot() });
    const openRows = open.model?.entries.filter(
      (entry) => entry.kind === "row"
    ).length;
    const closedRows = closed.model?.entries.filter(
      (entry) => entry.kind === "row"
    ).length;
    expect(openRows).toBeGreaterThan(0);
    expect(closedRows).toBe(0);

    const paged = project({
      groupPageSize: 1,
      paging: paging.getSnapshot(),
    });
    const before = paged.model?.entries.filter(
      (entry) => entry.kind === "group"
    ).length;
    groupingShowMoreAction({ scope: "groups" }, { groupPageSize: 1 }, paging);
    expect(listener).toHaveBeenCalledTimes(1);
    const after = project({
      groupPageSize: 1,
      paging: paging.getSnapshot(),
    }).model?.entries.filter((entry) => entry.kind === "group").length;
    expect(before).toBe(1);
    expect(after).toBe(2);
    stop();
  });

  it("widens only while a model exists, and an inactive view ignores writes", () => {
    const source = {
      rows: pageSlice,
      allFilteredRows: rows,
      page: 3,
      limit: 1,
    };
    const projected = project();
    expect(projectedGroupingSource(source, projected).rows).toBe(rows);
    expect(projectedGroupingSource(source, { model: undefined })).toBe(source);

    const setGroupBy = vi.fn();
    const onGroupLoadMore = vi.fn();
    const paging = { showMore: vi.fn() };
    const bundle = groupingProjectionBundle({
      groupBy: ["team"],
      projection: projected,
      collapsed: groupCollapseActions(
        createControllableStore<ReadonlySet<string>>(new Set())
      ),
      setGroupBy,
      paging,
      groupRowPageSize: 2,
      onGroupLoadMore,
      whenActive: () => false,
    });
    bundle?.setGroupBy("team");
    bundle?.showMore({ scope: "rows", groupKey: "team:a" });
    expect(setGroupBy).not.toHaveBeenCalled();
    expect(paging.showMore).not.toHaveBeenCalled();
    expect(onGroupLoadMore).not.toHaveBeenCalled();

    const live = groupingProjectionBundle({
      groupBy: ["team"],
      projection: projected,
      collapsed: groupCollapseActions(
        createControllableStore<ReadonlySet<string>>(new Set())
      ),
      setGroupBy,
      paging,
      groupRowPageSize: 2,
      onGroupLoadMore,
    });
    live?.setGroupBy("team");
    live?.showMore({ scope: "rows", groupKey: "team:a" });
    expect(setGroupBy).toHaveBeenCalledWith("team");
    expect(paging.showMore).toHaveBeenCalledWith(2, "team:a");
    expect(onGroupLoadMore).toHaveBeenCalledWith("team:a");
  });
});
