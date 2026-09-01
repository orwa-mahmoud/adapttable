# Upgrading from v2

v3 removes the enabling props. A feature is an import and an entry in
`features`, and that is the only way in — which is what lets a table download
what it named and nothing else. An adapter's `DataTable` is 55–67 kB gzipped
because of it.

Nothing else about the table changed: the same columns, the same data tiers,
the same URL state, the same labels.

## The shortest upgrade

If your table used most of the chrome, one import replaces the lot:

```tsx
import { DataTable } from "@adapttable/mantine";
import { standardFeatures } from "@adapttable/mantine/preset";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(r) => r.id}
  features={standardFeatures({ grouping: "team", filters: filterDefs })}
/>;
```

`standardFeatures()` brings the Columns menu, the density chooser, CSV export,
find-in-table, fit-columns, the fullscreen toggle, header filters, multi-sort,
resizable columns and the status bar. Grouping, bulk actions, filters and saved
views join when you pass their options. See [feature composition](./features.md)
for what the preset costs against individual imports.

## The smallest upgrade

Import only what you used. Each row below is a prop you were passing and the
factory that replaces it:

```tsx
// v2
<DataTable groupBy="team" enableColumnMenu exportCsv onCellEdit={save} />;

// v3
import { columnMenu } from "@adapttable/mantine/column-menu";
import { editing } from "@adapttable/mantine/editing";
import { exportCsv } from "@adapttable/mantine/export";
import { grouping } from "@adapttable/mantine/grouping";

<DataTable
  features={[grouping("team"), columnMenu(), exportCsv(), editing(save)]}
/>;
```

No type arguments are needed. A factory whose configuration says nothing about
rows composes into any table; one that takes a row-typed callback infers the
row from that callback.

## Every removed prop, and what replaces it

| Removed prop                                                                  | Replacement                  | Import                                |
| ----------------------------------------------------------------------------- | ---------------------------- | ------------------------------------- |
| `batchEditing`, `onBatchEdit`                                                 | `batchEditing(…)`            | `@adapttable/<kit>/editing`           |
| `bulkActions`                                                                 | `bulkActions(…)`             | `@adapttable/<kit>/bulk-actions`      |
| `cellNavigation`                                                              | `cellNavigation(…)`          | `@adapttable/<kit>/cell-navigation`   |
| `getCellSpan`, `cellSpanAppearance`                                           | `cellSpan(…)`                | `@adapttable/<kit>/cell-span`         |
| `collapsibleColumnGroups`                                                     | `collapsibleColumnGroups(…)` | `@adapttable/<kit>/column-groups`     |
| `enableColumnMenu`                                                            | `columnMenu(…)`              | `@adapttable/<kit>/column-menu`       |
| `columnSelectionCheckbox`                                                     | `columnSelectionCheckbox(…)` | `@adapttable/<kit>/column-selection`  |
| `commandPalette`                                                              | `commandPalette(…)`          | `@adapttable/<kit>/command-palette`   |
| `contextMenu`                                                                 | `contextMenu(…)`             | `@adapttable/<kit>/context-menu`      |
| `densityChooser`                                                              | `densityChooser(…)`          | `@adapttable/<kit>/density`           |
| `dirtyIndicators`                                                             | `dirtyIndicators(…)`         | `@adapttable/<kit>/editing`           |
| `editHistory`                                                                 | `editHistory(…)`             | `@adapttable/<kit>/editing`           |
| `onCellEdit`                                                                  | `editing(…)`                 | `@adapttable/<kit>/editing`           |
| `exportCsv`                                                                   | `exportCsv(…)`               | `@adapttable/<kit>/export`            |
| `extraRows`                                                                   | `extraRows(…)`               | `@adapttable/<kit>/extra-rows`        |
| `filters`                                                                     | `filters(…)`                 | `@adapttable/<kit>/filters`           |
| `filterTypes`                                                                 | `filterTypes(…)`             | `@adapttable/<kit>/filters`           |
| `findInTable`                                                                 | `findInTable(…)`             | `@adapttable/<kit>/find-in-table`     |
| `fitColumns`                                                                  | `fitColumns(…)`              | `@adapttable/<kit>/fit-columns`       |
| `fullscreen`                                                                  | `fullscreen(…)`              | `@adapttable/<kit>/fullscreen`        |
| `groupBy`                                                                     | `grouping(…)`                | `@adapttable/<kit>/grouping`          |
| `headerFilters`                                                               | `headerFilters(…)`           | `@adapttable/<kit>/header-filters`    |
| `multiSort`                                                                   | `multiSort(…)`               | `@adapttable/<kit>/multi-sort`        |
| `nestedTable`                                                                 | `nestedTable(…)`             | `@adapttable/<kit>/nested-table`      |
| `onPrint`, `printButton`                                                      | `print(…)`                   | `@adapttable/<kit>/print`             |
| `resizableColumns`                                                            | `resizableColumns(…)`        | `@adapttable/<kit>/resizable-columns` |
| `onAddRow`, `onDuplicateRow`, `onDeleteRow`, `confirmDeleteRow`, `rowActions` | `rowActions(…)`              | `@adapttable/<kit>/row-actions`       |
| `rowStyle`, `rowHeight`, `rowClassName`                                       | `rowAppearance(…)`           | `@adapttable/<kit>/row-appearance`    |
| `renderRowDetail`, `defaultExpandedRowIds`                                    | `rowDetail(…)`               | `@adapttable/<kit>/row-detail`        |
| `rowEditing`, `onRowEdit`                                                     | `rowEditing(…)`              | `@adapttable/<kit>/editing`           |
| `pinnedRowIds`, `onPinnedRowIdsChange`                                        | `rowPinning(…)`              | `@adapttable/<kit>/row-pinning`       |
| `savedViews`                                                                  | `savedViews(…)`              | `@adapttable/<kit>/saved-views`       |
| `selectionStats`                                                              | `selectionStats(…)`          | `@adapttable/<kit>/selection-stats`   |
| `sidePanel`                                                                   | `sidePanel(…)`               | `@adapttable/<kit>/side-panel`        |
| `statusBar`                                                                   | `statusBar(…)`               | `@adapttable/<kit>/status-bar`        |
| `getChildren`, `getParentId`, `treeColumn`, `onLoadChildren`                  | `tree(…)`                    | `@adapttable/<kit>/tree`              |
| `undoRedoButtons`                                                             | `undoRedoButtons(…)`         | `@adapttable/<kit>/editing`           |
| `virtualize`, `virtualizeColumns`                                             | `virtualize(…)`              | `@adapttable/<kit>/virtualize`        |

Companion props travel with their feature: `cellSpanAppearance` is the second
argument to `cellSpan`, `defaultExpandedRowIds` the second to `rowDetail` and
`nestedTable`, `printButton` the second to `print`. Grouping's extras
(`groupAggregates`, `groupSort`, `groupFooters`, paging, collapse state) are one
options object:

```tsx
grouping("team", {
  groupAggregates: (rows: readonly Person[]) => ({ spend: total(rows) }),
  groupFooters: true,
});
```

## The other three removals

**Main-entry adapter machinery.** 72 names that were re-exported from
`@adapttable/core` now live only on `@adapttable/core/adapter`, which is where
they were always documented:

```ts
// v2
import { headerGroupRows } from "@adapttable/core";
// v3
import { headerGroupRows } from "@adapttable/core/adapter";
```

**`FilterTypeRegistry.register` / `.extend`.** A custom filter type registers
through a feature, on the same object every other extension uses:

```tsx
// v2
const registry = FilterTypeRegistry.register(mySpec);
// v3
features={[{ id: "my-filter", setup: (host) => host.registerFilterType(mySpec) }]}
```

`filterTypes([mySpec])` from `@adapttable/<kit>/filters` does the same thing
without writing the object by hand.

**MUI's `size` prop.** Use `density`: `density="compact"` is what `size="small"`
meant, and `density="comfortable"` is `size="medium"`.

## Checking the upgrade

The compiler finds every call site: a removed prop is not in
`DataTableProps` any more, so `tsc` names each one. There is no deprecation
warning to grep for, because there is nothing left to deprecate.
