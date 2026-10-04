# @adapttable/vue

Headless Vue composables over the framework-neutral AdaptTable engine. Vue owns
reactivity and lifecycle; adapters supply every visible control. This package
is experimental and has not been published to npm.

## Sources

`useFrontendData` searches, sorts and pages host-owned rows. `useServerData`
tracks server query state and supplies a request-local AbortSignal to the host.
`useQuerySource` adapts an existing query composable. Source results are readonly
shallow refs; rows and external engine objects are not deep-proxied.

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

Composables run in setup or an active effect scope. Callbacks remain callbacks;
pass a getter for the options object when callback references can change.
Dispose an explicit scope when its owner finishes. Components release their
subscriptions on unmount and suspend external resources while deactivated.

For server requests, check each request's `info.signal.aborted` before publishing
rows, totals, errors or loading state. `responseKey` identifies the query answered
by host-published rows; it is not a request-generation token.

## Rendering and controlled state

`useDataTable` returns destructurable refs and stable actions. `ColumnDef`,
`CellContext`, `HeaderContext`, `FooterContext` and `componentRenderer` preserve
row and value types. Bind complete attribute records to their semantic targets.
`useColumnLayout` and `useRowSelection` request host changes when controlled;
a rejected change does not silently overwrite the current value.

Adapter authors import structural Chrome, `useDataTableShell`, typed required
slots and feature lifecycle contracts from `@adapttable/vue/adapter`. Custom
features compose through `@adapttable/vue/features`. The binding supplies no
native input, button, select or overlay fallback.

SSR state is request-local. Browser listeners and measurements begin after mount.
Use equivalent initial data, direction, URL state and responsive settings on the
server and client to keep hydration deterministic.
