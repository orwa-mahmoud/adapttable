/**
 * The live grouped model — what a grouped table renders from.
 */
import { createMemoryAdapter, type TableSource } from "@adapttable/core";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { injectDataTable } from "../dataTable";
import type { AdaptTableFeature } from "../featureHost";
import { injectFrontendData } from "../source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { grouping, injectGrouping, type TableGrouping } from "./grouping";
import { groupingPanel } from "./groupingPanel";

interface Task {
  id: string;
  team: string;
  status: string;
  points: number;
}

const TASKS: Task[] = [
  { id: "1", team: "Core", status: "open", points: 3 },
  { id: "2", team: "Web", status: "done", points: 5 },
  { id: "3", team: "Core", status: "done", points: 2 },
  { id: "4", team: "Core", status: "open", points: 4 },
];

const COLUMNS: ColumnDef<Task>[] = [
  { key: "team", header: "Team" },
  { key: "status", header: "Status" },
  { key: "points", header: "Points" },
];

/** Headers as `label (level)` and leaves as ids, in render order. */
function outline(model: TableGrouping<Task> | undefined): string[] {
  return (model?.entries ?? []).map((entry) => {
    if (entry.kind === "group") return `${entry.label}@${String(entry.level)}`;
    if (entry.kind === "row") return entry.row.id;
    return entry.kind;
  });
}

let features: readonly AdaptTableFeature[] = [];
let sourceOverride:
  ((source: TableSource<Task>) => TableSource<Task>) | undefined;

@Component({ template: "" })
class Host {
  private readonly tasks = signal(TASKS);
  readonly source = injectFrontendData<Task>({
    data: this.tasks,
    columns: COLUMNS,
    getRowId: (row) => row.id,
  });
  private readonly table = injectDataTable<Task>({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
    features,
  });
  readonly grouping = injectGrouping<Task>({
    table: this.table,
    source: computed(() => {
      const current = this.source();
      return sourceOverride ? sourceOverride(current) : current;
    }),
    features,
  });
}

function mount(next: readonly AdaptTableFeature[]) {
  features = next;
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  return fixture.componentInstance;
}

describe("injectGrouping", () => {
  beforeEach(() => {
    sourceOverride = undefined;
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
  });

  it("is absent when neither grouping nor the panel is composed", () => {
    expect(mount([]).grouping).toBeUndefined();
  });

  it("builds headers and leaves, with each group's subtotal", () => {
    const host = mount([
      grouping<Task>("team", {
        groupAggregates: (rows) => ({
          points: rows.reduce((sum, row) => sum + row.points, 0),
        }),
      }),
    ]);
    const model = host.grouping!();
    expect(model?.groupBy).toEqual(["team"]);
    expect(outline(model)).toEqual(["Core@0", "1", "3", "4", "Web@0", "2"]);
    const headers = model!.entries.filter((entry) => entry.kind === "group");
    expect(headers.map((entry) => entry.aggregateCells)).toEqual([
      { points: 9 },
      { points: 5 },
    ]);
  });

  it("nests by several keys and collapses to a depth", () => {
    const host = mount([grouping(["team", "status"])]);
    expect(outline(host.grouping!())).toEqual([
      "Core@0",
      "open@1",
      "1",
      "4",
      "done@1",
      "3",
      "Web@0",
      "done@1",
      "2",
    ]);
    host.grouping!()!.collapseToDepth(1);
    expect(outline(host.grouping!())).toEqual([
      "Core@0",
      "open@1",
      "done@1",
      "Web@0",
      "done@1",
    ]);
    host.grouping!()!.collapseAll();
    expect(outline(host.grouping!())).toEqual(["Core@0", "Web@0"]);
    host.grouping!()!.expandAll();
    expect(outline(host.grouping!())).toHaveLength(9);
  });

  it("hides a collapsed group's leaves", () => {
    const host = mount([grouping("team")]);
    const core = host.grouping!()!.entries[0]!;
    host.grouping!()!.collapsed.toggle(core.key);
    expect(outline(host.grouping!())).toEqual(["Core@0", "Web@0", "2"]);
  });

  it("reveals the next page of groups and asks the host for a group's rows", () => {
    const onGroupLoadMore = vi.fn();
    const host = mount([
      grouping("team", {
        groupPageSize: 1,
        groupRowPageSize: 1,
        onGroupLoadMore,
      }),
    ]);
    const first = host.grouping!()!;
    expect(first.entries.map((entry) => entry.kind)).toEqual([
      "group",
      "row",
      "groupMore",
      "groupMore",
    ]);
    first.showMore({ scope: "groups" });
    expect(outline(host.grouping!())).toContain("Web@0");
    first.showMore({ scope: "rows", groupKey: "group:team:Core" });
    expect(onGroupLoadMore).toHaveBeenCalledExactlyOnceWith("group:team:Core");
  });

  it("changes the keys through the source and tells the host", () => {
    const onGroupByChange = vi.fn();
    const host = mount([groupingPanel(["team"], { onGroupByChange })]);
    expect(host.grouping!()).toBeUndefined();
    host.source().setGroupBy("team");
    expect(outline(host.grouping!())[0]).toBe("Core@0");
    host.grouping!()!.setGroupBy(["status"]);
    expect(host.source().groupBy).toBe("status");
    expect(onGroupByChange).toHaveBeenCalledExactlyOnceWith(["status"]);
    expect(outline(host.grouping!())[0]).toBe("open@0");
  });

  it("warns and stays flat when the source cannot group", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    sourceOverride = (source) => ({ ...source, allFilteredRows: undefined });
    const host = mount([grouping("team")]);
    expect(host.grouping!()).toBeUndefined();
    TestBed.tick();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("groupBy is ignored")
    );
    warn.mockRestore();
  });
});
