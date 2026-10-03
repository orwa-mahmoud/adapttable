# @adapttable/ai

## 0.5.2

### Patch Changes

- Updated dependencies [143d5bf]
  - @adapttable/core@3.8.1

## 0.5.1

### Patch Changes

- 42a4349: Keep agent revisions, sampled values and custom capabilities current when a table source or capability handler changes. Reject retained-session execution after disconnect and cancel pending work, preventing obsolete plans or destroyed tables from being written to.
- Updated dependencies [42a4349]
  - @adapttable/core@3.8.0

## 0.5.0

### Minor Changes

- d6e065c: Core owns the rest of what a second binding would otherwise copy from React. `@adapttable/core/binding` gains the state shapes the binding hooks return (`SelectionState`, `GridFocusState`, `TreeExpansionState`, `RowPinningState`, the URL-state results, `UseTableDataResult` and others), the `DENSITY_STATE` and `ROW_REORDER` keys with their state types, and the column-default and same-rows helpers (`resolveColumnDefaults`, `resolveColumnHeaders`, `columnPathText`, `sameRows`). `@adapttable/core` gains the column menu's drag-and-drop rules and state (`createColumnDragController`, `startColumnDrag`, `acceptColumnDrag`, `dropColumn`, `columnReorderKeyDown`), and `@adapttable/core/formula` the formula URL-state result. `@adapttable/ai` owns `TABLE_AGENT_STATE`.
  
  `@adapttable/react`, `@adapttable/ai-react` and `@adapttable/angular` re-export or call these under their existing names; their public APIs and behaviour are unchanged.

### Patch Changes

- Updated dependencies [d6e065c]
- Updated dependencies [643545d]
- Updated dependencies [ed815b3]
- Updated dependencies [96e5cc0]
  - @adapttable/core@3.7.0

## 0.4.0

### Minor Changes

- 4613ab6: `createTableAgentController`: the table agent's approval parking, always-allow memory, announcements, column sampling and WebMCP lifecycle as a framework-neutral controller.

### Patch Changes

- Updated dependencies [4613ab6]
- Updated dependencies [73d62b5]
- Updated dependencies [8c6aeda]
- Updated dependencies [6bec4e8]
- Updated dependencies [1bce1a4]
  - @adapttable/core@3.6.0

## 0.3.2

### Patch Changes

- Updated dependencies [e5615bd]
  - @adapttable/core@3.5.0

## 0.3.1

### Patch Changes

- Updated dependencies [7ee30f8]
- Updated dependencies [343239c]
  - @adapttable/core@3.4.0

## 0.3.0

### Minor Changes

- 36d14b9: `@adapttable/ai` exports the mapping from a table's runtime view to an agent session — `bindLiveSession` with the observation, row reads, apply and approval helpers beside it — so a binding for any framework can put an agent on a live table. `@adapttable/ai-react` builds its session from it; its API and behaviour are unchanged.

### Patch Changes

- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
  - @adapttable/core@3.3.0

## 0.2.3

### Patch Changes

- cbe937e: The docs and live demo now live at [adapttable.orwamahmoud.com](https://adapttable.orwamahmoud.com/), with React docs under `/react/`. Package homepages and README links point there; the previous addresses redirect.
- Updated dependencies [cbe937e]
  - @adapttable/core@3.2.2

## 0.2.2

### Patch Changes

- Updated dependencies [32677fd]
- Updated dependencies [068ba7e]
- Updated dependencies [6911b24]
- Updated dependencies [46a9ec3]
- Updated dependencies [7565dc4]
- Updated dependencies [79c9956]
- Updated dependencies [57d1217]
  - @adapttable/core@3.2.1

## 0.2.1

### Patch Changes

- Updated dependencies [3cf4297]
- Updated dependencies [037c2a5]
  - @adapttable/core@3.2.0

## 0.2.0

### Minor Changes

- 96110a1: `tableAgent` offers every row and bulk action the host composed as a governed agent capability — `rowAction.<key>` on one row, `bulkAction.<key>` on the current selection. The table's write policy and approval apply, an action's `ai.approval` overrides them, an action with a `confirm` block asks a person, and `ai: false` keeps an action away from the agent. `tableActionCapabilities` builds the same definitions for `createAgentSession`.
- 832d63d: A backend-mode voice clip can be the assistant's turn: `useSpeechInput({ onClip: assistant.sendClip })` sends it through the HTTP transport on the turn's first round, and the backend's `transcript` becomes the reader's message, with a localized "Voice message" placeholder until it arrives. `createAgentHttpClient().send` takes `audio` and `onTranscript`, and `AssistantTransport.send` receives `audio`.

### Patch Changes

- 091be10: Reference comments name the current entry points (`@adapttable/react/stream`, `@adapttable/react/features`), the `exportCsv({ writer })` feature form, the writer-derived default filename, the headless table's `table` role and the HTTP client's `full` default context profile.
- Updated dependencies [96110a1]
- Updated dependencies [9c0d3ef]
- Updated dependencies [c587812]
- Updated dependencies [d90cdd1]
- Updated dependencies [832d63d]
- Updated dependencies [e245987]
- Updated dependencies [d91b4f1]
- Updated dependencies [d6e7d65]
- Updated dependencies [ea48c20]
- Updated dependencies [091be10]
  - @adapttable/core@3.1.0

## 0.1.0

### Minor Changes

- 38c2e79: Introduce provider-independent table-agent support in `@adapttable/ai`.
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
  
  The contract names the operations each aggregatable column takes, so a
  caller plans against ids the table stores rather than guessing a spelling;
  a custom operation's description is answered by `describe`. A refusal lists
  the operations the column does take, unless naming them would disclose a
  column the caller may not read.
  
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
  - `/ag-ui` and `/ai-sdk` adapt agent streams to table execution. AI SDK call
    identities distinguish turns, requests and steps within a stream, while
    repeated calls within a step retain replay protection.
  - `/webmcp` exposes tools to an agent in the page — each taking an optional
    `expectedRevision`, so a call planned against a view the reader has left is
    refused rather than applied to a different one — and `/mcp-apps` supports an
    embedded table view in an MCP host.
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
  
  The conversation is the controller's by default and the host's on request.
  Pass `messages` and the controller renders that list instead of keeping its
  own; `onMessagesChange` reports every change with the whole list, so a
  transcript held in a store, loaded from an API or arriving over a socket is
  the one the reader sees. `conversation` decides how much of the history
  travels with a turn — every earlier message, the most recent n, or none at
  all for a backend that keeps its own session. It does not change what the
  reader sees.
  
  Stop, disconnect and resume are separate operations. Stop ends the turn and
  the work behind it; releasing the connection leaves the backend running, and a
  transport that named work through `onResumable` can rejoin it with `resume`.
  `onDetach` hands the `AssistantResumeHandle` to a host that keeps it and
  `resumeHandle` takes one back, which is where durable recovery across a page
  reload belongs. Within one session a completed action is not run twice on a
  resume; across a reload the session is new and the host owns it.
  
  A capability reports how far it has got through `reportProgress` on its
  execution context, and the session passes it on with the call that made it.
  Progress is never a result: the receipt still says what happened.
  
  Every action is judged against the view its turn was planned against, and
  reports the revision its own work reached — on every transport, not only HTTP.
  Later actions retain stale-command checks after a successful read or mutation;
  an unrelated table change is not adopted as the turn's own progress.
  
  React integration is supplied separately by `@adapttable/ai-react`.

### Patch Changes

- 28b3c3d: Pass hide and column order to the assistant the same way pin already is, and advertise the Started date filter on the AI demo.
- 7159258: Send the table's real aggregation ids and page sizes to the model, repair a refused call twice before showing it, and apply a page move after a restated size so setLimit cannot wipe it.
- e2e22c3: Publish exact AdaptTable runtime dependency versions rather than major-caret
  ranges. Each package resolves the sibling versions it was released with;
  consumers do not need to align package version numbers manually.
- Updated dependencies [28b3c3d]
- Updated dependencies [65fcbed]
- Updated dependencies [278a6d5]
- Updated dependencies [cd45219]
- Updated dependencies [4d05d7b]
- Updated dependencies [cd45219]
- Updated dependencies [4d05d7b]
  - @adapttable/core@3.0.0
