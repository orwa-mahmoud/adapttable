---
"@adapttable/ai": minor
"@adapttable/react": minor
---

Agents can pin columns and rows through the same governed executor every other
operation uses.

`view.pinColumn` takes a column key and a logical side, so one call is correct
under `dir="rtl"` as well as `ltr`; `view.pinRow` takes `top` or `bottom` plus
a stable `rowKey`, or a position with the revision it was read at. Both are
view operations, so neither takes the write-approval path. A column marked
unpinnable refuses a pin and still accepts an unpin, and summary rows are
refused as the chrome they are. `view.describe` now reports the live
`pinnedColumns` and `pinnedRows`.

Both capabilities appear only when the table actually wires them — the
operation decides, never the feature name.

`@adapttable/ai` also exports the assistant contracts a conversational UI is
built from: `AssistantRequest`, `AssistantAction`, `AssistantProposal`,
`AssistantOutcome`, `AssistantTurn`, `AssistantConversation`, the
`AssistantPlanner` seam, and `AssistantSuggestion` with `eligibleSuggestions`
and `assertUniqueSuggestions`. A capability definition may carry
`presentation` with a localized title and its own suggestions.
