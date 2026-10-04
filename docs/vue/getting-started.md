# Get started with Vue tables

The experimental Vue integration provides reactive data sources, a headless
table controller and an unstyled table with native HTML controls. It uses the
same framework-neutral engine as AdaptTable's other bindings, with Vue-native
refs, renderers, effect scopes and component lifecycles.

## Availability and scope

`@adapttable/vue` and `@adapttable/vue-unstyled` are private `0.1.0` workspace
packages, not published npm packages. These examples require a checkout or an
application already linked to the built workspace packages. The peer dependency
is Vue `^3.5.0`; the workspace build requires Node `>=22.12.0` and pnpm. From the
repository root, build the binding, native kit and their workspace dependencies:

```sh
pnpm --filter @adapttable/vue-unstyled... build
```

The implemented native table includes search, sorting and multi-sort, paged or
infinite loading, row selection, responsive mobile cards, grouped column
headings, controlled column layout, loading/refreshing states, empty results,
and errors with optional retry. The binding also exposes typed renderer,
custom-feature, model-channel and structural Chrome contracts for adapter authors.

This is a limited experimental surface. It does not include the complete
React/Angular feature catalog, styled Vue kits, a Vue AI binding or a standard
feature preset. Exported extension types for editing, grouping, filtering and
other advanced models are building blocks, not installed native controls.
In particular, the current native kit does not supply resize handles,
grouped-row controls or row-action menus.
Do not copy another framework's feature imports into a Vue table.

Set `collapsibleColumnGroups` to render native desktop group-header buttons.
They update the same controlled or local column layout. Mobile cards honor the
collapsed visibility but do not render desktop group-header controls.

For strict template checking, use Vue tooling with `strictTemplates: true`.
If your template checker restricts custom data attributes, its
`vueCompilerOptions.dataAttributes` can include `"data-*"` for the documented
semantic hooks. Row types, renderer props and selection model events remain
checked in both directions.

## First table

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
  { id: "grace", name: "Grace", score: 20 },
]);
const selectedIds = shallowRef<string[]>([]);
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
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
    :class-names="{ table: 'people-table', th: 'people-heading' }"
  />
</template>
```

A leaf column's `key` supplies the default accessor and caption. Add `accessor`
when the value does not come from that property path. Supply stable, unique row
IDs through `rowKey`. Replace the host's row array to publish changes; the table
never owns or mutates the data.

`v-model:selected-ids` accepts selection requests through `update:selectedIds`.
To inspect or reject a request, pass `:selected-ids` and handle
`@update:selected-ids` yourself. The same pattern applies to `columnLayout` and
`update:columnLayout`. Use `selectable` and `defaultSelectedIds` for local
selection. Initial defaults do not reset later user changes.

The kit supplies native controls and no stylesheet. Its `classNames` target
semantic table, card and control elements; ordinary class/style/listener
attributes fall through to the root. See the [Vue API](./api.md#native-table)
for the complete prop, slot and class-name contracts.

## Reactive sources and headless use

Use a source when you want to own fetching or share a table's query state with
other UI. The source is a readonly shallow ref. In script, read `source.value`;
a top-level ref is unwrapped automatically in a Vue template.

```ts
import { shallowRef } from "vue";
import { useDataTable, useFrontendData, type ColumnDef } from "@adapttable/vue";

interface Person {
  id: string;
  name: string;
}

// Run inside setup() or an explicitly owned effectScope().
const rows = shallowRef<readonly Person[]>([{ id: "ada", name: "Ada" }]);
const columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }];
const source = useFrontendData({ data: rows, columns, urlSync: false });
const table = useDataTable({
  source,
  columns,
  rowKey: (row: Person) => row.id,
});
const { rows: visibleRows, searchValue, setSearchValue } = table;

setSearchValue("Ada"); // Debounced input; table.setSearch commits immediately.
// visibleRows and searchValue remain reactive after destructuring.
```

Pass this source to the native table as `:source="source"`, or render your own
surface with `useDataTable`. A supplied source wins over `data` and owns query
state; the native table's fallback data source does not claim its URL namespace.

Reactive value inputs accept a plain value, a ref or a getter. Optional inputs
also accept refs/getters whose current value is `undefined`. Callbacks such as
`rowKey`, `getSearchText`, `refetch` and `onQueryChange` remain callbacks. To
replace callback identities reactively, pass a getter for the whole options
object. Never wrap a renderer in a getter just to make it reactive.

For remote rows, choose `useServerData` when the host performs requests and
publishes `rows`/`total`, or `useQuerySource` when an existing query composable
owns fetching and cancellation. See [source contracts](./api.md#data-sources)
for request cancellation and query-library lifecycle rules.

## Cell and header content

The `cell` slot receives `{ row, rowIndex, column, value }`; `header` receives
`{ column, label, sortDir, sortIndex, toggleSort }`. A column's own `cell` or
`headerCell` renderer takes precedence over the corresponding table slot.
A custom header owns its sort control: invoke `toggleSort` if it should sort.

```vue
<template>
  <DataTable :data="rows" :columns="columns" :row-key="rowKey">
    <template #cell="{ row, column, value }">
      <strong v-if="column.key === 'name'">{{ row.name }}</strong>
      <span v-else>{{ value }}</span>
    </template>
  </DataTable>
</template>
```

For typed value rendering, use `ColumnDef<Person, number>` with a numeric
accessor and renderer. For an SFC renderer, use `componentRenderer(Component,
propsMapper)` so required component props are checked. Heterogeneous table
slots retain the row type but use `unknown` for the column value.

## Responsive layout, URL state and SSR

The default mobile breakpoint is 768px. Source `paginationMode: "auto"` resolves
to paged on desktop and infinite on mobile. Set `forceMobile` explicitly when
you need a fixed surface. Supply the same responsive options to a separately
created source and table to keep their layout and paging behavior aligned.

URL synchronization defaults to enabled where a browser adapter is available.
Use `urlSync: false` for local-only state or distinct `urlKey` values for separate
tables. URL actions and namespace changes retain request-local state; no
app-global mutable table registry is used.

Call resource-owning composables during component setup or in an active
`effectScope()`. Component subscriptions, browser listeners and source request
commits start after mount, suspend under `KeepAlive` deactivation, and are
released on unmount. A manually created effect scope activates immediately;
its owner must call `stop()`. Custom feature `mount` callbacks run during feature
composition, so guard their external work with the supplied `active` ref.

Server component setup does not activate browser resources. Use the same initial
rows, labels, direction, URL state and `forceMobile` value during SSR and
hydration. The initial responsive surface is desktop unless explicitly forced.
For request-specific URL state, pass a request-local memory adapter seeded from
the incoming URL and reuse the seed on the client. A query library's own SSR and
`KeepAlive` policies remain that library's responsibility.

Continue with the [Vue API reference](./api.md) for the full experimental
contracts and the [shared concepts](../concepts.md) for engine ownership.
