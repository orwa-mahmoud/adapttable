---
"@adapttable/core": major
"@adapttable/react": major
"@adapttable/ai": minor
---

A React render stages the engine instead of writing to it. `stageCandidate`
builds a private candidate; `snapshot`, `rows`, the revision tokens and every
subscriber stay on the committed state until `commitCandidate` publishes it,
and `discardCandidate` drops one that never arrives. `TableEngineReader` is
the read half both the engine and its candidate answer to. A render that
suspends or is abandoned no longer changes the table an agent is reading, and
the tokens move only where the columns, the rows or the view values actually
differ — adopting a fresh `data` array or a new `rowKey` closure is not a
change anyone is told about.

`useTableEngine` and `useFrontendData` publish in a layout effect, before
paint. `useFrontendData` renders from the candidate, so the rows, the page it
settled on and the totals beside them come from one state.

A cancelled agent request stops before every unstarted write, whether or not
the table asks for approval: at the start of a reserved execution, after
planning, after approval, before the handler, and between the rows of a bulk
write. `AgentCapabilityContext` carries the request's `signal` and a
`throwIfCancelled()` for handlers with steps of their own. A request cancelled
before any write leaves its idempotency key free; one cancelled part way
through a bulk write keeps and reports the rows already written, and replays
that outcome instead of writing them again.
