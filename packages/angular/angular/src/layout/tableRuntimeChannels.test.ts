/** Live runtime channels and source-engine ownership across Angular updates. */
import {
  type BulkAction,
  type RowAction,
  type TableSource,
} from "@adapttable/core";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { injectDataTable } from "../dataTable";
import { injectFrontendData } from "../source/frontendData";
import { type RuntimeTableOptions, tableRuntimeFor } from "./tableRuntime";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];
const actions: readonly RowAction<Row>[] = [
  { key: "row", label: "Row action", onClick: vi.fn() },
];
const bulk: readonly BulkAction[] = [
  { key: "bulk", label: "Bulk action", onClick: vi.fn() },
];

@Component({ template: "" })
class Host {
  readonly source = injectFrontendData({
    data: ROWS,
    columns: [{ key: "name" }],
    urlSync: false,
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: [{ key: "name" }],
    rowKey: (row) => row.id,
  });
  readonly options = signal<RuntimeTableOptions<Row>>({});
  readonly runtime = tableRuntimeFor(
    this.table,
    this.source,
    [{ id: "first" }, {}],
    undefined,
    this.options
  );
}

const OTHER_ROWS: Row[] = [
  { id: "3", name: "Katherine" },
  { id: "4", name: "Dorothy" },
];
const SERVER_ROWS: Row[] = [{ id: "5", name: "Mary" }];

@Component({
  template: `
    @for (row of table.rows(); track row.id) {
      <output>{{ row.name }}</output>
    }
  `,
})
class SwitchingSourceHost {
  readonly first = injectFrontendData({
    data: ROWS,
    columns: [{ key: "name" }],
    defaults: { limit: 1 },
    paginationMode: "paged",
    urlSync: false,
  });
  readonly second = injectFrontendData({
    data: OTHER_ROWS,
    columns: [{ key: "id" }, { key: "name" }],
    defaults: { limit: 1 },
    paginationMode: "paged",
    urlSync: false,
  });
  readonly selected = signal<"first" | "second" | "server">("first");
  readonly source = computed<TableSource<Row>>(() => {
    if (this.selected() === "second") return this.second();
    if (this.selected() === "server") {
      return {
        ...this.first(),
        rows: SERVER_ROWS,
        total: 1,
        tableEngine: undefined,
      };
    }
    return this.first();
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: [{ key: "name" }],
    rowKey: (row) => row.id,
  });
  readonly options = signal<RuntimeTableOptions<Row>>({});
  readonly runtime = tableRuntimeFor(
    this.table,
    this.source,
    [],
    undefined,
    this.options
  );
}

describe("runtime projection channels", () => {
  it("reads and subscribes to the replacement source's engine without disposing either source", async () => {
    const fixture = TestBed.createComponent(SwitchingSourceHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const firstEngine = host.first().tableEngine!;
    const secondEngine = host.second().tableEngine!;
    const disposeFirst = vi.spyOn(firstEngine, "dispose");
    const disposeSecond = vi.spyOn(secondEngine, "dispose");
    const first = host.runtime.view()!.neutralTable!;
    const firstChanges = vi.fn();
    const unsubscribeFirst = first.subscribe("all", firstChanges);
    expect(first.rows("page")).toEqual([ROWS[0]]);

    host.selected.set("second");
    await fixture.whenStable();
    const second = host.runtime.view()!.neutralTable!;
    expect(second).not.toBe(first);
    expect(second.tableId).toBe(secondEngine.tableId);
    expect(second.columns.map((column) => column.key)).toEqual(["id", "name"]);
    expect(second.rows("visible")).toEqual([OTHER_ROWS[0]]);
    expect(second.rows("page")).toEqual([OTHER_ROWS[0]]);
    expect(second.rows("full")).toEqual(OTHER_ROWS);
    expect(second.rowByKey("3")).toBe(OTHER_ROWS[0]);
    expect(second.rowByKey("1")).toBeUndefined();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector("output")
        ?.textContent
    ).toBe("Katherine");

    const secondChanges = vi.fn();
    const unsubscribeSecond = second.subscribe("all", secondChanges);
    host.second().setSearch("Dorothy");
    await fixture.whenStable();
    expect(secondChanges).toHaveBeenLastCalledWith(second.revisions);
    expect(firstChanges).not.toHaveBeenCalled();
    expect(host.runtime.view()!.neutralTable).toBe(second);
    expect(second.rows("page")).toEqual([OTHER_ROWS[1]]);
    expect(first.rows("page")).toEqual([ROWS[0]]);
    expect(disposeFirst).not.toHaveBeenCalled();
    expect(disposeSecond).not.toHaveBeenCalled();
    unsubscribeFirst();
    unsubscribeSecond();
    fixture.destroy();
  });

  it("starts a fresh reader after a server interval while keeping ordinary capability updates on that reader", async () => {
    const fixture = TestBed.createComponent(SwitchingSourceHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const first = host.runtime.view()!.neutralTable!;
    host.selected.set("server");
    await fixture.whenStable();
    expect(host.runtime.view()!.neutralTable).toBeUndefined();
    expect(host.runtime.rowAt(0)).toBe(SERVER_ROWS[0]);
    expect(first.rows("visible")).toEqual([ROWS[0]]);

    host.selected.set("first");
    await fixture.whenStable();
    const returned = host.runtime.view()!.neutralTable!;
    expect(returned).not.toBe(first);
    expect(returned.tableId).toBe(host.first().tableEngine!.tableId);
    expect(returned.rows("page")).toEqual([ROWS[0]]);
    host.options.set({ columnLayoutLive: true });
    expect(host.runtime.view()!.neutralTable).toBe(returned);
    expect(returned.operations.hideColumn).toBe(true);
    host.options.set({});
    expect(host.runtime.view()!.neutralTable).toBe(returned);
    expect(returned.operations.hideColumn).not.toBe(true);
    fixture.destroy();
  });

  it("preserves the neutral reader while tree rows and live capabilities change", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const neutral = host.runtime.view()!.neutralTable!;
    expect(host.runtime.featureIds()).toEqual(["first", "feature-1"]);
    expect(host.runtime.labels()).toBe(host.table.labels());
    expect(host.runtime.rowAt(9)).toBeUndefined();
    expect(host.runtime.view()!.columnLayout).toBeUndefined();
    host.options.set({
      tree: { entries: [{ row: ROWS[1]! }] },
      columnLayoutLive: true,
      rowActions: actions,
      bulkActions: bulk,
    });
    expect(host.runtime.view()!.neutralTable).toBe(neutral);
    expect(host.runtime.rowAt(0)).toBe(ROWS[1]);
    expect(neutral.rows("visible")).toEqual([ROWS[1]]);
    expect(host.runtime.view()!.actions).toEqual({ row: actions, bulk });
    expect(host.runtime.view()!.columnLayout?.keys).toEqual(["name"]);
    expect(neutral.operations.hideColumn).toBe(true);
    host.options.set({});
    expect(host.runtime.view()!.actions).toBeUndefined();
    expect(host.runtime.rowAt(0)).toBe(ROWS[0]);
    expect(host.runtime.view()!.columnLayout).toBeUndefined();
    expect(neutral.operations.hideColumn).not.toBe(true);
    fixture.destroy();
  });

  it("forwards direct and staged edits and retracts only the removed channel", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const direct = vi.fn();
    const staged = vi.fn();
    host.options.set({
      editing: { onCellEdit: direct, batch: { setDraft: staged } },
    });
    host.runtime.view()!.editing!.onCellEdit!(ROWS[0]!, "name", "Direct");
    host.runtime.view()!.editing!.stageCell!(ROWS[0]!, "1", "name", "Staged");
    expect(direct).toHaveBeenCalledWith(ROWS[0], "name", "Direct");
    expect(staged).toHaveBeenCalledWith(ROWS[0], "1", "name", "Staged");
    host.options.set({ editing: { batch: { setDraft: staged } } });
    expect(host.runtime.view()!.editing!.onCellEdit).toBeUndefined();
    expect(host.runtime.view()!.editing!.stageCell).toBeTypeOf("function");
    host.options.set({});
    expect(host.runtime.view()!.editing).toBeUndefined();
    fixture.destroy();
  });
});
