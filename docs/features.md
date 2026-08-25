# Feature composition — `features={[rowReorder(fn)]}`

▶ **See it working:** [the Feature Lab](https://orwa-mahmoud.github.io/adapttable/demo/all-options/) — every opt-in, on every kit.

Opt-in features used to be a prop: pass `onRowReorder` and a grip appears. That
still works. The new path moves the enable-switch onto the import:

```tsx
import { DataTable } from "@adapttable/mantine";
import { rowReorder } from "@adapttable/mantine/row-reorder";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(row) => row.id}
  features={[
    rowReorder((from, to) => setRows(applyRowReorder(rows, from, to))),
  ]}
/>;
```

Same runtime as `onRowReorder={…}`. A built-in factory and a host plugin are
the same `TableFeature` type in the same array — that is the public plugin
surface, not a parallel API.

## No bundle savings yet

While the enabling props still work, `DataTable` keeps its internal imports. A
bundler follows imports, not prop values, so a plain table still ships every
feature it _might_ render. The drop lands at v3, when the props go away and
the adapter can stop importing what the host did not.

Until then: compose with `features` so the call site already names what it
uses, and keep the props if that is what you have.

## Kit subpaths

Every public adapter exports the same factories:

| Import                              | Factory                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `@adapttable/<kit>/row-reorder`     | `rowReorder`                                                      |
| `@adapttable/<kit>/saved-views`     | `savedViews`                                                      |
| `@adapttable/<kit>/grouping`        | `grouping`                                                        |
| `@adapttable/<kit>/editing`         | `editing`                                                         |
| `@adapttable/<kit>/virtualize`      | `virtualize`                                                      |
| `@adapttable/<kit>/column-menu`     | `columnMenu`                                                      |
| `@adapttable/<kit>/cell-navigation` | `cellNavigation`                                                  |
| `@adapttable/<kit>/features`        | every factory, plus `applyTableFeatures`                          |
| `@adapttable/<kit>/pivot`           | `PivotPanel` and the pivot engine (`pivot`, `pivotTableModel`, …) |

`<kit>` is `mantine`, `mui`, `chakra`, `antd`, `radix`, `base-ui`, `shadcn`,
or `unstyled`. The factories themselves live in `@adapttable/core/features`;
the kit subpaths re-export them so the import path matches the table.

The pivot engine stays a calculation — `import { pivot } from "@adapttable/core/pivot"`
— not a `<DataTable>` prop. The kit `/pivot` subpath is the panel plus that
engine, so a host that composes a pivot table still does it in one import.

## Both paths, until v3

```tsx
// Deprecated, still works:
<DataTable onRowReorder={handler} groupBy="team" virtualize />;

// Preferred:
import { grouping } from "@adapttable/mantine/grouping";
import { rowReorder } from "@adapttable/mantine/row-reorder";
import { virtualize } from "@adapttable/mantine/virtualize";

<DataTable features={[rowReorder(handler), grouping("team"), virtualize()]} />;
```

An explicit prop wins if both are set. Development mode warns once when a
deprecated enabling prop is used. The props are removed in v3.

A host plugin is the same object: `feature("audit-log", { statusBar: true })`,
or a `TableFeature` with `setup(host)` for live registration (custom filter
types, editors, aggregators, exporters, menu items, panels, commands).

## Every factory

`rowReorder` · `rowPinning` · `cellSpan` · `extraRows` · `rowAppearance` ·
`rowDetail` · `nestedTable` · `editing` · `rowEditing` · `batchEditing` ·
`editHistory` · `dirtyIndicators` · `grouping` · `tree` · `virtualize` ·
`columnMenu` · `resizableColumns` · `collapsibleColumnGroups` · `exportCsv` ·
`cellNavigation` · `findInTable` · `fullscreen` · `commandPalette` ·
`contextMenu` · `sidePanel` · `bulkActions` · `filters` · `filterTypes` ·
`headerFilters` · `savedViews` · `selectionStats` · `densityChooser` ·
`print` · `statusBar` · `undoRedoButtons` · `multiSort` · `fitColumns` ·
`columnSelectionCheckbox` · `feature` (ad-hoc patch) · `applyTableFeatures`
(the merge used by every adapter).
