# @adapttable/naive-ui

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

Naive UI controls for the AdaptTable Vue binding. AdaptTable owns table state,
feature composition and semantic table structure. Naive UI supplies the visible
controls and their styling.

Import the adapter stylesheet alongside the component:

```ts
import { DataTable } from "@adapttable/naive-ui";
import "@adapttable/naive-ui/styles.css";
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

## Table rendering

The desktop renderer uses Naive UI's `NTable`, `NThead`, `NTbody`, `NTr`, `NTh`
and `NTd` primitives. The mobile renderer uses `NCard`. Their public slots keep
attributes, native element refs, ARIA metadata and prepared cell spans on the
actual semantic targets. Naive UI supplies the table/card theme and controls.

The renderer consumes the Vue binding's prepared models. It does not ask
`NDataTable` to sort, filter, paginate, select, expand or virtualize rows again.
`NDataTable`'s `remote`, `rowProps` and `cellProps` APIs do not expose its private
table, header-row or header-cell targets, and its virtual modes restrict spans.
The semantic primitives avoid those limitations without private DOM changes.

`DataTable` uses the binding's optional outer layout for search, status, loading
and pagination. Applications composing a custom shell can use the desktop and
mobile renderers directly, or use the headless Vue binding with their own
presentation.

The adapter uses the following public Naive UI APIs:

- `NButton` renders action controls. Its `attrType` forwards native button types.
- `NCheckbox` exposes its focusable `role="checkbox"` root. Controlled `checked`
  and `indeterminate` values come from AdaptTable; one `update:checked` event
  requests one selection toggle.
- `NInput.inputProps` sends IDs, accessible names, part markers and classes to
  the actual input. Value changes use `update:value`.
- `NSelect` is a compound control. Its part marker and class are on the component
  host; `inputProps` supplies the accessible name of its filtering input. Its
  menu stays inside the table with `to=false`, including in fullscreen mode.

The density and fullscreen features are separate imports:

```ts
import { densityChooser } from "@adapttable/naive-ui/density";
import { fullscreen } from "@adapttable/naive-ui/fullscreen";

const features = [densityChooser(), fullscreen()];
```

## Filtering

Import filter contributions only where they are used:

```ts
import { filters } from "@adapttable/naive-ui/filters";
import { headerFilters } from "@adapttable/naive-ui/header-filters";

interface Person {
  name: string;
}
const features = [
  filters<Person>([{ key: "name", type: "text" }], { tree: true }),
  headerFilters(),
];
```

Filter fields use Naive inputs, selects and checkboxes. The advanced builder
uses a controlled Naive collapse with a native Naive button as its keyboard
trigger. Filter values, option loading, checklist windows and recursive writes
remain owned by the Vue binding. Standalone `ChecklistFilter`,
`FilterTreeBuilder`, `FilterHeaderControl` and `FilterHeaderRow` components use
the same generic row contracts.

The popover uses Naive's public manual coordinates, placement, portal and
outside-click APIs. Drawer mode retains Naive's mask, focus trap and scroll
lock. Escape first dismisses an open nested select, then the filter surface.
The drawer mask boundary below also applies to filtering.

## Editing and grouping

The proposed `editing`, `batch-editing` and `grouping` subpaths add opt-in
controls. Cell, row and batch editing use `NInput`, `NInputNumber`, `NCheckbox`
and `NSelect`; Save, Cancel, conflict resolution, rollback, Undo and Redo use
`NButton`. Group collapse, paging and selection fill the shared group chrome
with Naive buttons and checkboxes on desktop and cards.

```ts
import {
  editing,
  editHistory,
  dirtyIndicators,
  undoRedoButtons,
} from "@adapttable/naive-ui/editing";

const features = [
  editing<Person>((row, columnKey, value) => {
    // Update your authoritative data here.
  }),
  editHistory(),
  dirtyIndicators(),
  undoRedoButtons(),
];
```

Validation, raw drafts, pending saves, conflicts, history and stale callback
ownership remain in the Vue binding. Row editing saves through Save or Enter;
batch editing requires its explicit Save. Blur keeps staged drafts. History with
row or batch editing also needs an `editing()` callback to
replay values. Custom editors receive the binding's existing editor contract.

Numeric inputs use the public `inputProps` and `format` APIs so the binding's
raw draft survives vendor blur formatting. Numeric and choice editor refs
resolve `input[role="spinbutton"]` and `input[role="combobox"]` beneath Vue's
public `$el`; the roles are supplied through `inputProps`. Editing part markers,
validation ARIA attributes and class hooks land on these native inputs. This
editing select differs from the general compound-select host contract above.
An open select owns its navigation, selection and first Escape; a second Escape
cancels the edit and restores the activation button's focus.

## Compatibility

This package targets Vue 3.5 and Naive UI 2.45.3. The package is prepared for an
initial 0.1.0 release. Registry publication is a separate release step.

## Native control refs

Button, checkbox, table and card refs resolve their semantic root through Vue's
public `$el`. Adding or removing a callback keeps the same native element and
its focus. A public component option that replaces the root, such as
`NButton.tag`, releases the old target before supplying its replacement.

Input refs use the `inputElRef` and `textareaElRef` fields in Naive UI 2.45.3's
exported `InputInst` type. These return the actual input or textarea, including
when the control changes between those two shapes.

Naive UI's exported `SelectInst` exposes focus methods but no native-element
ref. Its `inputProps.ref` is replaced by its own internal template ref. The
adapter therefore performs a read-only lookup beneath Vue's public `$el` host
for `input[role="combobox"]`; that role reaches the actual filtering input
through the public `inputProps` API. This is a tested DOM-target bridge for
Naive UI 2.45.3, not an exposed `SelectInst` native-ref API. It does not read
private component state or change rendered attributes.

Replacing a callback, replacing its native target, removing the callback, or
unmounting the control releases the previous target with `null` before handing
over the next target. The select's part marker and classes remain on its
compound host.

## Server rendering

Use Naive UI's CSS-render SSR integration on the server. Install
`@css-render/vue3-ssr` and collect the component styles after rendering:

```ts
import { setup } from "@css-render/vue3-ssr";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

const app = createSSRApp(App);
const { collect } = setup(app);
const html = await renderToString(app);
const styles = collect();
```

Include `styles` in the document head and hydrate `html` with the matching
client app. This is required by Naive UI's floating controls as well as its
stylesheet collection.

## Naive UI drawer mask boundary

Naive UI 2.45.3 keeps its decorative drawer mask internal. It exposes no public
mask attribute, class or theme-color hook. The vendor focus trap requires this
mask to remain enabled. Consequently, the mask cannot receive the shared
`data-adapttable-part="filters-backdrop"` marker or `filtersBackdrop` class hook
through supported Naive UI APIs. The public dialog and content targets remain
customizable.

## Component documentation

- [Naive UI table primitives](https://www.naiveui.com/en-US/os-theme/components/table)
- [Naive UI button](https://www.naiveui.com/en-US/os-theme/components/button)
- [Naive UI checkbox](https://www.naiveui.com/en-US/os-theme/components/checkbox)
- [Naive UI input](https://www.naiveui.com/en-US/os-theme/components/input)
- [Naive UI select](https://www.naiveui.com/en-US/os-theme/components/select)
- [Naive UI license](https://github.com/tusen-ai/naive-ui/blob/main/LICENSE)

## License

MIT.

## Navigation and utility controls

Opt in through `bulk-actions`, `cell-navigation`, `export`, `find-in-table`,
`print`, `selection-stats`, and `status-bar`. The `cell-navigation` entry also
exports `columnSelectionCheckbox`; `status-bar` also exports `selectionStats`.

Naive buttons, checkboxes, inputs, text, cards and progress indicators render
the controls. The Vue binding owns selection ranges, find matches, action
requests and export jobs. Printing and data changes remain host callbacks.
Find and utility controls work in mobile cards; cell ranges and fill handles
are desktop-grid features.

## Command and context surfaces

Import `commandPalette` from `command-palette` and `contextMenu` from
`context-menu`. The command palette uses native Naive inputs and buttons
inside an `NModal` and `NCard`; native modal focus and dismissal are guarded
against nested or already-handled Escape events.

The context menu uses `NPopover`, `NCard`, and real `NButton` menu items. The
shared binding's menu controller owns wrapped navigation, disabled-item
skipping, and prefix typeahead. Tab and Shift+Tab dismiss without cancelling
native traversal. Both surfaces retain the binding's lifecycle and fullscreen
container contracts.

## Grouping panel and row movement

Import `groupingPanel` from `grouping-panel` and `rowReorder` from
`row-reorder`. Naive grouping choices, buttons, checkboxes and tags fill the
shared grouping controller. Group ordering, aggregation capabilities, defaults,
and announcements stay in the binding. Declare numeric aggregation operations
explicitly, or supply a numeric column filter/editor for implied operations.

Row handles and mobile move buttons issue host requests. Cross-group destination
choices use `NSelect`, retain disabled choices and their reasons, and keep the
selector within the table. The optional native confirmation modal starts on
Cancel and restores the real destination input. Confirmation and stale-session
decisions stay with the shared row model.

## Saved views and side panels

Import `savedViews` and `SavedViewsPanel` from `saved-views`, and `sidePanel`
from `side-panel`. Native Naive buttons, inputs, cards and tags render the
binding's saved-view disclosure and management controls. Read-only views,
renaming, ordering and persistence remain owned by the shared controller.

Side panels use native card and button presentation over the shared tab,
selection, identity and lifecycle contract. Host-controlled open state stays
authoritative. Managed saved-view popovers use the table's fullscreen container
and semantic trigger/input refs.
