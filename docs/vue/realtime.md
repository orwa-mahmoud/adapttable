# Vue realtime rows

Keep live rows in a Vue ref and update that ref when a feed delivers patches.
`useRowPatchStream()` from `@adapttable/vue/stream` connects a WebSocket or
server-sent-events endpoint to the host-owned array. It does not make the table
a database or a write transport.

```vue
<script setup lang="ts">
import { shallowRef } from "vue";
import type { ColumnDef } from "@adapttable/vue";
import { useRowPatchStream } from "@adapttable/vue/stream";
import { DataTable } from "@adapttable/vue-unstyled";

interface Stock {
  id: string;
  product: string;
  available: number;
}

const rows = shallowRef<readonly Stock[]>([
  { id: "s1", product: "Notebook", available: 10 },
]);
const enabled = shallowRef(true);
const rowKey = (row: Stock) => row.id;
const columns: readonly ColumnDef<Stock>[] = [
  { key: "product", header: "Product" },
  { key: "available", header: "Available" },
];
const stream = useRowPatchStream<Stock>(() => ({
  eventSource: "/api/stock/events",
  enabled: enabled.value,
  getRowId: rowKey,
  onPatch: (update) => {
    rows.value = update(rows.value);
  },
}));
const { status, error } = stream;
</script>

<template>
  <button type="button" @click="enabled = !enabled">
    {{ enabled ? "Pause live updates" : "Resume live updates" }}
  </button>
  <p role="status">Feed: {{ status }}</p>
  <p v-if="error" role="alert">{{ error.message }}</p>
  <DataTable
    table-label="Live stock"
    :data="rows"
    :columns="columns"
    :row-key="rowKey"
  />
</template>
```

Use a real application endpoint in place of `/api/stock/events`. The default
frame format is a JSON patch array, for example
`[{"type":"update","id":"s1","changes":{"available":9}}]`. A custom `parse`
function can adapt another protocol. Use your kit's `DataTable`; the stream
entry remains on the binding.

## Connection lifecycle

Choose `websocket` or `eventSource`; SSE also accepts an event name and
WebSockets can supply subprotocols. Pass a getter for the whole options object
so the URL and `enabled` stay reactive. Changing the endpoint or transport
closes the prior connection; replacing only a callback does not reconnect a
healthy socket. Mounting opens the feed, KeepAlive suspension closes it,
activation reconnects it, and unmounting closes it. The returned `status` and
`error` are readonly refs. `close()` keeps the feed closed for the rest of that
composable's lifetime; use `enabled: false` as the paused state you can resume.

`reconnect` configures reconnection. Reopening a transport is not proof that
missed data was replayed: the host protocol must decide how to resume, refetch
or reconcile after a gap. Invalid default-format frames with no valid patches
leave the row array unchanged. Validate incoming business values and permissions
at your service boundary; do not let a feed grant new editing rights.

The feed opens after mount, so server rendering never connects. Keep the
initial rows identical on server and client for hydration.

## Flash the cells that moved

`useChangedCellFlash(options?)` from `/stream` marks the cells a patch changed.
It is off until `enabled: true`, lights nothing for a reader who prefers reduced
motion, and holds each mark for `durationMs` (1200 ms by default). Feed `mark`
the events from core's `rowPatchLog`, and pass `isFlashing` to the table's
`isCellFlashing`; the changed desktop cells and card values carry `data-flash`,
which your stylesheet animates. The unstyled kit needs your CSS for a visible
tint. The result also offers `isRowFlashing(rowId)`,
`flashProps(rowId, columnKey)` for custom cells, and `clear()`; its timers stop
with the component.

```ts
import { rowPatchLog } from "@adapttable/core";
import { useChangedCellFlash, useRowPatchStream } from "@adapttable/vue/stream";
import { shallowRef } from "vue";

interface Stock {
  id: string;
  product: string;
  available: number;
}
const rowKey = (row: Stock) => row.id;
const rows = shallowRef<readonly Stock[]>([]);
const flash = useChangedCellFlash({ enabled: true });
useRowPatchStream<Stock>({
  eventSource: "/api/stock/events",
  getRowId: rowKey,
  onPatch: (update) => {
    const next = update(rows.value);
    rows.value = next;
    const log = rowPatchLog(next);
    if (log) flash.mark(log.events);
  },
});
// <DataTable :data="rows" :is-cell-flashing="flash.isFlashing" … />
```

## Apply a patch without a stream

`applyRowPatches`, `updateRow`, `insertRow`, `upsertRow` and `removeRow` are
neutral helpers from `@adapttable/core`. Apply them to the ref's value for a
save response, timer or an existing host socket. Updates preserve untouched row
objects and no-op patches preserve the array reference. Stable keys retain
selection and expansion identity; an update to a missing ID is a no-op, while an
upsert can append a missing record. `applyRowPatchesWithLog` returns
`{ rows, events }` for the flash.

Keep connection status and failures available as text, not only animation.
Pause/Resume should be reachable by touch and keyboard. For live updates that
arrive under an active edit, configure the
[editing conflict policy](./cell-editing.md) rather than silently overwriting a
draft.

See [Data tiers](./data-tiers.md), [Specialized data views](./specialized.md)
and the [stream implementation](../../packages/vue/vue/src/stream.ts).
