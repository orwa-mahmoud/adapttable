# React table Excel export — xlsxWriter

▶ **See it working:** [export a grouped table to XLSX](https://orwa-mahmoud.github.io/adapttable/demo/mantine/grouping/) — the Export button writes the grouped sheet with outline levels and bold totals.

`xlsxWriter()` turns the export button into a real `.xlsx` download. It
ships as `@adapttable/core/xlsx`, a separate entry point with no
dependency: the workbook and its ZIP container are written by hand, and a
table that never imports the writer never carries the code.

```tsx
import { xlsxWriter } from "@adapttable/core/xlsx";
import { type ColumnDef, DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, base-ui, shadcn, unstyled
import { exportCsv } from "@adapttable/mantine/export";

interface Person {
  id: string;
  name: string;
  zip: string;
  salary: number;
  active: boolean;
  hiredAt: Date;
}

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", width: 200 },
  { key: "zip", header: "ZIP" },
  {
    key: "salary",
    header: "Salary",
    accessor: (row) => `$${row.salary.toLocaleString()}`,
    exportValue: (row) => row.salary,
  },
  {
    key: "active",
    header: "Active",
    accessor: (row) => (row.active ? "Yes" : "No"),
    exportValue: (row) => row.active,
  },
  {
    key: "hiredAt",
    header: "Hired",
    accessor: (row) => row.hiredAt.toLocaleDateString(),
    exportValue: (row) => row.hiredAt,
  },
];

export function People({ people }: { people: Person[] }) {
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        exportCsv<Person>({
          writer: xlsxWriter({ sheetName: "People" }),
          scope: "all",
          filename: "people.xlsx",
        }),
      ]}
    />
  );
}
```

The writer plugs into the same `exportCsv()` feature as CSV and PDF. Which
rows and columns leave the table, the lifecycle hooks, and the server-built
route are shared by every format; they are covered in
[Browser and server exports](./exporting.md) and
[Customization — Export](./customization.md#export). This page covers what
is specific to the spreadsheet.

## How it works

1. The export button resolves the scope and the column set, then resolves
   every cell once into an `ExportTable` — headers, keys, one array of values
   per row, plus row structure and suggested widths.
2. `xlsxWriter().build` turns that table into a workbook and returns an
   `ExportPayload`: the bytes in `parts`, the MIME type
   `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, and an
   empty `text`, because the file is binary.
3. `downloadExportFile` saves it. Without a `filename`, the file is
   `export.xlsx`; a `filename` you pass is used as given, so include the
   extension.

The button relabels itself **Export XLSX**, from `labels.exportFile("xlsx")`.
`onAfterExport` receives an empty `csv` for this format and the workbook in
`file.parts`.

The workbook holds one worksheet:

- a header row in bold on a shaded fill, frozen so it stays visible while the
  sheet scrolls;
- one row per exported row, with each value typed by what it is;
- column widths from the table's columns;
- outline levels for grouped and tree rows, with group headers and totals in
  the header's bold, shaded style.

## Cell values and types

Cells resolve exactly as they do for CSV: a column's `exportValue` first,
then its `accessor`, then its `sortValue`. The resolved value decides the
cell type, never its text:

| Resolved value              | Cell in the sheet                                                |
| --------------------------- | ---------------------------------------------------------------- |
| finite `number`             | number — sums, averages and number formats work                  |
| `boolean`                   | boolean (`TRUE` / `FALSE`)                                       |
| `Date` at midnight          | date serial with the `yyyy-mm-dd` format                         |
| any other valid `Date`      | date-and-time serial with the `yyyy-mm-dd hh:mm` format          |
| `string`                    | text, including text that looks numeric: `"01730"` stays `01730` |
| empty string, `null`, other | empty cell                                                       |

Two consequences follow from typing by value:

- **Give a formatted column an `exportValue`.** An accessor that returns
  `"$1,240.00"` exports text. `exportValue: (row) => row.salary` exports the
  number while the table keeps showing the formatted string — see
  [Exporting a different value than the screen shows](./customization.md#exporting-a-different-value-than-the-screen-shows).
- **A column with no `accessor` exports its field as display text.** The
  table derives an accessor for a bare-key column that renders the field as
  a string, so `{ key: "salary" }` writes `"1200.5"` as text. Add
  `accessor: (row) => row.salary` or an `exportValue` to keep the number. A
  bare-key column whose field is a `Date` still exports the date.

A `Date` counts as midnight when its UTC or its local clock reads
00:00:00.000. Other date-and-time values are written from their UTC instant.

Formula escaping does not apply. XLSX stores formulas in their own element
and the writer never emits one, so a cell reading `=CMD()` is text that is
displayed, never evaluated; `escapeFormulas` is ignored for this format.
Control characters that XML 1.0 cannot carry (everything below U+0020
except tab, newline and carriage return) are removed, and markup characters
are escaped.

## Column widths

Widths are in the spreadsheet's character units:

- a column with a pixel `width` gets `width / 8` characters, clamped to 8–40
  (`200` becomes `25`); a string width is read by its leading number, so
  `"200px"` behaves like `200`;
- a column without one gets its header length plus two, clamped to 8–40.

## Sheet name

`sheetName` defaults to `"Sheet1"`. Excel refuses a workbook whose sheet name
breaks its rules, so the name is corrected rather than passed through: each
of `: \ / ? * [ ]` becomes a space, the result is trimmed and cut to 31
characters, and an empty result becomes `"Sheet1"`.
`"Q1: payroll/draft"` is written as `"Q1  payroll draft"`.

## Grouped and tree exports

A grouped or tree-shaped table exports its structure, not a flat list of
leaves. Each row carries its role and its depth:

- group header rows sit at their grouping level, bold and shaded, with the
  group label and any group totals the table shows;
- leaves sit one level below their group, as outline levels Excel can
  collapse and expand;
- group footers and a `summaryRow` grand total are bold, shaded rows;
- a tree writes each node at its depth.

Group headers are written above their rows, and the sheet declares that
order, so the outline control for each group sits on its header.

Which leaves appear follows the scope. `scope: "page"` writes the view as
shown: a collapsed group keeps its header and leaves out its hidden rows.
`scope: "all"` and `scope: "selected"` include leaves inside collapsed
groups and folded tree nodes; `"selected"` then keeps only the groups that
still hold a selected leaf. `scope: "range"` stays a flat rectangle, because
the selection already named its shape. Cells covered by a
[row or column span](./row-spanning.md) are written empty in a flat export.

## Scope and columns

Every scope works unchanged, because the scope is resolved before the writer
sees anything:

| Scope              | Rows in the workbook                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| `"page"` (default) | The current page or loaded slice.                                            |
| `"all"`            | Every row matching the search and filters, in sort order.                    |
| `"selected"`       | The ticked rows, in table order, from every page the source holds.           |
| `"range"`          | The highlighted cell rectangle from [cell navigation](./cell-navigation.md). |

`columns: "visible"` (the default), `"all"`, or an array of keys chooses the
columns; a range names its own. `hideOnMobile` never removes a column from
the file, so a phone and a desktop download the same workbook. On a server
source, `scope: "all"` needs `onExportAll`, `request` or `fetchAll`; see
[Browser and server exports](./exporting.md).

## Building the workbook in Node

`buildTableXlsx` is the same workbook without a table. The
`@adapttable/core/xlsx` entry needs no React and no DOM, so it runs in
Node, an edge function or a worker:

```ts
import { writeFile } from "node:fs/promises";

import { buildTableXlsx, type ColumnMetadata } from "@adapttable/core/xlsx";

interface Person {
  id: string;
  name: string;
  team: string;
  salary: number;
  hiredAt: Date;
}

const columns: ColumnMetadata<Person>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name, width: 200 },
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "salary", header: "Salary", accessor: (row) => row.salary },
  { key: "hiredAt", header: "Hired", accessor: (row) => row.hiredAt },
];

const people: Person[] = [
  {
    id: "1",
    name: "Ada Lovelace",
    team: "Platform",
    salary: 1200.5,
    hiredAt: new Date(Date.UTC(2026, 0, 15)),
  },
];

const bytes = buildTableXlsx({ rows: people, columns, sheetName: "People" });
await writeFile("people.xlsx", bytes);
```

It returns a `Uint8Array`, which a web `Response` accepts as a body:

```ts
return new Response(bytes, {
  headers: {
    "content-type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "content-disposition": 'attachment; filename="people.xlsx"',
  },
});
```

Direct calls resolve columns exactly as written. Give each column an
`accessor` or `exportValue` that returns the raw value; a column with
neither writes empty cells, except for a field holding a `Date`. A column
without a string `header` is headed by its `key`.

This is the natural pair for `onExportAll`: the browser sends the page-free
`ExportAllQuery` — search, filters, sort, grouping, the requested column keys
in order, `format: "xlsx"` and the filename — and the server builds the file
next to the data. The client half, with progress and cancellation, is in
[Server-built export with progress](./exporting.md#server-built-export-with-progress).

Pass `view` to write groups and `summary` to append a grand total. A `view`
lists every row in display order as `ExportViewEntry` values:

```ts
import { buildTableXlsx, type ColumnMetadata } from "@adapttable/core/xlsx";

interface Sale {
  id: string;
  region: string;
  amount: number;
}

const columns: ColumnMetadata<Sale>[] = [
  { key: "region", header: "Region", accessor: (row) => row.region },
  { key: "amount", header: "Amount", accessor: (row) => row.amount },
];

const north: Sale[] = [
  { id: "1", region: "North", amount: 120 },
  { id: "2", region: "North", amount: 80 },
];

const bytes = buildTableXlsx({
  rows: north,
  columns,
  view: [
    { role: "group", label: "North", level: 0, labelKey: "region" },
    ...north.map((row) => ({ role: "data" as const, row, level: 1 })),
    {
      role: "aggregate",
      label: "North total",
      level: 0,
      labelKey: "region",
      values: { amount: 200 },
    },
  ],
  summary: { region: "Grand total", amount: 200 },
});
```

A `group` or `aggregate` entry writes its `values` by column key and puts
`label` in the `labelKey` column when that cell has no value. With `view`
present, the workbook follows it and `rows` is not read on its own.

## Bundle isolation

`@adapttable/core/xlsx` is the documented entry. `xlsxWriter` and
`buildTableXlsx` are also reachable from the `@adapttable/core` root, and
`@adapttable/core` declares `sideEffects: false`, so a bundler drops the
spreadsheet code from any build that does not call them. A bundle that
exports CSV only contains no XLSX code.

## Options

`xlsxWriter(options?)` returns an `ExportWriter` with `extension: "xlsx"`.

| Option      | Type     | Default    | Description                                              |
| ----------- | -------- | ---------- | -------------------------------------------------------- |
| `sheetName` | `string` | `"Sheet1"` | The worksheet's name, corrected to Excel's naming rules. |

`buildTableXlsx(options)` returns `Uint8Array` workbook bytes.

| Option      | Type                                         | Default    | Description                                                                |
| ----------- | -------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `rows`      | `readonly TRow[]`                            | required   | The rows to write, in order.                                               |
| `columns`   | `readonly ColumnMetadata<TRow>[]`            | required   | The columns to write, in order; `header`, `width` and value resolution.    |
| `sheetName` | `string`                                     | `"Sheet1"` | The worksheet's name.                                                      |
| `view`      | `readonly ExportViewEntry<TRow>[]`           | —          | Grouped or tree rows in display order; the workbook follows it when given. |
| `summary`   | `Readonly<Partial<Record<string, unknown>>>` | —          | A grand-total row appended in the bold total style, keyed by column key.   |

Both come from `@adapttable/core/xlsx`, which also exports the types they
use: `ExportWriter`, `ExportViewEntry`, `ExportPayload`, `ExportWriteContext`,
`ExportTable`, `ExportRowMeta`, `ExportRowRole`, `ColumnMetadata` and
`ColumnModel`.

## Notes

- One worksheet per file. The writer does not emit formulas, merged cells,
  cell colours beyond the header, group and total styling, or a
  right-to-left sheet view; text in any script is stored as UTF-8 and reads correctly, and a
  reader can switch the sheet's direction in the spreadsheet application.
- ZIP entries are stored uncompressed, which keeps the writer free of a
  compression library. The file is larger than one a spreadsheet application
  saves; past the browser's comfortable size, build it on the server with
  `onExportAll`.
- The archive timestamp is fixed, so the same table produces the same bytes
  every time — convenient for tests and caching.
- For CSV and the full export flow, see [Browser and server exports](./exporting.md);
  for PDF and print, see [PDF export and print layout](./export-pdf.md).
