---
"@adapttable/core": minor
"@adapttable/react": minor
---

A column formatting a server's subtotal is told which operation produced it.
`useQuerySource` and `useServerData` publish `TableSource.groupAggregations`
from the aggregates their request carried — the ones the host declared, and
whatever the reader has since chosen — so `formatAggregate` reads a
server-computed count as a count and a server-computed total as money.

It describes the response being drawn, not one still in flight: while a
request is out, the numbers on screen keep the operations they were answered
with. A source that publishes nothing is unchanged, and an aggregate function
only the server understands is reported as unknown rather than guessed at.
`queryAggregateOps` is the reader for a source that assembles its own groups.
