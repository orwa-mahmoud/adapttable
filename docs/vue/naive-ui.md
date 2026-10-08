# Naive UI Vue table

`@adapttable/naive-ui` renders AdaptTable's Vue binding with Naive UI controls.
AdaptTable owns table state, feature composition and semantic table structure;
Naive UI supplies the visible controls and their styling.

## Availability and versions

The package is prepared for its first experimental `0.1.0` release and is not
yet published to npm. Until it is, link the built workspace packages as
described in [Get started with Vue](./getting-started.md).

Peers: Vue `^3.5.0` and Naive UI `^2.45.3`. Node.js 22.12.0 or newer.

## Application setup

Load the kit's stylesheet once; Naive UI styles its own components:

```ts
import "@adapttable/naive-ui/styles.css";
```

```vue
<script setup lang="ts">
import { DataTable, type ColumnDef } from "@adapttable/naive-ui";
import { filters } from "@adapttable/naive-ui/filters";

interface Person {
  id: string;
  name: string;
}

const rows: Person[] = [{ id: "ada", name: "Ada" }];
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
];
const features = [filters<Person>([{ key: "name", type: "text" }])];
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    :url-sync="false"
  />
</template>
```

## Kit components

| Component             | Entry points                 | Renders                                              |
| --------------------- | ---------------------------- | ---------------------------------------------------- |
| `NaiveEditableCell`   | `/editing`                   | An editable cell with Naive UI inputs and selects.   |
| `NaiveRowEditActions` | `/editing`                   | Edit, save and cancel buttons for one row.           |
| `NaiveBatchEditBar`   | `/editing`, `/batch-editing` | The unsaved-row count with Save all and Cancel all.  |
| `NaiveFilterField`    | `/filters`                   | A filter definition's field with the kit's controls. |
| `NaiveHeaderFilter`   | `/header-filters`            | A column header filter button and its popover.       |
| `NaiveDesktopTable`   | `/renderers`                 | The desktop table over `NTable` semantic primitives. |
| `NaiveMobileCards`    | `/renderers`                 | The mobile card list over `NCard`.                   |
| `naiveTableControls`  | `/renderers`                 | The required table controls as Naive components.     |

`/renderers` also exports the kit's `DataTableClassNames`. Applications that
compose their own outer layout can use the desktop and mobile renderers directly,
or use the headless binding with their own presentation.

## Controls and styling

- The desktop renderer uses Naive UI's `NTable`, `NThead`, `NTbody`, `NTr`, `NTh`
  and `NTd` primitives; the mobile renderer uses `NCard`. Attributes, element
  refs, ARIA metadata and prepared cell spans stay on the semantic targets.
- The renderer consumes the binding's prepared models; it does not ask
  `NDataTable` to sort, filter, paginate, select or virtualize rows again.
- `DataTable` uses the binding's outer layout for search, status, loading and
  pagination.

The [Vue feature guide](./features.md) covers feature composition. The package
README lists every feature entry point and its Naive UI control.
