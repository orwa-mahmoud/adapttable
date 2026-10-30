# Vue reactive data sources and data tiers

Choose Vue frontend or server data sources, reactive refs and headless controllers with host-owned fetching and query state.

Use a source when you want to own fetching or share a table's query state with
other UI. The source is a readonly shallow ref. In script, read `source.value`;
a top-level ref is unwrapped automatically in a Vue template.

```ts
import { shallowRef } from "vue";
import { useDataTable, useFrontendData } from "@adapttable/vue";
import type { ColumnDef } from "@adapttable/vue";

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

## Server rows through table props

The table takes the server tier directly: pass the current page as `data`, the
row count as `total`, and fetch in `onQueryChange`. It is called after mount
and once per real change with the consolidated query; the previous request's
`signal` is aborted. `is-loading` and `error` describe the request.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import type { ColumnDef, TableQuery, TableQueryHandler } from "@adapttable/vue";
import { DataTable } from "@adapttable/vue-unstyled";

interface Person {
  id: string;
  name: string;
}
interface PeoplePage {
  rows: readonly Person[];
  total: number;
}
// Your application's request; it sends the query and honors the signal.
declare function fetchPeople(
  query: TableQuery,
  init: { signal: AbortSignal }
): Promise<PeoplePage>;

const columns: readonly ColumnDef<Person>[] = [{ key: "name", sortable: true }];
const rows = shallowRef<readonly Person[]>([]);
const total = shallowRef(0);
const loading = shallowRef(false);
const fetchPage: TableQueryHandler = async (query, { signal }) => {
  loading.value = true;
  try {
    const reply = await fetchPeople(query, { signal });
    if (signal.aborted) return;
    rows.value = reply.rows;
    total.value = reply.total;
  } finally {
    if (!signal.aborted) loading.value = false;
  }
};
</script>

<template>
  <DataTable
    :data="rows"
    :total="total"
    :is-loading="loading"
    :columns="columns"
    :row-key="(row: Person) => row.id"
    @query-change="fetchPage"
  />
</template>
```

`mode` is inferred: `data` with `onQueryChange` is server, `data` alone is
frontend. `mode="frontend"` keeps the table's own search, sort and paging and
makes `onQueryChange` a notification of what the reader changed; the mount is
not a change. `supports`, `aggregates`, `responseKey`, `facetKeys` and `facets`
carry the same server capabilities as `useServerData`; `facetKeys` defaults to
every checklist filter. A supplied `source` wins over all of them.

## Server query ownership

`useServerData` accepts reactive `rows`, `total`, `loading` and `error`, and an `onQueryChange` callback. The host fetches or computes a response and publishes it through those refs. Use the callback context’s abort signal to avoid applying replies after a newer query or disposal. Declare only the server capabilities your endpoint actually implements.

The complete signatures are in the [Vue API](./api.md); the [server query contract](../server-queries.md) describes query parameters and endpoint ownership. The [live demo](/vue/demo/) uses a simulated server for its Server mode. It does not provision a backend.
