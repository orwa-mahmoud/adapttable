# Experimental Vue API reference

This reference describes the experimental `0.1.0` public packages.
They require Vue `^3.5.0` and have not been published to npm. See
[getting started](./getting-started.md) for scope, workspace setup and a first
native table. Identically named APIs in the React and Angular references do
not define Vue signatures.

## Updating preview imports

The unpublished Vue entry layout follows the React binding's public roles.
Move ordinary binding factories from focused paths such as `/density`,
`/editing` and `/column-menu` to `/features`; move their Chrome, slot props,
model keys and adapter helpers to `/adapter`. Table, column, source,
view-state and shared feature contracts belong to the binding root.

Consumer names align with the matching React concepts: `useSelection`,
`UseSelectionOptions`, `UseTableUrlStateResult`, `useTextFilterWidget`,
`useRangeFilterWidget`, `useBooleanFilterWidget`, `ResolvedFilterOptions`,
`UseGridFocusOptions` and `UseFindInTableOptions`. The inline header row Chrome
is `FilterHeaderChrome`; the popover `HeaderFilterChrome` remains distinct.
Native standalone filter controls are `ChecklistFilter` and `FilterTreeBuilder`.

Use individual native column/row feature entries instead of `/columns` or
`/rows`. Formula, stream and sparkline helpers come directly from their binding
entries. Native `/pivot` supplies `PivotPanel`; pivot data and URL state come
from binding `/pivot`. Optional binding writer factories moved from
`/export-pdf` and `/export-xlsx` to `/pdf` and `/xlsx`; the native writer entries
retain their existing names and control contributions.

Framework-neutral contracts retain their original `@adapttable/core` or
`@adapttable/core/binding` names. The Vue binding forwards the contracts its
consumer and adapter APIs expose; it no longer forwards every neutral export
through every focused entry. Vue renderer contracts keep their Vue member and
generic types. In particular, Vue's `Aggregator` returns `VNodeChild` and is a
different contract from the neutral writer's `Aggregator`.

## Entry points

Shared contracts have a documented owner: import table, column, source and
view-state types and feature composition, host and mount types from
`@adapttable/vue`; structural Chrome and slot types from
`@adapttable/vue/adapter`; and factories plus feature-specific options from
`@adapttable/vue/features`. In particular, `StaticTableFeature`,
`FeatureMountContext<TRow>` and `StaticFeatureHost` belong to the root,
while `DensityControlProps`, `DensityChooserSlots`,
`FullscreenControlProps` and `ViewControlButtonProps` belong to `/adapter`.

Import `densityChooser` and `fullscreen` from `@adapttable/vue/features`.
Their Chrome and control keys are available from `/adapter`. Native kit
factory imports remain `@adapttable/vue-unstyled/density` and
`@adapttable/vue-unstyled/fullscreen`.

| Import                     | Purpose                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@adapttable/vue`          | Source composables, `useDataTable`, column renderers, layout, selection and URL state. Also re-exports framework-neutral types.                                                                                                                                     |
| `@adapttable/vue/adapter`  | `useDataTableShell`, structural Chrome, attribute bridges, feature lifecycle/state/model helpers and neutral binding utilities. Adapter code imports its engine contracts here rather than importing core directly.                                                 |
| `@adapttable/vue/features` | Binding factories for columns, rows, grouping/tree/details and view controls, and custom feature declarations. Shared composition contracts belong to the root; patch/slot construction helpers belong to `/adapter`. Factories that need UI require adapter slots. |
| `@adapttable/vue-unstyled` | Native `DataTable`, `DataTableProps`, `DataTableSlots`, `DataTableClassNames` and its documented column, context, handle and source type re-exports.                                                                                                                |

The native kit supplies controls through its feature entries. Binding models,
Chrome and slots use the canonical owners above. Start with the
[feature import map](./features.md#choose-an-entry-point) for filters, editing,
columns, hierarchy and view controls, then use these contract guides for:

- [Actions and exports](./actions.md): bulk actions, command palette, context
  menu, side panels, history buttons, CSV exports, optional writers and print.
- [Column menu](./column-menu.md): controlled layout and rename models, menu
  controls and their required slots.
- [Navigation, find and status](./navigation.md): grid focus, clipboard/fill,
  column selection, find state, statistics and adapter channels.
- [Specialized views](./specialized.md): virtual windows, row reordering,
  grouping controls, pivot, formulas, streams and sparklines.
- [Summaries and footers](./summary-row.md): reactive summary values, desktop
  and mobile projections, footer renderers and structural helpers.

The [root API index](../api.md#vue-actions-and-adapter-channels) also maps these
Vue exports to their owning entries. Separate formula, pivot, sparkline and
stream helpers are not automatically loaded by the feature barrel.

The native `/preset` entry exports `standardFeatures` and
`StandardFeatureOptions<TRow>`. Native `/export` is the canonical CSV entry;
`/export-csv` remains available. Binding `/pdf` and `/xlsx`, and native `/export-pdf` and
`/export-xlsx`, expose `exportPdf` / `exportXlsx`,
`ExportPdfOptions<TRow>` / `ExportXlsxOptions<TRow>` and writer utilities. Native `/features` also exports these factories.
See [export scope and lifecycle](./actions.md) and
[standard native composition](./features.md#standard-native-features).

Type-only re-exports do not imply matching runtime exports. In particular,
structural/model helpers and feature functions belong to their entries above;
importing the binding root never installs controls, optional features or AI.

## Optional adapter layout

`DataTableSurfaceChrome` from `@adapttable/vue/adapter` renders a shared outer
layout over an existing `useDataTableShell` result. It does not create another
source or own table state. `DataTableSurfaceChromeProps<TRow>` connects that
model, presentation options, application content slots, and the actual root and
scroll element refs.

Every `DataTableSurfaceSlots<TRow>` renderer is required: `Search`, `Select`,
`Button`, `Loading`, `Desktop`, and `Mobile`. The kit owns its controls, styling,
and table/card rendering. `Desktop` and `Mobile` receive the prepared binding
models and class names; they can use the structural Chrome or their own
renderer. No native control or table renderer is selected implicitly.

`Search` receives both native attributes and explicit `value` / `onChange`
properties. Native inputs can use the attributes. A kit with model-value events
uses the explicit request callback and consumes the native input handler, so
one edit sends one request. The binding retains its existing debounced search
draft behavior. `Select` uses the same value/request boundary.

The shared layout is optional. Build a custom UI with root composables such as
`useFrontendData` and `useDataTable`, or render an existing `useDataTableShell`
result directly. Neither path requires the shared layout's renderers. Named
headless imports do not retain `DataTableSurfaceChrome` unless it is selected.
The framework-neutral core remains independent of rendered UI.

`DataTableProps<TRow>`, `DataTableSlots<TRow>`, and `DataTableClassNames` are
canonical adapter contracts. `provideDataTableClassNames` and
`useDataTableClassNames` share reactive presentation hooks with feature controls.
`GROUP_ROW`, `groupRowSlotKey<TRow>()`, and `GroupRowSlotProps<TRow>` let a grouping
feature supply its row renderer lazily; importing the table surface does not
install a grouping renderer or another optional feature.

## Reactive input and lifecycle rules

`MaybeRefOrGetterOptional<T>` means `T`, a readonly `Ref<T | undefined>`, or a
getter returning `T | undefined`. Required reactive fields use Vue's
`MaybeRefOrGetter<T>`. Function-valued domain callbacks remain ordinary
callbacks, including zero-argument `refetch` functions. A whole-options getter
is the supported way to replace callback identities.

Resource-owning composables require component setup or an active effect scope.
`useScopeActivity(): Readonly<ShallowRef<boolean>>` becomes active after
component mount, pauses on `KeepAlive` deactivation and becomes false on disposal.
An explicit non-component effect scope starts active immediately and must be
stopped by its owner. Browser subscriptions and effects remain inactive during server rendering.

`ExternalStore<T>` contains `getSnapshot(): T` and
`subscribe(listener: () => void): () => void`.
`useExternalStore(input: MaybeRefOrGetter<ExternalStore<T>>, options?: ExternalStoreOptions)` returns a readonly
shallow snapshot ref. It rereads after subscribing, follows store replacement,
releases inactive subscriptions and ignores notifications from replaced or
disposed subscriptions. Snapshots and their row/engine objects are not deep-proxied.
`ExternalStoreOptions.active` optionally adds an activity ref/getter to the
owning scope's lifecycle. These helpers come from `@adapttable/vue/adapter`.

## Data sources

Each source returns `Readonly<ShallowRef<TableSource<TRow>>>`; the respective
aliases are `FrontendDataState<TRow>`, `ServerDataState<TRow>` and
`QuerySourceState<TRow>`. Read the latest `.value` instead of caching one source
snapshot. `TableSource` carries rows, total, loading/error state, query state
and stable mutation actions. The host owns row persistence.

All three options contracts extend `UseTableUrlStateOptions` and
`SourceViewportOptions`. The latter accepts reactive optional `paginationMode`,
`forceMobile` and `mobileBreakpoint`: the defaults are `"auto"`, viewport-based
layout and 768px. Auto pagination is paged on desktop and infinite on mobile.

### Client rows

```ts
useFrontendData<TRow>(
  options: MaybeRefOrGetter<UseFrontendDataOptions<TRow>>,
): FrontendDataState<TRow>;
```

`UseFrontendDataOptions` requires reactive `data`. Optional reactive `columns`
provide column metadata. Ordinary callbacks are `getRowId`, `getSearchText`,
`getSortValue(row, columnKey)`, `filterFn(row, extra)`,
`filterTreeFn(row, tree)` and `refetch`. Reactive `filterKey` invalidates custom
filter derivations when their external inputs change. `locale`, `error`,
`isFetching` and `isLoading` can also be reactive. The neutral engine derives
searching, filtering, sorting and paging without modifying the input array.

### Host-controlled server rows

```ts
useServerData<TRow>(
  options: MaybeRefOrGetter<UseServerDataOptions<TRow>>,
): ServerDataState<TRow>;

type TableQueryHandler = (
  query: TableQuery,
  info: TableQueryInfo,
) => void | Promise<void>;
```

`UseServerDataOptions` requires reactive `rows` and `total`. It accepts reactive
`loading`, `error`, `nextCursor`, `supports`, `aggregates`, `columns`,
`responseKey`, `expandedIds`, `facetKeys` and `facets`, plus an ordinary
`onQueryChange: TableQueryHandler` callback. `TableQueryInfo` contains the
request's `signal: AbortSignal` and canonical query `key: string`.

Requests commit only while the owning scope is active. Query changes and scope
suspension abort obsolete work. The host must check `info.signal.aborted`
before publishing rows, totals, errors or loading state. `responseKey` attributes
aggregate metadata to the query answered; it is not a request-generation token
and does not prevent an obsolete same-query response from overwriting host state.

```ts
import { shallowRef } from "vue";
import { useServerData } from "@adapttable/vue";
import type { TableQuery } from "@adapttable/vue";

interface Person {
  id: string;
  name: string;
}
// An application-supplied request function with cancellation support.
declare function fetchPeople(
  query: TableQuery,
  signal: AbortSignal
): Promise<{ rows: Person[]; total: number }>;

const rows = shallowRef<readonly Person[]>([]);
const total = shallowRef(0);
const loading = shallowRef(false);
const error = shallowRef<Error | null>(null);
const responseKey = shallowRef<string>();
const source = useServerData<Person>({
  rows,
  total,
  loading,
  error,
  responseKey,
  urlSync: false,
  async onQueryChange(query, info) {
    loading.value = true;
    error.value = null;
    try {
      const result = await fetchPeople(query, info.signal);
      if (info.signal.aborted) return;
      rows.value = result.rows;
      total.value = result.total;
      responseKey.value = info.key;
    } catch (cause) {
      if (!info.signal.aborted)
        error.value = cause instanceof Error ? cause : new Error(String(cause));
    } finally {
      if (!info.signal.aborted) loading.value = false;
    }
  },
});
```

### Query-library integration

```ts
useQuerySource<TRow, TParams extends TableQueryParams, TPage>(
  options: MaybeRefOrGetter<UseQuerySourceOptions<TRow, TParams, TPage>>,
): QuerySourceState<TRow>;
```

`TParams` defaults to `TableQueryParams`; `TPage` defaults to
`PaginatedResponse<TRow>`. The required `query(params)` factory is invoked once
in setup with a live `Readonly<ShallowRef<Partial<TParams>>>`. It must return an
`InfiniteQueryState<TPage>`: reactive `data`, `isLoading`, `isFetching`,
`isFetchingNextPage`, `hasNextPage`, `error`, optional `dataUpdatedAt`, and
ordinary `fetchNextPage()`/`refetch()` methods. Keep the parameter ref reactive
inside the host query composable. Replacing options does not call a new factory.

`UseQuerySourceOptions` also accepts `selectPage`, reactive `selectorKey` and
`baseParams`, `sanitizeParams`, reactive `supports`, `aggregates`, `columns`,
`expandedIds`, `facetKeys`, and a `nextCursor(page)` callback. Use `selectPage`
for a custom response shape and change `selectorKey` when its external
interpretation changes. No query library is imported by AdaptTable; that
library owns its requests, cancellation, SSR and deactivation policy.

## URL state

`useTableUrlState(options?: MaybeRefOrGetter<UseTableUrlStateOptions>)` returns
`UseTableUrlStateResult`: a readonly shallow `state` ref plus `TableUrlActions`.

`UseTableUrlStateOptions` contains reactive optional `urlAdapter`, `urlSync`,
`urlKey`, `numberExtraKeys`, `arrayExtraKeys`, and reactive `defaults`.
`urlSync` defaults to true when the environment can supply a URL adapter; false
uses local state. A namespace is claimed only while active, and switching
adapter/namespace retains that namespace's state. For SSR, seed a request-local
memory adapter from the request and supply matching state during hydration.

`TableUrlActions` exposes `setPage`, `setLimit`, `setSort`, `toggleSortLevel`,
`setSearch`, `setExtra`, `setExtras`, `setFilterTree`, `clearExtras`, `clearAll`,
`setGroupBy`, `initializeGroupBy` and `setGroupAggregateOverrides`, preserving
the neutral store signatures. It omits subscription/configuration methods.
Actions remain stable when the options or namespace changes; after scope
disposal they no longer mutate state. Install the native filter/grouping features to add their controls.
[Additional slices and Saved Views](./features.md#what-a-view-restores) document
density, pins, explicit group collapse and the state that is not captured.

## Columns and rendering

`ColumnDef<TRow, TValue = unknown>` extends neutral `ColumnMetadata` with a
string `header`, a typed `accessor(row): TValue`, and Vue `cell`, `headerCell`,
`headerActions` and `footer` renderers. `ColumnGroup<TRow>` contains nested
`children: readonly ColumnInput<TRow>[]`; `ColumnInput` is a leaf or group.
`resolveColumns(columns, locale?)` supplies metadata/accessor defaults.
`flattenColumns(inputs)` returns `leaves` and a `ReadonlyMap` of group records.

| Type/helper                                 | Contract                                                                                                                   |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `CellContext<TRow, TValue>`                 | `row`, `rowIndex`, `column`, and typed `value`.                                                                            |
| `HeaderContext<TRow, TValue>`               | `column`, text `label`, `sortDir`, `sortIndex`, and `toggleSort(event?)`, including shift-key multi-sort.                  |
| `FooterContext<TRow, TValue>`               | `column` and optional aggregate `value`, shared by desktop summary cells and mobile summary fields.                        |
| `RenderFunction<TContext>`                  | `(context: TContext) => VNodeChild`. A function is a renderer, never a getter-normalized component.                        |
| `ComponentRenderer<TContext>`               | Explicit `{ component, props(context) }` descriptor.                                                                       |
| `ComponentProps<TComponent>`                | Infers public props from an SFC, `defineComponent` result or functional component.                                         |
| `Renderer<TContext>`                        | Union of `RenderFunction` and `ComponentRenderer`.                                                                         |
| `componentRenderer(component, propsMapper)` | Creates a component descriptor and checks required component props against `ComponentProps`.                               |
| `renderContent(renderer, context)`          | Calls a render function or creates the component VNode using mapped props.                                                 |
| `primitiveText(value): string \| null`      | Formats supported primitive/path values for display; unsupported structured values do not get stringified as cell content. |
| `renderCell(context, slot?)`                | Column `cell`, then table slot, then `formatValue(row)`, then primitive text.                                              |
| `renderHeader(context, slot?)`              | Column `headerCell`, then table slot, then the text label.                                                                 |
| `renderFooter(context, slot?)`              | Column `footer`, then supplied slot, then Vue nodes or primitive aggregate text.                                           |

```ts
import { defineComponent, h } from "vue";
import { componentRenderer } from "@adapttable/vue";
import type { CellContext, ColumnDef } from "@adapttable/vue";

interface Person {
  id: string;
  score: number;
}
const Score = defineComponent({
  props: { amount: { type: Number, required: true } },
  setup: (props) => () => h("strong", String(props.amount)),
});
const score: ColumnDef<Person, number> = {
  key: "score",
  accessor: (row) => row.score,
  cell: componentRenderer(Score, (context: CellContext<Person, number>) => ({
    amount: context.value,
  })),
};
```

`computed<TRow extends object, TValue>(spec: VueComputedColumnSpec<TRow, TValue>)`
from the binding root creates a derived `ColumnDef`. The spec supplies key,
header, dependency projection, value calculation, formatting and optional Vue
column options. Import it as `computedColumn` when also using Vue's `computed`.
It delegates caching/value semantics to the [computed-column contract](../columns.md).

## Headless table, layout and selection

`useDataTable(input: MaybeRefOrGetter<UseDataTableOptions<TRow>>)` returns
`UseDataTableResult<TRow>`. Required options are reactive `source`, reactive
`columns` and ordinary `rowKey(row)`. Optional values include `tableLabel`,
`labels`, `dir`, `forceMobile`, `mobileBreakpoint`, `locale`, `multiSort`,
`fitColumns`, `columnWidths`, `collapsibleColumnGroups`, `activeFilterCount`,
`selection`, `searchDebounceMs`, `onClearFilters` and the layout options below.

The result's destructurable refs include `source`, `rows`, `columns`,
`allColumns`, `columnGroups`, `columnWidths`, `layout`, `labels`, `dir`, `isMobile`, `headerPlan`,
`pagination`, `pagerSlots`, `pageSizeOptions`, `sortBy`, `sortDir`,
`sortByOptions`, `search`, `searchValue`, `bodyRegion`, `emptyVariant`,
`showFooter`, `canLoadMore`, `isEmpty`, `isRefreshing`, `errorState`,
`statusAnnouncement`, `canRenameColumns` and `windowStart`.

Stable actions include `toggleSort(key, event?)`, `setSearch(value)` for an
immediate commit, `setSearchValue(value)` for debounced input, `setPage`,
`setLimit`, `clearFilters`, `clearSearchAndFilters`, `loadMore`, `rowKey`,
`cellValue`, `autoSizeColumn(root, key)` and `autoSizeColumns(root)`.
`tableAttrs`, `headerRowAttrs`, `headerCellAttrs`, `sortButtonAttrs`, `rowAttrs`,
`cellAttrs`, `cardAttrs`, `searchInputAttrs`, `loadMoreAttrs` and
`loadMoreButtonAttrs` return complete Vue-ready semantic bindings. Bind them to
the actual table, row, cell, input or button rather than a decorative wrapper.
The load-more observer is mounted only while active and available.
Rendered widths, sticky offsets and table minimum width share one effective
column projection. Responsive hiding does not discard persistent column order,
widths or visibility settings. Explicit `columnWidths` override the stored
widths for that projection.

`useColumnLayout(columns, options, groups?, collapsible?)` returns
`ComputedRef<ColumnLayout<TRow>>`. `ColumnLayoutOptions` accepts controlled
`columnLayout`, initial `defaultColumnLayout`, `onColumnLayoutChange(next)`
and `onColumnRename(key, name)`. `ColumnLayout` includes `state`, resolved
`visibleColumns`, `isHidden`, `pinOffset`, `setHidden`, `toggleVisible`,
`setPinned`, `setWidth`, `setName`, `resetName`, `move`, `setOrder`, `reset` and
`toggleColumnGroup`. A controlled mutation requests a host update; it cannot
silently replace the supplied layout.

For persistence, the root exports `useColumnLayoutUrlState` with
`UseColumnLayoutUrlStateOptions`/`UseColumnLayoutUrlStateResult`, and
`useColumnLayoutStorageState` with
`UseColumnLayoutStorageStateOptions`/`UseColumnLayoutStorageStateResult`.
Bind their `layout` ref and `onLayoutChange` to the native prop/event explicitly.
The URL result also has `flush`; pass it as `UseSavedViewsOptions.flushViewState`
when using Saved Views. [Layout-persistence examples](./features.md#persist-column-layout-explicitly)
cover the full options, SSR seed, debounce and storage boundaries.

`useSelection(options: MaybeRefOrGetter<UseSelectionOptions<TRow>>)` returns
`RowSelection`. Its options require reactive `rows` and a `rowKey`; optional
inputs are `enabled` (default true), controlled `selectedIds`, `defaultSelectedIds`,
`onSelectionChange(ids)`, `labels` and `acrossPages`. The result exposes refs
`selectedIds` (a readonly set), `selectedCount`, `headerState`, `allMatching`
and `state`, plus `isSelected`, `toggle`, `toggleAll`, `clear`, `replace`,
`toggleGroupLeaves`, `selectAllMatching`, `rowCheckboxAttrs` and
`headerCheckboxAttrs`. `toggleAll` acts on visible row IDs. `selectAllMatching`
marks a broader matching scope when permitted; it does not fetch missing rows
or enumerate every remote ID. Checkbox attributes include indeterminate state
and localized labels. Disabling selection retains its value and blocks requests.
Component actions start on mount, suspend during KeepAlive and stop on disposal.
Published actions and checkbox callbacks retire when their ordered row objects
or IDs change, or their active lifetime ends. Equivalent row-array wrappers
preserve ownership, and accepted requests use the current host callback. IDs
outside the visible row scope remain selected until the host or a live action
changes them.

## Native table

`DataTable<TRow>` from `@adapttable/vue-unstyled` uses `DataTableProps<TRow>`:

| Prop group          | Props and behavior                                                                                                                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required            | `columns: readonly ColumnInput<TRow>[]`, `rowKey: (row: TRow) => string`.                                                                                                                                                                             |
| Data                | `data?: readonly TRow[]` or `source?: TableSource<TRow>`; source takes precedence. `getSearchText` customizes local search.                                                                                                                           |
| Query               | `defaults`, `paginationMode`, `urlSync`, `urlKey`, `urlAdapter`; these configure the fallback frontend source, not a separately supplied source.                                                                                                      |
| Search and sorting  | `searchable` defaults to true; `searchDebounceMs` defaults to the engine's 300ms interval. `multiSort` enables shift-key sort levels.                                                                                                                 |
| Layout              | `forceMobile`, `mobileBreakpoint`, `columnLayout`, `defaultColumnLayout`, `onColumnRename`, `fitColumns`, `columnWidths`, `collapsibleColumnGroups`. Group headings and native desktop collapse buttons render; cards honor the resulting visibility. |
| Selection           | `selectable`, controlled `selectedIds`, initial `defaultSelectedIds`.                                                                                                                                                                                 |
| Labels and styling  | `tableLabel`, `labels`, `dir`, `locale`, `classNames`.                                                                                                                                                                                                |
| Local source status | `isLoading`, `isFetching`, `error`, `refetch`; a supplied source owns its status.                                                                                                                                                                     |
| Extensions          | `features?: readonly ComposedFeature<NoInfer<TRow>>[]`. Compose factories from the native feature entries; the row type is inferred from the data/columns contract.                                                                                   |

`summaryRow?: SummaryRowFn<TRow>` builds a column-aligned footer from the current
source row scope. A visible column `footer` or the table `footer` slot also
creates the summary surface without a mapper. See [summaries and footers](./summary-row.md)
for page, grouped, server and mobile behavior.

`density?: TableDensity`, `defaultDensity?: TableDensity`,
`onDensityChange?: (density: TableDensity) => void` and
`confirm?: ConfirmHandler` also belong to `DataTableProps`. Density is
`"comfortable" | "compact"`; `confirm` supplies adapter-owned row-action confirmation.

Events are `update:selectedIds(ids: string[])`,
`update:columnLayout(layout: ColumnLayoutState)` and
`update:density(density: TableDensity)`. They are change requests;
prop replacement does not itself emit another request. The corresponding
models are `v-model:selected-ids`, `v-model:column-layout` and `v-model:density`.
The host may accept a request by updating the prop or reject it by keeping the
current value. `onDensityChange` observes the request once; it is separate from
the model event. A template ref exposes
`DataTableHandle<TRow>`: `focus()` focuses the scroll surface, `runtime` is the
table runtime, and `getView()` returns the current `TableRuntimeView` or
`undefined` after disposal.

`DataTableSlots<TRow>` provides `cell(CellContext)`, `header(HeaderContext)`,
`headerActions(HeaderContext)`, `footer(FooterContext)`, `tableFooter()`, `toolbar()`, `loading()`, `empty({ noResults, clear })` and
`error(TableErrorState)`. An error slot receives the real error, optional retry
and retrying state. The toolbar slot appends to the built-in toolbar; loading,
empty and error slots replace status content. A source without `refetch` has no retry action. Custom
headers own their sorting controls; per-column renderers take precedence.

`DataTableClassNames` keys are applied to the corresponding semantic elements:

- Container/toolbar: `root`, `toolbar`, `searchWrapper`, `searchInput`,
  `sortSelect`, `sortDirectionButton`, `scroll`.
- Table: `table`, `thead`, `tbody`, `tr`, `th`, `td`, `sortButton`,
  `selectionHeader`, `selectionCell`, `selectionCheckbox`, `columnGroup`, `columnGroupToggle`.
- Summary: `summary`, `summaryRow`, `summaryCell`, `summaryCard`; custom content uses `tableFooter`.
- Cards: `cards`, `card`, `cardFields`, `cardRow`, `cardLabel`, `cardValue`.
- Paging: `footer`, `rowsPerPage`, `pager`, `pagePrev`, `pageNext`, `pageNumber`,
  `pageEllipsis`, `loadMore`, `loadMoreButton`.
- Status: `loading`, `empty`, `emptyClear`, `error`, `retry`, `refreshing`, `status`.

Optional feature controls use these additional semantic class hooks:

- Filters: `filtersButton`, `filtersClear`, `filtersDone`, `filtersForm`,
  `filtersPanel`, `filtersActions`, `filtersToolbar`, `filtersPopover`,
  `filtersDrawer`, `filterField`, `filterLabel`, `filterControl`, `filterInput`,
  `filterSelect`, `filterCheckbox`, `filterHeaderInput`, `filterHeaderButton`,
  `filterChecklist`,
  `filterChecklistSearch`, `filterChecklistActions`, `filterChecklistList`,
  `filterChecklistCount`, `filterTree`, `filterTreeGroup`, `filterTreeCondition`,
  `filterTreeActions`, `filterTreeRemove`, `filterTreeSummary`.
- Editing: `editableCell`, `editCellActivate`, `editCellEditor`, `editCellError`,
  `editCellSaveError`, `editCellRollback`, `editCellConflictButton`,
  `rowEditActions`, `rowEditButton`, `batchEditBar`, `batchEditButton`,
  `editHistory`, `undoButton`, `redoButton`.
- Hierarchy/actions: `groupRow`, `groupLabel`, `groupToggle`, `groupCount`,
  `groupAggregate`, `groupMore`, `groupCheckbox`, `treeCell`, `treeToggle`,
  `treeSpacer`, `expandToggle`, `detailRow`, `detailCell`, `actionsHeader`,
  `actionsCell`, `cardActions`, `rowAction`, `addRow`, `resizeHandle`.
- View controls: `densitySelect`, `fullscreenButton`, `viewsMenu`, `viewsButton`,
  `viewsPanel`, `viewsRow`, `viewsItem`, `viewsDelete`, `viewsDivider`,
  `viewsSaveRow`, `viewsInput`, `viewsSave`.

The standalone `SavedViewsPanel` accepts the same `DataTableClassNames` contract
through its `classNames` prop. `SavedViewsPanelProps` and `DataTableClassNames` are available from
`@adapttable/vue-unstyled/saved-views`; for example,
`const classes: DataTableClassNames = { viewsPanel: "saved-view-panel" }`
styles the panel without importing the table component.

`filterOperator` styles native operator selects, and `filterCheckboxGroup`
styles the multi-select group wrapper. `filterCheckbox` applies to each option's
label; its input retains its own accessible name. `undoButton` and `redoButton`
style the history controls.

The table is unthemed. Attribute fallthrough applies ordinary host attributes
and listeners to the root; binding attributes stay on their semantic targets.
The desktop header sort buttons and selection checkboxes are native controls,
and responsive cards use native mobile sort controls. The public
`data-adapttable-part` names can also be used as CSS selectors.

### Native table surfaces

`rowActionsLayout?: "buttons" | "menu"` applies to desktop rows and mobile
cards. Omit it for inline native buttons. The menu uses a native `details` /
`summary` disclosure; Enter or Space opens it, Escape closes it and restores
focus to its trigger, and choosing an enabled action closes it. Both layouts
use the binding's current hidden/disabled/confirmation rules. Pending host
confirmation never grants an obsolete row action permission to run after its
source, row or feature has retired.

`ColumnDef.headerActions?: Renderer<HeaderContext<TRow, TValue>>` renders host
content after the caption and before the resize handle. The table's
`headerActions(context)` slot is its fallback. These additions preserve the
default sort button; replacing `headerCell` or the `header` slot still means
owning that caption's sort controls. Default multi-sort buttons expose their
one-based priority in a `sort-index` span. Header actions use Vue child
semantics: `false`, `null` and empty comment/fragment results render no wrapper;
`0` remains visible, and live renderer/slot changes update the same header.

`filters()` renders a removable list of the active field and tree conditions.
Removing an array chip retains its other current entries; removing a tree
chip asks the current source to remove that condition. Clear all clears field
and tree filters while keeping the search query. These are source requests,
so a controlled host can reject them. Retained controls are inactive after
source replacement, feature disposal or suspension. Custom sources use their
stable `tableEngine` or, without an engine, their stable `setPage` mutator as
the source identity, matching the bounded built-in export lifecycle contract.
If neither signal exists, the authored source object is the fallback. Fresh
wrappers preserving a built-in signal keep current actions usable. Arbitrary
custom sources sharing the same engine or page callback cannot be distinguished
by that signal; this is not a universal source-identity protocol.

For another kit, the existing `ACTIVE_FILTER_CHIPS` feature slot is required
by the binding's `filters()` feature alongside `TOOLBAR_EXTRAS`.
`FilterChipsChrome` from `@adapttable/vue/adapter` accepts
`ActiveFilterChipsSlotProps` plus `slots: FilterChipsSlots` and optional
`classNames: FilterChipsClassNames`. `Remove` and `Clear` are required slots;
each receives `FilterChipButtonProps` with `attrs` and a localized `label`.
The binding renders the real `ul`/`li` list and supplies event attributes; the
kit renders every button. No fallback controls are installed by the binding.

`skeletonRows?: number` sets the number of initial-loading desktop rows or
mobile cards; its default is the current page size. The skeleton appears only
when the existing body policy selects initial loading with no rows. A
background refresh keeps available rows visible. The `loading` slot replaces
the default skeleton. The shapes are hidden from assistive technology, and a
single localized status reports loading. Search and a busy export also expose
native SVG affordances.

A desktop `rowDetail()` feature reserves the first utility column for its
expand controls. `expand-header` is a real `th`; `expand-cell` is a real `td`,
including an empty placeholder on summary rows. Grouped headers, summary
footers, extra rows, data-cell spans, pinned rows and virtual windows account
for that column. Mobile cards retain one inline control in the first field.
The keyboard grid continues to address data columns; utility columns are not
added to its data-cell coordinates.
The shell supplies this geometry. A hand-authored `DesktopTableModel` can opt in
with `expandLabel` and the matching `columnCount`; `expandCellAttrs` carries
row-specific layout such as pin styles. `useDesktopTableModel` also accepts an
optional fourth `expandLabel: () => string | undefined` callback. Existing
hand-authored `row.detail` models without that label keep their inline toggle.

Additional class hooks land on their corresponding functional elements:

- Chips: `chips`, `chip`, `chipRemove`.
- Actions and headers: `actionButton`, `rowActionsMenu`, `rowActionsTrigger`,
  `sortIndex`, `headerActions`, `expandHeader`, `expandCell`.
- Loading: `loadingTable`, `loadingHeaderRow`, `loadingHeaderCell`, `loadingRow`,
  `loadingCell`, `loadingCards`, `loadingCard`, `loadingLine`.
- Affordances and announcements: `searchIcon`, `exportSpinner`,
  `gridAnnouncer`, `rowReorderAnnouncer`, `tableStatusAnnouncer`.

The experimental Vue targets `row-action`, `grid-focus-announcer` and `status`
are corrected to the canonical `action-button`, `grid-announcer` and
`table-status-announcer` targets. Update selectors that used those old part
names. The existing `rowAction` class hook remains an alias for `actionButton`,
and `status` remains an alias for `tableStatusAnnouncer`; both old and new
classes reach the same native element.

## Adapter shell and structural Chrome

The following runtime APIs come from `@adapttable/vue/adapter`.

`useDataTableShell(input: MaybeRefOrGetter<UseDataTableShellOptions<TRow>>)`
returns `UseDataTableShellResult<TRow>`. It composes a supplied source or local
frontend source, controlled selection/layout, feature state/lifecycle, runtime
publication and desktop/card models. `UseDataTableShellOptions` extends the
headless/source options with `data`, optional `source`, `features`, `confirm`,
controlled/default `density`, `onDensityChange`, selection inputs and optional
`runtimeChannels`. `ResolvedTableOptions` includes merged feature patches such
as `bodyModel`, `filterEngine`, filter definitions/types, `rowActionControls`,
`rowActions`, `bulkActions` and `undoRedoButtons`. Explicit defined options
win over feature patches.

The result includes `table`, `source`, `selection`, `desktop`, `mobile`,
`state`, `active`, normalized `features`, `featureHost`, model refs,
`filterRuntime`, `featureOptions`, `density`, `setDensity`,
`toolbarExtrasProps`, `renderToolbarExtras`, `renderBatchEditBar`, `slotFills`, `runtime`, `handle`,
`reconcile`, `setSurface`, `rowInventory`, `grouping`, `tree`, `detail`,
`urlAdapter` and `flushViewState`. Pass a `DataTableSurface` with
`scrollElement(): HTMLElement | null` to `setSurface` for the exposed focus
handle. The shell's `confirm` callback must be supplied by the adapter when a
row action requests confirmation; the binding does not draw a dialog.

| Model API                                              | Meaning                                                                                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `useDesktopTableModel(table, selection?, fitColumns?)` | Returns `ComputedRef<DesktopTableModel<TRow>>` from a headless table and optional selection/fit getters.                                       |
| `useMobileCardsModel(table, desktop)`                  | Returns `ComputedRef<MobileCardsModel<TRow>>` with card-list semantics from the same rows.                                                     |
| `DesktopTableModel`                                    | Table/header attributes, headers, rows, optional body slots, selection header, group-header plan/toggle props, action label and column count.  |
| `MobileCardsModel`                                     | List attributes, rows and optional body slots.                                                                                                 |
| `TableHeaderModel`                                     | Column/context and attributes, with optional sorting, resize and filter render controls.                                                       |
| `TableRowModel`                                        | Stable key, source row/index, attributes, cells, optional selection attributes, summary flag and action controls.                              |
| `TableCellModel`                                       | Stable key, attributes, typed context and optional display decoration function.                                                                |
| `TableBodySlot`                                        | Neutral row/group/extra/virtual-padding projection specialized to Vue content and row wiring; extra entries may identify covered column slots. |

`DesktopTableChrome({ model, slots, classNames? })` and
`MobileCardsChrome({ model, slots, classNames? })` return structural Vue content.
`TableChromeSlots<TRow>` requires `SortButton` and `SelectionCheckbox`.
`SortButtonProps` contains `attrs`, `HeaderContext` and rendered `content`;
`SelectionCheckboxProps` includes a `header` flag and the
`SelectionCheckboxControl` contract: `attrs`, `checked`, `indeterminate` and
`onToggle(): void`. Native controls forward the complete `attrs`, including
labels, event handlers, refs and indeterminate state, to their checkbox.

A kit with its own model-value API instead forwards
`selectionCheckboxInputAttrs(control.attrs)`, binds `control.checked` and
`control.indeterminate` to its state props, and connects exactly one
user-interaction event to `control.onToggle`. The projection removes only
native `checked`, `indeterminate` and `onChange` wiring; ARIA, refs, disabled,
keyboard and form attributes remain intact. Do not also forward the native
change listener to a widget that emits a separate model update: that would
request two toggles for one interaction. `onToggle` requests an interaction,
not a checked-value assignment; repeated interactions remain distinct even
when a widget repeats the same event payload.

`selectionCheckboxControl(attrs: SelectionCheckboxAttrs)` creates this
semantic projection for a custom structural model. `SelectionCheckboxAttrs`
extends `Attrs` with a boolean `checked`, optional boolean `indeterminate`
and `onChange(): void`. The model remains the state owner, so a controlled
host can accept or reject the requested selection without a kit maintaining
a second selection store.

Slots `RowActions`, `ColumnGroupToggle`, `ResizeHandle`, `GroupRow`,
`TreeToggle` and `RowDetailToggle` are
optional in the type because their features are optional. When a model needs
one, it becomes required at render time: missing controls throw rather than
silently rendering native HTML. Optional `cell` and `header` content slots do
not replace these interactive control contracts.

`TableChromeClassNames` covers table/selection/card keys plus
`columnGroupToggle`, `resizeHandle`, `filterHeaderInput`, `actionsHeader`,
`actionsCell` and `cardActions`. Chrome supplies structure and semantic parts;
an adapter supplies every visible control and its appearance.
`ColumnGroupToggleChrome` accepts `ColumnGroupToggleChromeProps`, extending
`ColumnGroupToggleProps` with `ColumnGroupToggleSlots`. Its `Button` slot
receives `ColumnGroupToggleButtonProps`: the localized label, expanded state,
class name and click action. No button fallback is provided.

### Native editor input types

`editorInputType(editor)` re-exports the core's canonical input-type mapping from
`@adapttable/vue/adapter`. It accepts a `CellEditor` or `null` and returns `"text"`,
`"number"`, `"date"`, `"datetime-local"` or `"time"`. Boolean and structured editors
use their own checkbox, select or custom controls; the text-input fallback is
`"text"`.

### Attribute and element-ref helpers

`managedOverlayPanel(render)` lets `ColumnMenuChrome` and
`SavedViewsMenuChrome` use an adapter's own overlay positioning, dismissal and
focus behavior. `OverlayPanelSlot` remains callable for ordinary inline
panels. Its `OverlayPanelProps` include the panel attributes, content, container
and close request. The managed renderer receives `ManagedOverlayPanelProps`,
which additionally requires the current anchor, open state and `isCurrent()`
lifetime check. `OverlayCloseReason` is `"escape" | "outside" | "done"`.
See the [managed panel contract](./column-menu.md#building-a-vue-kit).

- `Attrs` is a readonly string-keyed attribute record.
  `toVueAttrs(attrs, { changeEvent? })` maps neutral class/for/event names to Vue
  DOM conventions. Neutral text `onChange` becomes `onInput`; checkboxes/radios
  use `onChange`. For a select, pass `{ changeEvent: "change" }` explicitly.
- `toVueStyle(style)` handles nested style arrays and adds `px` to nonzero numeric
  dimensional values; unitless properties and custom properties are preserved.
- `mergeVueAttrs(binding, host)` uses Vue's prop merging, retaining classes,
  styles and listeners with binding listeners first. Do not replace a binding
  event handler by spreading an unrelated attribute object over it.
- `ElementRef<TElement>` is `(element: TElement | null) => void`.
  `elementRef(set, target?)` adapts it to a Vue VNode ref. A component instance
  requires an explicit resolver for its actual semantic DOM target; no `$el`
  guessing is performed.
- `composeElementRefs(...refs)` returns one `ElementRef` and releases the previous
  target with `null` before publishing a replacement to all refs.
- `useElementRef(target, owner)` is a setup composable for a kit component whose
  native target or callback may change. Supply getters for the actual element
  and its `ElementRef` callback; either getter may return `null` or `undefined`.
  The previous callback receives `null` before a replacement receives the current
  element. Removing the callback or ending the setup scope releases the target.
  Unchanged renders do not repeat notifications. The kit still resolves its
  native element through its own public component API.

## Custom features and scoped state

`TableFeature<TRow>` has a stable nonempty `id`, optional `dependencies`,
`apply(input): FeaturePatch`, `setup(host)` and `mount(context)` functions,
plus optional `renders` and `requiredSlots`. `ComposedFeature<TRow>` is the
row-specific composition type. `StaticTableFeature` provides row-independent
composition; `StaticFeatureHost` omits row-sensitive menu registrations from
`TableFeatureHost`, which aliases `LiveFeatureHost<TRow>`.

`FeatureMountContext<TRow>` supplies `runtime`, `table`, reactive `featureHost`,
`filterRuntime` and resolved `options`, owned `state`, the feature's `scope`,
`active`, `reconcile()`, `flushAdmission()` and `flush(run)`. It also exposes
`root`, `urlAdapter`, `source`, optional `density`/`rowInventory`,
`flushViewState()` and `registerViewStateFlush(flush)` for state writers that
need to finish before Saved Views capture/apply. Setup/mount may
return cleanup callbacks. Guard external effects using `active`: mount runs
while composing the feature, including server setup, rather than being an alias
for Vue's `onMounted`.

`feature(id, patch?, setup?)` creates a declaration. `extendFeature(base,
renders)` appends typed render fills. `normalizeFeatures(features)` validates
IDs/callbacks and resolves duplicates before application: the last declaration
wins, with a development warning. `featureOptionsOf(features)` merges patches;
call it after normalization. `featureSlotFillsOf(features)` returns slot fills
by ID; `renderFeatureSlot(key, fills, props)` returns the drawn Vue children.
`assertRequiredSlots(features, fills)` throws when a declared required control
has no fill. Use `featureSlotKey`, `featureStateKey` and `slotRender` from the
feature entry to create typed neutral keys and fills.

```ts
import { watch } from "vue";
import { featureStateKey } from "@adapttable/vue/adapter";
import type { TableFeature } from "@adapttable/vue";

interface Person {
  id: string;
}
const rowCountKey = featureStateKey<number>("example-visible-row-count");
const visibleRowCount: TableFeature<Person> = {
  id: "example-visible-row-count",
  mount({ table, state }) {
    watch(table.rows, (rows) => state.set(rowCountKey, rows.length), {
      immediate: true,
    });
  },
};
// Pass [visibleRowCount] as features. Its watcher and owned publication
// are released when the feature is removed or the table is disposed.
```

`createFeatureState(): TableFeatureState` creates a table-local registry.
`FeatureState` exposes `get(key)` as a readonly shallow ref and
`set(key, value | undefined)`. `TableFeatureState.owner()` returns
`OwnedFeatureState`, whose `dispose()` clears only publications it still owns;
a newer owner's value survives an older owner's cleanup. `clear()` clears all
values. `provideFeatureState(state)` makes a registry available to descendants;
`useFeatureState(key)` reads it or returns an undefined ref outside a provider.
These runtime functions belong to the adapter entry.

`useFeatureLifecycle(options): FeatureLifecycle<TRow>` manages one retained
effect scope/registry per feature. It exposes a readonly `host` ref,
`reconcile(features)` and `dispose()`. A feature is retained while its ID,
setup/mount callbacks and dependencies are unchanged; changing only render fills
or option patches does not restart its resources. Removal and disposal release
state ownership, cleanup callbacks, registered resources and the effect scope.
The shell normally owns this lifecycle; adapter authors rarely need to create
it directly.

`eraseTableRuntime(runtime)` keeps the runtime identity while presenting the
neutral opaque-row boundary as `TableRuntime<unknown>`. Controllers using this
bridge must only pass rows obtained from that same runtime.

## Optional model channels

These adapter-entry contracts let custom features supply models to the shell.
The implemented feature factories publish these channels; custom features
can use the same typed contracts. A channel export alone does not install a
feature or provide its required controls.
Typed key functions specialize stable channels to the current row type.

| Channel/helper                                        | Published value and integration                                                                                                                                                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ROW_PINNING_MODEL`, `rowPinningModelKey<TRow>()`     | `RowPinningState<TRow>` used by body projection and optional pin actions.                                                                                                                                                   |
| `EDITING_MODEL`, `editingModelKey<TRow>()`            | `EditingBundle<TRow>`; `editableCellSlotKey<TRow>()` specializes the required editable-cell render slot to Vue columns and content.                                                                                         |
| `EDIT_HISTORY_MODEL`, `editHistoryModelKey<TRow>()`   | `EditHistoryState<TRow>` used for undo/redo toolbar props when requested.                                                                                                                                                   |
| `ROW_ACTIONS_MODEL`, `rowActionsModelKey<TRow>()`     | `RowActionsModel<TRow>` with add availability/action, resolved action lists, `hasRowActions` and optional host action metadata.                                                                                             |
| `COLUMN_RESIZE_MODEL`                                 | `ColumnResizeModel`, exposing `attrs(columnKey, label): Attrs \| undefined`. Resize-enabled headers require a kit `ResizeHandle`.                                                                                           |
| `HEADER_FILTER_MODEL`, `headerFilterModelKey<TRow>()` | `HeaderFilterModel<TRow>` maps column keys to `VueHeaderFilterControlProps<TRow>`, extending neutral filter-control props with optional direction. `headerFilterSlotKey<TRow>()` specializes the filter-header render slot. |

`TableBodyProjector<TRow>` maps `TableBodyProjectionInput<TRow>` to
`TableBodyProjection<TRow>`. The input includes `table`, resolved `options`,
base `desktop`/`mobile` models and optional `pinning`; the result must supply
both models so custom row structure remains coherent on desktop and mobile. The input also
includes optional grouping, tree, detail, selection and `TableRowInventory`;
its `loadedRows` preserve editing liveness while `visibleRows` define rendered
hierarchy traversal and selection. See [hierarchy row semantics](./features.md#visible-rows-and-loaded-rows).

`RowActionControlsProjector<TRow>` maps `RowActionControlsInput<TRow>` to readonly
`RowActionControl<TRow>[]`. Inputs are `row`, `actions`, the adapter `confirm`
handler, `cancelLabel` and a live `enabled()` predicate. Each control has a
`key`, `label`, original `action` and semantic `attrs`. Respect `enabled()`
before starting or completing delayed action work; the projector or its table
may have been replaced or deactivated. Render these controls through the kit's
`RowActions` slot rather than adding binding-owned buttons.

## Optional Vue assistant contracts

`@adapttable/ai-vue` is the optional public, unreleased Vue 3.5 binding to neutral
AI stores. `tableAgent(options: MaybeRefOrGetter<TableAgentOptions>)` returns a
`StaticTableFeature`; `TableAgentBridge` and `TableAgentColumnPatch` describe
host notifications and column patches. `TABLE_AGENT_STATE` is the typed feature
state key and `SharedApproval` describes the shared approval configuration.

`useTableAssistant(options: MaybeRefOrGetter<TableAssistantOptions>)` returns
`TableAssistantState`: readonly computed conversation refs, a presentation `view`,
controlled or local `open`, `setOpen`, and stable actions for sending, answering,
stopping, resuming, clearing, undoing and revoking permissions.
`useSpeechInput(options: MaybeRefOrGetter<UseSpeechInputOptions>)` returns
`SpeechInputState`, with readonly speech refs, `view` and explicit start/stop
controls. Neutral AI types are forwarded as type-only exports; the binding also
forwards `AgentApprovalPending`, `AgentProgress` and `StaticTableFeature`.

`@adapttable/vue/adapter` exports `TableAssistantChrome` /
`TableAssistantChromeProps`, `AgentApprovalChrome` / `AgentApprovalChromeProps`,
and `ApprovalReviewChrome` / `ApprovalReviewChromeProps`. These structural
components require kit controls. `createAdapterTableAssistantFeature(render)` and
`createAdapterAgentApprovalFeature(render)` register kit surfaces;
`tableAssistantSlotKey()` returns the single assistant slot channel.

The assistant UI contracts are `TableAssistantProps`, `TableAssistantView`,
`TableAssistantSlots`, `TableAssistantAvatars`, `TableAssistantButtonProps`,
`TableAssistantBadgeProps`, `TableAssistantComposerProps`,
`TableAssistantLanguageChipProps`, `TableAssistantMenuProps`,
`TableAssistantPanelProps`, `TableAssistantSheetProps` and
`TableAssistantWindowProps`. Approval slots use `ApprovalReviewSlots`,
`AgentApprovalProps`, `AgentApprovalButtonProps` and `AgentApprovalListProps`.
`SpeechInputHandle` describes the optional speech presentation. These contracts
use Vue render nodes over neutral models and load no AI runtime.

`@adapttable/vue-unstyled/assistant` exports native `TableAssistant` and
`AgentApproval` components, the `TableAssistantProps` / `AgentApprovalProps`
types, and `tableAssistant()` / `agentApproval()` feature factories. These
factories and components are also forwarded by the native `/features` entry.
Pass `DataTableProps.assistant` only with a registered assistant feature;
`DataTableClassNames.agentApproval` and `.agentApprovalButton` style the native
table approval strip. The shell exposes `renderAgentApproval(classNames?)` and
`renderTableAssistant()` for adapter placement.

See [Vue assistant and approvals](./assistant.md) for a complete application,
controlled-state settlement, SSR, KeepAlive, keyboard and speech behavior.

The assistant binding entry re-exports the canonical `StaticTableFeature` type
from `@adapttable/vue/features`. Its setup and mount callback contracts are
`StaticFeatureHost` and `FeatureMountContext` from that feature entry.

The [assistant adapter type guide](./assistant.md#adapter-feature-types) links the canonical definitions
for the feature/context/host contract and its type-only member exports. The
complete signatures are retained in the assistant API report.
