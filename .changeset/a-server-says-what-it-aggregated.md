---
"@adapttable/core": minor
"@adapttable/react": minor
---

A column formatting a server's subtotal is told which operation produced it.
`useQuerySource` and `useServerData` publish `TableSource.groupAggregations`
from the aggregates their request carried — the ones the host declared, and
whatever the reader has since chosen — so `formatAggregate` reads a
server-computed count as a count and a server-computed total as money.

It describes the response being drawn, not one still in flight. Retained rows
keep the operations they were computed with through a fetch that fails, one
that is cancelled, and a host that reports `loading` a tick late.
`useQuerySource` reads that from the query's `dataUpdatedAt`; on the server
tier `onQueryChange` names each request in `info.key`, and the new
`responseKey` prop is where the answer's key comes back.

A source that publishes nothing is unchanged, and an aggregate function only
the server understands is reported as unknown rather than guessed at.
`queryAggregateOps` is the reader for a source that assembles its own groups.
