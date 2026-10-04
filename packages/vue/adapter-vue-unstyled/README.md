# @adapttable/vue-unstyled

Native HTML controls for the AdaptTable Vue binding. The table ships no theme;
style semantic elements with `classNames` or `data-adapttable-part` selectors.
This package is experimental and has not been published to npm.

## Basic table

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import { DataTable, type ColumnDef } from "@adapttable/vue-unstyled";

interface Person {
  id: string;
  name: string;
  score: number;
}
const rows = shallowRef<readonly Person[]>([
  { id: "ada", name: "Ada", score: 10 },
]);
const selectedIds = shallowRef<string[]>([]);
const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "score", sortable: true },
];
const rowKey = (person: Person) => person.id;
</script>
<template>
  <DataTable
    v-model:selected-ids="selectedIds"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
    :url-sync="false"
    table-label="People"
  />
</template>
```

The current native surface supports search, sorting, pagination, row selection,
responsive cards, grouped column headings with optional native desktop collapse
buttons, source replacement, loading and
refreshing, empty results and error/retry rendering. Pass `source` to use a source
created by `@adapttable/vue` instead of the built-in frontend data path.

`selectedIds` and `columnLayout` are controlled when supplied. Their matching
`update:selectedIds` and `update:columnLayout` events request changes; the host
may accept or reject each request. Prop replacement never emits another request.
Use `selectable` with `defaultSelectedIds` for local selection. The table does
not modify the host's rows. Defaults seed initial state only.

`cell` and `header` scoped slots receive typed row/column contexts. An explicit
column renderer wins over the matching table slot. A `ColumnDef<Person, number>`
provides a numeric value to its renderer; a heterogeneous table cell slot has an
`unknown` value and a typed `Person` row. The optional `toolbar`, `loading`,
`empty` and `error` slots replace native content; an error slot receives the real
error, retry action and retrying state. No retry is offered without a source
retry callback.

Set `collapsibleColumnGroups` to show native desktop group-header buttons.
Cards honor the same collapsed layout but do not render desktop group controls.

All `classNames` keys are exported in `DataTableClassNames`. Ordinary attributes,
classes and listeners fall through to the root. Column, row and native-control
semantics remain on their actual table or input elements. Labels come from the
binding's localized label contract; pass `labels` and `dir="rtl"` together for
an RTL locale. For SSR, provide equivalent server/client data and URL state;
the initial responsive surface is desktop unless `forceMobile` is supplied.

A template ref exposes `DataTableHandle<Person>` with `focus()`, `runtime` and
`getView()`. `focus()` targets the actual scroll surface.
