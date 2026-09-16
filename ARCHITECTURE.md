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

These contracts are frozen for the React-binding move. They are not a shipped
runtime yet: item 10 implements the engine and the `@adapttable/react`
package. Do not treat this document as permission to add empty stubs.

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
@adapttable/ai/{json,openai,mcp,http}
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

`@adapttable/server` parses and executes table queries on the server;
`@adapttable/i18n` carries the locale bundles; `@adapttable/cli` scaffolds and
migrates. None of them are on the render path. Core imports neither React nor
AI. AI's root depends only on neutral core contracts (`TableSourceCapabilities`
and the revision/operation types below). AI React imports the binding through
`@adapttable/react`. The React package does not depend on a kit.

Kit import paths stay: `import { DataTable } from "@adapttable/mui"` and
`import { grouping } from "@adapttable/mui/grouping"`. Individual feature
subpaths and `standardFeatures()` remain. Preset options affect behavior, not
a guarantee that unused members disappear.

## Neutral contracts

Planning declarations for item 10. Names that already exist keep their
spelling; new names are additive. Row data stays the host's type — never
restricted to JSON.

### Column model vs React column

```ts
/** Neutral column — identity, values, operation metadata. No renderers. */
export interface ColumnModel<TRow = unknown> {
  readonly key: string;
  readonly headerTooltip?: string;
  readonly renameable?: boolean;
  readonly responsivePriority?: number;
  readonly group?: string | readonly string[];
  readonly groupShow?: ColumnGroupShow;
  readonly i18n?: Readonly<Record<string, string>>;
  readonly filter?: ColumnFilter<TRow>;
  readonly editable?: boolean | ((row: TRow) => boolean);
  readonly editor?: string;
  readonly editValue?: (row: TRow) => unknown;
  readonly parseValue?: (draft: string, row: TRow) => unknown;
  readonly validate?: (
    value: unknown,
    row: TRow
  ) => string | undefined | Promise<string | undefined>;
  readonly sortValue?: (row: TRow) => SortableValue;
  readonly exportValue?: (row: TRow) => unknown;
  readonly formatValue?: (row: TRow) => string;
  readonly sortable?: boolean;
  readonly width?: number | string;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly flex?: number;
  readonly align?: "start" | "center" | "end";
  readonly colSpan?: number | ((row: TRow) => number);
  readonly rowSpan?: number | ((row: TRow) => number);
  readonly mobileLabel?: string;
  readonly hideOnMobile?: boolean;
  readonly hideOnDesktop?: boolean;
  readonly lockPosition?: boolean;
  readonly lockVisibility?: boolean;
  readonly lockWidth?: boolean;
  readonly lockPin?: boolean;
  readonly hidden?: boolean;
  readonly meta?: Record<string, unknown>;
}

/**
 * React column. Today's `ColumnDef` keeps this name on `@adapttable/react`.
 * Renderers stay React nodes — the engine never stringifies them into labels.
 */
export interface ColumnDef<TRow = unknown> extends Omit<
  ColumnModel<TRow>,
  "header" | "filter" | "editor"
> {
  header?: ReactNode;
  headerActions?: ReactNode;
  renderHeader?: (ctx: ColumnHeaderContext<TRow>) => ReactNode;
  renderFooter?: (ctx: ColumnFooterContext<TRow>) => ReactNode;
  Cell?: ComponentType<CellProps<TRow>>;
  accessor?: (row: TRow) => ReactNode;
  filter?: ColumnFilter<TRow>;
  editor?: CellEditor;
}
```

Cell values for operations, export, AI, and announcements resolve in this
order: `formatValue`, then `exportValue`, then a primitive `accessor` result,
then the `key` / `i18n` data path. A React node is never a cell value.

### Engine instance

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

export interface TableSnapshot<TRow = unknown> {
  readonly revisions: TableRevisions;
  readonly columns: readonly ColumnModel<TRow>[];
  readonly source: TableSource<TRow>;
  readonly capabilities: TableSourceCapabilities;
}

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
  | { readonly type: "setFilters"; readonly filters: unknown }
  | { readonly type: "setGroupBy"; readonly key?: string }
  | { readonly type: "setSelection"; readonly ids?: readonly string[] };

/**
 * Framework-neutral table. AI and a future Vue/Angular binding speak this,
 * not React props. `TableSource` remains the query/data contract — this is
 * not a second source abstraction.
 */
export interface TableEngine<TRow = unknown> {
  readonly snapshot: () => TableSnapshot<TRow>;
  readonly getColumn: (key: string) => ColumnModel<TRow> | undefined;
  readonly cellValue: (row: TRow, columnKey: string) => unknown;
  readonly rows: (scope: "visible" | "page" | "full") => readonly TRow[];
  readonly rowByKey: (rowKey: string) => TRow | undefined;
  readonly subscribe: (
    axes: readonly TableRevisionAxis[] | "all",
    listener: (revisions: TableRevisions) => void
  ) => () => void;
  readonly dispatch: (operation: TableOperation) => void;
  readonly invalidate: (axes: readonly TableRevisionAxis[]) => void;
  readonly dispose: () => void;
}
```

The host still owns the data. Edits, adds, deletes, and reorders go through
the existing callbacks. `dispatch` updates view/schema/policy state and
invokes those callbacks; it does not become a store for rows.

Updates are immutable from the engine's point of view. A host with a mutable
source calls `invalidate(["data"])` after in-place writes. Subscribers see
revision bumps, not a row scan. React bindings must not increment revisions
because a parent re-rendered with an equivalent options object.

`view` is today's AI `viewRevision`. Item 12 subscribes to the four axes
instead of fingerprinting rows.

### Feature registration vs React providers

```ts
/** Neutral: id, operators, cleanup. No React configuration bags. */
export interface FeatureRegistration<TRow = unknown> {
  readonly id: string;
  readonly setup?: (host: NeutralFeatureHost<TRow>) => void | (() => void);
}

/**
 * React feature. Today's `TableFeature` keeps this name on `@adapttable/react`.
 * Providers, slots and part renders live here.
 */
export interface TableFeature<
  TRow = unknown,
> extends FeatureRegistration<TRow> {
  readonly setup?: (host: FeatureHost<TRow>) => void | (() => void);
}
```

Registration is table-local: two engines do not share plugin state. `setup`
must return its cleanup (or register nothing that needs one). Slot and
`data-adapttable-part` names stay part of the public contract. A React
`filters: ReactNode` option is not a neutral engine API.

### Neutral table interface for AI

AI already speaks `AgentObservation`, `AgentColumn`, `AgentSession`, and
`TableSourceCapabilities`. The missing seam is a live engine instead of a
hand-built observation:

```ts
export interface NeutralTable<TRow = unknown> {
  readonly tableId: string;
  readonly revisions: TableRevisions;
  readonly columns: readonly ColumnModel<TRow>[];
  readonly cellValue: (row: TRow, columnKey: string) => unknown;
  readonly rows: (scope: "visible" | "page" | "full") => readonly TRow[];
  readonly rowByKey: (rowKey: string) => TRow | undefined;
  readonly capabilities: TableSourceCapabilities;
  readonly operations: Readonly<Record<string, boolean>>;
  readonly subscribe: TableEngine<TRow>["subscribe"];
  readonly dispose: () => void;
}
```

`visible` is the rendered data-row order after grouping and tree expansion
(today's runtime row list, not `source.rows` when they differ). `page` is the
source page. `full` requires `capabilities.fullDataset`. Group headers are
not writable data rows. `@adapttable/ai-react` adapts a React table onto this
interface; `@adapttable/ai` consumes it without importing React.

## The three layers

```
@adapttable/core        neutral engine
      ↑
@adapttable/react       React binding + headless chrome
      ↑
@adapttable/<kit>       kit components in required slots
      ↑
your application        columns, data, rowKey
```

`@adapttable/server` parses and executes table queries on the server;
`@adapttable/i18n` carries the locale bundles; `@adapttable/cli` scaffolds. None
of them are on the render path.

## The root table

`DataTable` is useful with three props — `columns`, `data`/`source`, `rowKey` —
and everything below is present without asking:

- responsive desktop and mobile rendering
- loading, error and empty states
- accessibility: roles, `aria-rowcount`/`aria-colcount`, live announcements
- single-column sorting, search, pagination and infinite data
- column resolution: the `columns` array rendered in order, honouring `hidden`

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

Each of the 38 features is classified in
`scripts/feature-classification.json`, and the classification decides where its
code lives:

| Class        | Meaning                                                                                  | Count |
| ------------ | ---------------------------------------------------------------------------------------- | ----- |
| **headless** | Structure and state only. Core owns it; the kit renders it through slots it already has. | 11    |
| **adapter**  | Needs a kit-rendered control or surface of its own.                                      | 20    |
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
`standardFeatures({ groupBy: "team", filters: defs })`. A feature that cannot act
without configuration is inert, and bundling an inert implementation because a
preset happened to name it is the cost this rule removes.

Excluded on purpose: `virtualize`, `tree` and the editing family change render
or data semantics rather than adding chrome, and `commandPalette`, `sidePanel`,
`contextMenu`, `pivot` and `cellNavigation` are large enough that a table which
does not want them should not carry them.

### Subpath naming

`@adapttable/<kit>/<feature>`, kebab-cased from the feature id — `row-reorder`,
`saved-views`, `column-menu`. Features that share one surface share one subpath:
the five editing features are all `@adapttable/<kit>/editing`, and `filters` and
`filterTypes` are both `@adapttable/<kit>/filters`. `@adapttable/<kit>/features`
re-exports every factory for hosts that would rather have one import.

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

What is forbidden is a coupling, not a vendor. `@tanstack/virtual-core` is
framework-neutral and is ordinary engine code; `@tanstack/react-virtual` is
React-coupled and lives in the optional virtualization feature of the React
binding, where the base graph proves it absent and the tables that virtualize
keep a mature implementation. Rewriting a working library to clear a namespace
buys nothing.

`frameworkBoundary.engineModules` in the classification artifact names the
engine modules that must stay in core, and
`scripts/check-framework-boundary.mjs` fails the build when one of them imports
`react`, `react-dom`, `react-compiler-runtime` or a `@tanstack/react-*`
package. Item 11 upgrades that check from selected files to transitive
shipped entrypoints. New engine code joins that list; a module that becomes
binding moves to `@adapttable/react` and leaves the list, with the reason in
the commit.

This is what makes a Vue or Angular binding possible without a rewrite. Those
bindings are not in this major, and the line is drawn and enforced now so they
do not require one later.

`useQuerySource` stays a React hook on `@adapttable/react` and keeps structural
typing for its query function, so React Query is an integration a host may use
rather than a dependency core or the binding carries. The query/source
contracts (`TableSource`, `TableQueryParams`, capabilities) stay in core.

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
published tarballs, and runs the consumer harness on the floor and the current
Active LTS. Raising either raises both.

## Adapter parity

Eight adapters render the same chrome with different kits, so anything a host
can see or style is contract in all of them:

- `data-adapttable-part` names are compared across the themed adapters by
  `scripts/check-parts-parity.mjs`; a genuine gap is recorded with its reason.
- `headerProps` from core is spread whole onto the header cell. A public prop
  whose effect depends on the kit is not a public prop, so no adapter reads
  named fields out of it and drops the rest.
- Labels resolve through `@adapttable/i18n` in every locale, and RTL is a
  layout requirement rather than a per-kit option.

`adapter-unstyled` renders the native fallbacks for every kit and so names far
more parts than a themed adapter; `adapter-shadcn` wraps it. Neither is a parity
gap.
