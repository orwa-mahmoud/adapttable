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

Use an optional native widget from `@adapttable/<kit>/assistant`, or build
your own UI and transport. This is the package's initial release; no migration
from an earlier AdaptTable AI React package is required.
