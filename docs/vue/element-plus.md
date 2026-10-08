# Element Plus Vue table

`@adapttable/element-plus` renders AdaptTable's Vue binding with Element Plus
controls and card surfaces. The binding owns table state, feature lifetimes,
query ownership and host-write callbacks; this kit supplies buttons, fields,
checkboxes, selects, popovers, drawers and message boxes.

## Availability and versions

The package is prepared for its first experimental `0.1.0` release and is not
yet published to npm. Until it is, link the built workspace packages as
described in [Get started with Vue](./getting-started.md).

Peers: Vue `^3.5.0` and Element Plus `^2.14.7`. Node.js 22.12.0 or newer.

## Application setup

Register Element Plus the way your application already does, then load its
stylesheet and the kit's stylesheet once:

```ts
import "element-plus/dist/index.css";
import "@adapttable/element-plus/styles.css";
```

Load Element Plus's dark-theme CSS variables when using its dark theme. Popup
stacking follows `ElConfigProvider`'s `zIndex` setting.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/element-plus";
import { filters } from "@adapttable/element-plus/filters";

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
const features = [filters<Person>([{ key: "name", type: "text" }])];
const selectedIds = ref<string[]>([]);
</script>

<template>
  <DataTable
    v-model:selected-ids="selectedIds"
    :data="rows"
    :columns="columns"
    :row-key="(row) => row.id"
    :features="features"
    :url-sync="false"
    selectable
  />
</template>
```

## Kit components

Each feature entry exports the kit component it renders, for custom layouts over
the same binding models:

| Component               | Entry points                 | Renders                                                |
| ----------------------- | ---------------------------- | ------------------------------------------------------ |
| `ElementEditableCell`   | `/editing`                   | An editable cell with Element Plus inputs and selects. |
| `ElementRowEditActions` | `/editing`                   | Edit, save and cancel buttons for one row.             |
| `ElementBatchEditBar`   | `/editing`, `/batch-editing` | The unsaved-row count with Save all and Cancel all.    |
| `FilterField`           | `/filters`                   | A filter definition's field with the kit's controls.   |
| `ElementHeaderFilter`   | `/header-filters`            | A column header filter button and its popover.         |

## Controls and styling

- The desktop renderer places a semantic HTML table inside `ElCard`; mobile
  cards use one `ElCard` per row.
- Sorting, selection, search and paging use Element Plus components. Filter
  popovers use `ElPopover`; `{ mode: "drawer" }` uses a modal `ElDrawer`.
- Row-action confirmation uses `ElMessageBox`, inside the fullscreen table.
- `classNames` styles the named part; compound controls follow Element Plus's
  public attribute API for checkboxes, inputs and selects.

Server rendering needs Element Plus's per-request `ID_INJECTION_KEY` and
`ZINDEX_INJECTION_KEY` setup and the injected teleport payload, as described in
the [Element Plus SSR guide](https://element-plus.org/en-US/guide/ssr.html).

The [Vue feature guide](./features.md) covers feature composition. The
package README lists every feature entry point and its Element Plus control.
