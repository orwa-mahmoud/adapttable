import {
  AdaptCellTemplate,
  ADAPTTABLE_FEATURE_STATE,
  ADAPTTABLE_FIND_STATE,
  ADAPTTABLE_SLOT_TABLE,
  type AdaptTableFeature,
  type ColumnDef,
  type ContextMenuRegionHandlers,
  type FeatureMountContext,
  featureStateKey,
  type FindInTableState,
  injectDataTable,
  injectFeatureState,
  injectFrontendData,
  mountTableFeatures,
  slotRender,
  type SlotTable,
} from "@adapttable/angular";
import {
  AdaptDataTableShell,
  AdaptSlot,
  ADAPTTABLE_CONTEXT_MENU,
  ADAPTTABLE_PALETTE_OPEN,
  type PaletteOpenState,
  tableRuntimeFor,
} from "@adapttable/angular/adapter";
import { featureSlotKey } from "@adapttable/core/binding";
import { Component, inject, Injector, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

const DRAW = featureSlotKey<object>("canonical-entry-identity");
const LABEL = featureStateKey<string>("canonical-entry-label");

@Component({ template: `<output>{{ label() }}</output>` })
class CanonicalSlot {
  readonly props = input.required<object>();
  readonly table = inject(ADAPTTABLE_SLOT_TABLE);
  readonly state = inject(ADAPTTABLE_FEATURE_STATE);
  readonly label = injectFeatureState(LABEL);
}

@Component({
  imports: [AdaptSlot],
  template: `<ng-container
    [adaptSlot]="slot"
    [adaptSlotProps]="{}"
    [adaptSlotTable]="table"
  />`,
})
class FeatureHost {
  readonly injector = inject(Injector);
  mounted: FeatureMountContext | undefined;
  readonly feature: AdaptTableFeature = {
    id: "canonical-entry-feature",
    renders: [slotRender(DRAW, () => CanonicalSlot)],
    mount: (context) => {
      this.mounted = context;
      context.state.set(LABEL, "mounted across entries");
    },
  };
  readonly slot = DRAW;
  readonly source = injectFrontendData({
    data: [{ id: "one" }],
    columns: [{ key: "id" }],
    urlSync: false,
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: [{ key: "id" }],
    rowKey: (row) => row.id,
    features: [this.feature],
  });
  readonly dispose = mountTableFeatures([this.feature], {
    runtime: tableRuntimeFor(this.table, this.source, [this.feature]),
    state: this.table.featureState,
    injector: this.injector,
  });
}

interface Row {
  id: string;
  name: string;
}

@Component({
  selector: "entry-test-table",
  template: `<ng-content />`,
  providers: [
    {
      provide: ADAPTTABLE_CONTEXT_MENU,
      useFactory: () => signal<ContextMenuRegionHandlers | null>(null),
    },
    {
      provide: ADAPTTABLE_FIND_STATE,
      useFactory: () => signal<FindInTableState | null>(null),
    },
    {
      provide: ADAPTTABLE_PALETTE_OPEN,
      useFactory: () => signal<PaletteOpenState | null>(null),
    },
  ],
})
class EntryTable extends AdaptDataTableShell<Row> {
  get declarations() {
    return this.cellTemplates();
  }
  get renderedColumns() {
    return this.view()?.table.columns();
  }
}

@Component({
  imports: [EntryTable, AdaptCellTemplate],
  template: `<entry-test-table
    [data]="rows"
    [columns]="columns"
    [rowKey]="rowKey"
    [urlSync]="false"
  >
    <ng-template adaptCellTemplate="name" let-value="value"
      ><b>{{ value }}</b></ng-template
    >
  </entry-test-table>`,
})
class TemplateHost {
  readonly rows = [{ id: "one", name: "Ada" }];
  readonly columns: readonly ColumnDef<Row>[] = [{ key: "name" }];
  readonly rowKey = (row: Row) => row.id;
}

describe("canonical Angular entry identity", () => {
  it("shares root feature state and slot tokens with adapter-created controls", async () => {
    const fixture = TestBed.createComponent(FeatureHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const slot = fixture.debugElement.query(
      (node) => node.componentInstance instanceof CanonicalSlot
    ).componentInstance as CanonicalSlot;
    const table: SlotTable = host.table;
    expect(slot.table).toBe(table);
    expect(slot.state).toBe(host.table.featureState);
    expect(slot.state).toBe(host.mounted?.state);
    expect(slot.label).toBe(host.table.featureState.get(LABEL));
    expect(
      (fixture.nativeElement as HTMLElement).querySelector("output")
        ?.textContent
    ).toBe("mounted across entries");
    host.table.featureState.set(LABEL, "updated");
    await fixture.whenStable();
    expect(slot.label()).toBe("updated");
  });

  it("finds the root cell-template directive through adapter shell content queries", async () => {
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const table = fixture.debugElement.query(
      (node) => node.componentInstance instanceof EntryTable
    ).componentInstance as EntryTable;
    expect(table.declarations).toHaveLength(1);
    expect(table.declarations[0]).toBeInstanceOf(AdaptCellTemplate);
    expect(table.renderedColumns?.[0]?.cell).toBe(
      table.declarations[0]?.template
    );
  });
});
