# @adapttable/shadcn-vue

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

shadcn-vue presentation for AdaptTable's headless Vue binding. Table state,
feature lifetimes, query ownership, and structural Chrome belong to
`@adapttable/vue`; this package supplies copied, licensed shadcn-vue controls.

## Features

- Feature composition with 41 canonical factories, focused imports, an optional
  `/features` barrel, and the `standardFeatures()` preset.
- Global search, sorting, multi-sort, pagination, controlled selection, and mobile cards.
- Filtering, custom filter types, header filters, active chips, and AND/OR filter trees.
- Cell editing, row and batch editing, validation, dirty state, undo/redo, and edit history.
- Column management: visibility, pinning, resizing, fit-to-width, and column groups.
- Keyboard cell navigation, column selection, find-in-table, and selection statistics.
- Row grouping and aggregation, tree data, row expansion, nested tables, and a controlled pivot panel.
- Row reordering, row pinning, pinned summary rows, cell spanning, full-width extra rows, row styling, and virtualization.
- A spreadsheet formula engine, sparklines, and host-owned row streams.
- CSV export, optional PDF export and XLSX writers, and host-owned print layout.
- Toolbar and view controls for density, fullscreen, and saved views, plus row actions, bulk actions, a command palette, context menus, and side panels.
- Localized labels, RTL, SSR, and optional assistant and approval controls.

Feature factories are separate opt-in entry points. The base table does not import
the feature barrel, export writers, formula engine, or assistant surfaces.

## Usage

```vue
<script setup lang="ts">
import { DataTable, type ColumnDef } from "@adapttable/shadcn-vue";
import { densityChooser } from "@adapttable/shadcn-vue/density";
import "@adapttable/shadcn-vue/styles.css";

interface Person {
  id: string;
  name: string;
  score: number;
}
const data: readonly Person[] = [{ id: "ada", name: "Ada", score: 42 }];
const columns: readonly ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const features = [densityChooser()];
</script>

<template>
  <DataTable
    :data="data"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    selectable
  />
</template>
```

The table uses the shared generic Vue props and slots. Search, sorting,
pagination, selection, density, row identity, and source ownership stay in the
binding. Desktop output is a semantic table. Mobile output uses shadcn Card
components with article, definition-list, and selection semantics. Set `dir="rtl"`
for right-to-left layout, or `forceMobile` to select the card presentation.

Controlled selection and density emit requests and retain the supplied value
until the host updates it. Compact density tightens card padding, field gaps,
and control spacing; narrow viewports retain 44px minimum button/input/select
heights. Classes in `classNames` are merged with the kit's
presentation classes; attributes and typed cell/header/footer slots are forwarded.

## Styles

Import `@adapttable/shadcn-vue/styles.css` once. The package ships compiled
utilities without Tailwind Preflight, so consumers do not need a Tailwind build.
The stylesheet reads the standard shadcn CSS tokens (`--background`,
`--foreground`, `--primary`, `--border`, `--input`, and `--ring`) and provides
neutral fallback colors. Portaled controls read tokens from their actual host.

## Component source

shadcn-vue distributes editable component source rather than an aggregate
runtime component package. This adapter vendors the New York v4 registry at
[b251d9fd](https://github.com/unovue/shadcn-vue/tree/b251d9fd92aa496495e127137a7734704fb34a29/apps/v4/registry/new-york-v4/ui).
Its components compose Reka UI. The copied Card and Skeleton components also provide mobile and loading paint.
The upstream MIT license is preserved in
`THIRD_PARTY_NOTICES.md`, which is included in the published package.

Local adaptations use relative utility imports, logical select icon spacing,
setup-owned semantic focus targets, controlled-value rejection reconciliation,
and the binding's required slot contracts. No kit imports another kit's controls.

## Semantic targets

- Button: caller attributes, part name, class, keyboard events, and focus ref
  reach the `button` rendered by the shadcn `Primitive`.
- Input: those attributes reach the actual input.
- Native Select: part name, class, label, disabled state, keyboard events, and
  focus ref reach the select. `hostClass` styles the decorative wrapper.
- Checkbox: part name, class, label, keyboard events, and focus ref reach the
  Reka checkbox button. Selection uses one model-update event per request.
  An indeterminate value is represented by `aria-checked="mixed"`.
- Popover: content is portaled without a backdrop; Reka owns Escape,
  outside-click dismissal, and focus behavior.
- Sheet: content and its real dimming overlay use the Reka Dialog primitives.

## Opt-in controls

Import `densityChooser` from `@adapttable/shadcn-vue/density` and `fullscreen`
from `@adapttable/shadcn-vue/fullscreen`. Both contribute only presentation to
the binding feature. Optional controls are absent until requested.

## Filter fields and header filters

The `filters` entry exposes `filters()`, `FilterField`, `BasicFilterField`, `ChecklistFilter`,
and `FilterTree` as standalone generic presentations. Their definitions, sources,
operators, async options, checklist counts, and AND/OR updates belong to the Vue
binding. The adapter fills the required Chrome slots with its copied Input,
Native Select, Checkbox, and Button components. These fields can be embedded in a
host-owned form. Add `filters(definitions, { mode: "popover", tree: true })`
to the table’s features to enable the toolbar panel, active chips, and optional
AND/OR builder. Use `mode: "drawer"` for the modal Sheet with its real backdrop.
The binding owns open state and filter changes; the kit owns positioning and
focus. Escape, Done, and Cancel return focus to the connected visible trigger
after the panel closes. Outside dismissal leaves focus with the outside target.
Both modes portal into the table’s fullscreen host when one is active.
Removing the feature tears down its overlay and cancels pending focus work.
The full toolbar feature remains available with mobile cards.

Import `headerFilters` from `@adapttable/shadcn-vue/header-filters` to enable
column-header trigger filters. Column definitions declare their filter type;
`closeHeaderFilterOnSelect` optionally dismisses a completed single-choice filter.
The same entry exposes `HeaderFilter`, `FilterHeaderControl`, and
`FilterHeaderRow` for standalone use. Compact multi-choice headers use the copied
shadcn Popover and Checkbox components. Header popovers are non-modal, retain
background interaction, close on Escape or outside interaction, and restore focus
to their trigger on Escape. Reka owns positioning and nested dismissal.

All field and tree `classNames` hooks are preserved. `dir="rtl"` reaches compact
controls and portaled header content. Filter controls retain 44px targets on
narrow screens; desktop controls use the standard New York sizing. Header-row
controls are a desktop table presentation. The main header feature is absent from
mobile cards because those cards have no column-header row. Standalone fields can
be used in a mobile filter form. SSR renders closed header triggers without
browser reads or open portals. Host-rejected field edits remain controlled.

## Editing and hierarchy

The `editing` entry exposes `editing`, `rowEditing`, `batchEditing`,
`undoRedoButtons`, `dirtyIndicators`, and `editHistory`. Drafts, validation,
pending saves, rollback, and history stay in the binding. Inputs, choices,
checkboxes, and save/cancel controls use the copied shadcn components. Native
multiple selection retains the host's accepted value after a rejected change.

Import `grouping`, `tree`, `rowDetail`, and `nestedTable` from their corresponding
entries. The table renders kit toggles, selection controls, and nested kit tables
on desktop and mobile. Lazy loading and expansion state remain binding-owned.

## Navigation and Columns

`cellNavigation`, `columnSelectionCheckbox`, `findInTable`, `statusBar`, and
`selectionStats` live in optional entries. They fill the binding's navigation
controls with shadcn Input, Checkbox, Button, and Card presentations. Find keeps
its input focused while typing; closing it allows the grid controller to restore
the active cell. Grid interaction is passive during server rendering and attaches
after mount. Mobile Find highlights card values without introducing grid semantics.

`columnMenu` adds an anchored shadcn Popover with real button/input/select targets
for visibility, pinning, search, renaming, and binding-provided column actions.
It respects the table's portal container and live direction. Escape closes a
nested action group before its outer popover, and outer dismissal returns focus
only to a connected, visible opener. Hidden or disposed controls are never focused.

## Columns, rows, and calculations

`resizableColumns`, `fitColumns`, `multiSort`, and `collapsibleColumnGroups` are
available from their named entries or `/columns`. They use the binding's models
and the table's shadcn Button controls. Resize handles and column groups are
desktop-header presentations; mobile cards retain ordinary sorting and data.

`rowActions` supports inline Buttons or a DropdownMenu. `rowPinning`,
`pinnedSummaryRows`, `cellSpan`, `extraRows`, and `rowAppearance` use the existing
semantic row and card Chrome. Their factories live in matching entries and
`/rows`. Cell spanning is a desktop table behavior; cards keep each field's value.
`virtualize` is a separate import. `/formula`, `/stream`, and `/sparkline` forward
the binding's optional calculation and rendering APIs without creating state.

## Grouping, saved views, and row moves

`groupingPanel` uses shadcn NativeSelect, Checkbox, and Button controls around the
shared grouping Chrome. Logical keyboard moves support RTL. Grouping controls
remain available on mobile; aggregation computed by the host is read-only.

`savedViews` adds a managed Popover with shadcn Input and Button controls.
`SavedViewsPanel` is also available for host-owned settings. The binding owns
serialization, storage, rename, ordering, default selection, and read-only views.
Escape restores a connected visible trigger; outside dismissal keeps outside focus.

`rowReorder` renders a keyboard/drag grip on desktop and up/down controls in
mobile cards. Cross-group and tree moves use a DropdownMenu, with AlertDialog
confirmation when requested by the binding's policy. All moves request changes
through host callbacks. The adapter never mutates rows.

## Actions, export, and optional surfaces

`bulkActions` renders selection actions with shadcn Buttons. `print` calls the
host's print callback. `exportCsv` includes the binding's selection and server-job
workflow with styled progress and cancel, retry, download, and dismiss controls.
`exportPdf` and `exportXlsx` are separate imports; their optional writers remain
outside ordinary table and CSV imports.

`contextMenu` combines the shared coordinate/keyboard model with styled Reka
ContextMenu primitives and shadcn controls. `commandPalette` uses a dialog with
shadcn Input and styled command options, and `sidePanel` uses compound Tabs. The binding
owns matching, command navigation, disabled guards, tab selection, and open state.
Portaled surfaces use the fullscreen host and inherit the current direction.

`TableAssistant`, `AgentApproval`, `tableAssistant`, and `agentApproval` live in
`/assistant`. They use shadcn Sheet, Textarea, Input, NativeSelect, and Button
presentations over the binding's conversation and approval contracts. Transport,
conversation, speech, and decisions stay host-owned. `/pivot` supplies the
controlled `PivotPanel` with NativeSelect and Button controls.

`standardFeatures` from `/preset` composes the ordinary toolbar and navigation
features, with optional filters, saved views, grouping, and bulk actions. The
`/features` barrel is an explicit convenience import; individual entries remain
available for smaller bundles. Every feature stays absent until requested.
