---
title: "React table CSV export — one toolbar button (v1)"
description: "Export a React data table to CSV with one toolbar button: file
  name, current page or every filtered row, and the CSV helpers for your own
  export flow."
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"React
      table CSV export — one toolbar
      button","item":"https://adapttable.orwamahmoud.com/v1/react/csv-export/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og.png
slug: v1/react/csv-export
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/9f95391d5fd0f6f22585e8f0c9d2fc3c75da9cc0/starters/mantine?file=src%2FApp.tsx) — a real AdaptTable you can edit in the browser, no install. [Other UI kits →](/v1/react/getting-started/#try-it-in-stackblitz)

Pass `exportCsv` and the toolbar gains a kit-native **Export CSV** button.
Clicking it downloads the table's current view as a CSV file: the visible
columns in display order, under the active search, filters and sort. Omit
the prop (or pass `false`) and no button renders.

## Example

```tsx
import { type CellProps, type ColumnDef, DataTable } from "@adapttable/mantine"; // or @adapttable/mui, chakra, antd, radix, base-ui, shadcn, unstyled

interface Person {
  id: string;
  name: string;
  city: string;
  salary: number;
}

const people: Person[] = [
  { id: "1", name: "Ada Lovelace", city: "London", salary: 120000 },
  { id: "2", name: "Alan Turing", city: "Manchester", salary: 110000 },
  { id: "3", name: "Grace Hopper", city: "New York", salary: 130000 },
];

// The cell shows formatted text; the CSV falls back to `sortValue`, the raw number.
function SalaryCell({ row }: CellProps<Person>) {
  return <>{row.salary.toLocaleString("en-US")}</>;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "city" },
  {
    key: "salary",
    header: "Salary",
    align: "end",
    Cell: SalaryCell,
    sortValue: (row) => row.salary,
  },
];

export function People() {
  return (
    <>
      {/* Defaults: export.csv, current page */}
      <DataTable data={people} columns={columns} rowKey={(r) => r.id} exportCsv />

      {/* Custom filename, every filtered + sorted row */}
      <DataTable
        data={people}
        columns={columns}
        rowKey={(r) => r.id}
        exportCsv={{ filename: "people.csv", scope: "all" }}
      />
    </>
  );
}
```

## How it works

* `exportCsv` accepts `true` or an options object. `true` resolves to an
  empty options object, so every default applies; `false` or `undefined`
  renders no button.
* The button reads its text from the `exportCsv` label (English default
  **"Export CSV"**) and calls a handler built by `makeExportCsvHandler`.
* **Columns** — the export uses the columns the table currently shows: the
  user's column layout (hidden columns stay out, reordered columns keep
  their order) filtered for the active device (`hideOnDesktop` /
  `hideOnMobile`). The synthetic row-actions column is always dropped.
* **Header row** — each column's `header` when it is a string, otherwise its
  `key`. A column declared without `header` gets its auto-derived header
  (`"hiredAt"` → `"Hired At"`), the same text the table displays.
* **Cell values** — the column's `accessor` result when it is a string,
  number or boolean; otherwise the column's `sortValue`; otherwise an empty
  cell — never `[object Object]`. A column rendered with `Cell` or a JSX
  `accessor` exports its `sortValue`, so give such columns one. Key-only
  columns (no `accessor` / `Cell`) export the primitive value at the key's
  data path, dot paths included.
* **Rows** — `scope: "page"` (the default) exports the current page or
  loaded slice (`source.rows`). `scope: "all"` exports every row matching
  the active search, filters and sort (`source.allFilteredRows`), which the
  frontend tier (`data` / `useFrontendData`) provides.
* **Server-paginated sources** do not expose the full filtered set. With
  `scope: "all"` they export the current page and log a development-only
  warning.
* **Format** — comma-delimited, rows joined with `\r\n`, and RFC 4180
  quoting: a value containing the delimiter, a double quote, `\n` or `\r` is
  wrapped in double quotes with inner quotes doubled.
* **Download** — the file is a UTF-8 `text/csv` Blob prefixed with a BOM, so
  Excel opens non-ASCII text correctly. The download runs only in the
  browser; outside it the call does nothing.

## Options

`exportCsv?: boolean | ExportCsvOptions`

| Option     | Type               | Default        | Description                                                                                         |
| ---------- | ------------------ | -------------- | --------------------------------------------------------------------------------------------------- |
| `filename` | `string`           | `"export.csv"` | Download filename.                                                                                  |
| `scope`    | `"page" \| "all"`  | `"page"`       | `"page"` — current page / loaded slice. `"all"` — full filtered + sorted set when the source has it. |

Related props:

| Prop      | Type          | Default | Description                                                         |
| --------- | ------------- | ------- | ------------------------------------------------------------------- |
| `labels`  | `TableLabels` | English | `labels.exportCsv` sets the button text (default `"Export CSV"`).   |
| `toolbar` | `ReactNode`   | —       | Inline toolbar slot — the place for a custom export control.        |

## Headless helpers

The CSV functions are exported from `@adapttable/core` for custom export
controls — a button in the `toolbar` slot, a server-side job, or a
different delimiter.

| Export                   | Signature                                                                                                                  | Description                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `rowsToCsv`              | `rowsToCsv<TRow>(rows: readonly TRow[], columns: readonly ColumnDef<TRow>[], options?: RowsToCsvOptions<TRow>): string`    | Pure serializer. Returns CSV text without a BOM.                                                     |
| `RowsToCsvOptions<TRow>` | `{ getValue?: (row: TRow, column: ColumnDef<TRow>) => unknown; delimiter?: string }`                                       | `getValue` replaces the accessor → sortValue resolution; `delimiter` defaults to `","`.              |
| `downloadCsv`            | `downloadCsv(filename: string, csv: string): void`                                                                         | Downloads CSV text as a UTF-8 file with a BOM. No-op outside the browser.                            |
| `buildTableCsv`          | `buildTableCsv<TRow>(options: { source: TableSource<TRow>; columns: readonly ColumnDef<TRow>[]; scope?: "page" \| "all" }): string` | CSV text for a source + columns, with the `scope` rules above and the actions column dropped.         |
| `downloadTableCsv`       | `downloadTableCsv<TRow>(options: { source: TableSource<TRow>; columns: readonly ColumnDef<TRow>[]; filename?: string; scope?: "page" \| "all" }): void`                   | `buildTableCsv` + `downloadCsv`; `filename` defaults to `"export.csv"`.                              |
| `makeExportCsvHandler`   | `makeExportCsvHandler<TRow>(exportCsv: boolean \| ExportCsvOptions \| undefined, source: TableSource<TRow>, columns: readonly ColumnDef<TRow>[]): (() => void) \| undefined` | The click handler the built-in button uses; `undefined` when export is off.                          |
| `resolveExportCsv`       | `resolveExportCsv(value: boolean \| ExportCsvOptions \| undefined): ExportCsvOptions \| null`                              | `true` → `{}`, falsy → `null`, an object is returned as-is.                                          |
| `exportableColumns`      | `exportableColumns<TRow>(columns: readonly ColumnDef<TRow>[]): ColumnDef<TRow>[]`                                           | Drops the synthetic row-actions column.                                                              |
| `ExportCsvOptions`       | `{ filename?: string; scope?: "page" \| "all" }`                                                                            | The options type of the `exportCsv` prop.                                                            |

```tsx
import { downloadCsv, rowsToCsv } from "@adapttable/core";

// Semicolon-delimited export of an arbitrary row set.
const csv = rowsToCsv(people, columns, { delimiter: ";" });
downloadCsv("people.csv", csv);
```

`rowsToCsv` works on the columns exactly as passed: a column without a
string `header` uses its `key` as the header, and a column without an
`accessor` or `sortValue` exports empty cells. Pass `getValue` to resolve
values yourself.

## Notes

* For a server-backed full export, put your own control in the `toolbar`
  slot and download from your API; the built-in button exports only rows
  the source holds.
* The CSV contains data rows only — group header rows and the
  [summary row](/v1/react/summary-row/) are not written.

## Related

* [Columns](/v1/react/columns/) — `header`, `accessor`, `sortValue`, visibility
* [Column management](/v1/react/column-management/) — the user layout the export follows
* [Data tiers](/v1/data-tiers/) — which sources provide the full filtered set
* [Customization](/v1/react/customization/) — the `exportCsvButton` class slot
* [i18n & RTL](/v1/react/i18n-rtl/) — translating the button label
* [API reference](/v1/react/api/)
