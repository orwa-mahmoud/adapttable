---
title: "Migrate from TanStack Table — headless, UI kits (v2)"
description: TanStack Table renders nothing — no toolbar, filter inputs,
  pagination or URL sync. AdaptTable keeps the headless model, ships the UI.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Migrate
      from TanStack Table — headless, UI
      kits","item":"https://adapttable.orwamahmoud.com/v2/react/migrate-from-tanstack-table/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/migrate-from-tanstack-table.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/migrate-from-tanstack-table.png
slug: v2/react/migrate-from-tanstack-table
---

▶ **See it before you install:** [the live demo](https://adapttable.orwamahmoud.com/react/demo/?kit=tailwind) — the unstyled adapter with your own classes, plus seven kit-native ones in the switcher.

[TanStack Table](https://tanstack.com/table/latest) is a superb headless engine
— you keep total control because it renders nothing: no markup, no toolbar, no
filter inputs, no pagination controls, no URL sync. AdaptTable shares that
philosophy. `@adapttable/core` is also headless (prop-getters, no forced
markup), but it comes with the parts you rebuild on every TanStack project
already wired: a filter UI, a toolbar, pagination, URL-synced state, and saved
views. And when you *don't* need bespoke markup, an adapter renders native kit
components so you can delete the table UI entirely.

TanStack is multi-framework (React, Vue, Svelte, Solid, …); AdaptTable is
React-only. If you're not on React, stay on TanStack. This page is for React
teams tired of rebuilding the same chrome.

## What you gain

Everything TanStack leaves to you (verified from its docs), done for you:

* **A filter UI.** TanStack gives you `columnFilters` state and
  `getFacetedUniqueValues`, but you render every input. AdaptTable derives
  kit-native widgets, removable chips, and URL params from a `filter`
  declaration. See [filtering](/v2/react/filtering/).
* **A toolbar, pagination, and search** — none of which exist in TanStack; you
  wire the buttons around `nextPage()`/`setPageIndex()` yourself.
* **URL-synced state.** TanStack has no URL API; you serialize
  `sorting`/`columnFilters`/`pagination` by hand. AdaptTable does it. See
  [URL state](/v2/react/url-state/).
* **Saved views** — no concept in TanStack. See [saved views](/v2/react/saved-views/).
* **No opt-in row models.** You don't import `getSortedRowModel` /
  `getFilteredRowModel` / `getPaginationRowModel` — search, filter, sort, and
  paging run by default on the frontend tier.
* **Native kit UI, optional.** Keep headless control with `useDataTable`
  prop-getters, or adopt an adapter (`@adapttable/mantine`, `mui`, …) and drop
  your hand-written markup.

## Install

Headless core only, or core plus an adapter for ready UI:

```bash
# Headless (keep rendering your own markup, TanStack-style)
pnpm add @adapttable/core

# Batteries — native components for your kit (delete the markup)
pnpm add @adapttable/core @adapttable/mantine @mantine/core @mantine/hooks
```

## Concept mapping

| TanStack Table                                                        | AdaptTable                                                              | Notes                                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `useReactTable({ data, columns, getCoreRowModel })`                   | `useDataTable({ source, columns, rowKey })` or an adapter `<DataTable>` | `source` from `useFrontendData`; adapters accept `data` directly.                              |
| `getSortedRowModel` / `getFilteredRowModel` / `getPaginationRowModel` | (none needed)                                                           | Applied automatically on the frontend tier.                                                    |
| `flexRender(cell.column.columnDef.cell, …)`                           | adapter renders, or prop-getters (`getCellProps`, …)                    | Headless route mirrors TanStack's model.                                                       |
| `columnHelper.accessor("name", …)`                                    | `{ key: "name" }`                                                       | Dot paths work in both.                                                                        |
| `columnHelper.accessor(row => …)` (`accessorFn`)                      | `{ key, accessor: (row) => … }`                                         | —                                                                                              |
| `columnHelper.display({ cell })`                                      | `{ key, Cell }`                                                         | `Cell` receives `{ row, rowIndex }`.                                                           |
| `header` / `cell` / `footer`                                          | `header` / `Cell` (or `accessor`) / `summaryRow` (+ `renderFooter`)     | Footer values come from one table-level function; a column's `renderFooter` replaces its cell. |
| `enableSorting` / `state.sorting` / `onSortingChange`                 | `sortable` per column (+ `multiSort`)                                   | AdaptTable owns sort state.                                                                    |
| `columnFilters` + `getFilteredRowModel` + your inputs                 | column `filter` shorthand + `filters` array                             | Widgets + chips built for you.                                                                 |
| `state.pagination` + `getPaginationRowModel` + your controls          | automatic pagination                                                    | Paged on desktop, infinite on mobile.                                                          |
| `enableRowSelection` + `state.rowSelection` + your checkboxes         | `bulkActions` / `selectedIds` / `onSelectionChange`                     | —                                                                                              |
| `getExpandedRowModel` + `row.getToggleExpandedHandler()`              | `renderRowDetail`                                                       | Toggle UI is provided, not hand-added.                                                         |
| `getSubRows` (sub-row hierarchy)                                      | `getChildren` (or `getParentId`)                                        | Tree data with its own chevron and indent. See [tree data](/v2/react/tree-data/).                    |
| `columnVisibility` / `columnOrder` / `columnPinning` state            | `enableColumnMenu` / `columnLayout`                                     | One built-in menu instead of hand-wired state + DnD.                                           |
| `manualSorting` / `manualFiltering` / `manualPagination`              | `onQueryChange` (or `source` via `useQuerySource`)                      | One consolidated server query. See [data tiers](/v2/data-tiers/).                              |
| (serialize state to the URL yourself)                                 | `urlSync` / `urlKey` / `savedViews`                                     | URL sync is on by default; `savedViews` is opt-in (pass a `storageKey`).                       |

## Before / after

**Before** — TanStack: opt-in row models, `flexRender`, and hand-built
pagination:

```tsx
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const col = createColumnHelper<Person>();
const columns = [
  col.accessor("name", { header: "Name" }),
  col.accessor("role", { header: "Role" }),
];

function PeopleTable({ people }: { people: Person[] }) {
  const table = useReactTable({
    data: people,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <table>
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th key={h.id} onClick={h.column.getToggleSortingHandler()}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {/* …and you still hand-write the pagination buttons, search box,
          filter inputs, and URL syncing. */}
    </>
  );
}
```

**After** — an adapter renders native UI; search, sort, filters, pagination, and
URL state come built in:

```tsx
import { DataTable } from "@adapttable/mantine"; // or mui, chakra, antd, …

function PeopleTable({ people }: { people: Person[] }) {
  return (
    <DataTable
      data={people}
      rowKey={(r) => r.id}
      columns={[
        { key: "name", sortable: true },
        { key: "role", filter: { type: "select", options: "auto" } },
      ]}
    />
  );
}
```

Prefer to keep your own markup? Stay headless with `@adapttable/core`:
`useFrontendData` for the source and `useDataTable` for the prop-getters
(`getTableProps`, `getHeaderCellProps`, `getSortButtonProps`, `getRowProps`,
`getCellProps`, `getSearchInputProps`) — the same headless shape as TanStack,
but with filters, pagination, and URL state already handled.

## Gotchas

* **React only.** On Vue/Svelte/Solid/Angular, keep TanStack — AdaptTable has no
  adapter for those.
* **`rowKey` is required** (AdaptTable's `getRowId`).
* **Delete the opt-in row models.** No `getSortedRowModel` /
  `getFilteredRowModel` / `getPaginationRowModel` imports — those run for you.
* **Filters are declarative, not hand-rendered.** Swap your custom filter inputs
  for a `filter` shorthand; a bespoke control can still be JSX in `filters`.
* **You keep the headless escape hatch.** `useDataTable` returns prop-getters, so
  moving to AdaptTable doesn't mean giving up control — it means not rebuilding
  the chrome first.

## Still on react-table v7?

If your project uses the legacy `react-table` package (v7 — `useTable` +
`useSortBy` / `useFilters` / `usePagination` / `useRowSelect` plugin hooks),
you're on a frozen library: v7 stopped receiving releases when the project
became TanStack Table v8. You have two upgrade paths, and both are rewrites of
your table UI — the v7 plugin-hook API doesn't carry over:

* **react-table v7 → TanStack v8**: new package, new column defs, new row
  models — and you still hand-build every piece of UI afterwards.
* **react-table v7 → AdaptTable**: the same rewrite cost, but you come out the
  other side with the toolbar, filters, pagination, URL sync, and native kit
  rendering already done.

The v7 concepts map cleanly: `useTable({ columns, data })` → `<DataTable
data={…} columns={…}>`; a v7 column's `Header`/`accessor`/`Cell` →
AdaptTable's `header`/`key` (or `accessor`)/`Cell`; `useSortBy` → per-column
`sortable`; `usePagination` → automatic; `useRowSelect` → `bulkActions` /
`onSelectionChange`; `useExpanded` → `renderRowDetail`. Since you must rewrite
anyway, migrating "up" to batteries beats migrating sideways to another
build-it-yourself engine.

## Where next

* [Concepts](/v2/concepts/) — the headless engine and `TableSource`.
* [Getting started](/v2/react/getting-started/) · [Filtering](/v2/react/filtering/) ·
  [Data tiers](/v2/data-tiers/) · [API reference](/v2/react/api/).
* [Comparison](/v2/react/comparison/) — where each library fits.
