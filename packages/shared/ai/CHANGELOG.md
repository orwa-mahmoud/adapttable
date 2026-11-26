# @adapttable/ai

## 0.8.0

### Minor Changes

- 923b252: A table agent loads the WebMCP registrar only when it sets `webmcp`. The controller is also on the new `@adapttable/ai/agent` entry, which the React, Vue and Angular bindings now use, so `tableAgent` starts 0.54–0.58 KiB smaller in each framework and the registrar arrives as a 1.1 KiB chunk the first time a table offers itself to a page agent.

### Patch Changes

- d1f33b7: The HTTP transport keeps each connection's state apart and bounds every reply. A backend's session handle stays with the connection that was issued it, so two connections to one table each send their own and resetting one leaves the other intact. A timeout or cancel now also covers header resolution, a streamed reply holds one abort listener instead of one per chunk, and the upstream body is cancelled after the terminal event. JSON replies are refused at 512,000 bytes while reading, or before reading when their length says so, and a failed reply reads only the first 4 KB it shows as its diagnostic.
- 501fb5c: The agent never reads a column it is not allowed to read. Column discovery applies each column's permission and declared type before sampling a value, so a column marked unreadable is never invoked and a typed one needs no sample. Row reads prepare the requested columns once per read: 50 rows × 100 of 300 columns go from 2.2 ms to 1.6 ms with identical output.
- 8af4736: A feature's `setup(host)` only registers; what outlives a render goes in its `mount(context)`, which returns what releases it. Every binding keeps a mounted feature by id: declaring it again with new options, inline included, keeps the resource and hands `context.feature()` the new declaration, and only removing the feature, changing its `dependencies` or unmounting the table releases it, exactly once. A render the framework discards acquires nothing, and a failed mount rolls back what its pass acquired. React publishes the table runtime and its feature ids in layout effects, so AI and event callbacks read the last committed table; `PublishTableRuntime` is the chrome's publisher. `createFeatureMounts` and `composeMounts` on `@adapttable/core/binding` are the shared lifecycle. A `setup` that returns a cleanup is refused, and `onDispose` is no longer on the feature host. Vue's and Angular's table agent follows its latest declaration's options. `adapttable migrate-v4` reports `onDispose` calls.
- Updated dependencies [35abf7a]
- Updated dependencies [1bf65dd]
- Updated dependencies [ee0f202]
- Updated dependencies [225b501]
- Updated dependencies [7e27f45]
- Updated dependencies [536aa89]
- Updated dependencies [20c19a9]
- Updated dependencies [04d741f]
- Updated dependencies [9c18ce9]
- Updated dependencies [29dba96]
- Updated dependencies [cdbba81]
- Updated dependencies [bf57e9b]
- Updated dependencies [7e9d071]
- Updated dependencies [069735e]
- Updated dependencies [f6d17be]
- Updated dependencies [08be47a]
- Updated dependencies [1ee8c87]
- Updated dependencies [a4464a0]
- Updated dependencies [cb9f9db]
- Updated dependencies [43cf65e]
- Updated dependencies [69c475a]
- Updated dependencies [da4baa0]
- Updated dependencies [bee0c9f]
- Updated dependencies [636d0ad]
- Updated dependencies [8af4736]
- Updated dependencies [bb9ee7a]
- Updated dependencies [633e23c]
- Updated dependencies [d2beb5a]
- Updated dependencies [a96cfee]
- Updated dependencies [fbc52e8]
- Updated dependencies [ad4c90a]
- Updated dependencies [3ecb133]
- Updated dependencies [5a791f2]
- Updated dependencies [3c0ae19]
- Updated dependencies [6612d37]
- Updated dependencies [48cea86]
- Updated dependencies [4effc96]
- Updated dependencies [eb084d0]
- Updated dependencies [5b7bc3c]
- Updated dependencies [b36d160]
- Updated dependencies [3b2a5bd]
- Updated dependencies [c807131]
  - @adapttable/core@4.0.0

## 0.7.2

### Patch Changes

- Updated dependencies [6bee472]
- Updated dependencies [8c8eb0a]
  - @adapttable/core@3.16.0

## 0.7.1

### Patch Changes

- fb0e3af: Doc comments name a link target only when the entry point that publishes the comment exports it; any other name is written as code. Editor hovers and the API reference show no broken links.
- Updated dependencies [308e2f8]
- Updated dependencies [fb0e3af]
- Updated dependencies [e8d3443]
- Updated dependencies [2582d80]
- Updated dependencies [55d0118]
- Updated dependencies [e1bad04]
  - @adapttable/core@3.15.0

## 0.7.0

### Minor Changes

- 0fca0b0: The AI packages run one definition per command.
  
  - Each built-in agent capability is one command object — schema, argument reading, live guide, preview and apply — and the session runs every capability, built-in or custom, through the same registry. `@adapttable/ai/openai` no longer loads the capability guides (about 2.7 KB gzip off that entry).
  - `describe` publishes output schemas matching what each capability returns (`rows.read`'s row envelope, `view.describe`'s columns, filters and pagination, and write results with `partial` approval, `approvalReason` and per-row `results`).
  - Dictation and the assistant run on shared helpers (`createSpeechSession` on `@adapttable/ai/voice`; `tableAssistantInputs`, `tableAssistantFields`, `assistantUndoView` on `@adapttable/ai/assistant`), so React, Vue and Angular behave the same: choosing a dictation language with voice off writes nothing, and a panel inside the table reports a write waiting on the reader as awaiting approval.
  - Approvals answer the keyboard in every binding: Vue's strip above the table moves focus to Reject when a change arrives and Escape rejects it; in Angular, Escape belongs to an open approval dialog and leaves the assistant panel open.
  - The transports and the agent contract are organized into modules by responsibility, with every export unchanged.

### Patch Changes

- d92b039: Agent context `pinnedRows` accepts the table's row pin state, `{ top, bottom }` lists of row ids, as well as any record.
- 0fca0b0: Each entry point serves one audience, and the three bindings publish the same ones.
  
  - `@adapttable/core`'s main entry advertises the names a table reaches for. 651 names only the bindings use, or that no table, guide or example uses, are exported from `@adapttable/core/binding` (internal to AdaptTable packages) and stay on the main entry as deprecated aliases of the same value or type, so existing imports keep working. Undeprecated main-entry names: 1,494 → 845. The bindings take that machinery from `@adapttable/core/binding`.
  - React's main entry moves the 41 names only kits use to `@adapttable/react/adapter`, with deprecated aliases left on the main entry.
  - `@adapttable/react/pdf`, `/xlsx` and `@adapttable/angular/pdf`, `/xlsx` carry `exportPdf` / `exportXlsx` and core's PDF and XLSX helpers, as `@adapttable/vue` does; Angular's `exportPdf` and `exportXlsx` on `/features` are deprecated. Every Vue kit publishes the same entry points (`/export-csv`, `/export-pdf`, `/export-xlsx`, `/columns`, `/rows` where they were missing).
  - New on the bindings so hosts and kits do not reach into core: `applyRowPatches`, `updateRow`, `createMemoryAdapter` on `@adapttable/angular`; `createTableEngine` on `@adapttable/vue`; `treeRowAria` / `treeTableAria` on `@adapttable/react/adapter`. New on core: `filterTreeConditionChips`, `checklistSlice`, `nextChecklistViewport` (the three bindings' chips and checklists are built on them) and `EditableCellEditorCtrl`.
- Updated dependencies [0fca0b0]
- Updated dependencies [cbda297]
- Updated dependencies [39057e0]
- Updated dependencies [0fca0b0]
- Updated dependencies [9897b46]
- Updated dependencies [0fca0b0]
- Updated dependencies [8bc96c5]
- Updated dependencies [f20f914]
- Updated dependencies [aa07a99]
- Updated dependencies [b8b52f4]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
  - @adapttable/core@3.14.0

## 0.6.6

### Patch Changes

- Updated dependencies [7dee39f]
  - @adapttable/core@3.13.1

## 0.6.5

### Patch Changes

- Updated dependencies [549ee08]
- Updated dependencies [702a702]
- Updated dependencies [7ee7489]
- Updated dependencies [b4f2c66]
- Updated dependencies [e50c6c8]
- Updated dependencies [858ef5b]
  - @adapttable/core@3.13.0

## 0.6.4

### Patch Changes

- Updated dependencies [e3e40e7]
  - @adapttable/core@3.12.0

## 0.6.3

### Patch Changes

- b33a9ee: Keep table state and editing history consistent across async work and framework lifecycles.
  
  - Restore AI query state before pagination during undo, include pagination side effects in single-action undo, and retire undo/resume state when chat is cleared.
  - Ignore obsolete lazy tree requests after disconnect and allow pending rows to reload on reconnect.
  - Serialize saved-view storage writes, wait for pending writes before reload, retain replacement metadata, and remove renamed views only after their replacement saves successfully.
  - Keep disabled or disconnected editing history inert. Capture undo values before host writes, but record inline and batch saves only after success, preserving redo when saves fail.
  - Keep React assistants alive through Strict Mode replay, preserve WebSocket connections across equivalent protocol arrays, and scroll virtual rows into view during keyboard navigation. Batch virtual row measurements safely during React commits.
  - Synchronize mounted range filters after persisted state changes in React, Angular and Vue, while retaining local previews across unrelated changes.
  - Report absolute virtualized column positions and total column counts to assistive technology in Angular.
  - Stabilize Angular virtual keyboard navigation by measuring rows after rendering, revealing unmounted destinations, and suppressing the page-level sentinel below bounded virtual tables.
  - Await asynchronous paste/fill saves, preserve history until they succeed, and announce rejected saves or invalid pasted values without unhandled promise failures. Add localized fill failure messages in every locale.
  - Compute selection statistics without argument-count overflow or intermediate value matrices, count only loaded cells, and bound copy/statistics work to the loaded selection. Keep clipboard and export value resolution aligned while reducing optional feature bundle size.
  - Retire obsolete validation and save results across clear/retry transitions, release completed request identities, clear stale errors after synchronous retries, and preserve the original save error if a host formatter throws.
  - Honor zero/sub-unit edit-history depth and snapshot redo descriptors before a host reuses its batch array.
  - Detect a fill series once per source lane instead of recomputing it for every destination cell, keeping large drag-fill gestures responsive.
  - Handle copy/cut/paste/fill/find shortcuts with Caps Lock and report rejected fill parsing without throwing or extending the selected range.
  - Compute pivot min/max without spreading large groups into function arguments, avoiding stack-limit failures on large datasets.
  - Replace obsolete field errors from row validation when the row is checked again, preserving independent cell-validator errors and clearing both sources on reset.
  - Share one Reka runtime across showcase kits so Nuxt UI shortcut menus can receive focus inside the mobile assistant sheet and Escape closes the menu alone.
  - Keep assistant receipts readable without compounded opacity, improve neutral status and secondary control contrast, and use Naive UI's text token for the composer placeholder. Verify all supported assistants in light and dark themes with browser contrast checks.
  - Ignore server export progress callbacks after the run succeeds, fails or is dismissed, keeping terminal outcomes stable.
  - Retire React's all-matching selection on query reset even without explicit selected IDs, and when across-page selection becomes unavailable.
  - Retire pending clipboard reads and cuts when the grid detaches, preventing delayed host writes after unmount or remount.
  - Reset Vue row selection when search, filters or grouping change, retain it across paging and sorting, and respect controlled host refusal. Include compound filters in React's selection reset key.
  - Improve warning status and approval button contrast with native kit colors, including light and dark approval/rejection states.
  - Announce copy value-conversion failures without throwing, writing an incomplete clipboard or clearing cut cells.
- Updated dependencies [b33a9ee]
- Updated dependencies [426d44f]
  - @adapttable/core@3.11.0

## 0.6.2

### Patch Changes

- Updated dependencies [c201ffb]
- Updated dependencies [d35c348]
- Updated dependencies [d7ddec5]
  - @adapttable/core@3.10.0

## 0.6.1

### Patch Changes

- Updated dependencies [9213f9a]
  - @adapttable/core@3.9.1

## 0.6.0

### Minor Changes

- 0120bd4: Add optional `settleApply` delivery hooks and
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

### Patch Changes

- Updated dependencies [0120bd4]
- Updated dependencies [f3240c8]
- Updated dependencies [19da962]
- Updated dependencies [d32983f]
- Updated dependencies [da5d11b]
- Updated dependencies [1946b61]
- Updated dependencies [05b436c]
- Updated dependencies [88840eb]
- Updated dependencies [d32983f]
- Updated dependencies [aebbd39]
  - @adapttable/core@3.9.0

## 0.5.2

### Patch Changes

- 8d1e749: Correct native control labels, separator and list-item semantics, and keyboard scroll-region metadata. Preserve established Angular binding names and signal access while removing alias declarations. Share live bulk-action coordination, consolidate CSS rules, and simplify re-exports and controller code without changing subscription snapshots or filter memo invalidation.
- Updated dependencies [143d5bf]
- Updated dependencies [8d1e749]
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
