# Exporting from Angular tables

Compose `exportCsv()` from your kit's `/export` entry to add the export action.
Export scope is resolved from the current source, selection and column layout
when the reader activates it. The file uses column values, not Angular template
markup. XLSX and PDF use the same row/column scope contract.

## Export the current view

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { exportCsv } from "@adapttable/angular-unstyled/export";

interface Invoice {
  id: string;
  customer: string;
  total: number;
}

@Component({
  selector: "app-invoice-export",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Invoices"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
    <p role="status">{{ message() }}</p>
  `,
})
export class InvoiceExport {
  readonly rows: readonly Invoice[] = [
    { id: "i1", customer: "Ada", total: 120 },
  ];
  readonly columns: readonly ColumnDef<Invoice>[] = [
    { key: "customer", header: "Customer" },
    { key: "total", header: "Total", exportValue: (row) => row.total },
  ];
  readonly rowKey = (row: Invoice) => row.id;
  readonly message = signal("");
  readonly features = [
    exportCsv<Invoice>({
      filename: "invoices.csv",
      scope: "page",
      columns: "visible",
      onAfterExport: () => this.message.set("File handed to the browser."),
    }),
  ];
}
```

The same factory is available from `@adapttable/ng-zorro/export`, paired with
that kit's root `AdaptDataTable`.
See [Getting started](./getting-started.md) for installation
and first-release status.

## Choose rows and columns explicitly

| Option                           | Meaning                                                        |
| -------------------------------- | -------------------------------------------------------------- |
| `scope: "page"`                  | Current page or loaded slice; the default                      |
| `scope: "all"`                   | Full filtered/sorted set, or an explicit server export route   |
| `scope: "selected"`              | Selected row IDs resolved against the widest available row set |
| `scope: "range"`                 | The rectangle selected with `cellNavigation()`                 |
| `columns: "visible"`             | Current visible columns in view order; the default             |
| `columns: "all"`                 | All defined columns, including hidden ones                     |
| `columns: ["customer", "total"]` | Explicit column keys in file order                             |

A range decides its own columns. Without a range, range export falls back to
the page and produces a development warning. A server source cannot export
unloaded selected records merely because their IDs are selected. An all-row
server export stays disabled without an executable `onExportAll`, `request` or
`fetchAll` route. Never label a loaded slice as the full dataset.

Synthetic action columns are excluded. `exportValue` supplies a portable value
for a custom cell; an Angular `cell` template does not become file content.
Structured group/tree entries and scoped summaries are carried into the writer.
CSV formula escaping defaults to on; keep it enabled for files opened by people
in spreadsheet applications.

## Server exports and lifecycle

`onExportAll(query, controls)` is intended for building the full file where the
data lives. It receives a page-free query snapshot. Honor `controls.signal`,
report progress through the provided controls, and resolve `{ url }` for a
download link or `undefined` if your host delivered the file another way.
Rejection produces the error/retry state. Check permission on the backend for
the requested columns and rows, including columns hidden in the UI.

`request(info)` instead hands export responsibility to your application. While
its promise is pending, the control stays busy; the table does not create or
download another file. `fetchAll` is the explicit browser-side alternative:
provide `fetchPage`, optionally `pageSize` and `maxRows`, and handle `onCapped`.
Its default cap is 50,000 rows; reaching the cap without proving the end stops
the export rather than silently delivering a partial file.

`onBeforeExport(info)` runs after local rows and columns are resolved. Return
`false` to cancel or `{ filename }` to rename the file. `onAfterExport` means the
file was handed to the browser, not that a person saved it to disk. A binary
writer puts bytes in `file.parts`; its `csv` field is empty.

The kit renders localized busy, progress, cancellation and recovery controls.
Destroying the Angular context abandons the controller's active run; host jobs
must still honor cancellation. Keep those controls available on mobile and
reachable from the keyboard.

See [XLSX](./export-xlsx.md), [PDF](./export-pdf.md),
[Data tiers](./data-tiers.md) and [Selection](./selection.md).
The [export contract](../../packages/shared/core/src/export/tableCsv.ts) and
[Angular export controller](../../packages/angular/angular/src/export/exportHandler.ts)
are the source of the scope and lifecycle rules.
