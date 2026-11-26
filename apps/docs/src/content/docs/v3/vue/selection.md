---
title: "Vue table row selection and bulk actions (v3)"
description: Control selected Vue row IDs, retain stable row identity and
  compose native bulk actions without transferring ownership of data.
head:
  - tag: meta
    attrs:
      name: "robots"
      content: "noindex, follow"
  - tag: script
    attrs:
      type: application/ld+json
    content: '{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"AdaptTable","item":"https://adapttable.orwamahmoud.com/"},{"@type":"ListItem","position":2,"name":"Vue
      table row selection and bulk
      actions","item":"https://adapttable.orwamahmoud.com/v3/vue/selection/"}]}'
  - tag: meta
    attrs:
      property: og:image
      content: https://adapttable.orwamahmoud.com/og/vue/selection.png
  - tag: meta
    attrs:
      name: twitter:image
      content: https://adapttable.orwamahmoud.com/og/vue/selection.png
slug: v3/vue/selection
---

Control selected Vue row IDs, retain stable row identity and compose native bulk actions without transferring ownership of data.

Selection uses stable IDs from `rowKey`. This example keeps selected IDs in the Vue host with `v-model:selected-ids`. `selectable` enables native row checkboxes.

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
const selectedIds = shallowRef<string[]>([]);
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    table-label="People"
    url-key="people"
    selectable
    v-model:selected-ids="selectedIds"
  />
</template>
```

To validate or reject a selection request, pass `selectedIds` and handle `update:selectedIds` instead of accepting every model event. `defaultSelectedIds` initializes local selection; it does not reset later changes.

Selection is not an edit or delete operation. Compose your adapter’s `/bulk-actions` factory to request host-owned operations over selected IDs. Filtering and paging can change the visible rows; use the selection model and the callback’s IDs instead of deriving selection from checkbox DOM nodes. Selection and edit drafts are not restored by Saved Views. See [actions](/v3/vue/actions/), [saved views](/v3/vue/saved-views/) and [row controls](/v3/vue/rows/).

## Try the native adapters

Use the [live demo](/vue/demo/) or [Feature Lab](/vue/demo/all-options/) to switch all eight Vue kits. Dedicated kit examples show the same feature with each UI kit’s controls.
