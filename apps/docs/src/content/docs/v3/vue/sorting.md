---
title: "Vue table sorting and search (v3)"
description: Sort Vue table columns, compose multi-sort and search reactive data
  with shared query state and native controls.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Vue
      table sorting and
      search","item":"https://adapttable.orwamahmoud.com/v3/vue/sorting/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/sorting.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/sorting.png
slug: v3/vue/sorting
---

Sort Vue table columns, compose multi-sort and search reactive data with shared query state and native controls.

Search and sorting are built into the native Vue table. Mark individual columns `sortable`; the adapter renders the sort controls. This example starts with Name ascending and allows multi-sort. The browser URL can override initial defaults.

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
    :multi-sort="true"
    :defaults="{ sortBy: 'name', sortDir: 'asc' }"
  />
</template>
```

Use `searchable="false"` to omit the search field, and `getSearchText` to choose the text searched for each row. `searchDebounceMs` controls the draft delay, and `searchPlaceholder` sets the search box placeholder ahead of the `searchPlaceholder` label. With a supplied server source, query changes request data from the host; the table does not download the complete dataset to sort it.

A custom header owns its sort control. Invoke the provided `toggleSort` callback instead of changing the row array. For headless surfaces, use the sorting state and requests exposed by `useDataTable`; see the [API](/v3/vue/api/).

## Try the native adapters

Use the [live demo](/v3/vue/demo/) or [Feature Lab](/v3/vue/demo/all-options/) to switch all eight Vue kits. Dedicated kit examples show the same feature with each UI kit’s controls.
