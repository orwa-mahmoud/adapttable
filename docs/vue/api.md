# Experimental Vue API reference

This reference describes the experimental `0.1.0` public packages.
They require Vue `^3.5.0` and have not been published to npm. See
[getting started](./getting-started.md) for scope, workspace setup and a first
native table. Identically named APIs in the React and Angular references do
not define Vue signatures.

## Entry points

| Import                     | Purpose                                                                                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@adapttable/vue`          | Source composables, `useDataTable`, column renderers, layout, selection and URL state. Also re-exports framework-neutral types.                                                                                                           |
| `@adapttable/vue/adapter`  | Everything above plus `useDataTableShell`, structural Chrome, attribute bridges, feature lifecycle/state/model helpers and neutral binding utilities. Adapter code imports its engine contracts here rather than importing core directly. |
| `@adapttable/vue/features` | Custom feature declarations, patch/slot composition and neutral feature-key helpers. This entry does not install a catalog of ready-made Vue features.                                                                                    |
| `@adapttable/vue-unstyled` | Native `DataTable`, `DataTableProps`, `DataTableSlots`, `DataTableClassNames` and its documented column, context, handle and source type re-exports.                                                                                      |

Type-only re-exports do not imply matching runtime exports. In particular,
structural/model helpers and feature functions belong to their entries above;
importing the binding root never installs controls, optional features or AI.

## Reactive input and lifecycle rules

`MaybeRefOrGetterOptional<T>` means `T`, a readonly `Ref<T | undefined>`, or a
getter returning `T | undefined`. Required reactive fields use Vue's
`MaybeRefOrGetter<T>`. Function-valued domain callbacks remain ordinary
callbacks, including zero-argument `refetch` functions. A whole-options getter
is the supported way to replace callback identities.

`requireScope(name): void` throws outside component setup or an active effect
scope. `useScopeActivity(): Readonly<ShallowRef<boolean>>` becomes active after
component mount, pauses on `KeepAlive` deactivation and becomes false on disposal.
An explicit non-component effect scope starts active immediately and must be
stopped by its owner. Server component setup stays inactive.

`ExternalStore<T>` contains `getSnapshot(): T` and
`subscribe(listener: () => void): () => void`.
`useExternalStore(input: MaybeRefOrGetter<ExternalStore<T>>)` returns a readonly
shallow snapshot ref. It rereads after subscribing, follows store replacement,
releases inactive subscriptions and ignores notifications from replaced or
disposed subscriptions. Snapshots and their row/engine objects are not deep-proxied.
These lifecycle helpers are exported from `@adapttable/vue/adapter`.

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
import { useServerData, type TableQuery } from "@adapttable/vue";

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
`TableUrlState`: a readonly shallow `state` ref plus `TableUrlActions`.

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
disposal they no longer mutate state. Query-state support does not itself
provide a visible filter or grouping control.

## Columns and rendering

`ColumnDef<TRow, TValue = unknown>` extends neutral `ColumnMetadata` with a
string `header`, a typed `accessor(row): TValue`, and Vue `cell`, `headerCell`
and `footer` renderers. `ColumnGroup<TRow>` contains nested
`children: readonly ColumnInput<TRow>[]`; `ColumnInput` is a leaf or group.
`resolveColumns(columns, locale?)` supplies metadata/accessor defaults.
`flattenColumns(inputs)` returns `leaves` and a `ReadonlyMap` of group records.

| Type/helper                                 | Contract                                                                                                                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `CellContext<TRow, TValue>`                 | `row`, `rowIndex`, `column`, and typed `value`.                                                                              |
| `HeaderContext<TRow, TValue>`               | `column`, text `label`, `sortDir`, `sortIndex`, and `toggleSort(event?)`, including shift-key multi-sort.                    |
| `FooterContext<TRow, TValue>`               | `column` and optional aggregate `value`. It is a rendering contract; the current native kit has no aggregate footer surface. |
| `RenderFunction<TContext>`                  | `(context: TContext) => VNodeChild`. A function is a renderer, never a getter-normalized component.                          |
| `ComponentRenderer<TContext>`               | Explicit `{ component, props(context) }` descriptor.                                                                         |
| `ComponentProps<TComponent>`                | Infers public props from an SFC, `defineComponent` result or functional component.                                           |
| `Renderer<TContext>`                        | Union of `RenderFunction` and `ComponentRenderer`.                                                                           |
| `componentRenderer(component, propsMapper)` | Creates a component descriptor and checks required component props against `ComponentProps`.                                 |
| `renderContent(renderer, context)`          | Calls a render function or creates the component VNode using mapped props.                                                   |
| `primitiveText(value): string \| null`      | Formats supported primitive/path values for display; unsupported structured values do not get stringified as cell content.   |
| `renderCell(context, slot?)`                | Column `cell`, then table slot, then `formatValue(row)`, then primitive text.                                                |
| `renderHeader(context, slot?)`              | Column `headerCell`, then table slot, then the text label.                                                                   |
| `renderFooter(context, slot?)`              | Column `footer`, then supplied slot, then primitive aggregate text.                                                          |

```ts
import { defineComponent, h } from "vue";
import {
  componentRenderer,
  type CellContext,
  type ColumnDef,
} from "@adapttable/vue";

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

`useRowSelection(options: MaybeRefOrGetter<RowSelectionOptions<TRow>>)` returns
`RowSelection`. Its options require reactive `rows` and a `rowKey`; optional
inputs are controlled `selectedIds`, `defaultSelectedIds`,
`onSelectionChange(ids)`, `labels` and `acrossPages`. The result exposes refs
`selectedIds` (a readonly set), `selectedCount`, `headerState`, `allMatching`
and `state`, plus `isSelected`, `toggle`, `toggleAll`, `clear`, `replace`,
`toggleGroupLeaves`, `selectAllMatching`, `rowCheckboxAttrs` and
`headerCheckboxAttrs`. `toggleAll` acts on visible row IDs. `selectAllMatching`
marks a broader matching scope when permitted; it does not fetch missing rows
or enumerate every remote ID. Checkbox attributes include indeterminate state
and localized labels.

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
| Extensions          | `features?: readonly ComposedFeature<TRow>[]`. Only compose features whose required UI is actually supplied; no native advanced-feature catalog is included.                                                                                          |

Events are `update:selectedIds(ids: string[])` and
`update:columnLayout(layout: ColumnLayoutState)`. They are change requests;
prop replacement does not itself emit another request. A template ref exposes
`DataTableHandle<TRow>`: `focus()` focuses the scroll surface, `runtime` is the
table runtime, and `getView()` returns the current `TableRuntimeView` or
`undefined` after disposal.

`DataTableSlots<TRow>` provides `cell(CellContext)`, `header(HeaderContext)`,
`toolbar()`, `loading()`, `empty({ noResults, clear })` and
`error(TableErrorState)`. An error slot receives the real error, optional retry
and retrying state. A source without `refetch` has no retry action. Custom
headers own their sorting controls; per-column renderers take precedence.

`DataTableClassNames` keys are applied to the corresponding semantic elements:

- Container/toolbar: `root`, `toolbar`, `searchWrapper`, `searchInput`,
  `sortSelect`, `sortDirectionButton`, `scroll`.
- Table: `table`, `thead`, `tbody`, `tr`, `th`, `td`, `sortButton`,
  `selectionHeader`, `selectionCell`, `selectionCheckbox`, `columnGroup`, `columnGroupToggle`.
- Cards: `cards`, `card`, `cardFields`, `cardRow`, `cardLabel`, `cardValue`.
- Paging: `footer`, `rowsPerPage`, `pager`, `pagePrev`, `pageNext`, `pageNumber`,
  `pageEllipsis`, `loadMore`, `loadMoreButton`.
- Status: `loading`, `empty`, `emptyClear`, `error`, `retry`, `refreshing`, `status`.

The table is unthemed. Attribute fallthrough applies ordinary host attributes
and listeners to the root; binding attributes stay on their semantic targets.
The desktop header sort buttons and selection checkboxes are native controls,
and responsive cards use native mobile sort controls. The public
`data-adapttable-part` names can also be used as CSS selectors.

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
`toolbarExtrasProps`, `renderToolbarExtras`, `slotFills`, `runtime`, `handle`,
`reconcile` and `setSurface`. Pass a `DataTableSurface` with
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

Slots `RowActions`, `ColumnGroupToggle`, `ResizeHandle` and `GroupRow` are
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

### Attribute and element-ref helpers

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

## Custom features and scoped state

`TableFeature<TRow>` has a stable nonempty `id`, optional `dependencies`,
`apply(input): FeaturePatch`, `setup(host)` and `mount(context)` functions,
plus optional `renders` and `requiredSlots`. `ComposedFeature<TRow>` is the
row-specific composition type. `StaticTableFeature` provides row-independent
composition; `StaticFeatureHost` omits row-sensitive menu registrations from
`TableFeatureHost`, which aliases `LiveFeatureHost<TRow>`.

`FeatureMountContext<TRow>` supplies `runtime`, `table`, reactive `featureHost`,
`filterRuntime` and resolved `options`, owned `state`, the feature's `scope`,
`active`, `reconcile()`, `flushAdmission()` and `flush(run)`. Setup/mount may
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
import { featureStateKey, type TableFeature } from "@adapttable/vue/features";

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
A channel export does not install a feature or provide its required controls.
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
both models so custom row structure remains coherent on desktop and mobile.

`RowActionControlsProjector<TRow>` maps `RowActionControlsInput<TRow>` to readonly
`RowActionControl<TRow>[]`. Inputs are `row`, `actions`, the adapter `confirm`
handler, `cancelLabel` and a live `enabled()` predicate. Each control has a
`key`, `label`, original `action` and semantic `attrs`. Respect `enabled()`
before starting or completing delayed action work; the projector or its table
may have been replaced or deactivated. Render these controls through the kit's
`RowActions` slot rather than adding binding-owned buttons.
