---
"@adapttable/core": minor
"@adapttable/react": minor
---

A column formatting a server's subtotal is told which operation produced it.
`useQuerySource` and `useServerData` publish `TableSource.groupAggregations`
from the aggregates their request carried — the ones the host declared, and
whatever the reader has since chosen — so `formatAggregate` reads a
server-computed count as a count and a server-computed total as money.
Server-mode `<DataTable>` takes those declarations directly: `aggregates` is
now a prop alongside `supports`.

The operations belong to the response being drawn. Each request's operations
are held against its own key, and only a response that can be tied back to one
of them moves what is published; a response the table cannot place is reported
as unknown, so `formatAggregate` is never handed an operation that may be
wrong. `useQuerySource` gets that from the query's `dataUpdatedAt` read
against its request. On the server tier `onQueryChange` names each request in
`info.key`, and the new `responseKey` prop is where the answer's key comes
back — the one way a controlled tier can be accurate about it, since a
cancelled request is indistinguishable from an answered one from the outside.

A source that publishes nothing is unchanged, and an aggregate function only
the server understands is reported as unknown rather than guessed at.
`queryAggregateOps` is the reader for a source that assembles its own groups.
