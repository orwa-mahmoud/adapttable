---
"@adapttable/ai": minor
---

Add optional `settleApply` delivery hooks for live table bindings and `AgentCapabilityContext.whenApplied()` for custom handlers. Binding-owned column visibility, column order, column pinning and explicit selection confirm the delivered model before reporting success, with matching result revisions and unchanged revisions for genuine no-ops.

When delivery is enabled, reserve invoked callback identities across cancellation and replay, and preserve custom observation revision numbering. Existing synchronous bindings and void-compatible apply setters remain supported.
