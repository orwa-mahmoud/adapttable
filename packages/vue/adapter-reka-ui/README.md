# @adapttable/reka-ui

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

A Vue data table with accessible Reka UI controls and a compact, neutral theme.
AdaptTable owns the data models and interactions; the host owns the data. Reka
provides real selection, choices, popovers, dialogs and menu primitives.

This package is being prepared for its first release. Repository availability
does not imply npm publication.

## Features

- Feature composition with 41 canonical factories, focused imports, an optional
  `/features` barrel and the `standardFeatures()` preset.
- Sorting, multi-sort, pagination, global search and selection with controlled
  updates; keyboard navigation, range selection, Find and selection statistics.
- Filtering, custom filter types, the AND/OR filter tree and header filters.
- Cell editing, row editing, batch editing, dirty indicators, undo/redo and
  host-owned save callbacks.
- Column management, column groups, resizing, fit-to-width and visibility.
- Grouping and aggregation, tree data, row expansion, nested tables and a
  controlled pivot panel.
- Row reordering, row pinning, pinned summary rows, row and column spanning,
  full-width separator rows, row styling and virtualization.
- A spreadsheet formula engine, sparklines and host-owned row streams.
- CSV export, optional PDF export and XLSX writers, plus host-owned print layout.
- Saved views, row actions, bulk actions, a command palette, context menus and
  side-panel view controls.
- Mobile card layouts, localized labels, RTL and server-side rendering (SSR).
- Optional assistant and approval surfaces with host-owned transport and decisions.

Each visible control uses Reka primitives. Browser fullscreen depends on browser
support; resize handles and header filters belong to desktop headers. Optional
writers, assistant surfaces and the feature barrel stay outside the base entry.
See the [Vue feature guide](https://adapttable.orwamahmoud.com/vue/features/#reka-ui-feature-entries)
for imports and preset composition.

## Usage

Requires Vue 3.5 or later and Reka UI 2.11 or later within their current majors.

```vue
<script setup lang="ts">
import { DataTable, type ColumnInput } from "@adapttable/reka-ui";
import { filters } from "@adapttable/reka-ui/filters";
import "@adapttable/reka-ui/styles.css";

interface Person {
  id: string;
  name: string;
  team: string;
}
const rows: Person[] = [{ id: "ada", name: "Ada", team: "Engineering" }];
const columns: readonly ColumnInput<Person>[] = [
  { key: "name", sortable: true },
  { key: "team" },
];
const features = [filters<Person>([{ key: "name", type: "text" }])];
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :features="features"
    :row-key="(row) => row.id"
  />
</template>
```

Generic row types flow into column renderers, slots, row keys and update events.
Selection supports `v-model:selected-ids`; a controlled host can reject an update
without leaving the checkbox showing an unaccepted state.

## Rendering and styling

Reka does not supply a table or card widget. The adapter deliberately uses the
binding's semantic table/card Chrome and fills its controls with real Reka
primitives. `DataTableSurfaceChrome` is an optional assembly helper. Applications
can use `useDataTableShell` or the headless composables from `@adapttable/vue` and
render their own layout without this helper or this adapter.

The stylesheet provides CSS custom properties including `--at-reka-background`,
`--at-reka-border`, `--at-reka-text`, `--at-reka-muted` and `--at-reka-accent`.
`classNames` attaches custom classes to the corresponding semantic parts. Portal
surfaces have their own `at-reka-surface`, `at-reka-select-content` and
`at-reka-menu` classes, so theme overrides can also target content outside the
root table. RTL uses logical spacing and Reka's direction provider.

## Component mapping

- Selection and boolean fields: `CheckboxRoot` and `CheckboxIndicator`
- Choices: `SelectRoot`, `SelectTrigger`, `SelectContent` and related primitives
- Row action menus: `DropdownMenuRoot`, trigger, portal, content and items
- Filter popovers: non-modal `PopoverRoot`, `PopoverAnchor.reference`,
  `PopoverContent` and `PopoverPortal`
- Filter drawers: modal `DialogRoot`, content, title, overlay and portal
- Advanced-filter disclosure: controlled `CollapsibleRoot`, trigger and content
- Plain buttons and text inputs: Reka `Primitive` with their native tags

Reka has no separate Button or TextField widget. Native button and input
semantics remain intact. Overlays retain the library's portals, focus scopes,
keyboard handling and outside/Escape dismissal.

## Editing

Import `editing`, `rowEditing` or `batchEditing` from
`@adapttable/reka-ui/editing` and provide the host write callback. Text, number,
date and time editors use native Reka Primitive inputs; boolean editors use
CheckboxRoot. Single choices use Select, and multiple choices use Listbox.
The binding owns drafts, validation, cancellation, save state and focus return.
Row and batch changes are written only through their explicit Save controls.

## Navigation and status

`cellNavigation()` reuses the binding's keyboard and range controller;
`columnSelectionCheckbox()` adds real Reka checkboxes to the column headers.
`selectionStats()` and `statusBar()` share one localized statistics strip.
`findInTable({ button: true })` adds the optional search action and find bar.
These features are separate imports from their matching package subpaths.
Sparklines and host-owned row streams are available through `/sparkline` and
`/stream` without adding another table controller.

## Host-owned actions and exports

`bulkActions()` keeps writes behind the host's callbacks and confirmation
handler. `print()` calls the supplied print action. `exportCsv()` supports
current selection and server-built jobs, rendered with Reka Progress and
localized cancel, retry, download and dismiss controls.

PDF and XLSX writers are separate `/export-pdf` and `/export-xlsx` imports.
They reuse the binding's optional integrations; ordinary table and CSV imports
do not load those writer entry points.

## Attribute and ref ownership

Selection markers, classes, ARIA and DOM refs target the `CheckboxRoot` button.
The filter-checkbox styling marker belongs to its `Label` host; its inner
checkbox owns state and keyboard behavior.

Select markers, classes, labels and DOM refs belong to `SelectTrigger`, the
focusable combobox. Value, disabled state and form participation belong to
`SelectRoot`. Empty-string choices are encoded at the boundary because Reka
reserves an empty item value for clearing.

Refs use public `$el` forwarding. The external filter trigger is positioned via
the documented virtual-anchor API. Escape and Done restore it; pointer dismissal
keeps the new focus target. No private instance access or post-render attribute
patching is used.

## Upstream

- [Reka documentation](https://reka-ui.com/docs/overview/introduction)
- [Composition](https://reka-ui.com/docs/guides/composition)
- [Reka source and MIT license](https://github.com/unovue/reka-ui)

### Column menus, saved views, and context actions

The `column-menu` and `saved-views` entries use Reka Popover with genuine
Primitive controls. The `context-menu` entry uses controlled ContextMenu
Root, Trigger, Portal, Content, Item, and Separator primitives. Its documented
trigger is mounted into the binding's zero-size coordinate anchor; Reka owns
menu focus and dismissal, while the binding owns opening gestures and restores
the invoking cell before running an action. Disabled actions remain announced
and cannot execute. Host callbacks continue to own writes.

### Commands, settings, grouping, and row moves

`commandPalette()` renders a Reka Dialog with Primitive input and option
controls. The Vue binding supplies command matching and navigation, including
announcing a disabled active command without executing it. `sidePanel()` uses
compound Reka Tabs; tab changes and closing remain controlled by the host.

`groupingPanel()` supplies Reka Select and Checkbox controls plus Primitive
grouping handles. `rowReorder()` renders a keyboard grip on desktop and move
buttons in mobile cards. Cross-group and tree destinations use DropdownMenu;
confirmation uses AlertDialog. Every accepted move is a request to the host,
which continues to own row data.

`standardFeatures()` composes the ordinary toolbar and navigation features.
Optional filters, saved views, grouping, and bulk actions can be supplied through
its options. Individual entry points remain available for smaller bundles.

### Optional assistant and pivot controls

The `assistant` entry provides `TableAssistant`, `AgentApproval`,
`tableAssistant()`, and `agentApproval()` using the binding's conversation and
approval contracts. Its sheet is a Reka Dialog, examples use DropdownMenu, and
speech language choices use Select. It does not import an AI transport or own
approval decisions. The `pivot` entry provides a controlled `PivotPanel` with
Reka Select and Primitive controls.
