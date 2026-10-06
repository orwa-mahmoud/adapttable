# Vue specialized data views

These packages are experimental and unreleased. Use a checkout or built workspace
packages until they are available on npm.

The Vue Unstyled adapter provides native controls for grouping configuration,
row reordering and pivot configuration. The optional Vue entries use the same
framework-neutral formula, pivot, stream, sparkline, reorder and virtualization
models as the other bindings.

## Rows and columns in a window

Import `virtualize` from `@adapttable/vue-unstyled/virtualize` and include
`virtualize({ maxHeight: 360, virtualizeColumns: true })` in the table's features.
Omit `maxHeight` for page scrolling. `estimateRowSize`, `estimateCardSize`,
`virtualOverscan` and `virtualScrollMargin` control the initial measurements.
The window retains source row identity and the complete logical body model;
its mounted subset does not become the selection or keyboard-navigation dataset.

Desktop detail panels are measured together with their data row. Mobile cards
measure the entire card, including its expanded content. Pinned rows and summaries
remain outside the row window. Groups, tree entries and host extra rows retain
their structural positions. Horizontal spacers use logical start/end placement
and the neutral column viewport model supports RTL scrolling.

A flat paged table is already bounded by its page and does not window its rows.
An expanded group or tree may still window. A body containing a row span keeps
all rows mounted so a span's owner is never dropped. Column spans or row spans
keep all columns mounted for the same reason. These are deliberate geometry
fallbacks. Feature removal and KeepAlive suspension release observers and scroll
listeners. A body can be rendered on the server without starting those resources.

## Host-owned row moves

Import `rowReorder` from `@adapttable/vue-unstyled/row-reorder` and pass
`rowReorder((from, to, row) => updateRows(from, to, row))`. The host decides whether
to replace its array. The controls never mutate the host's rows.

Desktop handles support pointer drag and Space/arrow/Space keyboard moves. Mobile
cards offer native move-up/down buttons. A nested destination menu supports group
and tree moves under the neutral move policy. The default cross-boundary policy
is `never`; `confirm` opens a native confirmation dialog unless the host supplies
its own confirmation callback. The dialog focuses Cancel, Escape cancels the
decision, and completion returns focus to the live destination control. `onGroupMove` and `onTreeMove` own the resulting
writes. Pending asynchronous decisions and retained controls are canceled when
their feature owner ends or its source session changes. Flat moves resolve row IDs
back to the host data order; grouped/tree moves retain their sibling-position
contract. A pinned visual position is never used as a host array index.

## Group and pivot configuration

`groupingPanel` from `@adapttable/vue-unstyled/grouping-panel` composes ordinary
grouping with a native configuration strip. Chips expose keyboard reordering,
removal and drag targets. The aggregation picker offers only operations allowed
by the column and source. Restore defaults preserves the host's declared model.
Labels use the table's resolved locale, including RTL keyboard direction.
Removing the final aggregation focuses its native checkbox so keyboard users can
choose another calculation.

The table's `classNames` accepts `groupingPanel`, `groupingItem`, `groupingChip`,
`groupingChipHandle`, `groupingChipRemove`, `groupingDropZone`, `groupingRemoveZone`
and `groupingAdd`. Aggregation hooks are `groupingAggregations`,
`groupingAggregationItem`, `groupingAggregationOperation`,
`groupingAggregationRemove`, `groupingAggregationAdd` and
`groupingAggregationsRestore`. Reorder hooks are `reorderHeader`, `reorderCell`,
`rowReorderHandle`, `rowReorderButtons`, `rowReorderUp` and `rowReorderDown`.
`virtualSpacer` styles the row-window spacers; `cardDetail` styles expanded
mobile details.

`PivotPanel` is exported from `@adapttable/vue-unstyled/pivot`; `pivot`,
`pivotTableModel` and `usePivotUrlState` come from `@adapttable/vue/pivot`. The panel is controlled: `onChange(next)` requests
a configuration change, and the host must pass the accepted `config` back. Native
selects and buttons carry localized labels. The pivot table model yields ordinary
Vue columns, stable row keys and optional `pinnedRows` for the grand total. Pass
that last field to `pinnedSummaryRows` when composing the rendered table.

`usePivotUrlState` serializes configuration and collapsed group keys into one URL
slice. Adjacent configuration/collapse updates preserve each other. Changing the
adapter or namespace replaces the subscription rather than borrowing another
table's state. Saved Views may capture this same URL slice.

## Formulas, streams and sparklines

`buildFormulaColumns` and `useFormulaUrlState` from `/formula` use the neutral
formula grammar. Parser errors and dependency cycles remain explicit result
fields. Formula text is serialized as data; importing or restoring a formula does
not execute JavaScript. Sorting and export use the neutral numeric/text result.

`useRowPatchStream` from `/stream` passes an updater to the host's `onPatch` callback.
It accepts WebSocket or EventSource transport, custom frame parsing and an optional
reconnect policy. Callback replacement does not reconnect a healthy socket.
Endpoint or transport replacement closes the previous stream. Component mounting
opens it, KeepAlive suspension closes it, activation reconnects it, and explicit
`close()` keeps it closed for the remainder of that composable's lifetime.

`Sparkline` and `sparklineColumn` from `/sparkline` render line, bar or area SVGs
using neutral geometry. Each chart has an accessible name and title. Non-finite
values are removed before drawing, and sort/export read the numbers rather than
the SVG. Supply a `label` when a domain-specific or translated summary is needed.

## Compose a specialized view

```ts
import type { ColumnDef } from "@adapttable/vue-unstyled";
import { groupingPanel } from "@adapttable/vue-unstyled/grouping-panel";
import { sparklineColumn } from "@adapttable/vue/sparkline";
import { virtualize } from "@adapttable/vue-unstyled/virtualize";

interface Sale {
  id: string;
  team: string;
  history: readonly number[];
}

const columns: readonly ColumnDef<Sale>[] = [
  { key: "team", header: "Team", groupable: true },
  sparklineColumn<Sale>({
    key: "history",
    header: "Trend",
    values: (row) => row.history,
    label: () => "Sales trend",
  }),
];
const features = [
  virtualize({ maxHeight: 360, virtualizeColumns: true }),
  groupingPanel<Sale>(["team"]),
];
```

## Reusing the reorder and grouping contracts in a kit

`useRowReorder(input)` from `@adapttable/vue/features` takes a ref/getter of the
neutral `RowReorderControllerOptions<TRow>` and returns
`ComputedRef<VueRowReorderModel<TRow>>`. Call it during setup. The model holds the
current snapshot, session-bound controller actions, `rowAttrs` and
`ownsPending(row)`. Component suspension disables the model and cancels its
pending interaction. The host supplies the write and authoritative row order.

```ts
import { resolveLabels } from "@adapttable/vue/adapter";
import type { RowReorderHandler } from "@adapttable/vue";
import { useRowReorder } from "@adapttable/vue";
import { type MaybeRefOrGetter, toValue } from "vue";

interface Person {
  id: string;
  name: string;
}

export function usePeopleRowMoves(
  rows: MaybeRefOrGetter<readonly Person[]>,
  onMove: RowReorderHandler<Person>
) {
  const model = useRowReorder<Person>(() => ({
    enabled: true,
    session: toValue(rows),
    rowAt: (index) => toValue(rows)[index],
    getRowId: (row) => row.id,
    getRowIndex: (row) => {
      const index = toValue(rows).findIndex((item) => item.id === row.id);
      return index < 0 ? undefined : index;
    },
    labels: resolveLabels(undefined),
    onRowReorder: onMove,
  }));
  return {
    model,
    rowAttrs: (row: Person, index: number) =>
      model.value.rowAttrs(row.id, index, row, 0),
  };
}
```

This flat-row example treats each replacement array as a new interaction
session. A kit supporting grouped or tree moves also supplies the controller's
move policy, destinations and confirmation callbacks. For visible controls,
`RowReorderChrome` takes `RowReorderControlProps<TRow>` and all three required
`RowReorderControlSlots`: Handle, Button and Menu. Use its model's snapshot for
the localized announcement, and forward each control's supplied handlers.

Grouping uses one feature-owned controller and a required panel fill. The
following adapter factory accepts the kit's complete typed control set:

```ts
import { extendFeature, slotRender } from "@adapttable/vue/adapter";
import { groupingPanel } from "@adapttable/vue/features";
import {
  GroupingPanelChrome,
  groupingPanelControlKey,
} from "@adapttable/vue/adapter";
import type { GroupingPanelSlots } from "@adapttable/vue/adapter";
import type { TableFeature } from "@adapttable/vue";

export function kitGroupingPanel<TRow>(
  slots: GroupingPanelSlots
): TableFeature<TRow> {
  return extendFeature(groupingPanel<TRow>(), [
    slotRender(groupingPanelControlKey<TRow>(), (props) =>
      GroupingPanelChrome({ ...props, slots })
    ),
  ]);
}
```

`GroupingPanelSlots` requires Surface, DropZone, Chip, Select, RemoveZone,
AggregationItem, AggregationRemove, AggregationPicker and AggregationRestore.
These controls receive localized labels and model actions. Forward their refs,
keyboard and drag handlers to the actual control elements. The slot's
`GroupingPanelProps<TRow>` supplies state, columns, labels, mobile layout and
text direction; custom kits also keep their ordinary grouped-row controls.
The panel does not create a second grouping or aggregation model.

`BodyWindowModel<TRow>` exposes a rendered projection, the complete logical
rows, and `scrollToRow(rowId)` / `scrollToColumn(columnKey)` actions. Obtain the
current model with `bodyWindowModelKey<TRow>()` when implementing a shell.
The projection algorithms themselves are implementation details; compose the
public `virtualize(options)` feature to own measurements and subscriptions.

### Typed state channels for a custom shell

`rowReorderModelKey<TRow>()` returns the table-local state key for
`VueRowReorderModel<TRow>`. `rowReorderControlKey<TRow>()` is the single control
slot carrying `RowReorderControlProps<TRow>`: row move context, the current
model, resolved labels, `mobile` and optional class names. Both are exported
by `@adapttable/vue/features` and `/adapter`. The shell reads the model and
supplies the current row context; the kit fills the control key with
`RowReorderChrome` and its required Handle, Button and Menu controls.

`groupingPanelModelKey<TRow>()` is the corresponding state key for
`GroupingPanelProps<TRow>`. Read it from the same registry when placing a panel
in a custom shell. Fill `groupingPanelControlKey<TRow>()`, as shown above, to
render that model with the kit's controls. Both grouping keys are available
from `/adapter`. The returned state refs can be undefined
before a feature mounts or after its owner is removed; reading a key alone
does not install grouping, reorder or virtualization.

### Pivot and formula result types

`PivotPanelProps` from `@adapttable/vue-unstyled/pivot` is
`Omit<PivotPanelChromeProps, "slots">`: required `fields`, `config` and
`onChange(next)`, with optional `labels` and `className`. The native panel
supplies the slots. A different kit uses `PivotPanelChrome` from
`@adapttable/vue/adapter` with all five `PivotPanelSlots`: Surface, Zone, Field,
Add and Agg. The Agg slot receives `VuePivotAggProps`, extending the neutral
`PivotAggProps` with localized `optionLabels: Readonly<Record<AggregateName,
string>>`. Use those labels for the supplied aggregation `options`; pass a
selected operation to `onChange` rather than changing `config` in place.

`buildFormulaColumns<TRow extends object>(specs)` returns
`VueFormulaColumnsResult<TRow>` from `@adapttable/vue/formula`, also re-exported
by the native `/formula` entry. It retains the neutral `FormulaColumnsResult` fields `errors` (parser messages
by column key) and `cycles` (keys involved in dependency cycles), but its `columns` are
`readonly ColumnDef<TRow>[]` with Vue-compatible string headers. Inspect both
error and cycle fields before combining those columns with the table's ordinary
columns. The [formula grammar](../formulas.md) describes expressions and
failure reporting; the Vue result type determines what can be rendered here.
