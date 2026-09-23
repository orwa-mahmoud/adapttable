---
title: "React table columns — ColumnDef & custom cells (v2)"
description: Define React table columns once with ColumnDef — accessors,
  sorting, per-column filters, alignment, pinning and custom cells — same API
  across every UI kit.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://orwa-mahmoud.github.io/adapttable/"},{"@type":"ListItem","position":2,"name":"React
      table columns — ColumnDef & custom
      cells","item":"https://orwa-mahmoud.github.io/adapttable/v2/columns/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://orwa-mahmoud.github.io/adapttable/og/columns.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://orwa-mahmoud.github.io/adapttable/og/columns.png
slug: v2/columns
---

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/55da84f73ec078c0a075b812710f1619ec300875/starters/mantine?file=src%2FApp.tsx) — this page's feature is the starter's whole `columns` array in `src/App.tsx`; edit it in the browser, no install. [Other UI kits →](/adapttable/v2/getting-started/#try-it-in-stackblitz)

Columns are plain objects — declare a `key` and the table renders the value, derives the header, and wires sorting and filtering around it. Everything beyond the key is an opt-in refinement.

## Example

```tsx
import { type CellProps, type ColumnDef, DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, radix, shadcn, unstyled
import { Badge } from "@mantine/core";

interface Person {
  id: string;
  name: string;
  nameAr: string;
  department: { name: string };
  salary: number;
  status: "active" | "on-leave";
  hiredAt: string;
}

const people: Person[] = [
  {
    id: "1",
    name: "Amira Hassan",
    nameAr: "أميرة حسن",
    department: { name: "Engineering" },
    salary: 96000,
    status: "active",
    hiredAt: "2021-03-15",
  },
  {
    id: "2",
    name: "Tom Becker",
    nameAr: "توم بيكر",
    department: { name: "Design" },
    salary: 78000,
    status: "on-leave",
    hiredAt: "2022-11-01",
  },
  {
    id: "3",
    name: "Lina Park",
    nameAr: "لينا بارك",
    department: { name: "Engineering" },
    salary: 105000,
    status: "active",
    hiredAt: "2019-07-20",
  },
];

// Define Cell components at module level so their identity is stable.
function StatusCell({ row }: CellProps<Person>) {
  return (
    <Badge color={row.status === "active" ? "green" : "yellow"}>
      {row.status}
    </Badge>
  );
}

const columns: ColumnDef<Person>[] = [
  // Bare key: auto header "Name"; i18n swaps the data path when locale="ar".
  { key: "name", i18n: { ar: "nameAr" }, sortable: true },
  // Dot path reaches nested values; auto header "Department Name".
  { key: "department.name", header: "Department" },
  // accessor formats; sortValue keeps the column sortable by the raw number.
  {
    key: "salary",
    header: "Salary (USD)",
    accessor: (r) => r.salary.toLocaleString(),
    sortValue: (r) => r.salary,
    sortable: true,
    align: "end",
    width: 140,
  },
  // Cell: a full React component receiving { row, rowIndex }.
  { key: "status", Cell: StatusCell, mobileLabel: "Status" },
  { key: "hiredAt", hideOnMobile: true, meta: { exportFormat: "date" } },
];

export function People() {
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(r) => r.id}
      locale="en"
    />
  );
}
```

## How it works

* A bare `{ key }` is a complete column: the key doubles as the row's data path (dot paths reach nested values, `"department.name"`), and the header is auto-humanised (`hiredAt` → "Hired At"). An explicit `header` always wins, in any language.
* `renderHeader` replaces the caption only. The cell still owns sort, resize and the menu, and passes a `controller` (`label`, `sortDir`, `sortIndex`, `toggleSort`) so a custom caption can stay wired. `headerTooltip` is a native title; `headerActions` sit after the caption. `renderFooter` replaces one summary cell; `tableFooter` is a free slot under the table.
* Cell content resolves `Cell` → `accessor` → the key's data path. `Cell` is a React component receiving `{ row, rowIndex }`; `accessor` is the lighter function form. Mini charts are a separate import — see [sparkline columns](/adapttable/v2/sparkline/).
* `sortable` opts a column into sorting; on frontend data the comparator reads `sortValue`, falling back to the column's accessor. See [sorting](/adapttable/v2/sorting/).
* `i18n` maps locale tags to alternative data paths; the table's `locale` prop picks one (exact tag → primary subtag → `key`). The cell, client-side sort, and the column's filter all follow the resolved path — header text does not.
* `hideOnMobile` / `hideOnDesktop` drop a column per layout; `mobileLabel` overrides the label on mobile cards.
* `key` is also the value sent to a backend as `sortBy`, so keep it API-stable.

## Options

| Prop                                                            | Type                             | Default                      | Description                                                                                       |
| --------------------------------------------------------------- | -------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `key`                                                           | `string`                         | required                     | Unique id; data path for the cell value; the backend `sortBy` value.                              |
| `header`                                                        | `ReactNode`                      | humanised from `key`         | Header content, pre-translated by the caller.                                                     |
| `renderHeader`                                                  | `(ctx) => ReactNode`             | —                            | Custom caption; receives a controller so sort/resize stay available.                              |
| `renderFooter`                                                  | `(ctx) => ReactNode`             | —                            | Custom summary-row cell.                                                                          |
| `headerTooltip`                                                 | `string`                         | —                            | Native tooltip on the caption.                                                                    |
| `headerActions`                                                 | `ReactNode`                      | —                            | Host controls after the caption.                                                                  |
| `accessor`                                                      | `(row) => ReactNode`             | read the key's data path     | Lightweight cell renderer.                                                                        |
| `Cell`                                                          | `ComponentType<CellProps<TRow>>` | —                            | Component per row, receives `{ row, rowIndex }`; wins over `accessor`.                            |
| `sortable`                                                      | `boolean`                        | `false`                      | Enable sorting for this column.                                                                   |
| `sortValue`                                                     | `(row) => SortableValue`         | the generated accessor value | Primitive extractor for the client-side sort. See [sorting](/adapttable/v2/sorting/).                        |
| `exportValue`                                                   | `(row) => unknown`               | the display value            | Value written to a CSV export when the file should carry something other than the formatted cell. |
| `align`                                                         | `"start" \| "center" \| "end"`   | `"start"`                    | Text alignment within the cell.                                                                   |
| `width`                                                         | `number \| string`               | —                            | Width passed through to the rendered header/cell.                                                 |
| `mobileLabel`                                                   | `string`                         | `header` (when a string)     | Label on mobile card layouts.                                                                     |
| `hideOnMobile`                                                  | `boolean`                        | `false`                      | Hide the column entirely on mobile.                                                               |
| `hideOnDesktop`                                                 | `boolean`                        | `false`                      | Hide the column entirely on desktop.                                                              |
| `formatValue`                                                   | `(row) => string`                | derived (see below)          | The cell as plain text for announcements, labels, tooltips and the clipboard.                     |
| `filter`                                                        | `FilterType \| object`           | —                            | Declarative filter for this column. See [filtering](/adapttable/v2/filtering/).                              |
| `minWidth`                                                      | `number`                         | —                            | Width floor in px for resizing and `fitColumns`.                                                  |
| `maxWidth`                                                      | `number`                         | —                            | Width ceiling in px.                                                                              |
| `flex`                                                          | `number`                         | —                            | Share of the leftover width when the table fits its container (`fitColumns`).                     |
| `responsivePriority`                                            | `number`                         | never dropped                | How readily the column is given up when the table is too narrow; `1` is kept longest.             |
| `group`                                                         | `string \| readonly string[]`    | —                            | Spanning header above adjacent columns sharing the name. See below.                               |
| `groupShow`                                                     | `"open" \| "closed" \| "always"` | the group decides            | Visibility under a collapsible group. See [column groups](/adapttable/v2/column-groups/).                    |
| `lockPosition` / `lockVisibility` / `lockWidth` / `lockPin`     | `boolean`                        | `false`                      | Gray out that Columns-menu control. See [column management](/adapttable/v2/column-management/).              |
| `colSpan` / `rowSpan`                                           | `number \| (row) => number`      | `1`                          | Cell spanning. See [row and column spanning](/adapttable/v2/row-spanning/).                                  |
| `editable` / `editor` / `editValue` / `parseValue` / `validate` | —                                | —                            | Inline editing. See [cell editing](/adapttable/v2/cell-editing/).                                            |
| `i18n`                                                          | `Record<string, string>`         | —                            | Per-locale data paths for the column's value.                                                     |
| `meta`                                                          | `Record<string, unknown>`        | —                            | Free-form bag your own code can read back.                                                        |
| `locale`                                                        | `string` (table prop)            | —                            | Active locale tag (`"ar"`, `"ar-EG"`); drives `i18n` path resolution.                             |

## The cell as text

`accessor` returns a `ReactNode`, which is right for rendering and useless
everywhere else: a status badge is a React element, an avatar cell is a
component, and neither is a word. Anything that needs the cell as a **string** —
a screen-reader announcement, an `aria-label`, a tooltip, a clipboard copy —
has nothing to read.

`formatValue` is that string:

```tsx
{
  key: "status",
  accessor: (row) => <Badge color={tone(row)}>{row.status}</Badge>,
  formatValue: (row) => row.status,   // what a screen reader says
}
```

Text is always available, so `formatValue` only matters where it makes the text
*accurate*. `columnText(column, row)` resolves it in this order:

1. `formatValue` — the column stating its own text
2. `exportValue` — the underlying value, minus the formatting
3. `sortValue` — a primitive by definition
4. `accessor`, when it happens to return a primitive
5. the key's data path

with one deliberate restriction on that last step: **a column that renders its
own cell never falls back to the data path.** A column with
`accessor: () => null` renders an empty cell, and reading its path would
announce a value the user cannot see — worse than announcing nothing. Such a
column resolves to `""`, and giving it a `formatValue` is the fix.

## Computed columns

A total, a margin, a full name, days-until-due — columns whose value is derived
rather than stored. Writing the derivation into `accessor` works until the
column has to do anything else: sorting then compares the formatted string, so
`"$1,240.00"` sorts before `"$90.00"`; filtering has nothing to match; the
export carries the formatting; and the function runs again for every cell on
every render.

`computed` declares the derivation once and wires display, sorting and export
from it:

```tsx
import { computed } from "@adapttable/core";

const columns = [
  { key: "quantity" },
  { key: "unitPrice" },
  computed<Order, number>({
    key: "total",
    header: "Total",
    deps: (row) => [row.quantity, row.unitPrice],
    value: (row) => row.quantity * row.unitPrice,
    format: (total) => money.format(total),
    column: { sortable: true, align: "end" },
  }),
];
```

The screen shows `$1,240.00`; sorting and export see `1240`. A column `filter`
reads the row at `key`, so a filter on a computed column takes a `getValue`
that returns the same derivation.

* **`deps` is required, and listing them is the whole contract.** The value is
  recomputed when any dependency changes and reused when none do. A field the
  derivation reads but does not declare becomes a stale cell the moment the
  data changes underneath it.
* **The result is cached per row**, in a `WeakMap` keyed by the row object — a
  row that leaves the page takes its cached value with it, so a long-lived
  table cannot grow a cache it never releases.
* **`format` is display only.** Leave it out and primitives and dates render as text; any other value renders empty, since an object has no useful reading in a cell.
* **`column` carries everything else** a column can be — `sortable`, `align`,
  `width`, `filter`, `hideOnMobile`. `accessor`, `sortValue` and `exportValue`
  are derived and cannot be set here, which is what keeps display, sorting and
  export from disagreeing.

**Define the columns at module level, or memoise them.** The cache lives
inside the column `computed` returns, so rebuilding the column on every
render throws the cache away with it — values stay correct, nothing is
reused. It is the same rule `Cell` already asks for.

Rows must be objects, since the cache is keyed by row identity. The spec type is exported as `ComputedColumnSpec` for callers that build columns dynamically.

## Grouped headers

Give adjacent columns the same `group` and they render under one spanning
header cell. A string is one level; a path stacks one header row per depth.
That shortcut is presentational — for collapse options and groups that stay
together through reorder, use a `ColumnGroupDef` parent with `children`.
See [column groups](/adapttable/v2/column-groups/).

```tsx
const columns: ColumnDef<Person>[] = [
  { key: "firstName", header: "First", group: "Name" },
  { key: "lastName", header: "Last", group: "Name" },
  { key: "q1", header: "Q1", group: ["Finance", "2026"] },
  { key: "q2", header: "Q2", group: ["Finance", "2026"] },
  { key: "hiredAt", header: "Hired" },
];
```

```text
|      Name      |      Finance      |        |
|                |       2026        |        |
| First |  Last  |   Q1   |    Q2    | Hired  |
```

Columns without a `group` sit under a blank spanning cell, so the header rows
always line up. The grouping is **presentational and adjacency-based**: the
span is computed from the columns as they are currently ordered, so dragging a
column out of the middle of a group splits it into two spans rather than
pretending the layout is something it is not. Reorder them back together and
the group closes up again.

Pass `collapsibleColumnGroups` and each real group header gains a toggle. What
a collapsed group shows is that group's own options — an arrow stub by
default, a kept child via `collapsedKey`, or a cell via `collapsedRender`.
See [column groups](/adapttable/v2/column-groups/). Collapse state lives on
`columnLayout.collapsedGroups` and the URL (`colGroupCollapse`); group ids are
`path.join("\u001f")` so a label may contain `/`. On mobile the card layout has
no header row, but the same visible-column filter applies — cards hide the same
leaves a collapsed group hid on desktop.

## Notes

* Define `Cell` components at module level (or memoise them) — an inline component re-mounts every render and defeats row memoisation.
* Path-derived cells render primitives only; a non-primitive value at the path renders nothing. Use `accessor` or `Cell` for objects.
* A column whose `accessor` returns JSX needs `sortValue` to be sortable — without it the sort silently no-ops and a dev warning fires.
* `mobileLabel` only falls back to `header` when the header is a string; with a JSX header, set `mobileLabel` explicitly (it also names the column in the Columns menu).
* Duplicate column keys trigger a development warning — keys must be unique within the table.

See it live in the [demo](https://orwa-mahmoud.github.io/adapttable/demo/).
