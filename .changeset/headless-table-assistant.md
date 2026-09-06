---
"@adapttable/ai": minor
---

`@adapttable/ai/assistant` adds `useTableAssistant`, a conversation with no UI
of its own: status, transcript, draft, `send`, `stop`, `clear`, live
suggestions and panel state. A host renders its own panel from those values —
`examples/ai-assistant-custom-ui.tsx` is a complete one.

One send runs at a time, reserved before any await. A draft is put back if the
turn fails. Stopping is not a failure and nothing is retried, so an action
whose outcome is unknown stays unknown. A reply belonging to a previous table,
or to a panel that has unmounted, is dropped. Closing the panel discards
nothing.

Receipts come from results rather than an outer flag: `receiptFromResult`,
`receiptsFromResults` and `turnStatus` report `executed`, `staged`,
`rejected`, `awaiting-approval`, `cancelled`, `stale`, `failed` and summarize
a turn as `applied`, `partial`, `none`, `cancelled` or `failed`. An approved
write that has not reached the host reads as staged.

`AssistantTransport` is the seam a host fills, and it names nothing about HTTP
or any model. `assistantHttpTransport` on `@adapttable/ai/http` adapts the
existing backend bridge for hosts that want it.

`tableAgent` now returns the row-agnostic `StaticTableFeature`, so it composes
onto a typed table on its own rather than only alongside row-typed features.
