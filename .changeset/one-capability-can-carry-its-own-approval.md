---
"@adapttable/ai": minor
"@adapttable/ai-react": minor
---

A table can state who approves one capability, not just all of them.
`capabilityApproval` takes the same shape a row or bulk action carries, keyed by
capability, and replaces the table's shared policy for that key: `required` asks
on a table that asks for nothing, `automatic` skips the human on a table that
asks for writes. Approval decides who confirms an operation, never whether the
table offers it — a capability the table does not wire, or excludes, stays
unavailable.

The agent is offered editing wherever an editing channel is wired. Cell, row
and batch editing compose under different feature names, and a table editing
in batch kept every cell editable for the reader while telling the agent the
table had no writes at all.
