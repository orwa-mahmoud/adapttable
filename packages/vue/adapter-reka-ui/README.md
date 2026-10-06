# @adapttable/reka-ui

A Vue data table with accessible Reka UI controls and a compact, neutral theme.
AdaptTable owns the data models and interactions; the host owns the data. Reka
provides real selection, choices, popovers, dialogs and menu primitives.

This package is being prepared for its first release. Repository availability
does not imply npm publication.

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
