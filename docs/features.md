# Feature composition — `features={[rowReorder(fn)]}`

▶ **See it working:** [the Feature Lab](https://orwa-mahmoud.github.io/adapttable/demo/all-options/) — every opt-in, on every kit.

Every opt-in is an import and one entry in `features`. The import is the
switch, which is what lets a table pay only for what it named:

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

A built-in factory and a host plugin are the same `TableFeature` type in the
same array — that is the public plugin surface, not a parallel API.

## What the import buys

A bundler follows imports, not prop values, so the import is the switch: a
table downloads a feature's implementation when it names it, and not before.
An adapter's `DataTable` is 55–67 kB gzipped and carries the base contract —
responsive rendering, loading, error and empty states, accessibility, sorting,
search and pagination. Everything else arrives with its own entry.

The props that used to arm features are inert: `enableColumnMenu`,
`bulkActions`, `contextMenu`, `commandPalette`, `statusBar`, `sidePanel`,
`findInTable` and the rest configure a feature you compose, and draw nothing on
their own.

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
| `@adapttable/<kit>/preset`          | `standardFeatures`, `StandardFeatureOptions`                      |
| `@adapttable/<kit>/features`        | every factory, plus `applyTableFeatures`                          |
| `@adapttable/<kit>/pivot`           | `PivotPanel` and the pivot engine (`pivot`, `pivotTableModel`, …) |

`<kit>` is `mantine`, `mui`, `chakra`, `antd`, `radix`, `base-ui`, `shadcn`,
or `unstyled`. The factories themselves live in `@adapttable/core/features`;
the kit subpaths re-export them so the import path matches the table.

The pivot engine stays a calculation — `import { pivot } from "@adapttable/core/pivot"`
— not a `<DataTable>` prop. The kit `/pivot` subpath is the panel plus that
engine, so a host that composes a pivot table still does it in one import.

## The standard preset — one import for a good table

```tsx
import { DataTable } from "@adapttable/mantine";
import { standardFeatures } from "@adapttable/mantine/preset";

<DataTable
  data={rows}
  columns={columns}
  rowKey={(r) => r.id}
  features={standardFeatures()}
/>;
```

With no arguments it composes the features that work with nothing else
supplied: the Columns menu, CSV export, find-in-table, fit-columns, the
fullscreen toggle, header filters, multi-sort, resizable columns and the status
bar.

A feature that needs input joins only when you give it that input, because an
inert implementation is exactly the weight this architecture exists to remove:

```tsx
standardFeatures({
  grouping: "team",
  bulkActions: [{ key: "delete", label: "Delete", onClick: remove }],
  filters: [{ key: "team", type: "select", options: teams }],
  savedViews: { storage: "local" },
});
```

Two factories are callable with no arguments and are still NOT members: the
density chooser draws nothing unless the host also passes `onDensityChange`,
and selection statistics need a cell range — which needs `cellNavigation` —
while arming a row-selection column on their own. Import either directly when
you want it.

The result is an ordinary array. Append to it, filter it, or replace an entry:

```tsx
features={[...standardFeatures(), auditLog(), rowReorder(reorder)]}
```

Later entries win, so re-composing a member replaces it rather than doubling
it, and a duplicate id warns in development.

**The preset entry statically imports everything it can compose**, so its own
bundle contains the configurable members whether or not you pass their options.
That is the trade: one import instead of nine.

Measured on MUI, the table alone is 55.5 kB gzipped and the same table with
`standardFeatures()` composed is 101.9 kB.
A table counting every byte imports the individual features it uses instead,
and pays for those alone — `pnpm budget` measures both paths on every run.

## Types, and why no annotation is needed

```tsx
import { grouping } from "@adapttable/mantine/grouping";
import { virtualize } from "@adapttable/mantine/virtualize";

<DataTable features={[grouping("team"), virtualize()]} />;
```

A factory whose configuration says nothing about rows returns a
`StaticTableFeature` — the same feature whatever the table holds — and composes
into any `<DataTable>` with no type argument.

A factory that takes a row-typed callback returns `TableFeature<TRow>` and
infers the row from that callback: `rowReorder(handler)`, `editing(save)`. Put
one in a table of a different row type and the compiler refuses, naming the
feature's own row type.

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

### Features that draw — `renders`

State is half of a feature; the other half is what the reader sees. A feature
fills named positions in the table, and the kit's own components are what it
fills them with:

```tsx
import {
  FeatureSlot,
  featureSlotKey,
  slotRender,
} from "@adapttable/core/adapter";

export const STATUS_BAR = featureSlotKey<{ total: number }>("status-bar");

export const statusBar = (): TableFeature => ({
  id: "status-bar",
  renders: [
    slotRender(STATUS_BAR, ({ total }) => <MyStatusBar total={total} />),
  ],
});
```

The table computes the props and asks; it never learns what was drawn:

```tsx
<FeatureSlot slot={STATUS_BAR} props={{ total }} />
```

`slotRender` is what keeps `total` typed at the call site; one feature can fill
several positions that take different props.

An unfilled slot renders nothing, so chrome around a position the reader does
not have simply is not there. `useFeatureSlotFilled` answers when a wrapper
must not be drawn around nothing.

Several features may fill one position — a toolbar takes more than one control
— so a slot keeps every answer and orders them by feature id, the same way
providers nest. Fillers belong to the table that composed them, so two tables
on a page never draw each other's controls.

This is why a kit's pixels stay out of the base graph: the adapter's table asks
for a position, and only the feature that was imported can answer.

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
