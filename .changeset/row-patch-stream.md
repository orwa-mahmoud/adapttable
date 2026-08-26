---
"@adapttable/core": minor
---

Live row patches over WebSocket or SSE

`useRowPatchStream` from `@adapttable/core/stream` binds a socket to the rows
you already own: frames arrive as ordinary row patches and go back through
your own setter, so filters, sort, grouping and aggregates all happen the way
they do for any other change.

The wire format is the patch shape the table already has — one patch or an
array of them, as JSON — so a server that speaks it needs no translation, and
one that does not supplies `parse`. Nothing from the wire is trusted: a frame
that will not parse, an update with no changes, a remove with no id are each
dropped rather than applied.

A dropped WebSocket is reopened on a configurable delay and attempt cap. An
EventSource is left to its own reconnect and simply reported, so the server
never gets two subscriptions for one table. `status` covers idle, connecting,
open, reconnecting, error and closed.

`openRowPatchStream` is the same connector without React.
