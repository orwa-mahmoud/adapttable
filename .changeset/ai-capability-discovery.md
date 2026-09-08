---
"@adapttable/ai": minor
---

Introduce optional, provider-independent table-agent support.

- A live capability manifest exposes only the operations the table wires and
  permits. `catalog`, `describe` and `execute` support compact discovery
  and on-demand schemas and guidance.
- JSON, OpenAI and transport-neutral MCP integrations reuse the same session.
  OpenAI tools include strict schemas. No model SDK or hosted service is required.
- `@adapttable/ai/react` supplies the opt-in `tableAgent` feature.
  Governed operations include filtering, sorting, paging, grouping, bounded
  row reads, selection, saved views, pinning and host-wired writes.
- Execution validates permissions, revisions, cancellation and idempotency.
  Custom writes declare staging and partial-execution support explicitly.
  Partial approval is restricted to aligned, independently executable plans;
  opaque operations are reviewed as whole operations.
- The HTTP bridge sends a compact manifest to a developer-owned endpoint,
  supports progressive discovery and continuation, binds commands to the
  request snapshot, and preserves completed work when cancellation stops
  subsequent actions. The host owns authentication, model credentials,
  authorization and persistence.
- `@adapttable/ai/assistant` provides an optional headless conversation
  controller with send, stop, clear, draft, transcript, live suggestions and
  result-derived receipts. Hosts can provide their own transport and UI.
  Closing the UI preserves the conversation; stopped or obsolete turns
  cannot append a late reply.
- Approval subjects and receipt contracts are typed. Human-facing approval
  details are separated from model-visible results; staged changes are
  distinguished from saved changes.

This is the package's initial release series; these capabilities are new,
not migrations from intermediate APIs developed on the v3 branch.
