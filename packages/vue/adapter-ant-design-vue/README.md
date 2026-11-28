# @adapttable/ant-design-vue

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

AdaptTable's Vue data table with Ant Design Vue controls and card surfaces.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/ant-design-vue";
import { selection } from "@adapttable/ant-design-vue/selection";
import "@adapttable/ant-design-vue/styles.css";

interface Person {
  id: string;
  name: string;
  score: number;
}

const rows: Person[] = [
  { id: "ada", name: "Ada", score: 92 },
  { id: "bea", name: "Bea", score: 87 },
];
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const selectedIds = ref<string[]>([]);
function changeSelection(ids: string[]) {
  selectedIds.value = ids;
}
const rowKey = (row: Person) => row.id;
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :url-sync="false"
    :features="[selection({ selectedIds, onSelectionChange: changeSelection })]"
  />
</template>
```

## Feature imports

Import each factory from its own entry. The base `DataTable` import does not
load a feature.

```ts
import { editing } from "@adapttable/ant-design-vue/editing";
import { filters } from "@adapttable/ant-design-vue/filters";
```

The factories retain their individual signatures, native controls and
host-owned callbacks. See the [Vue feature guide](https://adapttable.orwamahmoud.com/vue/features/)
for composition and provider requirements.

## Features

- Feature composition with 41 canonical factories and focused, opt-in imports.
- Sorting, multi-sort, pagination, global search, selection and selection
  statistics, with host-controlled state.
- Filtering, custom filter types, the AND/OR filter tree and header filters.
- Cell editing, row and batch editing, dirty indicators, undo/redo and
  host-owned save callbacks.
- Column management, column groups, resizing and fit-to-width.
- Grouping and aggregation, tree data, row expansion and nested tables.
- Row reordering, row pinning, pinned summary rows, row and column spanning,
  full-width separator rows, row styling and virtualization.
- Keyboard navigation, cell ranges, Find, saved views, row actions, bulk actions,
  a command palette, context menus and side-panel view controls.
- Optional assistant and approval surfaces with host-owned transport and
  decisions.
- CSV export and host-owned print layout; PDF export and XLSX use optional
  writers supplied to the export feature.
- Pivot data, a spreadsheet formula engine and sparklines through the shared
  Vue binding's opt-in entries.
- Mobile card layouts, localized labels, RTL and server-side rendering (SSR)
  with the host setup described below.

Import `pdfWriter` from `@adapttable/vue/pdf` or `xlsxWriter` from
`@adapttable/vue/xlsx` and pass it as the `writer` option to this adapter's
`exportCsv` factory. The adapter retains its own export controls.

For pivot data, import `pivot` and `pivotTableModel` from
`@adapttable/vue/pivot` and render the prepared rows and columns with this
adapter; the `pivot` entry's `PivotPanel` edits the axes and measures with
Ant Design Vue controls. Formula columns come from
`buildFormulaColumns` in `@adapttable/vue/formula`, and SVG sparkline columns
from `sparklineColumn` in `@adapttable/vue/sparkline`.

## Rendering and styling

The desktop renderer places a semantic HTML table inside `Card`. The mobile
renderer uses a `Card` for each prepared row. Sorting, selection, search and
paging controls use Ant Design Vue components; AdaptTable's Vue binding owns the
data model, query state and host-write callbacks.

Native table rows and cells retain their semantic attributes, spans and focus
references. The table surface uses one scroll owner. Its colors and spacing use
Ant Design Vue's design tokens, read through `theme.useToken()`, so the table
follows the `ConfigProvider` theme, including its dark algorithm. Ant Design Vue
draws its own styles at runtime; only this kit's stylesheet is imported.

`classNames` styles the named part. Compound controls follow their kit's public
attribute API:

- `Checkbox`: Ant Design Vue forwards `data-*` and `aria-*` attributes to the
  native input, so the part sits on that input, which owns checked, mixed and
  disabled state and receives focus. The styling class stays on the label host.
- `Input`: the native input owns data attributes and its accessible name;
  the Ant Design Vue field host owns the styling class.
- `Select`: Ant Design Vue puts every attribute on the root element, so the kit
  host owns the part and styling class, and the kit copies the `aria-*` name
  onto the native combobox input, which owns focus behavior.

## Filtering

```ts
import { filters } from "@adapttable/ant-design-vue/filters";

const features = [
  filters<Person>([{ key: "name", type: "text" }], { tree: true }),
];
```

Pass `features` to `DataTable`. Use `{ mode: "drawer" }` for an Ant Design Vue
modal drawer. `FilterField`, `ChecklistFilter` and `FilterTreeBuilder` are also
available from the filtering entry point for custom layouts over the same
binding models.

The nonmodal popup uses `Popover` for positioning and dialog semantics, with
a dialog body. The popover has no backdrop, closes on Escape and on an
outside click, restores focus to its trigger and sets `aria-expanded` on it. The
`filters-popover` part and `classNames.filtersPopover` belong to that body. The
drawer is modal: its `filters-panel` part and class belong to the dialog panel,
Tab stays inside it, and Escape closes it. `Drawer` forwards no attributes to its
mask, so the kit marks the real mask with the `filters-backdrop` part and adds
`classNames.filtersBackdrop` to it.

### Column header filters

Add `headerFilters()` alongside `filters(...)` to place an Ant Design Vue filter
button in each configured column header:

```ts
import { filters } from "@adapttable/ant-design-vue/filters";
import { headerFilters } from "@adapttable/ant-design-vue/header-filters";

const features = [
  filters<Person>([{ key: "name", type: "text" }]),
  headerFilters(),
];
```

The header popup uses `Popover` and the same binding-owned filter fields.
`FilterHeaderControl`, `FilterHeaderRow` and `AntdHeaderFilter` are available
from the header-filter entry point for custom layouts. Compact text and range
fields use `Input`; single and Boolean choices use `Select`; multiple choices
use `Checkbox` inside a `Popover`. Their menus portal outside the scrolling
viewport and stay inside the table root during fullscreen. Popup stacking follows
`ConfigProvider`'s `zIndex` setting.

Pass `dir="rtl"` or `dir="ltr"` to a standalone `FilterHeaderControl` or
`FilterHeaderRow` to keep its open popup synchronized with your reactive layout.
When `dir` is omitted, the multiselect menu reads its native trigger's computed
direction each time it opens. Inherited CSS direction is not observed while the
menu stays open.

## Optional view controls

Add density and fullscreen controls only where they are needed:

```ts
import { densityChooser } from "@adapttable/ant-design-vue/density";
import { fullscreen } from "@adapttable/ant-design-vue/fullscreen";

const features = [densityChooser(), fullscreen()];
```

Pass `features` to `DataTable`. Density uses two visible Ant Design Vue radio
buttons, Comfortable and Compact, with native radio-group keyboard behavior.
Their labels follow the table locale. Use `v-model:density` to keep density in
host state; a rejected request leaves the accepted choice checked. The same
toggle is available in desktop tables and mobile cards, including RTL layouts.
The fullscreen button appears only when the browser supports fullscreen; it
promotes the existing table root.

## Grouped, tree and detail rows

```ts
import { grouping } from "@adapttable/ant-design-vue/grouping";
import { rowDetail } from "@adapttable/ant-design-vue/row-detail";

const features = [
  grouping("score", { groupFooters: true }),
  rowDetail<Person>((person) => `Details for ${person.name}`),
];
```

Group expansion, paging and selection use Ant Design Vue buttons and checkboxes
in both desktop and mobile layouts. Group aggregates receive the original host
rows. The `tree` entry point exports `tree`, `useTreeExpansion` and
`useLazyChildren`; expansion and loading remain in the Vue binding.

`rowDetail`, `nestedTable`, `nestedTableDetail` and `useRowExpansion` are exported
from `row-detail`. The `nested-table` entry point also exports `nestedTable`.
Supply this kit's `DataTable` in a nested renderer to keep its controls and
inherited density consistent with the parent.

## Server rendering

Collect Ant Design Vue's CSS-in-JS styles for each request and include them in
the rendered document, as described in the Ant Design Vue server-side rendering
guide, so the first paint matches the hydrated page. Popups, drawers and dialogs
render in the browser after mount, not in the server payload.

Checkbox labels use their native nested-label association during server
rendering, and input accessible names stay available through `aria-label`.
Applications that use external `label[for]` associations should confirm their IDs
after hydration.

## Ant Design Vue behavior this kit supplies

Ant Design Vue 4 leaves a few behaviors to the application. The kit adds them so
every surface meets the shared accessibility contract:

- `Menu` has no arrow-key navigation. Row actions, context menus and the
  assistant examples menu handle ArrowUp, ArrowDown, Home, End and Space
  themselves, move focus to the first item on open, and return focus to the
  trigger on Escape.
- `Drawer` has no focus trap and moves focus on open. The filter drawer and the
  assistant sheet keep Tab inside the panel, and Escape closes them.
- `Select` marks Escape as handled while its list is open, so a select inside a
  column-menu or filter popover closes its own list first and leaves the popover
  open.
- `Modal` and `Drawer` do not forward attributes. Named parts reach their real
  elements through `wrapProps`, `rootClassName` or the panel content.

### ConfigProvider limits

Ant Design Vue does not expose a public way to read the `ConfigProvider` locale,
size or direction. The kit therefore takes the table's own `labels` and `dir`
for its text and layout, and reads colors from `theme.useToken()`. Wrap the table
in `ConfigProvider` for Ant Design Vue's own components and pass `dir` to the
table for right-to-left layouts.

## Row actions

```ts
import { rowActions } from "@adapttable/ant-design-vue/row-actions";

const features = [
  rowActions<Person>([
    {
      key: "remove",
      label: "Remove",
      onClick: (person) => removePerson(person.id),
      confirm: {
        title: "Remove person?",
        message: () => "This cannot be undone.",
        confirmLabel: "Remove",
      },
    },
  ]),
];
```

Row-action controls activate after client mount, following the Vue binding's
server-rendering lifecycle. Actions receive the original host row. Ant Design Vue buttons request the action; the host
performs the change. Confirmation uses `Modal`, stays inside the
fullscreen table and uses the owning Vue app's providers. Dismissal, table
deactivation and unmount cancel that table's pending dialogs. Supply `confirm`
on `DataTable` to use your own confirmation handler.

## Pinned, summary and supplementary rows

```ts
import {
  extraRows,
  pinnedSummaryRows,
  rowAppearance,
  rowPinning,
} from "@adapttable/ant-design-vue/rows";

const features = [
  rowPinning(),
  pinnedSummaryRows<Person>({
    bottom: [{ id: "total", name: "Total", score: 179 }],
  }),
  extraRows([
    { key: "note", kind: "fullWidth", render: () => "Latest scores" },
  ]),
  rowAppearance<Person>({
    rowClassName: (person) => (person.score >= 90 ? "high-score" : undefined),
  }),
];
```

Data-row pin controls use Ant Design Vue row actions. Pass a ref or getter through
`pinnedRowIds` and handle `onPinnedRowIdsChange` to control their state. A rejected
request leaves the rendered pin order unchanged. Grouped and tree tables do not
support data-row pinning. Independent summary rows remain outside selection,
sorting and filtering.

Desktop summaries and extras retain native table geometry, including spans.
Mobile summaries and supplementary content use `Card`; their data rows keep
all fields visible. Host row classes, styles and heights apply to the actual
row or card. Individual optional entries are also available at `/row-pinning`,
`/pinned-summary-rows`, `/extra-rows` and `/row-appearance`.

## Column controls

```ts
import { type ColumnInput } from "@adapttable/ant-design-vue";
import {
  collapsibleColumnGroups,
  fitColumns,
  multiSort,
  resizableColumns,
} from "@adapttable/ant-design-vue/columns";

const columns: ColumnInput<Person>[] = [
  {
    header: "Scorecard",
    collapsedKey: "name",
    children: [
      { key: "name", sortable: true },
      { key: "score", sortable: true },
    ],
  },
];
const features = [
  collapsibleColumnGroups(),
  fitColumns(),
  multiSort(),
  resizableColumns(),
];
```

Column-group toggles, sort actions and resize handles use `Button`. Shift-click
a desktop sort heading to add another priority. Resize handles support native
pointer interaction and direction-aware Arrow keys through the shared binding.
Use `v-model:column-layout` to accept layout requests; a supplied layout remains
authoritative until the host updates it.

Mobile cards follow the accepted column layout and sort order. They omit the
desktop group and resize controls. Header groups keep their native table spans
and their localized toggle names during server rendering and hydration.

## Find in table

```ts
import { findInTable } from "@adapttable/ant-design-vue/find-in-table";

const features = [findInTable({ button: true })];
```

Find searches the prepared rows without filtering them. Its optional toolbar
button opens an `Input` search field with `Button` previous, next and close
controls. Ctrl/Cmd+F is scoped to the active table. Enter and Shift+Enter move
between matches; Escape closes the bar and restores the preceding focus target.
The same controls and match markers work with mobile cards.

The field's `find-input` part and accessible name belong to its native input;
`classNames.findInput` styles the Ant Design Vue host. Its focus target uses the
documented native `input`/`textarea` exposures and the binding's ref lifecycle.
`findBar` and `findButton` customize the remaining controls. Labels come from
the shared table labels. With URL synchronization enabled, the shared `find`
query restores the open bar and its value during server rendering and hydration.

## Cell navigation and status

```ts
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "@adapttable/ant-design-vue/cell-navigation";
import {
  selectionStats,
  statusBar,
} from "@adapttable/ant-design-vue/status-bar";

const features = [
  cellNavigation(),
  columnSelectionCheckbox(),
  statusBar(),
  selectionStats(),
];
```

Desktop cells use the binding's direction-aware keyboard navigation and range
selection. Column selection uses `Checkbox`; selecting a column moves focus
into its first grid cell. Status figures use `Typography.Text`, with selection
statistics inside a polite native `output` live region. Both status features share one strip.
Standalone aliases are available at `/column-selection` and `/selection-stats`.

Fill requires `cellNavigation({ onFill })` and editable columns. The host receives cell edit
requests and decides whether to apply them. The pointer-only fill square uses
Ant Design Vue theme variables; keyboard fill remains in the shared grid model.
The handle is hidden from assistive technology and does not add a tab stop.

Mobile cards show the status figures and Find controls while omitting desktop
grid selection and fill handles. `classNames.statusBar`, `statusItem`,
`selectionStats`, and `fillHandle` style their corresponding semantic parts.

## Columns menu and renaming

```ts
import { columnMenu } from "@adapttable/ant-design-vue/column-menu";

const features = [columnMenu()];
```

The Columns button opens an Ant Design Vue popover containing a named `Card`
dialog, real search and action buttons, and `Select` plugin choices. Use it to
show, hide, pin, reorder, resize or rename supported columns. Columns marked
`renameable: true` also receive a direct header rename action. Menu and header
renaming share the binding's validation, announcements and host callbacks.

Use `v-model:column-layout` to accept controlled layout changes. Until the host
updates the supplied layout, rejected pin, visibility and rename requests leave
the rendered columns unchanged. Renaming changes the display name, not the row
field key. The same Columns menu is available with mobile cards.

The real card content owns the panel part, id, accessible dialog name and native
ref. A documented virtual positioning reference lets the binding retain the
actual trigger's ARIA relationship and events. Nested choice popups attach beside
the scrolling card body, retaining its direction and dismissal boundary. The
managed panel follows its supplied container, including fullscreen containers.
The generic `ColumnMenu` component and `ColumnMenuSlotProps` are also exported
for headless compositions.

## Windowed rows and individual feature entries

```ts
import { virtualize } from "@adapttable/ant-design-vue/virtualize";

const features = [
  virtualize({ maxHeight: 360, estimateRowSize: 48, estimateCardSize: 160 }),
];
```

Windowing belongs to the Vue binding. The Ant Design Vue renderer retains its
single native scroll viewport, semantic table spacer rows and kit mobile cards.
It does not run a second table or virtualization engine. Omit the feature to
render every row in the current source scope.

Column features are available individually at `/column-groups`, `/fit-columns`,
`/multi-sort` and `/resizable-columns`, as well as through `/columns`.
`FilterHeaderControl` and `FilterHeaderRow` are available from the package root
and `/header-filters`; both routes retain the same component identities and
row-generic contracts.

## Bulk actions and print

```ts
import { bulkActions } from "@adapttable/ant-design-vue/bulk-actions";
import { print } from "@adapttable/ant-design-vue/print";

const features = [
  bulkActions([{ key: "archive", label: "Archive", onClick: archiveRows }]),
  print(printTable, true),
];
```

Bulk selection, matching-row scope, confirmation, pending state and errors are
owned by the Vue binding. Ant Design Vue supplies the real action buttons; the
table's confirmation handler is used when an action requests confirmation.
Controlled selection changes take effect when the host updates selected IDs.
The same action bar works with desktop tables and mobile cards.

Print calls the supplied host callback. Pass `true` as the second argument to
show the Ant Design Vue print button; the default registers the capability without
adding a toolbar button. Importing the package root does not load either feature.

## Cell, row and batch editing

```ts
import {
  editing,
  editHistory,
  undoRedoButtons,
} from "@adapttable/ant-design-vue/editing";
import { batchEditing } from "@adapttable/ant-design-vue/batch-editing";

const features = [editing(saveCell), editHistory(), undoRedoButtons()];
const stagedFeatures = [batchEditing(saveRows)];
```

Mark a column `editable: true` and choose its editor: text, number, date, datetime,
time, boolean, select, multi-select, or a host custom editor. Ant Design Vue supplies
`Input`, `Select`, `Checkbox` and `Button`; the binding owns drafts,
validation, parsing, save state, conflicts and host callbacks. The table never
mutates host rows.

Double-click a cell or press F2 to edit. Enter commits a cell; Escape cancels and
returns focus to its activation button. An open select consumes its own first
Escape, preserving the outer edit. Moving focus within a select does not save the
cell. The native input or the kit's supported focus method receives focus.

`rowEditing(saveRow)` provides row Save and Cancel buttons. `batchEditing(saveRows)`
keeps changes staged until the batch Save action. Both modes also work in mobile
cards. Failed host saves retain the shared error and retry/rollback behavior.
Custom editors receive the binding's guarded draft, keyboard and focus contract.
Compose `editing` with `editHistory` when row or batch history needs cell replay;
`undoRedoButtons` adds genuine Ant Design Vue history controls.

Editors retain server-rendered structure for hydration and retire open kit
popups and stale callbacks when their table is cached or unmounted. Importing the
package root does not activate or load editing controls.

### Commands, saved views, grouping, and row moves

The canonical `command-palette`, `context-menu`, `export`, `grouping-panel`,
`row-reorder`, `saved-views`, and `side-panel` entries fill the shared Vue feature
contracts with Ant Design Vue controls. Import the factories from those subpaths
and pass them to `DataTable` through `features`.

```ts
import { commandPalette } from "@adapttable/ant-design-vue/command-palette";
import { contextMenu } from "@adapttable/ant-design-vue/context-menu";
import { exportCsv } from "@adapttable/ant-design-vue/export";
import { groupingPanel } from "@adapttable/ant-design-vue/grouping-panel";
import { rowReorder } from "@adapttable/ant-design-vue/row-reorder";
import { savedViews } from "@adapttable/ant-design-vue/saved-views";
import { sidePanel } from "@adapttable/ant-design-vue/side-panel";
```

Command search and active items remain in the shared command model; `Modal`
owns the palette's modal interaction. Context menus use `Dropdown` and
`Menu item` for native menu navigation. Both surfaces honor their table's
fullscreen container. `Button`, `Input`, `Select`, `Checkbox`, `Tag`,
`Card`, `Progress`, and `Typography.Link` render the other controls without introducing
another feature store.

Grouping chips forward drag and keyboard interactions to the shared grouping
controller. Aggregation changes use the same shared operations and host
notifications. Row reorder requests preserve host row ownership; cross-group
and tree moves use the shared confirmation model rendered through `Modal`.

The `saved-views` entry also exports `SavedViewsPanel` and `SavedViewsPanelProps`
for management surfaces. Rename drafts, read-only/default rules, ordering, URL
state, and storage remain owned by the shared saved-view models. `sidePanel`
retains controlled panel selection, with native buttons and a native card frame.

### Optional assistant and pivot controls

The `assistant` entry provides `TableAssistant`, `AgentApproval`,
`tableAssistant()`, and `agentApproval()` using the binding's conversation and
approval contracts. Its sheet is a `Drawer`, examples use `Dropdown`, the
composer is an `Input` textarea, and speech language choices use `Select`.
It does not import an AI transport or own approval decisions. The `pivot` entry
provides a controlled `PivotPanel` with `Select` and `Button` controls.
