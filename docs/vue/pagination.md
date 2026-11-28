# Vue table pagination and infinite loading

Page Vue tables or use infinite loading with reactive sources, synchronized query state and native page controls.

The native table renders page controls for `paginationMode="paged"`. `defaults.limit` supplies the initial page size; source and URL state own later changes.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import type { ColumnDef } from "@adapttable/vue";
import { DataTable } from "@adapttable/vue-unstyled";

interface Person {
  id: string;
  name: string;
  score: number;
}
const rows = shallowRef<readonly Person[]>([
  { id: "ada", name: "Ada", score: 10 },
  { id: "grace", name: "Grace", score: 20 },
]);
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const rowKey = (row: Person) => row.id;
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    table-label="People"
    url-key="people"
    pagination-mode="paged"
    :defaults="{ limit: 10 }"
  />
</template>
```

Use `paginationMode="infinite"` for the infinite layout. A frontend source pages its supplied rows locally; a server source receives the query and publishes the returned rows and total. A total is the number of matching rows, not the length of the current page. The table never creates your endpoint.

Changing search or filters resets the query to the first page. Give independent tables distinct `urlKey` values, or set `urlSync="false"` for local-only state. Mobile cards use infinite loading in place of the desktop pager; see [mobile cards](./mobile-cards.md) and [data tiers](./data-tiers.md).

## Try the native adapters

Use the [live demo](/vue/demo/) or [Feature Lab](/vue/demo/all-options/) to switch all nine Vue kits. Dedicated kit examples show the same feature with each UI kit’s controls.
