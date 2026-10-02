/** Mounted runtime channels and admission flushing through the real kit. */
import {
  type AdaptTableFeature,
  type ColumnDef,
  type ColumnLayoutState,
  type FeatureMountContext,
  provideAdaptTableFeatures,
} from "@adapttable/angular";
import { batchEditing } from "@adapttable/angular-unstyled/batch-editing";
import { columnMenu } from "@adapttable/angular-unstyled/column-menu";
import { editing } from "@adapttable/angular-unstyled/editing";
import { filters } from "@adapttable/angular-unstyled/filters";
import { rowActions } from "@adapttable/angular-unstyled/row-actions";
import { rowPinning } from "@adapttable/angular-unstyled/row-pinning";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptDataTable } from "./dataTable";

interface Row {
  id: string;
  name: string;
  team: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "A" },
  { id: "2", name: "Grace", team: "B" },
];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name, editable: true },
  { key: "team", header: "Team", accessor: (row) => row.team },
];
let context: FeatureMountContext | undefined;
const detached = vi.fn();
const capture: AdaptTableFeature = {
  id: "capture-runtime",
  mount: (value) => {
    context = value;
    return detached;
  },
};

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [urlSync]="false"
      [forceMobile]="false"
      [selectable]="true"
      [selectedIds]="selected()"
      (selectionChange)="selected.set($event)"
      [columnLayout]="layout()"
      (columnLayoutChange)="layout.set($event)"
    />
  `,
})
class Host {
  readonly rows = signal(ROWS);
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  readonly selected = signal<readonly string[]>([]);
  readonly layout = signal<ColumnLayoutState>({
    order: [],
    hidden: [],
    pinned: {},
    widths: {},
  });
  readonly action = vi.fn();
  readonly commit = vi.fn((row: Row, key: string, value: unknown) => {
    this.rows.update((rows) =>
      rows.map((item) =>
        item.id === row.id ? { ...item, [key]: value } : item
      )
    );
  });
  readonly features = [
    columnMenu(),
    rowPinning(),
    filters<Row>([{ key: "team", type: "text" }]),
    rowActions<Row>([
      { key: "host-action", label: "Host action", onClick: this.action },
    ]),
    editing(this.commit),
  ];
}

async function mount() {
  TestBed.configureTestingModule({
    providers: [provideAdaptTableFeatures(capture)],
  });
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, current: context! };
}

describe("mounted feature runtime", () => {
  it("publishes filters, host actions, selection, live columns, pins and editing", async () => {
    const { fixture, host, current } = await mount();
    const view = current.runtime.view()!;
    const neutral = view.neutralTable!;
    expect(view.filterDefs?.map((def) => def.key)).toContain("team");
    expect(view.filterRegistry).toBeDefined();
    expect(view.actions?.row.map((action) => action.key)).toEqual([
      "host-action",
    ]);
    expect(view.columnLayout?.keys).toEqual(["name", "team"]);
    current.flush(() => view.selection!.replace(["2"]));
    expect([...current.runtime.view()!.selection!.selectedIds]).toEqual(["2"]);
    current.flush(() => view.columnLayout!.setHidden!("team", true));
    expect(current.runtime.view()!.columnLayout!.hidden).toEqual(["team"]);
    current.flush(() =>
      current.runtime.view()!.columnLayout!.setOrder!(["team", "name"])
    );
    expect(current.runtime.view()!.columnLayout!.keys).toEqual([
      "team",
      "name",
    ]);
    current.flush(() => view.pinning!.setColumnPin!("name", "start"));
    expect(current.runtime.view()!.pinning!.columns).toEqual({ name: "start" });
    current.flush(() => view.pinning!.setRowPin!("2", "top"));
    expect(current.runtime.view()!.pinning!.rows?.top).toEqual(["2"]);
    current.flush(() =>
      current.runtime.view()!.editing!.onCellEdit!(ROWS[0]!, "name", "Updated")
    );
    expect(host.commit).toHaveBeenCalledWith(ROWS[0], "name", "Updated");
    expect(current.runtime.view()!.neutralTable).toBe(neutral);
    expect(neutral.cellValue(neutral.rowByKey("1"), "name")).toBe("Updated");
    fixture.destroy();
    expect(detached).toHaveBeenCalledTimes(1);
  });

  it("commits a queued parent row, selection and layout change before admission", async () => {
    const { fixture, host, current } = await mount();
    const neutral = current.runtime.view()!.neutralTable!;
    const revision = neutral.revisions.data;
    host.rows.set([{ id: "3", name: "Parent change", team: "C" }]);
    host.selected.set(["3"]);
    host.layout.set({
      ...host.layout(),
      hidden: ["team"],
      order: ["team", "name"],
    });
    // No fixture change detection or await between the parent's writes and
    // admission: a table-local refresh would still see yesterday's inputs.
    current.flushAdmission();
    const view = current.runtime.view()!;
    expect(view.rows.map((row) => (row as Row).id)).toEqual(["3"]);
    expect([...view.selection!.selectedIds]).toEqual(["3"]);
    expect(view.columnLayout!.hidden).toEqual(["team"]);
    expect(view.columnLayout!.keys).toEqual(["team", "name"]);
    expect(neutral.revisions.data).toBeGreaterThan(revision);
    expect(neutral.rowByKey("3")).toEqual(host.rows()[0]);
    fixture.destroy();
  });

  it("exposes staged editing without sending an edit to the host", async () => {
    const save = vi.fn();
    @Component({
      imports: [AdaptDataTable],
      template: `<adapt-data-table
        [data]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [features]="features"
        [urlSync]="false"
      />`,
    })
    class BatchHost {
      readonly rows = ROWS;
      readonly columns = COLUMNS;
      readonly rowKey = (row: Row) => row.id;
      readonly features = [capture, batchEditing<Row>(save)];
    }
    const fixture = TestBed.createComponent(BatchHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const current = context!;
    expect(current.runtime.view()!.columnLayout).toBeUndefined();
    expect(current.runtime.view()!.editing!.onCellEdit).toBeUndefined();
    current.flush(() =>
      current.runtime.view()!.editing!.stageCell!(
        ROWS[0]!,
        "1",
        "name",
        "Draft"
      )
    );
    expect(save).not.toHaveBeenCalled();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-adapttable-part="batch-edit-bar"]'
      )
    ).not.toBeNull();
    fixture.destroy();
  });
});
