# Vue navigation, find and status

The Vue binding and Unstyled adapter expose optional cell navigation, column selection, find and status controls. The packages are experimental and unreleased.

```vue
<script setup lang="ts">
import { DataTable, type ColumnDef } from "@adapttable/vue-unstyled";
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "@adapttable/vue-unstyled/cell-navigation";
import { findInTable } from "@adapttable/vue-unstyled/find-in-table";
import { selectionStats, statusBar } from "@adapttable/vue-unstyled/status-bar";

interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: Row[] = [
  { id: "ada", name: "Ada", score: 10 },
  { id: "grace", name: "Grace", score: 30 },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name" },
  { key: "score", header: "Score", editable: true, parseValue: Number },
];
const features = [
  cellNavigation({ onRangeChange: (range) => console.log(range) }),
  columnSelectionCheckbox(),
  findInTable({ button: true }),
  selectionStats(),
  statusBar(),
];
</script>
<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
  />
</template>
```

Cell navigation turns the desktop table into one keyboard tab stop. Arrow keys move through cells; Shift extends a rectangle. Home, End, Page Up and Page Down follow the shared grid model. Horizontal movement follows the table's text direction. Inputs, buttons, inline editors and composition events retain their own keys. Enter or F2 on a grid cell opens its composed editor.

A column checkbox selects exactly that column across loaded data rows. Its label names the column. It stays visible for touch input and for selected columns; on a pointer that can hover, it appears on hover or focus. Checkbox interaction does not also sort the header.

`onRangeChange` receives a multi-cell rectangle or `null` for a single focused cell. Coordinates count data rows and visible columns; group headings, detail rows, extra rows and independent summaries are not selectable grid records. The same projected data-row order drives navigation, find and statistics, including expanded tree children and pinned data rows. When composed with `virtualize`, the native table reveals the logical row and column and focuses the cell after its DOM window mounts.

Navigation and clipboard operations cover loaded data. They do not fetch unseen server rows. The binding’s grid state accepts explicit valid focus addresses. Automatic focus recovery after removing the focused row or column is not yet implemented. Cell ranges are transient interaction state and are not saved in URLs or Saved Views.

## Host-owned clipboard and fill

Copy writes the selected rectangle as tab-separated values. Cut calls `onCellCut` only after the clipboard accepts the copy. Paste proposes ordinary `CellEdit<Row>[]` through `onCellPaste`, or the composed inline-edit callback. The fill handle and Ctrl/Cmd+D use `onCellFill`, with the same inline-edit fallback. The table never changes the host's records itself.

Clipboard and fill text use each column's `parseValue`; a numeric editor alone does not define clipboard parsing. Compose edit history with an inline replay callback to record a paste or fill as one undo gesture. Clipboard permission failures are announced through the grid's localized live region. A pending clipboard result is discarded if its address space or active lifetime changes; replacing equivalent array wrappers preserves the operation and uses current host callbacks.

## Find and persistent state

`findInTable()` adds Ctrl/Cmd+F within the table and a search bar. The native option `{ button: true }` also adds a toolbar button. The browser's shortcut remains available outside the table. Enter advances, Shift+Enter goes back, and Escape closes the bar. Typing retains input focus; matching cells are marked in both desktop tables and mobile cards.

For merged cells, navigation skips covered addresses. Find still compares the underlying logical column values, so text covered by a row or column span can match without a separate visible cell to highlight or focus.

The query uses the existing `find` URL parameter and the table's `urlKey` namespace. It participates in Saved Views. Pending text is flushed before a view is captured, when the find scope is suspended, and on disposal. Replacing a URL adapter or namespace sends any pending query to its original destination before adopting the replacement's state. Standalone consumers of `useFindInTable` receive `{ state, flush }` for the same explicit synchronization.

## Status and adapter slots

`statusBar()` shows the source's row range and selected-row count. `selectionStats()` formats count, sum, average, minimum and maximum for the selected cells. Composing both renders one strip. Number formatting uses `locale`; labels use the existing locale packs. Mobile cards keep find and row-status controls, while desktop keyboard-grid and column-checkbox affordances are absent.

The binding entries expose UI-free models and structural Chrome. Adapter implementations supply every visible search field, button, checkbox, fill handle and status element through required typed slots. There is no native fallback in the binding. Native controls belong to `@adapttable/vue-unstyled`.

The stable parts include `column-select`, `find-bar`, `find-input`, `find-count`, `find-previous`, `find-next`, `find-close`, `find-button`, `fill-handle-anchor`, `fill-handle`, `grid-focus-announcer`, `status-bar`, `status-item`, `selection-stats` and `selection-stat`. Native class hooks include `columnSelect`, `findBar`, `findInput`, `findButton`, `fillHandle`, `statusBar`, `statusItem` and `selectionStats`.

## A grid model for a custom Vue adapter

`useGridFocus<TRow>(input, activity?)` accepts a ref or getter of
`UseGridFocusOptions<TRow>` and returns `ComputedRef<GridFocusState>`. Create it in
component setup or an active effect scope. Its own component lifetime and the
optional `ExternalStoreOptions.active` guard both have to be active before it
handles input. Supply logical loaded rows and all visible columns, including
columns temporarily outside a horizontal render window.

```ts
import type { ColumnDef } from "@adapttable/vue";
import { useGridFocus } from "@adapttable/vue";
import { type MaybeRefOrGetter, toValue } from "vue";

interface Person {
  id: string;
  name: string;
}

export function usePeopleGrid(
  rows: MaybeRefOrGetter<readonly Person[]>,
  columns: readonly ColumnDef<Person>[]
) {
  const focus = useGridFocus<Person>(() => ({
    enabled: true,
    rows: toValue(rows),
    rowCount: toValue(rows).length,
    columns,
    getRowId: (row) => row.id,
    firstRowIndex: 0,
  }));
  return {
    focus,
    gridAttrs: () => focus.value.getGridProps(),
    rowAttrs: (index: number) => focus.value.getRowPropsAt(index),
    cellAttrs: (row: number, column: number) =>
      focus.value.getCellPropsAt(row, column),
  };
}
```

Bind each returned attribute object to the real grid, row or cell, including its
ref and event handlers. The example is an unwindowed flat grid. A virtual adapter
also supplies row/column reveal callbacks and the correct coordinate origin;
a grouped/tree adapter uses its projected data-row order. `reportRange` reports
the normalized multi-cell rectangle; a single focused cell reports `null`.

`@adapttable/vue/adapter` exposes the corresponding Chrome and slot types.
`FindBarSlots` requires Search and Button, `ColumnSelectSlots` requires Checkbox,
`FillHandleSlots` requires Handle, and `SelectionStatsSlots` requires Stats.
`StatusBarSlots` requires Bar plus its nested stats slots. Supply the kit's
controls and forward the supplied labels, attributes and callbacks. The grid
announcer is structural and needs no visible-control slot.

`useFindInTable(input, activity?)` takes a ref/getter of `UseFindInTableOptions`,
including rows, columns and a URL adapter, and returns a computed `state` plus
`flush()`. Its `state` is the model accepted by `FindBarChrome`. Keep these
composables owned by the table scope instead of recreating them in render calls.

### Connect a custom shell to navigation state

`GRID_FOCUS_MODEL` from `@adapttable/vue/adapter` identifies the current
`GridFocusState`. `FIND_MODEL` from `/adapter` identifies the current
`FindInTableState`. `SELECTION_STATS_MODEL` from `/selection-stats` or
`/status-bar` identifies `SelectionStats | null`. The three keys are also
available from `/adapter`. Read them through the table's feature state registry
and keep the returned refs live; absence means the corresponding feature has
not published a model. These channels do not create controllers or fetch data.

Use `slotRender` with the following `/adapter` control keys when building a kit:

- `FIND_BUTTON` is a single toolbar fill. Its
  `FindButtonControlProps` contains `label`, `onClick` and optional `className`.
  Render the kit's button and call that action to open the existing find model.
- `FILL_HANDLE_CONTROL` receives
  `FillHandleCellSlotProps<GridFocusState>` plus optional `firstRowIndex` and
  `className`. It places the fill affordance for the selected logical cell;
  pass its input and the kit's required Handle slot to `FillHandleChrome`.
- `GRID_ANNOUNCER` receives `GridFocusAnnouncerSlotProps<GridFocusState>` and is
  a single structural fill for `GridFocusAnnouncer`. It supplies the existing
  grid model's localized live announcement, with no visible control to theme.

The binding `cellNavigation()` feature already installs its structural
announcer. Add only the missing kit controls when extending that feature;
creating another live region or another grid model would duplicate its work.
See the [action-control example](./actions.md#build-action-controls-for-another-vue-kit)
for the same `extendFeature` and `slotRender` pattern.
