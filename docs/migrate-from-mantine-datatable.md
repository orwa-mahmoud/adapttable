# mantine-datatable alternative — same Mantine, more built-in

▶ **See it before you install:** [the live demo running on real Mantine](https://orwa-mahmoud.github.io/adapttable/demo/?kit=mantine) — same components you already use, nothing to set up.

[mantine-datatable](https://icflorescu.github.io/mantine-datatable/) is a
polished, Mantine-only table. `@adapttable/mantine` renders the **same Mantine
primitives**, so the look barely changes — what changes is how much you wire by
hand. Sorting, pagination, filtering, and data fetching move from imperative
state you manage into declarative props the table owns.

Both are Mantine-native and both do RTL first-class, so those stay the same.
This page maps the API across and shows a before/after.

## What you gain

Things mantine-datatable leaves to you that AdaptTable does for you:

- **One data contract for client and server.** Pass `data` for in-memory rows,
  or `data` + `total` + `loading` + `onQueryChange` for a paginated API — no
  manual `useEffect`/`fetching`/`totalRecords` juggling. See
  [data tiers](./data-tiers.md).
- **A real filter UI.** Declare `filter` on a column and get a kit-native
  widget, a removable chip, and URL parsing for free. mantine-datatable's
  `column.filter` is an empty slot you render yourself. See
  [filtering](./filtering.md).
- **Search, sort, and paging applied for you.** On the frontend tier AdaptTable
  filters, sorts, and pages the array itself — you no longer sort and slice
  `records` in response to `sortStatus`/`page`.
- **URL-synced, shareable, reload-safe state** — mantine-datatable keeps state
  in React only. See [URL state](./url-state.md).
- **A ready Columns menu** (show/hide, reorder, pin) via `enableColumnMenu`, and
  drag/keyboard resize via `resizableColumns`. mantine-datatable gives you the
  column mechanics but no menu UI. See
  [column management](./column-management.md).
- **Saved views, an automatic mobile card layout, and opt-in
  virtualization** — none of which mantine-datatable ships. See
  [saved views](./saved-views.md) and [virtualization](./virtualization.md).

## Install

```bash
pnpm add @adapttable/core @adapttable/mantine @mantine/core @mantine/hooks
```

Keep your existing `<MantineProvider>` at the app root — the adapter renders
through it exactly as mantine-datatable did.

## Prop mapping

`<DataTable>` props:

| mantine-datatable                             | `@adapttable/mantine`                                      | Notes                                                                                                                                 |
| --------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `records`                                     | `data`                                                     | Frontend tier. Server tier: `data` (current page) + `total` + `onQueryChange`.                                                        |
| `columns`                                     | `columns`                                                  | Field-by-field mapping below.                                                                                                         |
| `idAccessor`                                  | `rowKey`                                                   | **Required** — `(row) => string`. There is no `"id"` default.                                                                         |
| `sortStatus` / `onSortStatusChange`           | `sortable` per column (+ `multiSort`)                      | AdaptTable owns sort state and applies it; you don't sort `records` yourself.                                                         |
| `page` / `onPageChange` / `totalRecords`      | automatic (frontend) or `total` + `onQueryChange` (server) | Pagination is `"auto"`: paged on desktop, infinite on mobile.                                                                         |
| `recordsPerPage` / `recordsPerPageOptions`    | built-in page-size control                                 | Defaults to `PAGE_SIZE_OPTIONS`; `DEFAULT_LIMIT` is 25.                                                                               |
| `selectedRecords` / `onSelectedRecordsChange` | `bulkActions`, or `selectedIds` / `onSelectionChange`      | Providing `bulkActions` turns selection on and mounts the bulk bar.                                                                   |
| `isRecordSelectable`                          | — (gate in your bulk actions)                              | No per-row checkbox disable; use a bulk action's `disabledReason` to refuse ineligible ids (`selectionGetId` only customises the id). |
| `rowExpansion={{ content }}`                  | `renderRowDetail`                                          | `(row) => ReactNode`; multiple rows may be open at once.                                                                              |
| `fetching`                                    | `loading`                                                  | Server tier: skeleton when empty, subtle refresh indicator otherwise.                                                                 |
| `noRecordsText` / `emptyState`                | `slots.empty`                                              | Replace the empty state; `slots.skeleton` replaces the loader.                                                                        |
| `column.filter` (your JSX popover)            | column `filter` shorthand                                  | Declarative — see below. JSX is still allowed via the table-level `filters` prop.                                                     |

Column fields (`DataTableColumn` → `ColumnDef`):

| mantine-datatable           | `@adapttable/mantine`                               | Notes                                                                     |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| `accessor`                  | `key`                                               | Both support dot paths (`"department.name"`).                             |
| `title`                     | `header`                                            | Auto-derived from `key` when omitted (`hiredAt` → "Hired At").            |
| `render: (rec, i) => …`     | `Cell` (component) or `accessor: (row) => …`        | `Cell` receives `{ row, rowIndex }`; define it at module level.           |
| `sortable`                  | `sortable`                                          | Add `sortValue` when the cell renders formatted/JSX content.              |
| `textAlign: 'left'/'right'` | `align: 'start'/'end'`                              | Logical alignment — correct under RTL automatically.                      |
| `width`                     | `width`                                             | —                                                                         |
| `hidden` / `toggleable`     | `hideOnMobile`/`hideOnDesktop` + `enableColumnMenu` | Per-layout hiding is a column flag; user toggling lives in the menu.      |
| `draggable` / `resizable`   | `enableColumnMenu` / `resizableColumns`             | Enabled once at the table level, not per column.                          |
| `pinned: 'left'/'right'`    | `columnLayout` / `defaultColumnLayout`              | Pinning is part of the column-layout state (menu-driven or controlled).   |
| `footer`                    | `summaryRow`                                        | One table-level function maps the page's rows to per-column footer cells. |

## Before / after

**Before** — mantine-datatable, wiring sort + paging yourself:

```tsx
import { DataTable } from "mantine-datatable";
import { useMemo, useState } from "react";

function PeopleTable({ people }: { people: Person[] }) {
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Person>>({
    columnAccessor: "name",
    direction: "asc",
  });

  const sorted = useMemo(() => {
    const data = [...people].sort((a, b) =>
      String(a[sortStatus.columnAccessor]).localeCompare(
        String(b[sortStatus.columnAccessor])
      )
    );
    return sortStatus.direction === "desc" ? data.reverse() : data;
  }, [people, sortStatus]);

  const records = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <DataTable
      records={records}
      idAccessor="id"
      totalRecords={people.length}
      recordsPerPage={PER_PAGE}
      page={page}
      onPageChange={setPage}
      sortStatus={sortStatus}
      onSortStatusChange={setSortStatus}
      columns={[
        { accessor: "name", sortable: true },
        { accessor: "role" },
        { accessor: "status" },
      ]}
    />
  );
}
```

**After** — AdaptTable applies search, sort, filters, and paging itself:

```tsx
import { DataTable } from "@adapttable/mantine";

function PeopleTable({ people }: { people: Person[] }) {
  return (
    <DataTable
      data={people}
      rowKey={(r) => r.id}
      columns={[
        { key: "name", sortable: true },
        { key: "role" },
        { key: "status", filter: { type: "select", options: "auto" } },
      ]}
    />
  );
}
```

The `status` filter alone — a kit-native select, a removable chip, a URL param,
and the row predicate — is code you would have written by hand before.

## Gotchas

- **`rowKey` is required.** mantine-datatable defaults `idAccessor` to `"id"`;
  AdaptTable has no default, so always pass `rowKey={(r) => r.id}`.
- **Stop sorting and slicing `records`.** On the frontend tier, hand the full
  array to `data` and delete your `sortStatus`/`page` sort-and-slice logic — the
  table does it. For a server API, use the [server tier](./data-tiers.md)
  instead of manual `fetching`.
- **`render(record, index)` → `Cell`.** Use a module-level component receiving
  `{ row, rowIndex }`, or the lighter `accessor: (row) => …`. A cell that
  returns formatted/JSX content needs `sortValue` to stay sortable.
- **Filters are declarative.** Replace a hand-built `column.filter` popover with
  a `filter` shorthand (`"text"`, `"select"`, `"dateRange"`, …). A genuinely
  bespoke control can still be passed as JSX to the table-level `filters` prop.
- **`textAlign` values change.** `'left'`/`'right'` become the logical
  `'start'`/`'end'`, which flip correctly in RTL.

## Where next

- [Getting started](./getting-started.md) — install, providers, first table.
- [Filtering](./filtering.md) · [Data tiers](./data-tiers.md) ·
  [Column management](./column-management.md) · [Saved views](./saved-views.md).
- [Comparison](./comparison.md) — where each library fits.
