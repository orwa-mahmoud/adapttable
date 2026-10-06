# @adapttable/element-plus

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

## Optional view controls

Add density and fullscreen controls only where they are needed:

```ts
import { densityChooser } from "@adapttable/element-plus/density";
import { fullscreen } from "@adapttable/element-plus/fullscreen";

const features = [densityChooser(), fullscreen()];
```

Pass `features` to `DataTable`. Use `v-model:density` to keep density in host
state. The fullscreen button appears only when the browser supports fullscreen;
it promotes the existing table root.

## Server rendering

Use Element Plus's documented per-request `ID_INJECTION_KEY` and
`ZINDEX_INJECTION_KEY` setup, with the same seeds on the server and client.
Element Plus 2.14.7 assigns supplied form-control IDs after mounting. Checkbox
labels therefore use their native nested-label association during server
rendering. Input accessible names remain available through `aria-label`.
Applications that use external `label[for]` associations should account for
those IDs becoming available after hydration.

[Element Plus SSR documentation](https://element-plus.org/en-US/guide/ssr.html)
