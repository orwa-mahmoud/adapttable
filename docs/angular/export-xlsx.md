# Angular XLSX export

`exportXlsx()` from the kit's `/export` entry creates an Excel workbook using
the same scope, callbacks and progress UI as CSV. It is opt-in and does not
require a spreadsheet library in the host application.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/ng-zorro";
import { exportXlsx } from "@adapttable/ng-zorro/export";

interface Shipment {
  id: string;
  postalCode: string;
  units: number;
  sent: Date;
}

@Component({
  selector: "app-shipment-workbook",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Shipments"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
export class ShipmentWorkbook {
  readonly rows: readonly Shipment[] = [
    {
      id: "s1",
      postalCode: "01730",
      units: 4,
      sent: new Date("2026-10-01T00:00:00Z"),
    },
  ];
  readonly columns: readonly ColumnDef<Shipment>[] = [
    { key: "postalCode", header: "Postal code" },
    { key: "units", header: "Units", exportValue: (row) => row.units },
    {
      key: "sent",
      header: "Sent",
      accessor: (row) => row.sent.toISOString().slice(0, 10),
      exportValue: (row) => row.sent,
    },
  ];
  readonly rowKey = (row: Shipment) => row.id;
  readonly features = [
    exportXlsx<Shipment>({
      filename: "shipments.xlsx",
      scope: "all",
      columns: ["postalCode", "units", "sent"],
    }),
  ];
}
```

This example uses NG-ZORRO's private workspace kit. The equivalent native
controls use `@adapttable/angular-unstyled` and
`@adapttable/angular-unstyled/export`. Load NG-ZORRO's global stylesheet in
the host as described in [Getting started](./getting-started.md).

## Preserve useful cell types

Numbers remain numbers, booleans remain booleans, and valid `Date` values become
Excel dates with a date or datetime number format. Numeric-looking strings stay
strings: a postal code such as `"01730"` keeps its leading zero. Supply raw
typed values through `exportValue`; returning `"$120"` intentionally makes a
text cell instead of a summable number.

Strings are stored as text, including strings starting with `=`. The writer
does not convert an Angular formula column into an executable spreadsheet
formula: it exports the computed result. CSV's `escapeFormulas` switch does not
change XLSX's text-cell representation. Headers and group/aggregate rows have
their workbook presentation, and hierarchy levels travel as row outlines.

## Scope and async behavior

`scope: "all"` works directly when the source exposes the full filtered set.
With server data, supply an explicit all-row export route rather than expecting
the browser to have rows it never loaded. The `request`, `onExportAll`,
`fetchAll`, `onBeforeExport` and `onAfterExport` options behave as described in
[Exporting](./exporting.md). Await host jobs, propagate failures, and honor
cancellation signals so the kit's busy/error/retry UI reflects real progress.

The convenience factory fixes the writer to XLSX. For lower-level file building,
`xlsxWriter` and `buildTableXlsx` are neutral helpers under
`@adapttable/core/xlsx`; they do not require an Angular renderer. The factory's
options deliberately omit a `writer` property.

The export action remains a normal keyboard- and touch-accessible kit control.
Mobile cards do not change the underlying row values or export permissions.
See [Columns](./columns.md), [Formulas](./formulas.md) and the
[XLSX writer](../../packages/shared/core/src/export/xlsx.ts).
