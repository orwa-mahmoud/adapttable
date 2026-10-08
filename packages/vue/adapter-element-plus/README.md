# @adapttable/element-plus

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

AdaptTable's Vue data table with Element Plus controls and card surfaces.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/element-plus";
import "element-plus/dist/index.css";
import "@adapttable/element-plus/styles.css";

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
const rowKey = (row: Person) => row.id;
</script>

<template>
  <DataTable
    v-model:selected-ids="selectedIds"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :url-sync="false"
    selectable
  />
</template>
```

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
adapter. Pivot configuration controls are host-composed; this package does not
export a kit-specific pivot panel. Formula columns come from
`buildFormulaColumns` in `@adapttable/vue/formula`, and SVG sparkline columns
from `sparklineColumn` in `@adapttable/vue/sparkline`.

## Rendering and styling

The desktop renderer places a semantic HTML table inside `ElCard`. The mobile
renderer uses an `ElCard` for each prepared row. Sorting, selection, search and
paging controls use Element Plus components; AdaptTable's Vue binding owns the
data model, query state and host-write callbacks.

Native table rows and cells retain their semantic attributes, spans and focus
references. The table surface uses one scroll owner. Its colors and spacing use
Element Plus theme variables. Load Element Plus's dark-theme CSS variables when
using its dark theme.

`classNames` styles the named part. Compound controls follow their kit's public
attribute API:

- `ElCheckbox`: the label host owns the part and styling class. Its associated
  native input owns checked, mixed and disabled state, and receives focus.
- `ElInput`: the native input owns data attributes and its accessible name;
  the Element Plus field host owns the styling class.
- `ElSelect`: the kit host owns the styling class; its native combobox owns the
  accessible name and focus behavior.

## Filtering

```ts
import { filters } from "@adapttable/element-plus/filters";

const features = [
  filters<Person>([{ key: "name", type: "text" }], { tree: true }),
];
```

Pass `features` to `DataTable`. Use `{ mode: "drawer" }` for an Element Plus
modal drawer. `FilterField`, `ChecklistFilter` and `FilterTreeBuilder` are also
available from the filtering entry point for custom layouts over the same
binding models.

The nonmodal popup uses `ElPopover` for positioning and dialog semantics, with
an `ElCard` content body. The `filters-popover` part and
`classNames.filtersPopover` belong to that body. The drawer's `filters-panel`
part and class belong to the actual `ElDrawer` dialog root.

### Column header filters

Add `headerFilters()` alongside `filters(...)` to place an Element Plus filter
button in each configured column header:

```ts
import { filters } from "@adapttable/element-plus/filters";
import { headerFilters } from "@adapttable/element-plus/header-filters";

const features = [
  filters<Person>([{ key: "name", type: "text" }]),
  headerFilters(),
];
```

The header popup uses `ElPopover` and the same binding-owned filter fields.
`FilterHeaderControl`, `FilterHeaderRow` and `ElementHeaderFilter` are available
from the header-filter entry point for custom layouts. Compact text and range
fields use `ElInput`; single and Boolean choices use `ElSelect`; multiple choices
use `ElCheckbox` inside an `ElPopover`. Their menus portal outside the scrolling
viewport and stay inside the table root during fullscreen. Popup stacking follows
`ElConfigProvider`'s `zIndex` setting.

Pass `dir="rtl"` or `dir="ltr"` to a standalone `FilterHeaderControl` or
`FilterHeaderRow` to keep its open popup synchronized with your reactive layout.
When `dir` is omitted, the multiselect menu reads its native trigger's computed
direction each time it opens. Inherited CSS direction is not observed while the
menu stays open.

## Optional view controls

Add density and fullscreen controls only where they are needed:

```ts
import { densityChooser } from "@adapttable/element-plus/density";
import { fullscreen } from "@adapttable/element-plus/fullscreen";

const features = [densityChooser(), fullscreen()];
```

Pass `features` to `DataTable`. Density uses two visible Element Plus radio
buttons, Comfortable and Compact, with native radio-group keyboard behavior.
Their labels follow the table locale. Use `v-model:density` to keep density in
host state; a rejected request leaves the accepted choice checked. The same
toggle is available in desktop tables and mobile cards, including RTL layouts.
The fullscreen button appears only when the browser supports fullscreen; it
promotes the existing table root.

## Grouped, tree and detail rows

```ts
import { grouping } from "@adapttable/element-plus/grouping";
import { rowDetail } from "@adapttable/element-plus/row-detail";

const features = [
  grouping("score", { groupFooters: true }),
  rowDetail<Person>((person) => `Details for ${person.name}`),
];
```

Group expansion, paging and selection use Element Plus buttons and checkboxes
in both desktop and mobile layouts. Group aggregates receive the original host
rows. The `tree` entry point exports `tree`, `useTreeExpansion` and
`useLazyChildren`; expansion and loading remain in the Vue binding.

`rowDetail`, `nestedTable`, `nestedTableDetail` and `useRowExpansion` are exported
from `row-detail`. The `nested-table` entry point also exports `nestedTable`.
Supply this kit's `DataTable` in a nested renderer to keep its controls and
inherited density consistent with the parent.

## Server rendering

Use Element Plus's documented per-request `ID_INJECTION_KEY` and
`ZINDEX_INJECTION_KEY` setup, with the same seeds on the server and client.
Also inject the actual `ssrContext.teleports` payload into its reported targets
before hydration, as described in the Element Plus SSR guide. Internal select
anchors can be present in that payload even when `teleported` is false.

Element Plus 2.14.7 assigns supplied form-control IDs after mounting. Checkbox
labels therefore use their native nested-label association during server
rendering. Input accessible names remain available through `aria-label`.
Applications that use external `label[for]` associations should account for
those IDs becoming available after hydration.

[Element Plus SSR documentation](https://element-plus.org/en-US/guide/ssr.html)

### npm 10 co-installation with Popper

The packed Node harness uses npm's `--legacy-peer-deps` consumer profile.
With npm 10.9.8, Element Plus 2.14.7's declared
`@popperjs/core: npm:@sxzz/popperjs-es@^2.11.8` dependency can be collapsed
onto a co-installed real `@popperjs/core`, causing an ESM `placements` error.
For that specific resolver profile, preserve the declared vendor identity
with this consumer `package.json` override:

```json
{
  "overrides": {
    "element-plus@2.14.7": {
      "@popperjs/core": "https://registry.npmjs.org/@sxzz/popperjs-es/-/popperjs-es-2.11.8.tgz"
    }
  }
}
```

This is the official `@sxzz/popperjs-es` tarball required by Element Plus;
it does not change vendor files or replace another kit's real Popper.
The selector applies only to Element Plus 2.14.7, leaving future releases
on their own declared dependency graph.

## Row actions

```ts
import { rowActions } from "@adapttable/element-plus/row-actions";

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
server-rendering lifecycle. Actions receive the original host row. Element Plus buttons request the action;
the host performs the change. Confirmation uses `ElMessageBox`, stays inside the
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
} from "@adapttable/element-plus/rows";

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

Data-row pin controls use Element Plus row actions. Pass a ref or getter through
`pinnedRowIds` and handle `onPinnedRowIdsChange` to control their state. A rejected
request leaves the rendered pin order unchanged. Grouped and tree tables do not
support data-row pinning. Independent summary rows remain outside selection,
sorting and filtering.

Desktop summaries and extras retain native table geometry, including spans.
Mobile summaries and supplementary content use `ElCard`; their data rows keep
all fields visible. Host row classes, styles and heights apply to the actual
row or card. Individual optional entries are also available at `/row-pinning`,
`/pinned-summary-rows`, `/extra-rows` and `/row-appearance`.

## Column controls

```ts
import { type ColumnInput } from "@adapttable/element-plus";
import {
  collapsibleColumnGroups,
  fitColumns,
  multiSort,
  resizableColumns,
} from "@adapttable/element-plus/columns";

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

Column-group toggles, sort actions and resize handles use `ElButton`. Shift-click
a desktop sort heading to add another priority. Resize handles support native
pointer interaction and direction-aware Arrow keys through the shared binding.
Use `v-model:column-layout` to accept layout requests; a supplied layout remains
authoritative until the host updates it.

Mobile cards follow the accepted column layout and sort order. They omit the
desktop group and resize controls. Header groups keep their native table spans
and their localized toggle names during server rendering and hydration.

## Find in table

```ts
import { findInTable } from "@adapttable/element-plus/find-in-table";

const features = [findInTable({ button: true })];
```

Find searches the prepared rows without filtering them. Its optional toolbar
button opens an `ElInput` search field with `ElButton` previous, next and close
controls. Ctrl/Cmd+F is scoped to the active table. Enter and Shift+Enter move
between matches; Escape closes the bar and restores the preceding focus target.
The same controls and match markers work with mobile cards.

The field's `find-input` part and accessible name belong to its native input;
`classNames.findInput` styles the Element Plus host. Its focus target uses the
documented native `input`/`textarea` exposures and the binding's ref lifecycle.
`findBar` and `findButton` customize the remaining controls. Labels come from
the shared table labels. With URL synchronization enabled, the shared `find`
query restores the open bar and its value during server rendering and hydration.

## Cell navigation and status

```ts
import {
  cellNavigation,
  columnSelectionCheckbox,
} from "@adapttable/element-plus/cell-navigation";
import { selectionStats, statusBar } from "@adapttable/element-plus/status-bar";

const features = [
  cellNavigation(),
  columnSelectionCheckbox(),
  statusBar(),
  selectionStats(),
];
```

Desktop cells use the binding's direction-aware keyboard navigation and range
selection. Column selection uses `ElCheckbox`; selecting a column moves focus
into its first grid cell. Status figures use `ElText`, with selection statistics
inside a polite native `output` live region. Both status features share one strip.
Standalone aliases are available at `/column-selection` and `/selection-stats`.

Fill requires `onCellFill` and editable columns. The host receives cell edit
requests and decides whether to apply them. The pointer-only fill square uses
Element Plus theme variables; keyboard fill remains in the shared grid model.
The handle is hidden from assistive technology and does not add a tab stop.

Mobile cards show the status figures and Find controls while omitting desktop
grid selection and fill handles. `classNames.statusBar`, `statusItem`,
`selectionStats`, and `fillHandle` style their corresponding semantic parts.

## Columns menu and renaming

```ts
import { columnMenu } from "@adapttable/element-plus/column-menu";

const features = [columnMenu()];
```

The Columns button opens an Element Plus popover containing a named `ElCard`
dialog, real search and action buttons, and `ElSelect` plugin choices. Use it to
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
import { virtualize } from "@adapttable/element-plus/virtualize";

const features = [
  virtualize({ maxHeight: 360, estimateRowSize: 48, estimateCardSize: 160 }),
];
```

Windowing belongs to the Vue binding. The Element Plus renderer retains its
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
import { bulkActions } from "@adapttable/element-plus/bulk-actions";
import { print } from "@adapttable/element-plus/print";

const features = [
  bulkActions([{ key: "archive", label: "Archive", onClick: archiveRows }]),
  print(printTable, true),
];
```

Bulk selection, matching-row scope, confirmation, pending state and errors are
owned by the Vue binding. Element Plus supplies the real action buttons; the
table's confirmation handler is used when an action requests confirmation.
Controlled selection changes take effect when the host updates selected IDs.
The same action bar works with desktop tables and mobile cards.

Print calls the supplied host callback. Pass `true` as the second argument to
show the Element Plus print button; the default registers the capability without
adding a toolbar button. Importing the package root does not load either feature.

## Cell, row and batch editing

```ts
import {
  editing,
  editHistory,
  undoRedoButtons,
} from "@adapttable/element-plus/editing";
import { batchEditing } from "@adapttable/element-plus/batch-editing";

const features = [editing(saveCell), editHistory(), undoRedoButtons()];
const stagedFeatures = [batchEditing(saveRows)];
```

Mark a column `editable: true` and choose its editor: text, number, date, datetime,
time, boolean, select, multi-select, or a host custom editor. Element Plus supplies
`ElInput`, `ElSelect`, `ElCheckbox` and `ElButton`; the binding owns drafts,
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
`undoRedoButtons` adds genuine Element Plus history controls.

Editors retain server-rendered structure for hydration and retire open kit
popups and stale callbacks when their table is cached or unmounted. Importing the
package root does not activate or load editing controls.

### Commands, saved views, grouping, and row moves

The canonical `command-palette`, `context-menu`, `export`, `grouping-panel`,
`row-reorder`, `saved-views`, and `side-panel` entries fill the shared Vue feature
contracts with Element Plus controls. Import the factories from those subpaths
and pass them to `DataTable` through `features`.

```ts
import { commandPalette } from "@adapttable/element-plus/command-palette";
import { contextMenu } from "@adapttable/element-plus/context-menu";
import { exportCsv } from "@adapttable/element-plus/export";
import { groupingPanel } from "@adapttable/element-plus/grouping-panel";
import { rowReorder } from "@adapttable/element-plus/row-reorder";
import { savedViews } from "@adapttable/element-plus/saved-views";
import { sidePanel } from "@adapttable/element-plus/side-panel";
```

Command search and active items remain in the shared command model; `ElDialog`
owns the palette's modal interaction. Context menus use `ElDropdown` and
`ElDropdownItem` for native menu navigation. Both surfaces honor their table's
fullscreen container. `ElButton`, `ElInput`, `ElSelect`, `ElCheckbox`, `ElTag`,
`ElCard`, `ElProgress`, and `ElLink` render the other controls without introducing
another feature store.

Grouping chips forward drag and keyboard interactions to the shared grouping
controller. Aggregation changes use the same shared operations and host
notifications. Row reorder requests preserve host row ownership; cross-group
and tree moves use the shared confirmation model rendered through `ElDialog`.

The `saved-views` entry also exports `SavedViewsPanel` and `SavedViewsPanelProps`
for management surfaces. Rename drafts, read-only/default rules, ordering, URL
state, and storage remain owned by the shared saved-view models. `sidePanel`
retains controlled panel selection, with native buttons and a native card frame.
