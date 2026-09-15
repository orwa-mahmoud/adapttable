---
"@adapttable/ai": minor
---

Introduce provider-independent table-agent support in `@adapttable/ai`.
The package is framework-neutral and requires no model SDK or hosted service.

### Live context and execution

A session exposes `catalog`, `describe` and `execute` for the capabilities
a table currently wires and permits. Built-in operations cover filtering,
sorting, pagination, grouping, aggregation, selection, saved views, pinning,
bounded row reads and host-wired writes.

`@adapttable/ai/context` builds a permitted context with full and compact
profiles, an optional token budget, live filter and column information, and
on-demand guidance. Compact context retains column identities while deferring
descriptions and examples; `selection.deferredColumns` identifies details
available through `columns.describe`. Explicit budgets that cannot fit the
required context raise `ContextBudgetError`. Bounded column sampling is
opt-in.

The filter catalog publishes supported types, operators and available
options. Unambiguous option labels, column labels, casing differences and
operator aliases resolve to the table's stored spelling. Cell values and
free-text searches are not rewritten as choices. Pagination context reports
known totals and page counts without inventing totals for uncounted sources.

The session validates capability availability, inputs, write permissions and
expected revisions, and supports cancellation and idempotency. The host owns
data, authorization and persistence. Custom writes declare staging and
partial-execution support; independently executable plans can receive
per-item approvals, while opaque operations are reviewed as a whole.

### Optional integrations

- `/json`, `/openai` and `/mcp` expose the session to custom integrations,
  OpenAI tools and transport-neutral MCP hosts. MCP annotations identify
  read-only, destructive, idempotent and open-world behavior.
- `/http` connects to a developer-owned endpoint with catalog pinning,
  discovery, continuation, streamed replies and structured questions.
  `agentSystemPrompt` builds the default HTTP instructions from the request's
  context. The backend owns authentication and model credentials.
- `/ag-ui` and `/ai-sdk` adapt agent streams to table execution.
- `/webmcp` exposes tools to an agent in the page, and `/mcp-apps` supports
  an embedded table view in an MCP host.
- `/voice` provides browser or backend dictation support.

These subpaths do not add model or protocol SDK dependencies.

### Headless conversation and approval

`@adapttable/ai/assistant` provides `createTableAssistant` and
`TableAssistantStore`: draft, send, stop, clear, a single message list,
streamed text, structured questions, live suggestions and result-derived
receipts. Hosts can supply their own transport and interface.

`capabilityApproval` overrides the shared approval policy for a capability:
`required` requests confirmation and `automatic` skips it. These are
developer settings, not permission to execute an unavailable operation.
Separately, `approval.alwaysAllow` lets developers opt eligible capabilities
into a revocable reader choice; destructive and explicitly required actions
are excluded.

Receipts distinguish refused, partially applied, staged and saved work.
`subjectFor` supplies structured descriptions for custom transports.
View Undo is available through `undoTurn` and `undoAction`; it does not undo
data writes, which remain owned by edit history and host persistence.

React integration is supplied separately by `@adapttable/ai-react`.
