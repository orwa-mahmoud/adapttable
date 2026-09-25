# Architecture

How AdaptTable is put together, and the boundaries that hold it that way. The
machine-readable half of the feature surface is
[`scripts/feature-classification.json`](scripts/feature-classification.json) —
reconciled against the code by `pnpm check:features` and `pnpm check:boundary`.
The machine-readable half of the **package split** (every current public
symbol, its class, and its destination import) is
[`scripts/v3-package-split-map.json`](scripts/v3-package-split-map.json),
reconciled by `node scripts/check-package-split-map.mjs`. The human
migration rules live in [Upgrading from v2](docs/migrate-from-v2.md#v3-package-split).

## The package graph

```
@adapttable/core              neutral engine — models, state, operations
        ↑
@adapttable/react             headless React binding + structural Chrome
        ↑
@adapttable/<kit>             kit DataTable, feature factories, required slots
        ↑
your application              columns, data / source, rowKey

@adapttable/ai                neutral session / catalog / execute
@adapttable/ai-react          tableAgent + live React session
@adapttable/ai/{json,openai,mcp,http,ag-ui,ai-sdk,…}
                              optional provider / transport helpers
```

Canonical names:

| Package                | Owns                                                                                                                                                | Must not own                             |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `@adapttable/core`     | Column models, `TableSource`, query/filter/sort/page/group/tree contracts, revisions, operations, feature **registrations** (operators, not pixels) | React, React types, Chrome, AI           |
| `@adapttable/react`    | `useDataTable`, hooks, Chrome, React `ColumnDef` / renderer types, feature **providers**                                                            | A UI kit, a model SDK                    |
| `@adapttable/<kit>`    | `DataTable`, kit-native slots, kit feature entrypoints                                                                                              | Engine state, AI runtime                 |
| `@adapttable/ai`       | Provider-neutral session, manifest, schemas, validation                                                                                             | React (root), model SDKs, hosted service |
| `@adapttable/ai-react` | `tableAgent`, observation from a mounted React table                                                                                                | Kit components                           |

`@adapttable/server` parses and validates table queries on the server;
`@adapttable/i18n` carries the locale bundles; `@adapttable/cli` scaffolds and
migrates. None of them are on the render path. Core imports neither React nor
AI. AI depends only on neutral `@adapttable/core` contracts. AI React imports
the binding through `@adapttable/react/adapter`. The React package does not
depend on a kit; `@adapttable/shadcn` builds on `@adapttable/unstyled`.

Kit imports: `import { DataTable } from "@adapttable/mui"`,
`import { grouping } from "@adapttable/mui/grouping"`, and
`standardFeatures()` from `@adapttable/mui/preset`. Preset options affect
behavior, not a guarantee that unused members disappear.

## Neutral contracts

Row data stays the host's type — never restricted to JSON. The declarations
below are abridged; the source file named with each is authoritative.

### Column model vs React column

`packages/shared/core/src/columnModel.ts` and `packages/react/react/src/columnDef.ts`:

```ts
/** Neutral column — identity, values, and operation metadata. No renderers. */
export interface ColumnModel<TRow = unknown> {
  key: string;
  header?: string;
  accessor?: (row: TRow) => unknown;
  filter?: ColumnModelFilter; // string | Readonly<Record<string, unknown>>
  editor?: ColumnModelEditor; // string | Readonly<Record<string, unknown>>
  editValue?: (row: TRow) => string;
  sortValue?: (row: TRow) => SortableValue;
  exportValue?: (row: TRow) => unknown;
  formatValue?: (row: TRow) => string;
  // …plus identity (`i18n`, `ai`, `meta`), editing, grouping and
  // aggregation, sizing, spanning, mobile and locking metadata.
}

/** What the engine derives from: header and filter are left open. */
export type ColumnMetadata<TRow = unknown> = Omit<
  ColumnModel<TRow>,
  "header" | "filter"
> & {
  header?: unknown;
  filter?: unknown;
};

/**
 * React column. Renderers stay React nodes — the engine never stringifies
 * them into labels.
 */
export interface ColumnDef<TRow> extends ColumnMetadata<TRow> {
  filter?: ColumnFilter<TRow>;
  editor?: CellEditor;
  header?: ReactNode;
  headerActions?: ReactNode;
  renderHeader?: (ctx: ColumnHeaderContext<TRow>) => ReactNode;
  renderFooter?: (ctx: ColumnFooterContext<TRow>) => ReactNode;
  Cell?: ComponentType<CellProps<TRow>>;
  accessor?: (row: TRow) => ReactNode;
  formatAggregate?: (
    value: DisplayValue | undefined,
    context: AggregateFormatContext
  ) => ReactNode;
}
```

The engine and AI resolve a cell's value in this order
(`packages/shared/core/src/engine/cellValue.ts`): `formatValue`, then `exportValue`,
then `sortValue`, then the `key` / `i18n` data path. A React accessor or
`Cell` is never consulted, and a React node is never a cell value.

### Engine instance

`packages/shared/core/src/engine/createTableEngine.ts`:

```ts
export interface TableRevisions {
  /** Row identities or cell values changed. */
  readonly data: number;
  /** Sort, filter, page, group, expand, pin, search. */
  readonly view: number;
  /** Column set, types, or operation metadata. */
  readonly schema: number;
  /** Permissions, source capabilities, or wired operations. */
  readonly policy: number;
}

export type TableRevisionAxis = keyof TableRevisions;

export type TableRowScope = "visible" | "page" | "full";

/** View and policy operations. Row writes stay on host callbacks. */
export type TableOperation =
  | {
      readonly type: "setSort";
      readonly key?: string;
      readonly dir?: SortDirection;
    }
  | { readonly type: "setSearch"; readonly search: string }
  | { readonly type: "setPage"; readonly page: number }
  | { readonly type: "setLimit"; readonly limit: number }
  | { readonly type: "setFilters"; readonly filters: ExtraFilters }
  | { readonly type: "setGroupBy"; readonly key?: string }
  | { readonly type: "setSelection"; readonly ids?: readonly string[] };

export interface TableSnapshot<TRow = unknown> {
  readonly revisions: TableRevisions;
  readonly columns: readonly ColumnMetadata<TRow>[];
  readonly capabilities: TableSourceCapabilities;
  // …plus the view: page, requestedPage, lastPage, limit, search, sortBy,
  // sortDir, extra, groupBy, selectedIds and total.
}

export interface TableEngineReader<TRow = unknown> {
  readonly snapshot: () => TableSnapshot<TRow>;
  readonly getColumn: (key: string) => ColumnMetadata<TRow> | undefined;
  readonly cellValue: (row: TRow, columnKey: string) => unknown;
  readonly rows: (scope: TableRowScope) => readonly TRow[];
  readonly rowByKey: (rowKey: string) => TRow | undefined;
}

/** Framework-neutral table. */
export interface TableEngine<TRow = unknown> extends TableEngineReader<TRow> {
  readonly tableId: string;
  readonly rowKey: (row: TRow) => string;
  /** What the render in progress staged, or the committed state. */
  readonly candidate: TableEngineReader<TRow>;
  readonly subscribe: (
    axes: readonly TableRevisionAxis[] | "all",
    listener: (revisions: TableRevisions) => void
  ) => () => void;
  readonly dispatch: (operation: TableOperation) => void;
  readonly configure: (
    patch: TableEngineConfigPatch<TRow>,
    options?: { silent?: boolean }
  ) => void;
  readonly invalidate: (
    axes: readonly TableRevisionAxis[],
    next?: {
      readonly data?: readonly TRow[];
      readonly columns?: readonly ColumnMetadata<TRow>[];
    },
    options?: { silent?: boolean }
  ) => void;
  readonly stageCandidate: (
    patch: TableEngineConfigPatch<TRow>,
    next?: {
      readonly data?: readonly TRow[];
      readonly columns?: readonly ColumnMetadata<TRow>[];
    }
  ) => void;
  readonly commitCandidate: () => void;
  readonly discardCandidate: () => void;
  readonly dispose: () => void;
}
```

The host still owns the data. Edits, adds, deletes, and reorders go through
the host callbacks; `dispatch` changes view state and bumps the `view` axis,
and never becomes a store for rows. `TableSource` remains the query/data
contract — the engine is not a second source abstraction.

The React binding renders through a candidate: it stages configuration and
data with `stageCandidate` and publishes them with `commitCandidate`, so
`snapshot`, `rows`, the revision tokens and every subscriber stay on the
committed state until a render commits, and an abandoned render leaves it
untouched.

Updates are immutable from the engine's point of view. A host with a mutable
source calls `invalidate(["data"])` after in-place writes, and the engine
re-derives from the array it holds. Subscribers see revision bumps, not a row
scan, and a parent re-rendering with an equivalent options object bumps no
revision.

### Feature registration vs React features

`packages/shared/core/src/features/featureRegistration.ts` and
`packages/react/react/src/features/tableFeature.ts`:

```ts
/** Neutral plugin: id, operators, cleanup. No React configuration bags. */
export interface FeatureRegistration<TRow = unknown> {
  readonly id: string;
}

export interface NeutralFeatureHost<TRow = unknown> {
  onDispose(cleanup: () => void): void;
}

/** React feature: configuration, registrations, providers and slot renders. */
export interface TableFeature<
  TRow = unknown,
> extends FeatureRegistration<TRow> {
  readonly id: string;
  apply?(input: FeatureApplyInput<TRow>): FeaturePatch<TRow>;
  setup?(host: TableFeatureHost<TRow>): void | (() => void);
  readonly provider?: FeatureProviderContribution;
  readonly renders?: readonly FeatureRender<never>[];
}
```

`TableFeatureHost` is where custom filter types, editors, aggregators, export
writers, column-menu actions, side panels, commands and context-menu items
register, and `setup` returns its cleanup or hands it to `host.onDispose`.
A feature whose behavior is a hook contributes a `provider` — mounting it is
how hooks join the tree, and not importing it keeps them out of the graph.
Slot and `data-adapttable-part` names are part of the public contract. A React
`filters: ReactNode` option is not a neutral engine API.

### Neutral table interface for AI

`packages/shared/core/src/engine/neutralTable.ts`:

```ts
export interface NeutralTable<TRow = unknown> {
  readonly tableId: string;
  readonly revisions: TableRevisions;
  readonly columns: readonly ColumnMetadata<TRow>[];
  readonly cellValue: (row: TRow, columnKey: string) => unknown;
  readonly rows: (scope: TableRowScope) => readonly TRow[];
  readonly rowByKey: (rowKey: string) => TRow | undefined;
  readonly rowKey: (row: TRow) => string;
  readonly capabilities: TableSourceCapabilities;
  readonly operations: Readonly<Record<string, boolean>>;
  readonly subscribe: TableEngine<TRow>["subscribe"];
  readonly dispose: () => void;
}
```

`visible` is the rendered data-row order after grouping and tree expansion,
supplied by the binding; without one it is the engine page. `page` is the
source page. `full` throws unless `capabilities.fullDataset`. Group headers
are not writable data rows. `@adapttable/react` builds the table with
`createNeutralTable` and publishes it on the runtime view;
`@adapttable/ai-react` hands it to `@adapttable/ai`, which reads it without
importing React.

## The root table

`DataTable` is useful with three props — `columns`, `data`/`source`, `rowKey` —
and everything below is present without asking:

- responsive desktop and mobile rendering
- loading, error and empty states
- accessibility: roles, `aria-rowcount`/`aria-colcount`, live announcements
- single-column sorting, search, pagination and infinite data
- column resolution: the `columns` array rendered in order

Nothing else rides that import. Every other capability is a feature.

Membership is decided on two questions, both of which must be yes: is it
reachable from those three props, and is it cheap? Row selection, row actions,
column visibility and column order were each measured against that test and each
failed the first half — a three-prop table renders no checkbox, no action
column, and no way to change the column set. All four are cheap (0.10–1.90 KB),
and cheap alone is not a reason to charge every table for them, so each belongs
to the feature that already reaches it: selection to `columnSelectionCheckbox`,
`bulkActions` and `selectionStats`, the action column to its own factory, and
both column capabilities to `columnMenu`. The numbers and the method are in
`provisionalBaseReview` in the classification artifact.

## Features

A feature is one import and one entry in the `features` array:

```tsx
import { DataTable } from "@adapttable/mui";
import { grouping } from "@adapttable/mui/grouping";

<DataTable features={[grouping("team")]} … />;
```

Each of the 41 features is classified in
`scripts/feature-classification.json`, and the classification decides where its
code lives:

| Class        | Meaning                                                                                  | Count |
| ------------ | ---------------------------------------------------------------------------------------- | ----- |
| **headless** | Structure and state only. Core owns it; the kit renders it through slots it already has. | 13    |
| **adapter**  | Needs a kit-rendered control or surface of its own.                                      | 21    |
| **engine**   | Large calculation or interaction-opened panel.                                           | 7     |

A feature owns its complete contribution: its core module, its adapter
components, its subpath export, its labels and its tests. Nothing a feature
needs is reachable from the root import.

### `standardFeatures()`

One import for the common richer table, so the ordinary case is not ten
import lines. It is a starting point, not a tier — every member is separately
importable, and a table that wants ten of them composes ten.

Called bare it returns the ten factories that need no configuration:
`columnMenu`, `densityChooser`, `exportCsv`, `findInTable`, `fitColumns`,
`fullscreen`, `headerFilters`, `multiSort`, `resizableColumns`, `statusBar`.

`grouping`, `bulkActions`, `filters` and `savedViews` each need options to do
anything, so they join only when the caller supplies them —
`standardFeatures({ grouping: "team", filters: defs })`. `findButton: true`
adds the toolbar Find control. A feature that cannot act without configuration
is inert, so it stays out of the returned array. The preset entry itself
imports everything it can compose, so its bundle carries the optional members
whether or not their options are passed; a table counting every byte imports
the features individually.

Left out of the preset: `virtualize`, `tree` and the editing family change
render or data semantics rather than adding chrome; `commandPalette`,
`sidePanel`, `contextMenu`, `cellNavigation` and the pivot panel are large
enough that a table which does not want them should not carry them; and
`selectionStats` needs a cell range, which needs `cellNavigation`.

### Subpath naming

`@adapttable/<kit>/<feature>`, kebab-cased — `row-reorder`, `saved-views`,
`column-menu`. A few use a shorter name than the feature id: `density`,
`export`, `column-groups`, `column-selection`. Features that share one surface
share one subpath: the six editing features are all on
`@adapttable/<kit>/editing` (`batchEditing` also has its own `/batch-editing`),
and `filters` and `filterTypes` are both on `@adapttable/<kit>/filters`.

`@adapttable/<kit>/features` forwards the headless `@adapttable/react/features`
surface as it is. A factory that draws kit UI renders no controls when imported
from there, so each one comes from its own `@adapttable/<kit>/<subpath>`.

### Static imports

Feature imports are static. A bundler follows imports rather than prop values,
so a static graph is what makes the cost of a table equal to the features it
named.

A lazy variant is a separate export, admitted one at a time on evidence: initial
open, SSR, hydration, focus order and first use measured unchanged. No feature is
nominated for that in advance — a lazy boundary chosen on the shape of a feature
rather than on a measurement trades a countable byte total for an uncountable
first-use stall.

## The framework boundary

The engine is framework-agnostic by construction. Model, state, operators and
serialization compile without React; React lives in `@adapttable/react` —
hooks, Chrome, focus, renderer types.

What is forbidden is a coupling, not a vendor. A framework-neutral library is
ordinary engine code; `@tanstack/react-virtual` is React-coupled and lives in
the virtualization support of the React binding, where the base graph proves
it absent and the tables that virtualize keep a mature implementation.
Rewriting a working library to clear a namespace buys nothing.

`scripts/check-framework-boundary.mjs` holds the line in two ways. Each module
named in `frameworkBoundary.engineModules` in the classification artifact must
not import `react`, `react-dom`, `react-compiler-runtime` or a
`@tanstack/react-*` package. And the built neutral entrypoints — core's `.`,
`binding`, `query`, `pivot`, `stream`, `formula`, `xlsx` and `pdf`,
`@adapttable/server`, and every `@adapttable/ai` entry — must reach no React package, client
directive or React type anywhere in their transitive graph. New engine code
joins that list; a module that becomes binding moves to `@adapttable/react`
and leaves the list, with the reason in the commit.

This is what makes a Vue or Angular binding possible without a rewrite: the
line is drawn and enforced so a second binding never requires one.

`useQuerySource` is a React hook on `@adapttable/react` and keeps structural
typing for its query function, so React Query is an integration a host may use
rather than a dependency core or the binding carries. The query/source
contracts (`TableSource`, `TableQueryParams`, capabilities) live in core.

## Bundle cost

The promise is that features are opt-in, so the cost of a table is measured
rather than asserted. `scripts/bundle-budget.mjs` bundles real consumer fixtures
against the built packages — what npm ships, not the source — with React and the
UI kits external, and holds each fixture to a written ceiling.

A green total is not sufficient on its own: each fixture also names markers that
must be **absent** from its graph, which is what distinguishes a feature that is
genuinely not bundled from one that merely compressed well.

## Supported Node

The floor is **Node 22.12.0**, declared identically by every published package.

Two rules set it. A supported version is one still receiving upstream security
support at release, and a supported version is one CI actually runs — an
advertised range with no job behind it is a guess. So the declared range and the
test matrix move together or not at all: CI builds the packages, packs the
published tarballs, and installs and runs them on the floor and the current
Active LTS. Raising either raises both.

## Adapter parity

Eight adapters render the same chrome with different kits, so anything a host
can see or style is contract in all of them:

- `data-adapttable-part` names are compared across the themed adapters by
  `scripts/check-parts-parity.mjs`; a genuine gap is recorded with its reason.
- `headerProps` from `@adapttable/react` is spread whole onto the header cell. A public prop
  whose effect depends on the kit is not a public prop, so no adapter reads
  named fields out of it and drops the rest.
- Labels are core `TableLabels`, localized in every `@adapttable/i18n`
  locale, and RTL is a layout requirement rather than a per-kit option.

`adapter-unstyled` renders the native fallbacks for every kit and so names far
more parts than a themed adapter; `adapter-shadcn` wraps it. Neither is a parity
gap.
