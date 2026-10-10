---
"@adapttable/ai": minor
"@adapttable/core": minor
---

Add optional `settleApply` delivery hooks and
`AgentCapabilityContext.whenApplied()` for custom handlers. Binding-owned column
visibility/order/pinning and explicit selection confirm the delivered model
before reporting success; result revisions reflect real updates and no-ops.
Synchronous bindings and void-compatible setters remain supported.

Bindings can await pending state publication before call admission. Retired table
identities/capability registries reject queued work, and cancellation/replay
preserve callback ownership and custom revision numbering. Neutral engine view
revisions include layout, pinning and selection; optional all-matching/cross-page
selection scope does not grant additional access.

Pending approvals can carry a stable frozen transaction token across snapshots,
with a fresh token for each transaction, so presentations distinguish reused
proposals. Hosts may continue to omit it.
