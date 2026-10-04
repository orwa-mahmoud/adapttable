# Get started with Vue tables

The experimental Vue integration provides reactive data sources, a headless
table controller and an unstyled table with native HTML controls. It uses the
same framework-neutral engine as AdaptTable's other bindings, with Vue-native
refs, renderers, effect scopes and component lifecycles.

## Availability and scope

`@adapttable/vue` and `@adapttable/vue-unstyled` are public packages prepared for an
experimental `0.1.0` release. They have not been published to npm. These examples
require a checkout or an application already linked to the built workspace packages. The peer dependency
is Vue `^3.5.0`; the workspace build requires Node `>=22.12.0` and pnpm. From the
repository root, build the binding, native kit and their workspace dependencies:

```sh
pnpm --filter @adapttable/vue-unstyled... build
```

The native table includes search, sorting and multi-sort, paged or infinite
loading, row selection, responsive mobile cards, grouped column headings,
controlled column layout and loading/error states. Optional native features add
filters and header filters, cell/row/batch editing, grouping, tree data, row
details and nested tables, resizing, row presentation and actions, density,
fullscreen and Saved Views. The [Vue feature guide](./features.md) lists their
imports, signatures and composition boundaries.

The binding also exposes typed renderer, model and structural Chrome contracts
for adapter authors. Every interactive control belongs to its kit. Use native
factories from `@adapttable/vue-unstyled` feature subpaths with the native table;
binding-only factories require the corresponding adapter slots.

These packages are experimental and do not yet provide the complete
React/Angular feature catalog or styled Vue kits. There is no standard Vue
feature preset. Do not copy another framework's feature imports into a Vue
table; use the documented Vue entry points.

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
`@update:selected-ids` yourself. The same pattern applies to `columnLayout`/`update:columnLayout` and
`density`/`update:density`. Use `selectable` and `defaultSelectedIds` for local
selection. Initial defaults do not reset later user changes.

The kit supplies native controls and no stylesheet. Its `classNames` target
semantic table, card and control elements; ordinary class/style/listener
attributes fall through to the root. See the [Vue API](./api.md#native-table)
for the complete prop, slot and class-name contracts.

## Add filters, editing and view controls

This extends the first table. Mark a column editable, compose the native
features and pass the resulting array as `:features="features"`:

```ts
import { filters } from "@adapttable/vue-unstyled/filters";
import { headerFilters } from "@adapttable/vue-unstyled/header-filters";
import { editing } from "@adapttable/vue-unstyled/editing";
import { densityChooser } from "@adapttable/vue-unstyled/density";
import { savedViews } from "@adapttable/vue-unstyled/saved-views";

// Replace the first example's columns declaration with this one.
const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true, editable: true },
  { key: "score", header: "Score", sortable: true },
];
const features = [
  filters<Person>([{ key: "name", type: "text", label: "Name" }]),
  headerFilters(),
  editing<Person>((row, key, value) => {
    rows.value = rows.value.map((item) =>
      item.id === row.id ? { ...item, [key]: value } : item
    );
  }),
  densityChooser(),
  savedViews({ storageKey: "people-views" }),
];
```

The host applies each edit; for a server write, return its promise and publish
the new rows when it succeeds. `rowEditing` requests one row patch on Save;
`batchEditing` stages multiple row patches until the shared Save action.
See [editing and persistence](./features.md#editing-and-host-persistence) for
validation, conflict handling and undo/redo requirements.

Saved Views capture the state connected to the table's URL backend, including
filters and density. With `urlSync: false`, the fallback table source and
installed view features share an in-memory backend. Column layout, selection,
tree/detail expansion and edit drafts are not automatically captured; see
[what a view restores](./features.md#what-a-view-restores).

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

Continue with the [Vue feature guide](./features.md) for composition examples,
the [Vue API reference](./api.md) for component and adapter contracts, and the
[shared concepts](../concepts.md) for engine ownership.

## Optional AI binding

The public, unreleased `@adapttable/ai-vue` package is built and linked alongside
the Vue binding and native kit when your application needs an agent, conversation
or speech input. It requires Vue `^3.5.0`; publication is a separate release step.
The base table and assistant UI entries remain usable without AI. See
[assistant and approvals](./assistant.md). The CLI currently scaffolds React and
Angular projects; these Vue examples use explicit application setup.
