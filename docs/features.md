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
or a `TableFeature` with `setup(host)` for live registration.

## Host plugins — `setup(host)`

The enabling props (`filterTypes`, `exportCsv.writer`, `commandPalette.commands`,
`contextMenu.items`, `sidePanel.panels`) still work until v3. The public
registration surface is the same `TableFeature` as the factories: one array,
one host, lifecycle via `onDispose` or a function returned from `setup`.

```tsx
import type { TableFeature } from "@adapttable/mantine/features";

const currencyFilter: TableFeature = {
  id: "currency-filter",
  setup(host) {
    host.registerFilterType({
      type: "currency",
      widget: "number",
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

The per-seam registration APIs this supersedes (`FilterTypeRegistry.register`
/ `extend`, the `filterTypes` prop) are deprecated and removed at v3.

## Features that own hooks — `provider`

`apply` sets props and `setup(host)` registers values, but neither can add a
React hook. Hooks must be called in the same order on every render, so a table
that calls `useRowReorder` only when the feature is composed is not a table with
an optional feature — it is a crash. That is why the enabling props never saved
a byte: whatever the props said, the import was already in the graph.

A component is the answer, because mounting and unmounting one is the legal way
to add and remove hooks. A feature may carry a `provider` whose component wraps
the table, calls whatever hooks it needs, and publishes the result under a typed
key:

```tsx
import {
  FeatureStateScope,
  featureStateKey,
  type TableFeature,
} from "@adapttable/core/adapter";

export const AUDIT = featureStateKey<{ count: number }>("audit-log");

export const auditLog = (): TableFeature => ({
  id: "audit-log",
  provider: {
    Provider: ({ children }) => {
      const [count, setCount] = useState(0);
      useEffect(() => subscribe(() => setCount((n) => n + 1)), []);
      return (
        <FeatureStateScope stateKey={AUDIT} value={{ count }}>
          {children}
        </FeatureStateScope>
      );
    },
  },
});
```

Anything under the table reads it with `useFeatureState`, which returns
`undefined` when the feature is not composed — the ordinary answer for a table
that does not have it, not an error:

```tsx
const audit = useFeatureState(AUDIT);
if (!audit) return null;
return <span>{audit.count} changes</span>;
```

Both halves are typed: `featureStateKey<T>` fixes what the provider must publish
and what a reader gets back, so this is a contract rather than a bag of strings.

### What the table guarantees

- **Order comes from the ids, not from your array.** Providers nest in
  feature-id order, so `[grouping("team"), auditLog()]` and
  `[auditLog(), grouping("team")]` build the identical tree. Moving a line never
  remounts a provider or discards what it was holding.
- **One provider per id.** A duplicate id warns in development and the last one
  wins, exactly as `apply` already resolves duplicates.
- **A provider mounts when its feature arrives and unmounts when it leaves**, and
  its cleanup runs once.
- **State belongs to its own table.** It travels by context, so two tables on a
  page — and a table nested in another table's row detail — never read each
  other's. A nested table shadows the outer value for its own subtree while
  everything the outer table published stays readable.

This is the same `TableFeature` in the same `features` array. There is no second
registry to learn and nothing global to collide over.

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
the hook every adapter runs) · `featureHostOf` / `rememberFeatureHost` (the
host of one table, never a sibling's) · `FeatureHostProvider` /
`useFeatureHost` (hooks under that table) · `bindFeatureHostFn` (a mapper
created outside the table still resolves names for the table that invokes it).
