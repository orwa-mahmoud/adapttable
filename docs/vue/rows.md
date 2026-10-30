# Vue column layout and row controls

Compose Vue column resizing, grouped headers, row pinning, spans, details and host-owned row actions.

These examples use `@adapttable/vue-unstyled`. Import matching feature paths
from your selected adapter so its own kit renders the controls. See
[Vue installation and providers](./getting-started.md).

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

## Row clicks

`onRowClick(row)` activates a desktop row or a phone card from a click on its
body, Enter or Space; clicks on its own buttons, links and inputs stay theirs.
The first row is the Tab stop and Arrow Up/Down move between rows. Bind it as
a prop or a listener:

```vue
<DataTable
  :data="people"
  :columns="columns"
  :row-key="(row) => row.id"
  @row-click="(row) => openPerson(row.id)"
/>
```

Activatable rows and cards carry `data-clickable`. Omit the callback and rows
stay inert. `isCellFlashing(rowId, columnKey)` marks cells with `data-flash`,
on desktop cells and on card values; see
[changed cells](./specialized.md#formulas-streams-and-sparklines).

## Explore the implementation

Use the [Vue live demo](https://adapttable.orwamahmoud.com/vue/demo/) to switch
adapters and the [Vue Feature Lab](https://adapttable.orwamahmoud.com/vue/demo/all-options/)
to compose features. The [feature index](./features.md) lists native imports and
[API reference](./api.md) documents the binding and controlled contracts.
