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
not imply complete React/Angular feature parity. The native `standardFeatures()`
preset is available from `@adapttable/vue-unstyled/preset`.

## Sources and rendering

```ts
import { useFrontendData, useDataTable } from "@adapttable/vue";
import type { ColumnDef } from "@adapttable/vue";

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

`@adapttable/vue/features` exports opt-in factories and feature-specific options.
Import shared table, source, column, view-state and feature composition contracts
from `@adapttable/vue`. Structural Chrome, required slot props and adapter
construction helpers belong to `@adapttable/vue/adapter`.

Formula, pivot, stream and sparkline integrations keep their matching binding
entries. Optional PDF and XLSX factories and writers live at `/pdf` and `/xlsx`;
CSV and callback-driven print factories live at `/features`.

Adapter authors use `@adapttable/vue/adapter` for `useDataTableShell`, semantic
attribute/ref bridges, structural Chrome and lifecycle/model channels. Every
visible button, input, select and overlay is supplied by the adapter. Bind
complete attribute records to the actual semantic element.

`DataTableSurfaceChrome` is an optional shared outer layout. Its required
Search, Select, Button, Loading, Desktop and Mobile renderers let each kit own
its controls, table/card markup and appearance. `DataTableSurfaceSlots` and
`DataTableSurfaceChromeProps` describe that construction boundary. Root
composables and direct shell rendering remain available for completely custom
UI without selecting this layout. See the [optional layout reference](../../../docs/vue/api.md#optional-adapter-layout).

The shell composes column-aligned summaries through `useSummaryCells`,
`useTableSummaryModel`, `TableSummaryChrome` and `MobileSummaryChrome`.
`TableFooterChrome` places custom content outside the table. Summary mappers
receive the current source row scope, with reactive Vue values and shared
neutral incremental aggregates supported.

The shell distinguishes loaded rows from visible hierarchy rows: collapsed
children keep their editing drafts while select-all follows visible rows.
Grouped/tree tables refuse data-row pinning; independent summaries still work.
Saved Views capture connected URL slices, including density and uncontrolled
pins; group collapse and column layout require explicit host wiring.
`useColumnLayoutUrlState` returns layout/change/flush bindings;
`useColumnLayoutStorageState` persists an independent browser preference. Pass
the URL `flush` as the Saved Views `flushViewState` option. Selection,
tree/detail expansion and edit drafts are not captured.

SSR state is request-local. Browser resources start after mount and suspend
under KeepAlive. Dispose explicit effect scopes when their owner finishes.
Supply equivalent initial rows, direction, URL state and responsive settings
on server and client.

Read [getting started](https://adapttable.orwamahmoud.com/vue/getting-started/),
[feature composition](https://adapttable.orwamahmoud.com/vue/features/) and the
[Vue API reference](https://adapttable.orwamahmoud.com/vue/api/) for signatures,
examples, required slots and state-persistence boundaries.

## Optional assistant UI

`@adapttable/vue/adapter` exports `TableAssistantChrome`, `AgentApprovalChrome`,
`ApprovalReviewChrome` and their required kit control contracts. It imports no
AI runtime. The separately opt-in `@adapttable/ai-vue` package connects agents,
conversations and speech to Vue scopes. See the
[assistant guide](https://adapttable.orwamahmoud.com/vue/assistant/) for approvals,
controlled updates and lifecycle behavior. These public packages are experimental.

## Popup control slot ownership

Create popup renderer functions once in component setup and read current
presentation props through getters. A new `slots` object containing the same
renderer functions is a harmless render wrapper; it does not begin a new
logical session. Creating new renderer closures during each render replaces
their owner and retires callbacks captured by the previous owner.

`SidePanelChrome` tracks the `Frame`, `Tab`, and `Close` renderers (or its
complete `presentation` renderer). `SavedViewsPanelChrome` tracks `Surface`,
`Row`, `Input`, and `Empty`. Context menus track their `Surface` driver;
saved-view menus track their `Panel` driver. A replaced context-menu `onClose`
callback also retires captured callbacks and queued commands. Keep these
functions stable across style, label, and other ordinary presentation updates. Slot objects may be
recreated, and getters may read updated classes or direction without replacing
the functions. Replaced models or callback owners, replaced renderers, closed
sessions, KeepAlive deactivation, and disposal still retire stale callbacks.
Context-menu commands whose close was accepted remain one-shot dispatches even
when the closed projection clears its items or recreates its Surface wrapper.

Controls become active after their mounted render has flushed. In mounted
interaction tests, await Vue's next tick before invoking a control for the
first time; a callback captured from an inactive render remains retired.
