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
@adapttable/react             hooks + React structural Chrome
@adapttable/angular           signals + Angular structural Chrome
@adapttable/vue               composables + Vue structural Chrome
        ↑
@adapttable/<kit>             kit DataTable, feature factories, required slots
        ↑
your application              columns, data / source, rowKey

@adapttable/ai                neutral session / catalog / execute
@adapttable/ai-react          tableAgent + live React session
@adapttable/ai-angular        tableAgent + Angular assistant/speech signals
@adapttable/ai/{json,openai,mcp,http,ag-ui,ai-sdk,…}
                              optional provider / transport helpers
```

Canonical names:

| Package                                                 | Owns                                                                                                                                                | Must not own                             |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `@adapttable/core`                                      | Column models, `TableSource`, query/filter/sort/page/group/tree contracts, revisions, operations, feature **registrations** (operators, not pixels) | React, React types, Chrome, AI           |
| `@adapttable/react`                                     | `useDataTable`, hooks, Chrome, React `ColumnDef` / renderer types, feature **providers**                                                            | A UI kit, a model SDK                    |
| `@adapttable/angular`                                   | Signal controllers, Angular `ColumnDef`, templates/components and structural Chrome                                                                 | Kit widgets, engine state, AI runtime    |
| `@adapttable/vue`                                       | Composables, Vue `ColumnDef`, structural Chrome                                                                                                     | A UI kit, engine state, AI runtime       |
| `@adapttable/angular-unstyled` / `@adapttable/ng-zorro` | Native/NG-ZORRO `AdaptDataTable`, kit controls and feature entrypoints                                                                              | Engine state, another framework binding  |
| `@adapttable/<kit>`                                     | `DataTable`, kit-native slots, kit feature entrypoints                                                                                              | Engine state, AI runtime                 |
| `@adapttable/ai`                                        | Provider-neutral session, manifest, schemas, validation                                                                                             | React (root), model SDKs, hosted service |
| `@adapttable/ai-react`                                  | `tableAgent`, observation from a mounted React table                                                                                                | Kit components                           |
| `@adapttable/ai-angular`                                | Agent observation, assistant and speech signals for a mounted Angular table                                                                         | Kit widgets, model SDKs                  |

`@adapttable/server` parses and validates table queries on the server;
`@adapttable/i18n` carries the locale bundles; `@adapttable/cli` scaffolds and
migrates. None of them are on the render path. Core imports neither React, Angular
nor AI. AI depends only on neutral `@adapttable/core` contracts. AI React imports
the binding through `@adapttable/react/adapter`. The React package does not
depend on a kit; `@adapttable/shadcn` builds on `@adapttable/unstyled`.

**A kit talks only to its binding.** A React kit imports only
`@adapttable/react/…`; a Vue or Angular kit imports only its own binding. Only
a binding imports `@adapttable/core`, and it re-exports every core name its
kits use, as is or adapted to its framework, so the binding can change how its
framework sees a name without touching a kit. Core's own notes point to core:
a deprecated name on `@adapttable/core` names its replacement in
`@adapttable/core/binding`, because whoever imports core is building a
binding. ESLint enforces the rule on kit sources; kit tests may still use
core's test tooling, such as `@adapttable/core/conformance`.

Kit imports: `import { DataTable } from "@adapttable/mui"`,
`import { grouping } from "@adapttable/mui/grouping"`, and
`standardFeatures()` from `@adapttable/mui/preset`. Preset options affect
behavior, not a guarantee that unused members disappear.

Angular hosts import `AdaptDataTable` from `@adapttable/angular-unstyled` or
`@adapttable/ng-zorro`, and features from that kit’s subpaths. Its
`standardPreset()` composes the default feature set. Templates and component
renderers stay in the binding; neutral values and operations stay in core.
The Angular kits and `@adapttable/ai-angular` are prepared for their first
public `0.1.0` release; the binding is `@adapttable/angular`. Publishable
packages do not imply registry availability: npm publication remains a
separate owner-controlled step.

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
`binding`, `query`, `pivot`, `stream`, `formula`, `xlsx`, `pdf`,
`conformance`, `engine`, `grouping`, `editing` and `selection`,
`@adapttable/server`, and every `@adapttable/ai` entry — must reach no React package, client
directive or React type anywhere in their transitive graph. New engine code
joins that list; a module that becomes binding moves to `@adapttable/react`
and leaves the list, with the reason in the commit.

This is what makes a Vue or Angular binding possible without a rewrite: the
line is drawn and enforced so a second binding never requires one.

## Core layer owners

`scripts/check-core-dependencies.mjs` classifies `packages/shared/core/src`
from `scripts/core-export-ownership.json`.

| Layer        | Rank | Owners                                                    |
| ------------ | ---- | --------------------------------------------------------- |
| Leaf         | 0    | `contracts/`, `sort/`                                     |
| Engine       | 10   | `engine/`, `rows/`                                        |
| Source       | 20   | `source/`                                                 |
| Domain       | 30   | every other folder, including `utils/`                    |
| Presentation | 40   | `layout/`, `style/`, `a11y/`, `overlays/`, `conformance/` |

A module at rank 20 or below importing presentation fails, and the message
names the path. Public entry files directly under `src/` may re-export.
`utils/` sits at the domain rank, so a helper may type CSS.

The incremental cache is `rows/incremental.ts`. Runtime owners are every
module under `rows/` and `engine/fullRowModel.ts`. Grouping reads an attached
snapshot through `rows/incrementalGroups.ts` and does not import the cache.
A runtime import from any other module is a reach. The table session calls
the row model; it does not import the cache itself. Type-only edges are
reported on their own line and are not counted as JavaScript.

The recorded runtime and type-only violation lists are empty. A new edge
fails, and a listed edge that the source no longer has fails as stale.

The same checker inventories every public export of the core entries through
TypeScript symbol resolution: name, type or runtime, defining module,
audience, preferred path, forwarding, deprecation, and compatibility identity.
The default run fails when that inventory drifts. `--write-inventory` rewrites
it after an intentional surface change.

Binding capabilities and shared conformance registration run from
`scripts/check-feature-parity.mjs` and from a full `scripts/api-reports.mjs`
run. Both read `scripts/kits.mjs` rather than a second kit list.

`useQuerySource` is a React hook on `@adapttable/react` and keeps structural
typing for its query function, so React Query is an integration a host may use
rather than a dependency core or the binding carries. The query/source
contracts (`TableSource`, `TableQueryParams`, capabilities) live in core.

## Composed session

One session, `engine/tableSession.ts`, takes an injected row model.
`createBasicTableEngine` from `@adapttable/core/engine` uses the basic model:
filter, sort, search, and page. `createTableEngine` uses the full model, which
is what grouping and aggregation read. Both accept `CreateTableEngineOptions`.
The focused entries are listed in
[versioning](docs/versioning.md#focused-core-subpaths). The export names are
listed in [the API reference](docs/api.md#composed-ownership). This section
does not copy either list.

Importing either constructor from the root `@adapttable/core` entry still
works. That import is additive: an application that already imports
`createTableEngine` from the root does not change its import and does not
rebuild to keep the same behavior. A program that wants the basic
constructor's smaller graph imports `@adapttable/core/engine` and rebuilds
its application bundle. Bindings import a value from the one focused door
that publishes it. A kit imports only its binding.

```ts
import { createTableEngine } from "@adapttable/core";
import { planFeatureRegistration } from "@adapttable/core/binding";
import { createBasicTableEngine } from "@adapttable/core/engine";

const rows = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];
const columns = [{ key: "name", header: "Name", sortable: true }];
const rowKey = (row: { id: string }) => row.id;

const basic = createBasicTableEngine({ data: rows, columns, rowKey });
const full = createTableEngine({ data: rows, columns, rowKey });
const plan = planFeatureRegistration(
  [],
  [{ id: "notes", feature: { id: "notes" } }],
  (current, next) => current === next
);
```

`planFeatureRegistration` is binding SPI on `@adapttable/core/binding`. The
root entry publishes the `FeatureRegistration` type and does not publish that
function. The kit feature a host turns on is the `rowReorder` composition in
[features](docs/features.md): `applyRowReorder` from `@adapttable/react`,
`DataTable` from the kit, and `rowReorder` from the kit's `/row-reorder`
subpath. `scripts/showcase-snippets.test.mjs` compiles that snippet. App code
does not import `@adapttable/core` to turn a kit feature on.
`@adapttable/react/adapter` is the adapter-author boundary, the same promise
as the binding entry, described in [versioning](docs/versioning.md).

One header click: the kit paints the sortable header inside
`data-adapttable-part="header-cell"`. The binding's `toggleSort` calls
`source.setSort` on the view-state store. The source hook stages that view
on the engine candidate and, once the render is accepted, publishes it with
`commitCandidate`. Subscribers then render the committed row order. The kit
does not sort the array. The view store owns the sort keys the host asked
for. The engine owns the row order. A subscriber that throws runs after that
write has landed (`engine/candidate.test.ts`). Feature cleanup failures are
collected by `invokeCleanups` on the binding entry; one failure does not
skip the remaining cleanups.

Edit history is capped at `DEFAULT_EDIT_HISTORY_DEPTH` (50). The incremental
snapshot, shell operations, and row memos are `WeakMap`s keyed by the object
that owns them.

## Bundle cost

The promise is that features are opt-in, so the cost of a table is measured
rather than asserted. `scripts/bundle-budget.mjs` packs each package a run
needs with `pnpm pack`, unpacks the tarballs into a scratch consumer that has no
workspace to fall back on, and bundles real consumer fixtures through their
public specifiers and `exports` maps — what npm ships, not the source — with
React, Vue and the UI kits external. Every module the graph resolved is
recorded and must come from a tarball. Every emitted chunk and stylesheet is
counted once, and each fixture is held to a written initial ceiling (the
entries' static graph and styles) and total ceiling (everything behind a
dynamic import as well). Every fixture also type-checks against the packed
declarations, and the query, stream and server entries run in Node with no
framework installed. `--case <id>` measures only the named fixtures.

A green total is not sufficient on its own: each fixture also names markers that
must be **absent** from its graph, which is what distinguishes a feature that is
genuinely not bundled from one that merely compressed well.

Initial is the static graph and its styles. Total adds every dynamic import.
Peers — React, Vue, and the UI kits — stay external, because the application
already ships them. KiB in these readings is 1024 bytes. The
[FAQ](docs/faq.md#how-big-is-it--is-it-tree-shakeable) is the figure the budget
checks for the headless table, the every-export graph, and a React adapter
`DataTable`. [Features](docs/features.md) is the figure it checks for the MUI
table and the same table with `standardFeatures()`. Installing a package still
installs that package. Tree-shaking drops unused exports from an application
bundle. The every-export row is `export *` from `@adapttable/core`: the whole
public surface imported at once, not the download of a table.

| Fixture (`--case`) | What it imports | 2026-11-06 min+gzip | Ceiling |
| --- | --- | ---: | ---: |
| `core-every-export` | `export *` from `@adapttable/core` | 103.4 KiB initial and total | 102 KiB |
| `core-basic-table` | `createBasicTableEngine` | 4.4 KiB initial and total | 6 KiB |
| `core-simple-table` | `createTableEngine` | 10.1 KiB initial and total | 20 KiB |
| `react-simple-table` | `useFrontendData` + `useDataTable` | 21.2 KiB initial and total | 35 KiB |
| `mui-table` | MUI `DataTable` | 71.7 KiB initial and total | 80 KiB |
| `mui-plus-grouping` | MUI `DataTable` + grouping | 83.7 KiB initial and total | 160 KiB |
| `mui-table-plus-preset` | MUI `DataTable` + `standardFeatures()` | 133.5 KiB initial and total | 160 KiB |

These seven fixtures emitted no lazy chunk, so initial and total are the same
number. `core-every-export` is over its ceiling. The ceiling stays 102 KiB.
The 101 KiB restoration target is not met. The FAQ rounds that row to ~103 kB
and the headless row to ~21 kB. The features page rounds the MUI pair to 72 kB
and 133 kB. A later `pnpm budget` is what moves those published figures.

## Supported Node

The floor is **Node 22.12.0**, declared identically by every published package.

Two rules set it. A supported version is one still receiving upstream security
support at release, and a supported version is one CI actually runs — an
advertised range with no job behind it is a guess. So the declared range and the
test matrix move together or not at all: CI builds the packages, packs the
published tarballs, and installs and runs them on the floor and the current
Active LTS. Raising either raises both.

## Adapter parity

The kits in `scripts/kits.mjs` share the parts and behavior a host can see or
style, across framework bindings:

- `scripts/check-parts-parity.mjs` compares themed kits and separately requires
  equal part sets from the React and Angular native kits. Each kit's effective
  parts include its framework's binding-owned Chrome; native-only widget
  structure is explicitly accounted for, and genuine gaps carry reasons.
- A header binds its complete props: React spreads `headerProps`, and Angular
  applies `leaf.headerProps` through `adaptAttrs`. No adapter selects named
  fields and silently drops the rest.
- Labels are core `TableLabels`, localized in every `@adapttable/i18n`
  locale, and RTL is a layout requirement rather than a per-kit option.

Derived kits such as `adapter-shadcn` inherit their base kit's parts and
header. Registry roles determine contract participation: native and shell
kits participate even when their package remains unpublished; the `private`
role keeps unfinished kits outside the contracts.
