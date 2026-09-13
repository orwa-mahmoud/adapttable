---
"@adapttable/ai": minor
"@adapttable/ai-react": minor
---

A table can state who approves one capability, not just all of them.
`capabilityApproval` takes the same shape a row or bulk action carries, keyed
by capability, and resolves field by field against the table's shared policy.
It narrows only: a capability the table requires a human for cannot be waved
through here.

The agent is offered editing wherever an editing channel is wired. Cell, row
and batch editing compose under different feature names, and a table editing
in batch kept every cell editable for the reader while telling the agent the
table had no writes at all.
