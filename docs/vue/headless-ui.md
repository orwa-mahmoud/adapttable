# Headless UI Vue table

`@adapttable/vue-headless-ui` is a Vue data table built with Headless UI
components and a compact, neutral theme. AdaptTable owns the data models and
interactions; the host owns the data. Headless UI provides the choices, menus,
popovers, dialogs, tabs and radio groups.

## Availability and versions

This is a new package; its first release is `0.1.0`. Install
`@adapttable/vue-headless-ui` and its UI-kit peers using
[Get started with Vue](./getting-started.md#choose-a-ui-kit), then complete the
application setup below.

Peers: Vue `^3.5.0` and `@headlessui/vue` `^1.7.23`. Node.js 22.12.0 or newer.

## Application setup

Load the kit's stylesheet once:

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

## Kit components

| Component      | Entry points      | Renders                                                    |
| -------------- | ----------------- | ---------------------------------------------------------- |
| `FilterField`  | `/filters`        | A filter definition's field with Headless UI controls.     |
| `HeaderFilter` | `/header-filters` | A column header filter button and its Headless UI popover. |

## Controls and styling

Headless UI does not supply a table or card widget, so the kit uses the binding's
semantic table and card Chrome and fills its controls with Headless UI
components:

- Choices: `Listbox`, `ListboxButton`, `ListboxOptions` and `ListboxOption`.
- Row action menus: `Menu`, `MenuButton`, `MenuItems` and `MenuItem`.
- Filter popovers: a non-modal `Popover` panel with no backdrop; filter drawers: a
  `Dialog` with an overlay and panel.
- Command palette, assistant sheet and move confirmation: `Dialog`.
- Side-panel views: `TabGroup`; density: `RadioGroup`.
- Selection and Boolean fields, plain buttons and text inputs: native elements,
  because Headless UI has no checkbox, button or input.

Headless UI 1.x has no positioning, controlled open state or portal target. The
kit places panels beside their triggers, closes host-controlled panels on Escape
and outside presses, and moves its portal root into the table's fullscreen
element, so menus and dialogs stay usable in fullscreen. Headless UI makes the
rest of the page inert behind a dialog; in fullscreen the table itself stays
reachable.

The stylesheet provides custom properties including `--at-headless-background`,
`--at-headless-border`, `--at-headless-text`, `--at-headless-muted` and
`--at-headless-accent`. Portal surfaces carry `at-headless-surface`,
`at-headless-select-content` and `at-headless-menu` classes so overrides reach
content outside the table root. RTL uses logical spacing, a `dir` attribute on
every overlay and mirrored arrow keys in the density chooser.

The [Vue feature guide](./features.md#headless-ui-feature-entries) lists the
Headless UI feature entries and preset composition.
