---
title: "Feature composition — features={[rowReorder(fn)]} (v2)"
description: Compose AdaptTable features from kit subpath imports —
  features={[rowReorder(fn)]} — same runtime as the enabling props, which stay
  until v3.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Feature
      composition —
      features={[rowReorder(fn)]}","item":"https://adapttable.orwamahmoud.com/v2/react/features/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/features.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/features.png
slug: v2/react/features
---

▶ **See it working:** [the Feature Lab](https://adapttable.orwamahmoud.com/react/demo/all-options/) — every opt-in, on every kit.

An opt-in feature is enabled by a prop — pass `onRowReorder` and a grip
appears — or by a factory in the `features` array, which moves the
enable-switch onto the import:

```tsx
import { applyRowReorder } from "@adapttable/core";
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

## No bundle savings from `features`

While the enabling props work, `DataTable` keeps its internal imports. A
bundler follows imports, not prop values, so a plain table ships every
feature it *might* render, whichever path enables it.

Compose with `features` so the call site names what it uses, and keep the
props if that is what you have.

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

## Both paths

```tsx
// Deprecated, works:
<DataTable onRowReorder={handler} groupBy="team" virtualize />;

// Preferred:
import { grouping } from "@adapttable/mantine/grouping";
import { rowReorder } from "@adapttable/mantine/row-reorder";
import { virtualize } from "@adapttable/mantine/virtualize";

<DataTable features={[rowReorder(handler), grouping("team"), virtualize()]} />;
```

An explicit prop wins if both are set. Development mode warns once when a
deprecated enabling prop is used.

A host plugin is the same object: `feature("audit-log", { statusBar: true })`,
or a `TableFeature` with `setup(host)` for live registration.

## Host plugins — `setup(host)`

The enabling props (`filterTypes`, `exportCsv.writer`, `commandPalette.commands`,
`contextMenu.items`, `sidePanel.panels`) work. The public
registration surface is the same `TableFeature` as the factories: one array,
one host, lifecycle via `onDispose` or a function returned from `setup`.

```tsx
import type { TableFeature } from "@adapttable/mantine/features";

const currencyFilter: TableFeature = {
  id: "currency-filter",
  setup(host) {
    host.registerFilterType({
      type: "currency",
      widget: "numberRange",
      ops: ["eq", "gt", "lt"],
      defaultOp: "eq",
      stateKeys: (def) => [def.key],
      match: () => true,
      chips: () => ({}),
      conditionToExtra: () => ({}),
    });
    return () => {
      /* table unmounted, or `features` changed */
    };
  },
};

<DataTable features={[currencyFilter, rowReorder(onReorder)]} … />;
```

Every seam is a method on `TableFeatureHost`. Built-in factories that carry
extras (`filterTypes`, `exportCsv` with a writer, `commandPalette` with extra
commands, `contextMenu` with extra items, `sidePanel` panels) call the same
methods in `setup`, so a plugin is not a second API.

| Host method                | Same as                                     |
| -------------------------- | ------------------------------------------- |
| `registerFilterType`       | `filterTypes={[spec]}`                      |
| `extendFilterType`         | `FilterTypeRegistry.extend`                 |
| `registerEditor`           | `column.editor: { type: "custom", render }` |
| `registerAggregator`       | `aggregate({ key: fn })`                    |
| `registerWriter`           | `exportCsv={{ writer }}`                    |
| `registerColumnMenuAction` | appended after the built-in Columns actions |
| `registerPanel`            | `sidePanel.panels` (needs an open dock)     |
| `registerCommand`          | `commandPalette.commands`                   |
| `registerContextMenuItems` | `contextMenu.items`                         |
| `onDispose`                | cleanup when the table unmounts             |

A named editor is a string `column.editor` that is not a built-in (`"text"`,
`"number"`, …). `resolveCellEditor` turns it into `{ type: "custom", render }`
so adapters keep one custom-editor path. A named aggregator is a string
`aggregate()` looks up after the built-ins, when the mapper **runs** (inside
the table), not when `aggregate()` is called in the parent.

`registerPanel` appends to an existing `sidePanel` dock — the host still owns
`open` / `onOpenChange`. Registering a command or a context-menu factory with
no matching prop is enough to arm that chrome.

The per-seam registration APIs (`FilterTypeRegistry.register` / `extend`, the
`filterTypes` prop) are deprecated in favour of the host methods.

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
(the merge used by every adapter) · `useTableFeatures` (apply + `setup(host)`,
the hook every adapter runs). For adapter authors, `@adapttable/core/adapter`
adds `featureHostOf` / `rememberFeatureHost` (the
host of one table, never a sibling's) · `FeatureHostProvider` /
`useFeatureHost` (hooks under that table) · `bindFeatureHostFn` (a mapper
created outside the table still resolves names for the table that invokes it).
