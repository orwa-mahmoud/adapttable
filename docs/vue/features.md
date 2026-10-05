# Compose Vue table features

The experimental `@adapttable/vue` binding and `@adapttable/vue-unstyled`
kit share one table model. Add optional behavior through the native kit's
feature factories; each factory contributes its own native controls while
the binding owns state, validation, row projection and lifecycle. These are
public, unreleased `0.1.0` packages. See [getting started](./getting-started.md)
for workspace setup.

## Choose an entry point

The base `@adapttable/vue-unstyled` entry exports `DataTable` and its types.
Pass a `readonly ComposedFeature<TRow>[]` through `features`. The optional
`@adapttable/vue-unstyled/features` barrel collects the factories below; use
individual entries to state which behaviors a table needs.

| Native import suffix   | Exports and purpose                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/filters`             | `filters`, `filterTypes`: filter definitions, fields, checklist choices and the optional AND/OR filter tree.                                                 |
| `/header-filters`      | `headerFilters`: desktop column-filter controls over the same filter state.                                                                                  |
| `/editing`             | `editing`, `rowEditing`, `editHistory`, `undoRedoButtons`, `dirtyIndicators`: cell/row editing and its history/status controls. Also exports `batchEditing`. |
| `/batch-editing`       | `batchEditing`: stage edits across rows and save them together.                                                                                              |
| `/grouping`            | `grouping`: grouped rows, aggregates, collapse, selection and group paging controls.                                                                         |
| `/tree`                | `tree`: nested or parent-ID rows, expansion and host-owned lazy loading.                                                                                     |
| `/row-detail`          | `rowDetail`: a host-rendered expandable panel. Also exports `nestedTable`.                                                                                   |
| `/nested-table`        | `nestedTable`: a host-rendered child table with its own row type.                                                                                            |
| `/resizable-columns`   | `resizableColumns`: pointer and keyboard resize handles.                                                                                                     |
| `/column-groups`       | `collapsibleColumnGroups`: collapse controls for grouped column headings.                                                                                    |
| `/multi-sort`          | `multiSort`: Shift-click sorting by multiple columns.                                                                                                        |
| `/fit-columns`         | `fitColumns`: let columns share the available width.                                                                                                         |
| `/row-pinning`         | `rowPinning`: move data rows to the top or bottom.                                                                                                           |
| `/pinned-summary-rows` | `pinnedSummaryRows`: independent summary objects above or below the data.                                                                                    |
| `/cell-span`           | `cellSpan`: host-computed row and column spans.                                                                                                              |
| `/extra-rows`          | `extraRows`: separator or full-width content between data rows.                                                                                              |
| `/row-appearance`      | `rowAppearance`: row class, style and height callbacks.                                                                                                      |
| `/row-actions`         | `rowActions`: host actions and optional add, duplicate and delete requests.                                                                                  |
| `/density`             | `densityChooser`: comfortable/compact toolbar control.                                                                                                       |
| `/fullscreen`          | `fullscreen`: browser fullscreen for the table's actual root.                                                                                                |
| `/saved-views`         | `savedViews`, `SavedViewsPanel`: named state captures and an optional management surface.                                                                    |
| `/export`              | `exportCsv`: export the current scope as CSV with native progress controls. `/export-csv` remains a deprecated compatibility path.                           |
| `/export-pdf`          | `exportPdf`: export with the optional PDF writer and the same native lifecycle. Also exports PDF and print utilities.                                        |
| `/export-xlsx`         | `exportXlsx`: export with the optional XLSX writer and the same native lifecycle. Also exports XLSX utilities.                                               |

`/columns` collects the four column factories; `/rows` collects row pinning,
summary rows, spans, extra rows, appearance and actions. They remain supported
entry points. Import grouping from the native `/grouping` entry so its group
renderer is included.

Binding-only feature factories for rows, columns and hierarchy come from
`@adapttable/vue/features`. Filters, header filters, editing, batch editing,
density, fullscreen and saved views each have matching binding subpaths.
The focused native column/row entries export their factory; signature types
come from `@adapttable/vue`, its relevant feature entry, or the native
`/columns` and `/rows` collections when re-exported there.
A binding factory does not supply visible controls. Use its native counterpart
with the Unstyled kit. A React or Angular import does not define a Vue feature.

## Standard native features

`standardFeatures()` from `@adapttable/vue-unstyled/preset` returns an ordinary
array of working native features: columns menu, density chooser, CSV export,
keyboard Find, fit columns, fullscreen, header filters, multi-sort, resizable
columns and status bar. Each member is also available from its own public entry.
On mobile, toolbar controls remain available; header filters and resize handles
belong to desktop headers. Fullscreen depends on browser support.

```ts
import { standardFeatures } from "@adapttable/vue-unstyled/preset";
import { exportPdf } from "@adapttable/vue-unstyled/export-pdf";

interface Person {
  id: string;
  name: string;
  team: string;
}

const features = [
  ...standardFeatures<Person>({
    findButton: true,
    grouping: "team",
    filters: [{ key: "name", type: "text", getValue: (row) => row.name }],
    savedViews: { storageKey: "people-views" },
  }),
  exportPdf<Person>({ scope: "page", filename: "people.pdf" }),
];
```

Pass this array to `DataTable`. `StandardFeatureOptions<TRow>` types configured
filter callbacks with the table's row. Grouping, bulk actions, filters and saved
views join only when their corresponding option is provided; the zero-argument
preset does not install empty configured controls. `findButton` defaults to
false, while Ctrl/Cmd+F inside the table opens Find. Selection statistics require
an explicit cell-navigation feature and are not included.

Append a same-ID declaration to replace a preset member, or filter the ordinary
array by `id` to omit one. Export factories share the `export-csv` identity, so
the PDF declaration above replaces CSV with one PDF control. Existing controlled
values, update events, confirmation and mutation callbacks retain host authority.

The preset imports all members it can compose, including configured members.
Use individual entries when bundle size matters. PDF and XLSX writers remain
outside the preset until their format entry is imported.

## Filtering

```ts
import { filters } from "@adapttable/vue-unstyled/filters";
import { headerFilters } from "@adapttable/vue-unstyled/header-filters";

interface Person {
  id: string;
  name: string;
  score: number;
}
const features = [
  filters<Person>(
    [
      { key: "name", type: "text", label: "Name" },
      { key: "score", type: "numberRange", label: "Score" },
    ],
    { mode: "popover", tree: true }
  ),
  headerFilters(),
];
// Pass these features with the Person columns and rows from getting started.
```

`filters<TRow>(defs?: readonly FilterDef<TRow>[], options?: FiltersOptions)`
returns a row-typed feature. `FiltersOptions` accepts `mode: "popover" | "drawer"`
and `tree: boolean`. The popover is anchored with no backdrop; the drawer uses
a native modal dialog. Escape closes an open surface and returns focus to its
trigger. Header filters are desktop-only; the toolbar filters remain available
on mobile cards.

`filterTypes(specs: readonly FilterTypeSpec[])` extends the filter registry.
Custom filter types still need a supported widget kind or an adapter field
renderer. Registering filter semantics does not create a new control.
`headerFilters()` derives controls from the resolved filter definitions and
uses the same source `extra`/filter-tree state as the toolbar.

The fallback frontend source evaluates the composed filter engine. A supplied
source owns its filtering: server/query sources receive query changes through
their normal contracts, and a separately created frontend source needs its own
filter evaluation configured. Attaching controls does not replace an external
source's filtering implementation.

For adapter authors, `@adapttable/vue/filters` exports:

| API                                                                                          | Contract                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useTextFilter(def, source)`, `useRangeFilter(def, source)`, `useBooleanFilter(def, source)` | Reactive definition/source inputs return computed neutral widget models and guarded write actions. Text/range operator selection is separate from the entered value.                                                                                                                                             |
| `useFilterOptions(def)`                                                                      | A computed `FilterOptionsState` with `options`, `loading`, optional `error`; replaced async loaders cannot publish into a newer definition.                                                                                                                                                                      |
| `useFilterField(options)`                                                                    | `MaybeRefOrGetter<FilterFieldOptions<TRow>>` to `ComputedRef<FilterFieldModel>`. Options contain `def`, `source`, resolved `labels`, optional `registry` and `id`. Outside a component, provide `id`.                                                                                                            |
| `FilterFieldModel`, `FilterFieldControl`                                                     | A field ID/label/loading/error and discriminated input/select/checkbox control records.                                                                                                                                                                                                                          |
| `FilterFieldChrome({ model, controls, classNames?, className? })`                            | Render structure using all required `FilterFieldSlots`: `Input(FilterInputProps)`, `Select(FilterSelectProps)`, `Checkbox(FilterCheckboxProps)`. Props carry label, current value/checked state, semantic attrs and one `onChange` action. `FilterFieldClassNames` styles the field, label and control wrappers. |
| `useChecklistFilter(def, source)`                                                            | Computed available choices, visible search matches, selected values and select/clear/toggle actions. The source must satisfy `ChecklistSource<TRow>`.                                                                                                                                                            |
| `useChecklistWindow(count, enabled)`                                                         | Reactive list count/virtualization flag to `window`, element `ref` and `onScroll`; measures only while active.                                                                                                                                                                                                   |
| `useChecklistModel(props)`                                                                   | `MaybeRefOrGetter<ChecklistFilterProps<TRow>>` to a computed `ChecklistChromeModel`, combining the filter, window and labels.                                                                                                                                                                                    |
| `ChecklistChrome({ model, controls })`                                                       | Requires `ChecklistSlots<VNodeChild>` with Search, Button and Checkbox controls. This virtualizes long checklist choices, not table rows.                                                                                                                                                                        |
| `useFilterTree(options)`                                                                     | `FilterTreeOptions<TRow>` supplies definitions, a source with `filterTree`/`setFilterTree`, optional registry and default disclosure state. Returns refs for expansion/tree/actions; actions add/remove/replace nodes and change combinators.                                                                    |
| `useFilterTreeModel(props)`, `FilterTreeModel<TRow>`                                         | A computed presentation over `FilterTreeBuilderProps<TRow>` with resolved labels, registry and the tree actions.                                                                                                                                                                                                 |
| `FilterTreeChrome({ model, controls })`                                                      | Recursive AND/OR structure requiring `FilterTreeSlots<VNodeChild>`: Select, Input, Button and Disclosure. A tree requires definitions and a source that supports tree writes.                                                                                                                                    |

`FILTER_VIEW` and `filterViewKey<TRow>()` expose the table-owned
`FilterPanelModel<TRow>`. `FilterPanelChrome({ model, controls, classNames? })`
requires `FilterPanelSlots<TRow>`: Trigger, Button, Field, Popover and Drawer;
Tree is additionally required when the model enables the builder.
`FilterTriggerProps` carries semantic attrs, count, trigger ref and pointer/click
actions. `FilterPanelButtonProps` carries label, part and click action.
`FilterPanelSurfaceProps` carries open state, label, direction, anchor, optional
fullscreen container, content and close action. The kit owns positioning,
portals and dismissal. `FilterPanelClassNames` styles the form, panel, actions
and toolbar wrappers.

`@adapttable/vue/header-filters` exports
`useHeaderFilter(MaybeRefOrGetter<HeaderFilterOptions<TRow>>)` and
`HeaderFilterChrome({ model, controls })`. The options extend
`FilterHeaderControlProps` with optional `id` and `dir`; the computed model
provides trigger, field, anchor, close and reset state.
`HeaderFilterChromeSlots<TRow>` requires Trigger, Popover and Field. Pass an
explicit ID when using the composable outside component setup.

The native entries also export `NativeFilterField`, `NativeChecklistFilter`
and `NativeFilterTree` for standalone native fields/builders, and
`NativeHeaderFilter` for one column. Their inputs are respectively
`FilterFieldOptions<TRow>`, `ChecklistFilterProps<TRow>`,
`FilterTreeBuilderProps<TRow>` and `HeaderFilterOptions<TRow>`.

## Compact inline header controls

`FilterHeaderControl` renders one compact search, select, boolean, range or
multi-choice control. `FilterHeaderRow` places those controls in a second
header row under the columns you supply. Import either from the native root
or `/header-filters`. The existing `headerFilters()` feature keeps its funnel
buttons and popovers.

`FilterHeaderControlOptions<TRow>` extends `FilterHeaderControlProps<TRow>`
with an optional `menuClassName` for multi-choice menus. The row accepts
`FilterHeaderRowProps<TRow>`; its `classNames` follow `FilterHeaderClassNames`.

The compact components read and request writes through the supplied source.
Use the same source as the rest of your table so URL state, chips and host
acceptance stay coordinated. A compact select uses the neutral list-valued
filter representation; a range with no selected operator starts at a lower
bound. Multi-choice filters use a native disclosure; Escape closes it and
returns focus to its summary.

```vue
<script setup lang="ts">
import { type ColumnDef, type TableSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { FilterHeaderRow } from "@adapttable/vue-unstyled/header-filters";

interface Person {
  id: string;
  name: string;
}
const props = defineProps<{ source: TableSource<Person> }>();
const columns: readonly ColumnDef<Person>[] = [{ key: "name", header: "Name" }];
const labels = resolveLabels(undefined);
</script>
<template>
  <table>
    <thead>
      <tr>
        <th scope="col">Name</th>
      </tr>
      <FilterHeaderRow
        :columns="columns"
        :defs="[{ key: 'name', type: 'text', label: 'Name' }]"
        :source="props.source"
        :labels="labels"
        :class-names="{ filterHeaderInput: 'compact-search' }"
      />
    </thead>
    <tbody>
      <tr v-for="person in props.source.rows" :key="person.id">
        <td>{{ person.name }}</td>
      </tr>
    </tbody>
  </table>
</template>
```

The row receives projected visible columns, optional start/end column spacers,
cell styles, pin edges and sticky attributes from its caller. Enable only the
selection, reorder, expansion and actions pads that your table actually
renders. It hides when `enabled` is false or no definitions are supplied.
Mobile cards use standalone controls rather than a table-header row.

The row and cells expose `filter-header-row` and `filter-header-cell`.
`filter-header-input` targets the real input/select, a range-pair wrapper or
the multi-choice summary; `filter-header-menu` targets its choices fieldset.
The matching `filterHeaderRow`, `filterHeaderCell`, `filterHeaderInput` and
`filterHeaderMenu` class hooks style those same elements. Funnel buttons use
`filterHeaderTrigger`.

For custom kits, `useFilterHeaderControl` returns a computed
`FilterHeaderControlModel` whose `kind` identifies the text, select, multi,
range or custom-content branch. `FilterHeaderControlChrome` requires the
Search, Select, Range and Multi callbacks in `FilterHeaderSlots`. They receive
`FilterHeaderSearchProps`, `FilterHeaderSelectProps`, `FilterHeaderRangeProps`
and `FilterHeaderMultiProps`; select and multi choices use `FilterHeaderOption`.
`FilterHeaderRowChrome` requires the Control callback in
`FilterHeaderRowSlots<TRow>`, mounting each field in its own component scope.
The binding supplies structure and never substitutes a native control for a
missing slot.

## Editing and host persistence

Mark editable columns with `editable: true`, then provide the host write:

```ts
import { shallowRef } from "vue";
import type { ColumnDef } from "@adapttable/vue";
import {
  dirtyIndicators,
  editing,
  editHistory,
  undoRedoButtons,
} from "@adapttable/vue-unstyled/editing";

interface Person {
  id: string;
  name: string;
  score: number;
}
const rows = shallowRef<readonly Person[]>([
  { id: "ada", name: "Ada", score: 10 },
]);
const columns: ColumnDef<Person>[] = [
  { key: "name", editable: true },
  { key: "score", editor: "number", editable: true },
];
const features = [
  editing<Person>((row, key, value) => {
    rows.value = rows.value.map((item) =>
      item.id === row.id ? { ...item, [key]: value } : item
    );
  }),
  editHistory({ depth: 50 }),
  undoRedoButtons(),
  dirtyIndicators(),
];
```

`editing<TRow>(onCellEdit: CellEditHandler<TRow>, extras?)` sends
`(row, columnKey, value)` to the host. `rowEditing<TRow>(onRowEdit, extras?)`
sends `(row, patch)` on Save. `batchEditing<TRow>(onBatchEdit, extras?)`
sends `readonly BatchRowEdit<TRow>[]`, each carrying `row`, `rowId` and
`patch`, when the batch is saved. Async handlers can return their persistence
promise so the binding can show pending state and failures. Replace the host
rows when saving succeeds; no factory mutates them for you.

`EditingLifecycleExtras<TRow>` includes validation/application hooks, edit
lifecycle/error callbacks, rollback, dirty tracking, history, row versions,
conflict policy/handler and optional `rowEditIcons`. It omits rows, columns,
row key and the three primary write callbacks, which the shell/factory supplies.
`TableEditingOptions<TRow>` is the complete headless input, requiring rows,
editable columns and a row key. Native editors cover text, number, boolean,
date/time and select controls; a custom editor uses the typed editor contract.

Batch mode takes precedence over row mode when both are enabled. To use history
with row or batch editing, also compose `editing(onCellEdit)` as the replay
callback: undo/redo applies individual cell changes through that host callback.
Without it, enabling history for row/batch editing throws. `editHistory(true |
false | { depth? })` configures recording, `undoRedoButtons()` renders its
controls, and `dirtyIndicators()` enables dirty markers. `DirtyEdits` gives a
host observer `count`, `confirm`, `confirmRow` and `confirmAll` to acknowledge
persisted changes.

The binding editing entry exposes the following composables. Each input accepts
a `MaybeRefOrGetter` options object; the optional second argument is
`ExternalStoreOptions`, whose `active` ref/getter further gates the owning scope.

| API                 | Input and result                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `useTableEditing`   | `TableEditingOptions<TRow>` to `TableEditingModel<TRow>`: computed `bundle: EditingBundle<TRow>` and `history: EditHistoryState<TRow>`. |
| `useCellEditing`    | Optional `CellEditSessionOptions<TRow>` to a computed `CellEditingState<TRow>`.                                                         |
| `useCellSaveState`  | Optional `CellSaveStoreOptions<TRow>` to computed save/error/rollback state.                                                            |
| `useEditValidation` | Optional `EditValidationStoreOptions<TRow>` to computed validation state and async `check`; obsolete checks are invalidated.            |
| `useDirtyCells`     | Optional `DirtyCellsOptions`, extending the neutral dirty-store options with `onDirtyChange`, to computed dirty-cell state.             |
| `useRowEditing`     | `RowEditStoreOptions<TRow>` to computed row drafts, active row and save/cancel actions.                                                 |
| `useBatchEditing`   | `BatchEditStoreOptions<TRow>` to computed batch drafts and save/cancel actions.                                                         |
| `useEditHistory`    | `EditHistoryControllerOptions<TRow>` to computed history with guarded undo/redo.                                                        |

`useEditableCell(input)` adapts the neutral `editableCellController` input into
a computed controller. `useEditableCellModel(input)` takes
`VueEditableCellProps<TRow>` and returns `ComputedRef<EditableCellModel<TRow>>`,
adding activation/editor props, display content, unit mode, conflict prompt and
focus/error wiring. The prop type specializes `EditableCellSlotProps` to Vue
columns and `VNodeChild` content.

`EditableCellChrome({ model, controls, classNames? })` requires
`EditableCellChromeSlots<TRow>`: Activate, Editor and Button.
`EditableCellEditorProps<TRow>` provides the controller, label, semantic attrs,
focus ref, change, blur and keydown actions. `EditableCellClassNames` styles the
wrapper and error/status regions. For a custom editor,
`editableCustomControl(model): CustomCellEditorCtrl` maps the existing model's
draft, commit/cancel, keyboard, focus, validation and conflict actions; do not
create a second edit controller for the same cell.

`RowEditActionsChrome` and `BatchEditBarChrome` accept their neutral
`RowEditActionsProps<TRow>`/`BatchEditBarProps<TRow>` plus required
`EditingActionSlots`. Its Button receives `EditingActionButtonProps`: label,
part, optional icon, semantic attrs (including disabled state) and click action. Native counterparts are `NativeEditableCell`,
`NativeRowEditActions` and `NativeBatchEditBar`, exported from `/editing`
(and the batch bar from `/batch-editing`).

The shell publishes one `EditingChromeModel<TRow>` through
`EDITING_CHROME_MODEL`/`editingChromeModelKey<TRow>()`. Its optional row function
builds row-action props and its batch model builds the shared save bar.
`editableCellSlotKey`, `rowEditActionsSlotKey` and `batchEditBarSlotKey`
specialize required feature slots to the same row type.

## Grouping, trees and expandable rows

```ts
import { shallowRef } from "vue";
import { grouping } from "@adapttable/vue-unstyled/grouping";
import { tree } from "@adapttable/vue-unstyled/tree";

interface Person {
  id: string;
  team: string;
  children?: readonly Person[];
}
const expandedIds = shallowRef<readonly string[]>([]);
const groupedFeatures = [grouping<Person>("team", { groupFooters: true })];
const treeFeatures = [
  tree<Person>({
    getChildren: (row) => row.children,
    expandedIds,
    onExpandedIdsChange: (next) => {
      expandedIds.value = next;
    },
  }),
];
// Choose groupedFeatures or treeFeatures for the table's hierarchy.
```

`grouping(groupBy, extras?)` accepts a reactive string or string-array key list.
`GroupingExtras<TRow>` includes group collapse options, `onGroupByChange`,
`groupFooters`, group/row page sizes, `groupFilter`, `groupSort`,
`groupAggregates` and `onGroupLoadMore`. `StaticGroupingExtras` omits the
row-dependent filter/sort/aggregate callbacks, allowing row-independent use.
Server sources must advertise grouping support and supply compatible grouped
data/aggregate metadata; grouping does not fetch missing rows automatically.

`tree<TRow>(options?: TreeFeatureOptions<TRow>)` accepts `getChildren(row)` for
nested data or `getParentId(row)` for flat data, plus optional `hasChildren`,
`treeColumn` and `onLoadChildren(row)`. The host publishes loaded children back
into its rows. The binding tracks loading/failure per ID and closes a failed
expansion so it can be tried again. The callback has no AbortSignal parameter;
the host owns cancellation of its network work. Replacing the loader or ending
the feature's active lifetime prevents its old completion from updating the
current loading model.

`rowDetail<TRow>(render, defaultExpandedRowIds?, options?)` renders a `VNodeChild`
panel below a data row. `nestedTable<TRow>(nested, defaultExpandedRowIds?, options?)`
uses a `NestedTableFor<TRow>`, a row callback returning `NestedTable | undefined`.
A `NestedTable` contains an optional label and `table(defaults): VNodeChild`:

```ts
import { h } from "vue";
import { DataTable } from "@adapttable/vue-unstyled";
import { nestedTable } from "@adapttable/vue-unstyled/nested-table";

interface Order {
  id: string;
  description: string;
}
interface Customer {
  id: string;
  orders: readonly Order[];
}
const features = [
  nestedTable<Customer>((customer) => ({
    label: `Orders for ${customer.id}`,
    table: (defaults) =>
      h(DataTable<Order>, {
        ...defaults,
        data: customer.orders,
        columns: [{ key: "description" }],
        rowKey: (order: Order) => order.id,
        urlSync: false,
      }),
  })),
];
```

The host chooses the child kit, data, columns and URL policy.
`NestedTableDefaults` carries inherited labels/density and the child label,
with `urlSync: false` and `searchable: false` by default;
`NestedTableParent` describes that inheritance input.
`nestedTableDetail({ nestedTable?, renderRowDetail?, parent? })` creates the
accessible region renderer and falls back to ordinary detail content when no
nested table is returned.

These headless composables come from the binding `/features` entry (also
re-exported by the corresponding native hierarchy entries):

| Composable                                               | Controlled state and actions                                                                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useGroupCollapse(options?: GroupCollapseOptions)`       | Computed `GroupCollapseState`: collapsed IDs, toggle, expand all, collapse all and collapse to depth. Controlled pair: `collapsedGroupIds`/`onCollapsedGroupIdsChange`; seed: `defaultCollapsedGroupIds`. |
| `useTreeExpansion(options?: TreeExpansionOptions)`       | Computed `TreeExpansionState`: expanded IDs, toggle/expand, expand all and collapse all. Pair: `expandedIds`/`onExpandedIdsChange`; seed: `defaultExpandedIds`.                                           |
| `useRowExpansion(options?: RowExpansionOptions)`         | Computed `RowExpansionState`: expanded IDs, `isExpanded`, toggle. Pair: `expandedRowIds`/`onExpandedRowIdsChange`; seed: `defaultExpandedRowIds`.                                                         |
| `useGroupPaging(enabled = true)`                         | Computed `GroupPagingState` with paging state, `showMore(size, key?)` and `reset`. The flag is reactive.                                                                                                  |
| `useLazyChildren(options: LazyChildrenVueOptions<TRow>)` | Computed `LazyChildrenState<TRow>`, including loading/failure sets and `loadIfNeeded`. Options extend neutral `LazyChildrenOptions` with reactive `enabled`.                                              |

All options objects above accept a value/ref/getter. ID state inputs may also
be refs/getters; change callbacks stay callbacks. Supplying controlled IDs
makes the host authoritative. A toggle requests a replacement list; ignoring
that request leaves the displayed state unchanged. Defaults seed local state
once. Group collapse, tree expansion and detail expansion use separate ID sets.
Standalone hierarchy composables accept a reactive `enabled` lifecycle guard.
Installed hierarchy factories omit that helper-only option; add or remove the
feature to control its lifetime.

The adapter entry exposes `groupingModelKey<TRow>()`, `treeModelKey<TRow>()`
and `rowDetailModelKey<TRow>()`. They carry `TableGrouping` (entries, aggregates,
collapse and paging), `TableTree` (visible/all loaded entries, expansion and
load state) and `TableRowDetail` (expansion and renderer).
`GroupRowModel` supplies group controls and aggregate alignment;
`TreeCellModel` supplies the entry and semantic toggle attrs;
`RowDetailModel` supplies expanded state, toggle attrs and a detail renderer.
`GroupRowChrome(props: GroupRowChromeProps<TRow>)` requires Button and Checkbox
slots and renders either the desktop or mobile group structure.
`mountGrouping(context: FeatureMountContext<TRow>): void` is the binding's
scope-owned model installer; use `grouping()` for ordinary table composition.

### Visible rows and loaded rows

`TableRowInventory<TRow>` distinguishes `visibleRows` from `loadedRows`.
Selection and runtime row traversal follow visible hierarchy order. Collapsed
groups and trees hide descendants from select-all; expanded loaded children
join it. Editing checks row liveness against loaded rows, so collapsing a
parent does not discard a child's draft. Unloaded remote children are not
invented or selected. Independent summary rows and extra content are not data
rows in either selection scope.

The shell composes hierarchy, detail panels, pinning, spans and extra rows
through one desktop/card projection. Grouping takes precedence if both grouping
and tree models are active; choose one hierarchy intentionally. Data-cell spans
are clipped at structural group boundaries and open detail rows. Mobile cards
preserve complete cell values instead of applying grid spans.

## Columns, rows and actions

`resizableColumns()`, `collapsibleColumnGroups()`, `multiSort()` and
`fitColumns()` return `StaticTableFeature`. Desktop resize/group controls
operate on the same controlled or local column layout; mobile cards honor
visibility and ordering without desktop handles. Resize actions stop when
the feature is removed or deactivated. `ColumnResizeHandleOptions` and
`ColumnResizeHandleProps` describe the neutral handle's cancellation options
and semantic pointer/keyboard props for adapter implementations.

```ts
import { h, shallowRef } from "vue";
import type { RowPinState } from "@adapttable/vue";
import { rowPinning } from "@adapttable/vue-unstyled/row-pinning";
import { pinnedSummaryRows } from "@adapttable/vue-unstyled/pinned-summary-rows";
import { extraRows } from "@adapttable/vue-unstyled/extra-rows";
import { rowAppearance } from "@adapttable/vue-unstyled/row-appearance";

interface Person {
  id: string;
  name: string;
  score: number;
}
const pins = shallowRef<RowPinState>({ top: [], bottom: [] });
const features = [
  rowPinning({
    pinnedRowIds: pins,
    onPinnedRowIdsChange: (next) => {
      pins.value = next;
    },
  }),
  pinnedSummaryRows<Person>({
    bottom: [{ id: "total", name: "Total", score: 30 }],
  }),
  extraRows([
    {
      key: "note",
      kind: "fullWidth",
      render: () => h("p", "Scores are provisional"),
    },
  ]),
  rowAppearance<Person>({
    rowClassName: (row) => (row.score < 10 ? "low-score" : undefined),
  }),
];
```

`rowPinning(options?: RowPinningFeatureOptions)` accepts reactive
`pinnedRowIds: RowPinState` and `onPinnedRowIdsChange(next)`. Controlled requests
require host acceptance. Uncontrolled pins use the table's URL backend.
Grouped/tree tables refuse data-row pinning; `pinnedSummaryRows` still works
there. `useRowPinning(options: RowPinningOptions<TRow>)` is the lower-level
computed controller with `state`, `sideOf`, `pin`, `unpin` and actions; options
require reactive `enabled`, `getRowId` and labels.

`pinnedSummaryRows<TRow>(rows: PinnedRows<TRow>)` accepts independent `top` and
`bottom` arrays, rendered through ordinary columns but outside filtering,
sorting, pagination and selection. The host computes their values.

For computed summaries, `aggregate<TRow>(spec, options?)` from
`@adapttable/vue` returns a `SummaryRowFn<TRow>`: a function from rows to a
record of column keys and Vue-renderable values. `AggregateSpec` maps each
column key to a registered operation name or an `Aggregator<TValue>` callback
that receives the column's values and returns a `VNodeChild`.
`AggregateOptions<TRow>` retains the neutral aggregation options and accepts
`format(value, key): VNodeChild`, so formatted results can contain Vue nodes.
For example, `aggregate<Person>({ score: "sum" })(people)` computes a score
summary for host-rendered content. The binding uses the shared aggregation
registry; this helper does not install a footer summary row.

`cellSpan<TRow>(getCellSpan: GetCellSpan<TRow>, appearance?: CellSpanAppearance)`
uses a callback receiving `GetCellSpanArgs`: row, column, dataset row index,
column index and visual `sectionRows`/`sectionRowIndex`. Return
`CellSpanRequest` with optional `rowSpan`/`colSpan`; omitted dimensions are one.
Appearance is `"merged"` or `"plain"`. For example,
`cellSpan<Person>(({ column }) => column.key === "name" ? { colSpan: 2 } : undefined)`
merges the name with its next visible column on desktop. Neutral
`resolveCellSpan(args, getCellSpan, maxColumns, maxRows)` clamps requested
geometry; the Vue adapter entry re-exports it for custom projections.

`extraRows(rows: readonly ExtraRow[])` accepts stable keys, `kind: "separator" |
"fullWidth"`, optional `beforeRowId`, and optional Vue `render(): VNodeChild`.
Omit the row ID to append. `ExtraEntry` is the corresponding projected variant;
`ExtraRowKind` names the two kinds.
`rowAppearance<TRow>(options: RowAppearanceOptions<TRow>)` accepts
`rowClassName(row, index)`, `rowStyle` and `rowHeight`. Indices are relative to
the loaded source with its page offset, rather than counting structural rows.
`HeadlessRowsOptions<TRow>` groups these presentation inputs, spans, summaries
and optional pin offset for custom projectors. `HeadlessBodySlot<TRow>` aliases
the resulting Vue `TableBodySlot` union.

`rowActions<TRow>(actions?: readonly RowAction<TRow>[], handlers?: RowMutationHandlers<TRow>)`
combines host actions with optional add/duplicate/delete callbacks. Each action
has a key, label and optional `onClick(row)`; the host supplies its effect.
`RowMutationHandlers` offers `onAddRow()`, `onDuplicateRow(row)`,
`onDeleteRow(row)` and `confirmDeleteRow` (defaults to true). Native confirmation
uses the browser dialog unless the table's `confirm: ConfirmHandler` overrides
it. A cancelled confirmation does not call the host callback.

`useRowMutations(MaybeRefOrGetter<UseRowMutationsOptions<TRow>>)` returns a
computed `RowMutationsState`: `canAdd`, `addRow()` and mutation actions.
`RowMutationAction<TRow>` preserves the host's actual return value, including a
persistence promise. `rowActionControls(input: RowActionControlsInput<TRow>)`
produces labeled, semantic controls and guards delayed confirmation against
feature removal. Use it when implementing a kit; the native table already
uses this projection.

## Density, fullscreen and Saved Views

```ts
import { densityChooser } from "@adapttable/vue-unstyled/density";
import { fullscreen } from "@adapttable/vue-unstyled/fullscreen";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";

const features = [
  densityChooser(),
  fullscreen(),
  savedViews({ storageKey: "people-views" }),
];
```

`densityChooser()` and `fullscreen()` return static features.
`density: TableDensity` is `"comfortable" | "compact"`.
`v-model:density` accepts `update:density`; a host that ignores a controlled
request keeps its value, and the native select restores that value.
`onDensityChange` is an optional observer called once for the request;
`defaultDensity` seeds local state. The root exposes effective `data-density`.

`useFullscreen(target, activity?)` from the binding root returns a computed
`FullscreenState`. The target accepts an element, ref or getter returning
`HTMLElement | null | undefined`. Browser listeners activate after mount.
Unsupported environments have no fullscreen control. The active container is
passed to kit overlays so filters can remain inside the fullscreen surface.
Fullscreen itself is browser state and is not saved in a view.

`savedViews(options: MaybeRefOrGetter<UseSavedViewsOptions>)` installs one
scope-owned model and native menu. Options require `storageKey`; optional
`storage` (null for memory only), `store: SavedViewsStore`, `visibility`,
`migrate`, `urlAdapter`, `urlSync` and `urlKey` configure persistence and the
captured table namespace. An explicit store replaces browser storage.
`flushViewState?: () => void` lets the host flush pending URL slices immediately
before saving or applying a view; the installed feature also flushes its own
table-owned writers.

`useSavedViews(options, activity?): UseSavedViewsResult` returns computed
`views` and `defaultView`, plus `save(name)`, `apply(name)`, `remove(name)`,
`rename(from, to)`, `move(name, -1 | 1)`, `setDefault(name)` and `reload()`.
`SavedView`, `SavedViewVisibility`, `SavedViewMigration`, `SavedViewsStore`
and `SAVED_VIEW_VERSION` describe the shared persisted format and migration
contract. Saving/applying through the installed feature flushes pending
feature state writes first.

`SavedViewsPanel` from the native entry takes `SavedViewsPanelProps`: `views`,
`onApply`, `onRename`, `onMove`, `onSetDefault`, `onRemove`, optional labels,
footer and class name. Connect these to `useSavedViews` for a separate
management surface. Adapter authors can render `SavedViewsPanelChrome` from
`@adapttable/vue/adapter` with `SavedViewsPanelChromeProps`, providing the
required `SavedViewsPanelSlots` controls. It coordinates row actions and rename
state while the supplied controls determine the appearance.

### What a view restores

Saved Views capture recognized URL parameters from their configured namespace.
For this Vue slice, the connected source can serialize pagination, search,
sort levels, filter extras/tree, grouping keys and group aggregate overrides.
Density participates when `densityChooser()` is installed. Uncontrolled data
pins participate with `rowPinning()`. Group collapse participates only when
explicitly wired to `useGroupCollapseUrlState`:

```ts
import {
  grouping,
  useGroupCollapseUrlState,
} from "@adapttable/vue-unstyled/grouping";

const collapse = useGroupCollapseUrlState({ urlKey: "people" });
const features = [
  grouping("team", {
    collapsedGroupIds: collapse.collapsedGroupIds,
    onCollapsedGroupIdsChange: collapse.onCollapsedGroupIdsChange,
  }),
];
// Use urlKey="people" on the table and its Saved Views configuration too.
```

`UseGroupCollapseUrlStateOptions` extends `UrlSliceOptions` with optional
reactive default IDs; `UseGroupCollapseUrlStateResult` is the ref/change pair
above. `useDensityUrlState(options?, activity?)` accepts
`UseDensityUrlStateOptions`, returning `UseDensityUrlStateResult` with a
`density` ref, `onDensityChange` and `flush`. `Density` aliases `TableDensity`;
`DENSITY_URL_WRITE_DEBOUNCE_MS` exposes the shared write delay.
`useRowPinningUrlState(options?)` accepts `UseRowPinningUrlStateOptions`
(`enabled`, adapter, sync and key) and returns
`UseRowPinningUrlStateResult` with pin state and its writer.

`useUrlSlice<T, TConfig>(options, spec, config, activity?)` is the generic
bridge: a readonly shallow `value` ref, `set(next)` and `flush()`.
`UrlSliceOptions` holds reactive adapter/key/sync and optional `serverSearch`
for hydration. Use the same adapter and key for related slices. If a table
uses a separately supplied source, align that source's URL backend/namespace
with the table and view controls, especially when URL sync is disabled and
memory adapters would otherwise be separate.

Column layout participates when the host explicitly binds
`useColumnLayoutUrlState` as shown below. Tree/detail expansion, selected IDs,
edit drafts/history, host rows, spans, extra content and appearance callbacks
are not captured. Controlled state remains authoritative: a saved URL value
cannot override an unchanged controlled prop. The shared codec recognizing
additional features' parameters does not install those features or make their
state reactive in Vue.

### Persist column layout explicitly

The binding root exports both layout-persistence composables. Neither is
installed automatically by `DataTable`.

```vue
<script setup lang="ts">
import { useColumnLayoutUrlState } from "@adapttable/vue";
import { DataTable, type ColumnDef } from "@adapttable/vue-unstyled";
import { resizableColumns } from "@adapttable/vue-unstyled/resizable-columns";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";

interface Person {
  id: string;
  name: string;
  score: number;
}
const rows: Person[] = [{ id: "ada", name: "Ada", score: 10 }];
const columns: ColumnDef<Person>[] = [{ key: "name" }, { key: "score" }];
const rowKey = (person: Person) => person.id;
const { layout, onLayoutChange, flush } = useColumnLayoutUrlState({
  urlKey: "people",
});
const features = [
  resizableColumns(),
  savedViews({ storageKey: "people-views", flushViewState: flush }),
];
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :features="features"
    :column-layout="layout"
    url-key="people"
    @update:column-layout="onLayoutChange"
  />
</template>
```

`useColumnLayoutUrlState(options?, activity?): UseColumnLayoutUrlStateResult`
accepts `MaybeRefOrGetter<UseColumnLayoutUrlStateOptions>`. The options extend
`UrlSliceOptions` with reactive optional
`defaultColumnLayout: Partial<ColumnLayoutState>`. The result contains a
readonly shallow `layout` ref, `onLayoutChange(next: ColumnLayoutState)` and
`flush()`. Persisted fields include hidden/order/widths/pinned/names and
collapsed column groups. `LAYOUT_URL_WRITE_DEBOUNCE_MS` exposes the shared
write delay; passing `flush` to Saved Views captures the latest resize and
prevents an older pending write from overwriting an applied view.

Use the same `urlAdapter` and `urlKey` on the layout composable, source/table
and Saved Views. For `urlSync: false`, provide a shared explicit memory adapter
when independently created components need the same state. To reject a layout
request, inspect the event before calling `onLayoutChange`; the table keeps the
supplied layout until the host accepts it. During SSR, seed a request-local
adapter and use the same initial state on the client.

For a browser preference that does not join URL/Saved Views, use:

```ts
import { useColumnLayoutStorageState } from "@adapttable/vue";

const { layout, onLayoutChange } = useColumnLayoutStorageState({
  storageKey: "people-column-layout",
  defaultColumnLayout: { hidden: ["score"] },
});
// Bind the same column-layout prop and update:column-layout event as above.
```

`UseColumnLayoutStorageStateOptions` requires reactive `storageKey` and accepts
reactive optional `storage: LayoutStorage` and `defaultColumnLayout`.
`useColumnLayoutStorageState(options, activity?)` returns
`UseColumnLayoutStorageStateResult`: a readonly shallow `layout` ref and
`onLayoutChange`. Default browser storage is discovered and read only after
mount; unavailable storage leaves an in-memory preference. SSR and the first
hydration render use the fallback layout. Changing storage/key switches the
destination; returning to the default removes its saved entry. This controller
does not automatically merge a storage preference with a URL layout. Choose
one authoritative layout owner, or define that precedence in the host.

### View-control contracts for adapters

`ViewControlPresentation` contains resolved labels, direction, optional class
names and container. `DensityControlProps`, `FullscreenControlProps` and
`SavedViewsControlProps` add the corresponding state/actions.
`DENSITY_CONTROL`, `FULLSCREEN_CONTROL` and `SAVED_VIEWS_CONTROL` are required
feature slot keys. `FULLSCREEN_MODEL` and `SAVED_VIEWS_MODEL` publish their
models in the table's state registry.

`DensityChooserChrome(props)` requires `DensityChooserSlots.Control`, receiving
attrs, current value, localized options and `onChange`.
`FullscreenButtonChrome(props)` requires Button, receiving
`ViewControlButtonProps` with semantic attrs and label.
`SavedViewsMenuChrome(props: SavedViewsMenuChromeProps)` requires
`SavedViewsMenuSlots`: Trigger, Button, Input and Panel. It owns disclosure,
keyboard and focus state; the kit draws each control/surface.

## Composition and lifetime boundaries

Feature declarations are descriptions. The shell owns their effect scopes,
state and registrations. A feature with unchanged identity/dependencies keeps
its mounted model through unrelated row renders; removal disposes it. Use refs
or getters for documented reactive state, and replace a feature declaration
when changing ordinary callbacks/options that are not reactive inputs.
Explicit defined table options override feature patches.

Required control slots have no native fallback in the binding. A custom kit
must fill filter/editor/view-control slots and conditional table controls such
as ResizeHandle, ColumnGroupToggle, GroupRow, TreeToggle, RowDetailToggle and
RowActions. Missing required controls throw. Native factories fill these
contracts for the unstyled kit.

Component resources begin after mount, suspend during `KeepAlive` deactivation,
and end on unmount. Retained editor/confirmation/resize callbacks cannot
continue writing through a removed feature. Async host persistence and network
requests still belong to the host. SSR does not start DOM measurements,
browser listeners, lazy children or default local-storage access. Resource-backed
controls activate after mount; use identical initial rows, IDs, direction,
URL seed and responsive settings for deterministic hydration.

## Assistant and approvals

The optional native `/assistant` entry exports `TableAssistant`, `AgentApproval`,
`tableAssistant()` and `agentApproval()`, plus `TableAssistantProps` and
`AgentApprovalProps`. The native `/features` barrel also forwards these exports.
These UI entries have no dependency on `@adapttable/ai`. Use
`@adapttable/ai-vue` separately for `tableAgent`, `useTableAssistant` and
`useSpeechInput`. Read [assistant and approvals](./assistant.md) for the full
integration and try the [native assistant showcase](/vue/demo/unstyled/assistant/).

## Features together in the showcase

The [order workspace](/vue/demo/unstyled/workspace/) composes the real native
features without changing their ownership contracts. Its order desk uses
`nestedTable` to mount another `DataTable` with independent rows and columns.
`groupingPanel`, the page summary, `cellNavigation`, `findInTable`, filters,
editing and CSV export remain active on the parent table. Row selection drives
bulk actions; the independent cell range drives range export.

The local assistant opts into `@adapttable/ai-vue` and the native `/assistant`
entry. Selecting pending orders across the workspace requires approval. The result
message comes from the agent receipt after the host accepts the controlled
selection. The page explicitly identifies its scripted transport and includes no
provider SDK or model connection.

The dispatch view derives its loaded tree from shared Ready orders. Review orders
stay at the desk; Dispatched orders are complete. Stable order IDs retain the host’s
plan order through owner edits and status changes. Tree selection and sibling moves
compose with a separate pickup manifest that uses real row spans, navigation, selection,
export and a page summary. Spans are desktop geometry; mobile cards show every
field. This small demonstration makes no virtual-window or covered-cell Find
claim. The existing feature-union route retains the larger windowed regression
scenario.

Switching workspace views keeps each table's state with Vue `KeepAlive`.
Pausing the order desk deactivates its table and resumes the same view. The host
owns the data array, so an accepted edit is visible after a view switch; nothing
is written to a remote service. The binding owns independent `workspace-orders`,
`workspace-dispatch`, `workspace-manifest`, `workspace-revenue` and
`workspace-pivot` URL namespaces. The controlled `useGroupCollapseUrlState`
pairs keep independent order/revenue collapse namespaces; the page owns view, language, layout and theme
parameters and restores them on Back/Forward. The order desk also mounts the native
Saved Views menu with a unique browser-storage key. Its management panel uses the
same table-owned model for rename, reordering, default selection and deletion.
Saving captures the Orders URL namespace; applying a view leaves edited orders,
selection and other tables’ parameters intact. A stored default is considered once
on a fresh Orders link with no explicit table state. User interaction or history
navigation retires automatic application; tab changes do not reapply it.

Cell-range export is offered only while the binding reports a valid desktop
range. Cards disable that scope, and layout or query changes clear the prior
rectangle through the binding’s grid controller. A final before-export guard
rejects a stale request without creating a file. Page and all-filtered exports
remain distinct choices; row selection never masquerades as a cell range.

Chunk recovery checkpoints only host-owned authored values, stable plan IDs,
selection and detail expansion. A retry reloads only after that checkpoint is
written successfully; if storage is unavailable, it keeps the current workspace
in memory and explains how to return to another view. Pending approvals and
transient cell ranges are not replayed. Table queries and pivot configuration
are restored by the binding’s URL state, not a copied query engine.

Arabic pivot captions use shared aggregation labels and presentational column
headers derived from the unchanged pivot leaves. Region and Status captions are
localized in row and nested column dimensions; canonical field names, leaf paths,
row/column keys and serialized pivot configuration stay unchanged.
