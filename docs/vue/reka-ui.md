# Reka UI Vue table

`@adapttable/reka-ui` is a Vue data table with accessible Reka UI controls and a
compact, neutral theme. AdaptTable owns the data models and interactions; the
host owns the data. Reka provides real selection, choices, popovers, dialogs and
menu primitives.

## Availability and versions

The package is prepared for its first experimental `0.1.0` release and is not
yet published to npm. Until it is, link the built workspace packages as
described in [Get started with Vue](./getting-started.md).

Peers: Vue `^3.5.0` and Reka UI `^2.11.0`. Node.js 22.12.0 or newer.

## Application setup

Load the kit's stylesheet once:

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

## Kit components

| Component      | Entry points                   | Renders                                             |
| -------------- | ------------------------------ | --------------------------------------------------- |
| `FilterField`  | `/filters`, `/features`        | A filter definition's field with Reka controls.     |
| `HeaderFilter` | `/header-filters`, `/features` | A column header filter button and its Reka popover. |

## Controls and styling

Reka does not supply a table or card widget, so the kit uses the binding's
semantic table and card Chrome and fills its controls with Reka primitives:

- Selection and Boolean fields: `CheckboxRoot` and `CheckboxIndicator`.
- Choices: `SelectRoot`, `SelectTrigger`, `SelectContent` and related primitives.
- Row action menus: `DropdownMenuRoot` with its trigger, portal, content and items.
- Filter popovers: a non-modal `PopoverRoot`; filter drawers: a modal `DialogRoot`.
- Plain buttons and text inputs: Reka `Primitive` with their native tags.

The stylesheet provides custom properties including `--at-reka-background`,
`--at-reka-border`, `--at-reka-text`, `--at-reka-muted` and `--at-reka-accent`.
Portal surfaces carry `at-reka-surface`, `at-reka-select-content` and
`at-reka-menu` classes so overrides reach content outside the table root. RTL
uses logical spacing and Reka's direction provider.

The [Vue feature guide](./features.md#reka-ui-feature-entries) lists the Reka
feature entries and preset composition.
