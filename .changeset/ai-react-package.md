---
"@adapttable/ai-react": minor
---

Introduce `@adapttable/ai-react`, the React integration for the
framework-neutral `@adapttable/ai` package.

`tableAgent` connects a table's live capabilities, columns, source and host
callbacks to an agent session. `useTableAssistant` connects the headless
conversation controller to React. Cell, row and batch editing are exposed
through their wired editing channels.

The bridge can publish the session, view inputs, approvals and remembered
allowances to a panel mounted outside the table. Pass the published
`contextInputs` and `alwaysAllow` state to `useTableAssistant` when the
panel cannot read the table's feature state directly.

`useTableAssistant` returns `resume`, `interrupted` and `resumable` for a
connection that went while the work carried on, and `progress` for a
capability that says how far it has got. `onDetach` and `resumeHandle` are
where a host keeps that work across a page reload. `tableAgent` publishes
progress through `bridge.progress` and the table's own state.

Use an optional native widget from `@adapttable/<kit>/assistant`, or build
your own UI and transport. This is the package's initial release; no migration
from an earlier AdaptTable AI React package is required.
