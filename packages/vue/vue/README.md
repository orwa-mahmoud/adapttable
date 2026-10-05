# @adapttable/vue

Requires Node.js **22.12.0 or newer**; packed releases are tested on Node 22.12 and Node 24.

Headless Vue 3.5 composables over the framework-neutral AdaptTable engine.
Vue owns reactivity and lifecycle; adapters supply every visible control.
This public package is experimental, prepared for `0.1.0`, and has not been
published to npm. Use the built workspace packages until publication.

## Features

- Reactive frontend, server and query-library sources with search, filtering,
  sorting and pagination over host-owned rows
- Typed cell/header/footer renderers, controlled column layout and row selection,
  desktop table and responsive mobile card models
- Feature composition for filters, header filters and AND/OR filter trees;
  cell, row and batch editing with validation, conflict handling, dirty state
  and undo/redo
- Grouping and aggregation, tree data, row expansion and nested tables;
  resizable/grouped columns, row pinning, independent summary rows, cell spans,
  full-width rows, row styling and host-owned row actions
- Density/fullscreen view controls, URL state and Saved Views for the connected
  state slices
- Localized labels, RTL semantic attributes, SSR-safe setup and scoped resource
  ownership through mount, KeepAlive deactivation and disposal

The binding provides models and structural Chrome. A feature that needs UI
requires adapter controls; use the native factories from
`@adapttable/vue-unstyled` with its `DataTable`. This experimental slice does
not imply complete React/Angular feature parity or a standard Vue preset.

## Sources and rendering

```ts
import { useFrontendData, useDataTable, type ColumnDef } from "@adapttable/vue";

interface Person {
  id: string;
  name: string;
}
const columns: ColumnDef<Person>[] = [{ key: "name", sortable: true }];
const source = useFrontendData({
  data: [{ id: "ada", name: "Ada" }],
  columns,
  urlSync: false,
});
const table = useDataTable({
  source,
  columns,
  rowKey: (row: Person) => row.id,
});
```

Run composables in setup or an owned effect scope. Source results are readonly
shallow refs; read the latest `source.value` in script. Returned table refs stay
reactive when destructured. Callback values remain callbacks; pass a getter for
the whole options object when replacing callback identities.

`useServerData` sends the host a query and request-local AbortSignal. Check
`info.signal.aborted` before publishing rows, totals, errors or loading state.
`responseKey` attributes data to a query; it is not a request-generation token.
`useQuerySource` adapts an existing query composable, which owns its requests,
cancellation and SSR policy.

`ColumnDef<TRow, TValue>`, `CellContext`, `HeaderContext`, `FooterContext` and
`componentRenderer` preserve row/value types. The table never mutates host data.
Controlled layout, selection, density and hierarchy state request host changes;
ignoring a request preserves the supplied state.

## Feature and adapter entries

`@adapttable/vue/features` exports column/row/hierarchy factories and custom
feature contracts. `/filters`, `/header-filters`, `/editing`, `/batch-editing`,
`/density`, `/fullscreen` and `/saved-views` provide their specific factories,
models and required Chrome slot contracts.

Adapter authors use `@adapttable/vue/adapter` for `useDataTableShell`, semantic
attribute/ref bridges, structural Chrome and lifecycle/model channels. Every
visible button, input, select and overlay is supplied by the adapter. Bind
complete attribute records to the actual semantic element.

The shell composes column-aligned summaries through `useSummaryCells`,
`useTableSummaryModel`, `TableSummaryChrome` and `MobileSummaryChrome`.
`TableFooterChrome` places custom content outside the table. Summary mappers
receive the current source row scope, with reactive Vue values and shared
neutral incremental aggregates supported.

The shell distinguishes loaded rows from visible hierarchy rows: collapsed
children keep their editing drafts while select-all follows visible rows.
Grouped/tree tables refuse data-row pinning; independent summaries still work.
Saved Views capture connected URL slices, including density and uncontrolled
pins; group collapse requires explicit wiring. Column layout, selection,
tree/detail expansion and edit drafts are not automatically captured.

SSR state is request-local. Browser resources start after mount and suspend
under KeepAlive. Dispose explicit effect scopes when their owner finishes.
Supply equivalent initial rows, direction, URL state and responsive settings
on server and client.

Read [getting started](https://adapttable.orwamahmoud.com/vue/getting-started/),
[feature composition](https://adapttable.orwamahmoud.com/vue/features/) and the
[Vue API reference](https://adapttable.orwamahmoud.com/vue/api/) for signatures,
examples, required slots and state-persistence boundaries.

## Optional assistant UI

`@adapttable/vue/assistant` exports `TableAssistantChrome`, `AgentApprovalChrome`,
`ApprovalReviewChrome` and their required kit control contracts. It imports no
AI runtime. The separately opt-in `@adapttable/ai-vue` package connects agents,
conversations and speech to Vue scopes. See the
[assistant guide](https://adapttable.orwamahmoud.com/vue/assistant/) for approvals,
controlled updates and lifecycle behavior. These public packages are unreleased.
