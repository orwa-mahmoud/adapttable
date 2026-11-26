# Vue table row selection and bulk actions

Control selected Vue row IDs, retain stable row identity and compose native bulk actions without transferring ownership of data.

Selection uses stable IDs from `rowKey`. Compose `selection()` from the kit's `/selection` entry. Its options are `VueSelectionOptions`: `selectedIds` and `defaultSelectedIds` may be a ref or a getter, `getId` selects by an id other than the row key, and `onSelectionChange` reports the requested ids. Pass `selectedIds` when the host holds the selection, and apply the ids from `onSelectionChange`.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import type { ColumnDef } from "@adapttable/vue";
import { DataTable } from "@adapttable/vue-unstyled";
import { selection } from "@adapttable/vue-unstyled/selection";

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
function changeSelection(ids: string[]) {
  selectedIds.value = ids;
}
</script>

<template>
  <DataTable
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    table-label="People"
    url-key="people"
    :features="[selection({ selectedIds, onSelectionChange: changeSelection })]"
  />
</template>
```

To reject a request, leave `selectedIds` unchanged inside `onSelectionChange`. `defaultSelectedIds` initializes the table's own selection; it does not reset later changes.

Selection is not an edit or delete operation. Compose your adapter’s `/bulk-actions` factory to request host-owned operations over selected IDs. Filtering and paging can change the visible rows; use the selection model and the callback’s IDs instead of deriving selection from checkbox DOM nodes. Selection and edit drafts are not restored by Saved Views. See [actions](./actions.md), [saved views](./saved-views.md) and [row controls](./rows.md).

## Try the native adapters

Use the [live demo](/vue/demo/) or [Feature Lab](/vue/demo/all-options/) to switch all eight Vue kits. Dedicated kit examples show the same feature with each UI kit’s controls.
