# @adapttable/vue-headless-ui

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

A Vue data table with accessible Headless UI controls and a compact, neutral theme.
AdaptTable owns the data models and interactions; the host owns the data. Headless
UI provides the choices, menus, popovers, dialogs, tabs and radio groups.

This is a public `0.1.0` package.

```sh
pnpm add @adapttable/vue-headless-ui @headlessui/vue@^1.7.23 vue@^3.5.0
```

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

Each visible control is a Headless UI component or a native element. Browser fullscreen depends on browser
support; resize handles and header filters belong to desktop headers. Optional
writers, assistant surfaces and the feature barrel stay outside the base entry.
See the [Vue feature guide](https://adapttable.orwamahmoud.com/vue/features/#headless-ui-feature-entries)
for imports and preset composition.

## Usage

Requires Vue 3.5 or later and `@headlessui/vue` 1.7.23 or later within the 1.x line.

```vue
<script setup lang="ts">
import { DataTable, type ColumnInput } from "@adapttable/vue-headless-ui";
import { filters } from "@adapttable/vue-headless-ui/filters";
import "@adapttable/vue-headless-ui/styles.css";

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
Compose `selection({ selectedIds, onSelectionChange })`. A controlled host
can reject an update by leaving `selectedIds` unchanged, without the checkbox
showing an unaccepted state.

## Rendering and styling

Headless UI does not supply a table or card widget. The adapter deliberately uses the
binding's semantic table/card Chrome and fills its controls with Headless UI
components. `DataTableSurfaceChrome` is an optional assembly helper. Applications
can use `useDataTableShell` or the headless composables from `@adapttable/vue` and
render their own layout without this helper or this adapter.

The stylesheet provides CSS custom properties including `--at-headless-background`,
`--at-headless-border`, `--at-headless-text`, `--at-headless-muted` and `--at-headless-accent`.
`classNames` attaches custom classes to the corresponding semantic parts. Portal
surfaces have their own `at-headless-surface`, `at-headless-select-content` and
`at-headless-menu` classes, so theme overrides can also target content outside the
root table. RTL uses logical spacing, a `dir` attribute on every overlay, and
mirrored arrow keys in the density chooser.

## Component mapping

- Selection and boolean fields: a native `button` with `role="checkbox"` and
  `aria-checked`, because Headless UI has no checkbox
- Choices: `Listbox`, `ListboxButton`, `ListboxOptions` and `ListboxOption`
- Row action menus: `Menu`, `MenuButton`, `MenuItems` and `MenuItem`
- Filter popovers: `Popover` with a `PopoverPanel`, no backdrop, closing on
  Escape and outside press and returning focus to the trigger
- Filter drawers: `Dialog` with a `DialogOverlay` backdrop and `DialogPanel`
- Advanced-filter disclosure: a controlled `Disclosure`
- Density chooser: `RadioGroup` and `RadioGroupOption`; side-panel views: `TabGroup`
- Command palette, assistant sheet and move confirmation: `Dialog`
- Plain buttons, labels and text inputs: native elements through a small
  `HeadlessPrimitive`, because Headless UI has no Button, Input or Label

Headless UI 1.x has no positioning, controlled open state or scoped portal
target. The adapter adds three small pieces of its own, all in `src/controls`:
placement beside the trigger (`overlay.ts`), dismissal for host-controlled
panels (`useDismissLayer`) and a portal root that follows the fullscreen
element (`portal.ts`).

## Editing

Import `editing`, `rowEditing` or `batchEditing` from
`@adapttable/vue-headless-ui/editing` and provide the host write callback. Text, number,
date and time editors use native inputs; boolean editors use the checkbox button.
Single choices use Listbox, and multiple choices use a multiple Listbox.
The binding owns drafts, validation, cancellation, save state and focus return.
Row and batch changes are written only through their explicit Save controls.

## Navigation and status

`cellNavigation()` reuses the binding's keyboard and range controller;
`columnSelectionCheckbox()` adds real checkboxes to the column headers.
`selectionStats()` and `statusBar()` share one localized statistics strip.
`findInTable({ button: true })` adds the optional search action and find bar.
These features are separate imports from their matching package subpaths.
Sparklines and host-owned row streams are available through `/sparkline` and
`/stream` without adding another table controller.

## Host-owned actions and exports

`bulkActions()` keeps writes behind the host's callbacks and confirmation
handler. `print()` calls the supplied print action. `exportCsv()` supports
current selection and server-built jobs, rendered with a native progress bar and
localized cancel, retry, download and dismiss controls.

PDF and XLSX writers are separate `/export-pdf` and `/export-xlsx` imports.
They reuse the binding's optional integrations; ordinary table and CSV imports
do not load those writer entry points.

## Attribute and ref ownership

Selection markers, classes, ARIA and DOM refs target the checkbox button.
The filter-checkbox styling marker belongs to its `label`; its inner
checkbox owns state and keyboard behavior.

Select markers, classes, labels and DOM refs belong to `ListboxButton`, the
focusable trigger. Value, disabled state and form participation belong to
`Listbox`. Empty-string choices are valid values.

Refs resolve the documented `$el` of each Headless UI component. The external
filter trigger is the popover's anchor. Escape and Done restore it; pointer
dismissal keeps the new focus target. No private instance access or
post-render attribute patching is used.

## Upstream

- [Headless UI for Vue documentation](https://headlessui.com/v1/vue)
- [Headless UI source and MIT license](https://github.com/tailwindlabs/headlessui)

### Column menus, saved views, and context actions

The `column-menu` and `saved-views` entries use a Headless UI Popover panel with
native controls. The `context-menu` entry lists its items with `MenuItems`
at the binding's zero-size coordinate anchor; Headless UI owns menu keyboard
navigation, while the binding owns opening gestures and restores the invoking
cell before running an action. Disabled actions remain announced and cannot
execute. Host callbacks continue to own writes.

### Commands, settings, grouping, and row moves

`commandPalette()` renders a Headless UI Dialog with native input and option
controls. The Vue binding supplies command matching and navigation, including
announcing a disabled active command without executing it. `sidePanel()` uses
Headless UI Tabs; tab changes and closing remain controlled by the host.

`groupingPanel()` supplies Listbox and checkbox controls plus native
grouping handles. `rowReorder()` renders a keyboard grip on desktop and move
buttons in mobile cards. Cross-group and tree destinations use a Menu;
confirmation uses a Dialog with `role="alertdialog"`. Every accepted move is a
request to the host, which continues to own row data.

`standardFeatures()` composes the ordinary toolbar and navigation features.
Optional filters, saved views, grouping, and bulk actions can be supplied through
its options. Individual entry points remain available for smaller bundles.

### Optional assistant and pivot controls

The `assistant` entry provides `TableAssistant`, `AgentApproval`,
`tableAssistant()`, and `agentApproval()` using the binding's conversation and
approval contracts. Its sheet is a Headless UI Dialog, examples use a Menu, and
speech language choices use Listbox. It does not import an AI transport or own
approval decisions. The `pivot` entry provides a controlled `PivotPanel` with
Listbox and native controls.
