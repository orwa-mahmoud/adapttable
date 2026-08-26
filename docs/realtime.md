# Realtime React data table — live row updates, websockets

▶ **See it working:** [watch rows patch in on the Mantine demo](https://orwa-mahmoud.github.io/adapttable/demo/mantine/realtime/) — budgets change while you read them; sort and selection hold. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

A realtime table is one whose rows update as data arrives — a websocket, a
poll, another tab. AdaptTable does not open the socket. You do. When a change
lands, you patch the rows you already hold. There is no `realtime` prop.

**Related:** [Inline cell editing](./cell-editing.md) · [API](./api.md) ·
[Data tiers](./data-tiers.md)

## Apply a patch

`applyRowPatches` updates the array you pass as `data`. Untouched rows keep
their object identity, so React does not redraw the whole page, and scroll,
sort, filters and selection survive.

```tsx
import { DataTable } from "@adapttable/mantine";
import { applyRowPatches, updateRow } from "@adapttable/core";

export function People({ rows, columns, setRows }) {
  const byId = (row) => row.id;

  // Your socket / poll calls this when a row changes.
  const onMessage = (id, budget) =>
    setRows(applyRowPatches(rows, [updateRow(id, { budget })], byId));

  return <DataTable data={rows} columns={columns} rowKey={byId} />;
}
```

`insertRow`, `updateRow`, `upsertRow` and `removeRow` build the batch. A later
patch sees what an earlier one did.

## Incremental re-evaluation

Hand the array `applyRowPatches` returns back as `data` — do not spread it.
The result carries a `rowPatchLog`; `useFrontendData` continues the live
view and re-runs search, filters, sort, grouping and aggregates for the
rows the patch touched, not the whole set. A copy (`[...patched]`) drops
the log and rebuilds everything, which is how the scale bench's full-rebuild
arm is built.

```tsx
setRows(applyRowPatches(rows, [updateRow(id, { budget })], byId));
```

`createIncrementalView` / `applyRowPatchesToView` /
`applyRowPatchLogToView` are the same engine if you hold the snapshot
yourself. All eight adapters share it, including the mobile card layout.

The scale demo measures both pipelines: `?patch=200` spreads (full rebuild)
and `?patch=200&incremental=1` keeps the log. `node scripts/bench.mjs
--only patch` prints the burst times. A 2026-08-26 run on this machine was
**13.5 s** full rebuild → **9.9 s** incremental (**1.4×**) for 200 updates
on 20,000 rows through the live Mantine table.

## Live patches over WebSocket or SSE

`@adapttable/core/stream` is a separate entry, so a table that never opens
a socket never downloads one. `useRowPatchStream` binds a WebSocket or an
SSE endpoint to the rows you already own. Frames become ordinary row
patches and go back through your setter — filters, sort, grouping and
aggregates happen the way they do for any other change.

```tsx
import { useRowPatchStream } from "@adapttable/core/stream";
import { DataTable } from "@adapttable/mantine";

function LiveTable({ initial, columns }) {
  const [rows, setRows] = useState(initial);
  const stream = useRowPatchStream({
    websocket: "wss://api.example.com/rows",
    getRowId: (row) => row.id,
    onPatch: setRows,
  });

  return (
    <>
      {stream.status === "reconnecting" && <span>Reconnecting…</span>}
      <DataTable data={rows} columns={columns} rowKey={(row) => row.id} />
    </>
  );
}
```

### The wire format is the patch shape

A frame is one patch, or an array of them, as JSON — the same four shapes
`applyRowPatches` already takes:

```json
[
  { "type": "insert", "row": { "id": "9", "name": "Ada" }, "at": 0 },
  { "type": "update", "id": "3", "changes": { "status": "active" } },
  { "type": "upsert", "row": { "id": "4", "name": "Bo" } },
  { "type": "remove", "id": "7" }
]
```

A server that already speaks this needs no translation. One that speaks
something else supplies `parse`. **Nothing from the wire is trusted.** A
frame that is not JSON, an entry that is not an object, an update with no
`changes`, a remove with no id — each is dropped rather than applied. One
malformed frame cannot empty a table, and it does not take the connection
down either.

### Connection state

`status` is one of `idle`, `connecting`, `open`, `reconnecting`, `error` or
`closed`, with `error` carrying the reason. `isStreamLive` and
`isStreamSettled` are the two questions worth asking:

|                |                                                            |
| -------------- | ---------------------------------------------------------- |
| `idle`         | No url, or `enabled: false`. Nothing is open.              |
| `connecting`   | Opening for the first time.                                |
| `open`         | Receiving.                                                 |
| `reconnecting` | Dropped; a retry is scheduled.                             |
| `error`        | Gave up — retries spent, or no socket in this environment. |
| `closed`       | You closed it. Final.                                      |

A dropped **WebSocket** is reopened here, after `reconnect.delayMs`
(1000 ms by default) and at most `reconnect.maxAttempts` times. An
**EventSource** reconnects on its own, so it is left to do that and simply
reported as `reconnecting` — retrying alongside it would give the server
two subscriptions for one table.

```tsx
useRowPatchStream({
  eventSource: "https://api.example.com/rows/stream",
  event: "patch", // defaults to "message"
  getRowId: (row) => row.id,
  onPatch: setRows,
});
```

An authenticated connection, a wrapper, or a test double is
`createWebSocket` / `createEventSource`. `openRowPatchStream` is the same
connector without React — frames in, status out.

`enabled: false` keeps everything idle — nothing is opened, nothing retries.
The table never owns your rows. `onPatch` hands you an updater, so it drops
straight into a `useState` setter and never races a concurrent update.

## Flash the cells that moved

A number that quietly becomes a different number is a number nobody
notices. `useChangedCellFlash` from the same `/stream` entry tracks the
cells a patch changed and answers `isCellFlashing(rowId, columnKey)`. Pass
that into the table; kits set `data-flash` on the cell and on the matching
card value, and your stylesheet decides what the pulse looks like — the
same seam `data-dirty` already uses.

It is off by default. `prefers-reduced-motion` is a hard opt-out of the
pulse (unlike `useHighlight`, which still marks the row and holds it
steady). An update is diffed, so a field sent back unchanged stays dark.
An insert marks the whole row; a remove has no cells left to mark.

```tsx
import {
  useChangedCellFlash,
  useRowPatchStream,
} from "@adapttable/core/stream";
import { rowPatchLog } from "@adapttable/core";
import { DataTable } from "@adapttable/mantine";

function LiveTable({ initial, columns }) {
  const [rows, setRows] = useState(initial);
  const flash = useChangedCellFlash({ enabled: true });
  useRowPatchStream({
    websocket: "wss://api.example.com/rows",
    getRowId: (row) => row.id,
    onPatch: (update) => {
      setRows((prev) => {
        const next = update(prev);
        const log = rowPatchLog(next);
        if (log) flash.mark(log.events);
        return next;
      });
    },
  });

  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      isCellFlashing={flash.isFlashing}
    />
  );
}
```

## What this page is not

A websocket that changes the row **under an open editor** is a conflict, not
this page. That lives under [cell editing](./cell-editing.md#live-update-conflicts).

## Notes

- Works in all eight adapters. The demo is the same feed on each kit.
- The table never owns your data. A patch is a new array you hand back.
- [API reference](./api.md) lists `applyRowPatches`, `applyRowPatchesWithLog`
  and the patch shapes.
