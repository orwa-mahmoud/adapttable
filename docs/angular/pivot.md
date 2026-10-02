# Angular pivot tables

Build a pivot with `pivot()`, turn its result into table inputs with your kit's
`pivotTableModel()`, and use `AdaptPivotPanel` to edit the axes and measures.
The calculation is separate from rendering; the model preserves the selected
kit's row-header component, grouped columns and grand-total footer.

```ts
import { Component, computed } from "@angular/core";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import {
  AdaptPivotPanel,
  injectPivotUrlState,
  pivot,
  pivotTableModel,
  type PivotField,
} from "@adapttable/angular-unstyled/pivot";

@Component({
  selector: "app-sales-pivot",
  imports: [AdaptDataTable, AdaptPivotPanel],
  template: `
    <adapt-pivot-panel
      [fields]="fields"
      [config]="state.config()"
      [onChange]="state.onConfigChange"
    />
    <adapt-data-table
      tableLabel="Sales pivot"
      urlKey="sales-pivot-table"
      [data]="model().rows"
      [columns]="model().columns"
      [rowKey]="model().rowKey"
      [summaryRow]="model().summaryRow"
    />
  `,
})
export class SalesPivot {
  readonly rows = [
    { region: "North", quarter: "Q1", amount: 120 },
    { region: "North", quarter: "Q2", amount: 80 },
    { region: "South", quarter: "Q1", amount: 60 },
  ];
  readonly fields: readonly PivotField[] = [
    { key: "region", label: "Region" },
    { key: "quarter", label: "Quarter" },
    { key: "amount", label: "Amount" },
  ];
  readonly state = injectPivotUrlState({
    urlKey: "sales-pivot",
    defaultConfig: {
      rows: ["region"],
      columns: ["quarter"],
      measures: [{ key: "amount", agg: "sum" }],
    },
  });
  readonly model = computed(() =>
    pivotTableModel(
      pivot(this.rows, this.state.config(), {
        collapsed: this.state.collapsed(),
      }),
      { fields: this.fields }
    )
  );
}
```

`onChange` is a callback input, so bind it with `[onChange]`, not `(onChange)`.
The initializer runs in an Angular injection context. `config` and `collapsed`
are signals and must be called when rendering or calculating. Use
`@adapttable/ng-zorro/pivot` with the NG-ZORRO root table for that kit's panel
and row-header controls. Both kits remain private workspace packages.

## Configuration and collapse

The rows and columns arrays are ordered dimensions; measures specify a field
and aggregation. The panel supplies add, remove and move controls, including
keyboard-operable buttons rather than requiring drag-and-drop. Its fieldsets
and labels distinguish the three zones for screen readers. Keep the panel
usable at narrow widths even when the resulting pivot is wide.

`injectPivotUrlState()` preserves axes, measure order, totals switches and the
collapsed-key set. Use `onConfigChange` and `onCollapsedChange` to update them;
do not mutate the existing arrays or `Set`. Namespace state when more than one
pivot is on a page. Its URL adapter can be shared with your host's Router setup.

The basic row header displays the pivot line's caption. Folding is a host
rendering decision: supply `renderRowHeader` to `pivotTableModel`, return an
Angular template/component for foldable lines, and toggle that line's `key` in
`state.collapsed()`. Preserve a text caption for export and announcements.
The model's grand total remains a footer and is not a foldable row.

## Data scope and result rendering

`pivot()` calculates from exactly the rows supplied. With a remote page, that
would be a page pivot, not a complete dataset pivot. Use the backend pivot
contract and `serverPivotResult` from the binding's `/pivot` entry when the
backend owns the full set. Associate async results with their configuration and
discard stale responses; surface failure before presenting an old pivot as the
new result.

`pivotTableModel` returns `columns`, `rows`, `rowKey` and optional `summaryRow`.
The generated rows are aggregate lines, not the original editable records.
Do not send a pivot line's synthetic key to a source-record edit endpoint.
Use `fields`, `labels`, `rowHeader` and `indent` for its captions and hierarchy;
`renderRowHeader` is an Angular renderer hook, not JSX.

The same table inputs support desktop and responsive rendering. When many
measures make a pivot wide, consider explicit column widths and the appropriate
[virtualization](./virtualization.md) settings rather than removing labels on
phones.

See [Aggregation](./aggregation.md), [Column groups](./column-groups.md),
[URL state](./url-state.md) and the
[Angular pivot model](../../packages/angular/angular/pivot/pivotTableModel.ts).
