# @adapttable/ai-react

## 0.2.12

### Patch Changes

- Updated dependencies [143d5bf]
- Updated dependencies [8d1e749]
- Updated dependencies [143d5bf]
  - @adapttable/core@3.8.1
  - @adapttable/ai@0.5.2
  - @adapttable/react@1.6.0

## 0.2.11

### Patch Changes

- Updated dependencies [42a4349]
- Updated dependencies [42a4349]
- Updated dependencies [42a4349]
  - @adapttable/ai@0.5.1
  - @adapttable/core@3.8.0
  - @adapttable/react@1.5.0

## 0.2.10

### Patch Changes

- d6e065c: Core owns the rest of what a second binding would otherwise copy from React. `@adapttable/core/binding` gains the state shapes the binding hooks return (`SelectionState`, `GridFocusState`, `TreeExpansionState`, `RowPinningState`, the URL-state results, `UseTableDataResult` and others), the `DENSITY_STATE` and `ROW_REORDER` keys with their state types, and the column-default and same-rows helpers (`resolveColumnDefaults`, `resolveColumnHeaders`, `columnPathText`, `sameRows`). `@adapttable/core` gains the column menu's drag-and-drop rules and state (`createColumnDragController`, `startColumnDrag`, `acceptColumnDrag`, `dropColumn`, `columnReorderKeyDown`), and `@adapttable/core/formula` the formula URL-state result. `@adapttable/ai` owns `TABLE_AGENT_STATE`.
  
  `@adapttable/react`, `@adapttable/ai-react` and `@adapttable/angular` re-export or call these under their existing names; their public APIs and behaviour are unchanged.
- Updated dependencies [d6e065c]
- Updated dependencies [643545d]
- Updated dependencies [ed815b3]
- Updated dependencies [96e5cc0]
  - @adapttable/core@3.7.0
  - @adapttable/ai@0.5.0
  - @adapttable/react@1.4.0

## 0.2.9

### Patch Changes

- 4613ab6: `tableAgent` runs on `createTableAgentController` from `@adapttable/ai`. Its API is unchanged.
- Updated dependencies [4613ab6]
- Updated dependencies [73d62b5]
- Updated dependencies [8c6aeda]
- Updated dependencies [6bec4e8]
- Updated dependencies [1bce1a4]
  - @adapttable/core@3.6.0
  - @adapttable/ai@0.4.0
  - @adapttable/react@1.3.6

## 0.2.8

### Patch Changes

- Updated dependencies [e5615bd]
  - @adapttable/core@3.5.0
  - @adapttable/react@1.3.5
  - @adapttable/ai@0.3.2

## 0.2.7

### Patch Changes

- Updated dependencies [7ee30f8]
- Updated dependencies [343239c]
  - @adapttable/core@3.4.0
  - @adapttable/react@1.3.4
  - @adapttable/ai@0.3.1

## 0.2.6

### Patch Changes

- 36d14b9: `@adapttable/ai` exports the mapping from a table's runtime view to an agent session — `bindLiveSession` with the observation, row reads, apply and approval helpers beside it — so a binding for any framework can put an agent on a live table. `@adapttable/ai-react` builds its session from it; its API and behaviour are unchanged.
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
  - @adapttable/ai@0.3.0
  - @adapttable/core@3.3.0
  - @adapttable/react@1.3.3

## 0.2.5

### Patch Changes

- 3bb83b4: The table agent reads server-data tables whose rows hold a `BigInt` or a circular reference; it no longer throws while building the manifest.

## 0.2.4

### Patch Changes

- cbe937e: The docs and live demo now live at [adapttable.orwamahmoud.com](https://adapttable.orwamahmoud.com/), with React docs under `/react/`. Package homepages and README links point there; the previous addresses redirect.
- Updated dependencies [cbe937e]
  - @adapttable/ai@0.2.3
  - @adapttable/core@3.2.2
  - @adapttable/react@1.3.2

## 0.2.3

### Patch Changes

- Updated dependencies [32677fd]
- Updated dependencies [068ba7e]
- Updated dependencies [6911b24]
- Updated dependencies [46a9ec3]
- Updated dependencies [7565dc4]
- Updated dependencies [79c9956]
- Updated dependencies [308effa]
- Updated dependencies [57d1217]
  - @adapttable/core@3.2.1
  - @adapttable/react@1.3.1
  - @adapttable/ai@0.2.2

## 0.2.2

### Patch Changes

- Updated dependencies [338e626]
  - @adapttable/react@1.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [3cf4297]
- Updated dependencies [5e66063]
- Updated dependencies [06c3694]
- Updated dependencies [14ba2ea]
- Updated dependencies [037c2a5]
- Updated dependencies [1039051]
  - @adapttable/core@3.2.0
  - @adapttable/react@1.2.0
  - @adapttable/ai@0.2.1

## 0.2.0

### Minor Changes

- 96110a1: `tableAgent` offers every row and bulk action the host composed as a governed agent capability — `rowAction.<key>` on one row, `bulkAction.<key>` on the current selection. The table's write policy and approval apply, an action's `ai.approval` overrides them, an action with a `confirm` block asks a person, and `ai: false` keeps an action away from the agent. `tableActionCapabilities` builds the same definitions for `createAgentSession`.
- 832d63d: A backend-mode voice clip can be the assistant's turn: `useSpeechInput({ onClip: assistant.sendClip })` sends it through the HTTP transport on the turn's first round, and the backend's `transcript` becomes the reader's message, with a localized "Voice message" placeholder until it arrives. `createAgentHttpClient().send` takes `audio` and `onTranscript`, and `AssistantTransport.send` receives `audio`.

### Patch Changes

- Updated dependencies [96110a1]
- Updated dependencies [42f4117]
- Updated dependencies [9c0d3ef]
- Updated dependencies [c587812]
- Updated dependencies [bd95c61]
- Updated dependencies [d90cdd1]
- Updated dependencies [e82b90f]
- Updated dependencies [832d63d]
- Updated dependencies [81eeb48]
- Updated dependencies [e245987]
- Updated dependencies [65306b8]
- Updated dependencies [84fbb7d]
- Updated dependencies [d91b4f1]
- Updated dependencies [d6e7d65]
- Updated dependencies [ad6532c]
- Updated dependencies [0a5aa1b]
- Updated dependencies [ea48c20]
- Updated dependencies [67d276d]
- Updated dependencies [091be10]
- Updated dependencies [aa57a3a]
  - @adapttable/ai@0.2.0
  - @adapttable/core@3.1.0
  - @adapttable/react@1.1.0

## 0.1.0

### Minor Changes

- 9b310ab: Introduce `@adapttable/ai-react`, the React integration for the
  framework-neutral `@adapttable/ai` package.
  
  `tableAgent` connects a table's live capabilities, columns, source and host
  callbacks to an agent session. `useTableAssistant` connects the headless
  conversation controller to React. Cell, row and batch editing are exposed
  through their wired editing channels.
  
  React DOM 18 or 19 is a peer dependency. Binding-owned view changes are
  committed before returning their execution revision, so sequential commands
  can follow their own updates without accepting unrelated reader changes.
  
  The bridge can publish the session, view inputs, approvals and remembered
  allowances to a panel mounted outside the table. Pass the published
  `contextInputs` and `alwaysAllow` state to `useTableAssistant` when the
  panel cannot read the table's feature state directly.
  
  `tableAgent` samples the columns whose author set `ai.sample`, once per
  contract, and hands the values into the context — a model then filters on the
  spelling the table stores rather than guessing one.
  
  `useTableAssistant` takes `messages` and `onMessagesChange` for a host that
  owns the transcript, and `conversation` for how much of it is sent with each
  turn.
  
  `useTableAssistant` returns `resume`, `interrupted` and `resumable` for a
  connection that went while the work carried on, and `progress` for a
  capability that says how far it has got. `onDetach` and `resumeHandle` are
  where a host keeps that work across a page reload. `tableAgent` publishes
  progress through `bridge.progress` and the table's own state.
  
  Use an optional native widget from `@adapttable/<kit>/assistant`, or build
  your own UI and transport. This is the package's initial release; no migration
  from an earlier AdaptTable AI React package is required.

### Patch Changes

- 28b3c3d: Pass hide and column order to the assistant the same way pin already is, and advertise the Started date filter on the AI demo.
- 7159258: Send the table's real aggregation ids and page sizes to the model, repair a refused call twice before showing it, and apply a page move after a restated size so setLimit cannot wipe it.
- e2e22c3: Publish exact AdaptTable runtime dependency versions rather than major-caret
  ranges. Each package resolves the sibling versions it was released with;
  consumers do not need to align package version numbers manually.
- Updated dependencies [38c2e79]
- Updated dependencies [28b3c3d]
- Updated dependencies [7159258]
- Updated dependencies [e2e22c3]
- Updated dependencies [65fcbed]
- Updated dependencies [278a6d5]
- Updated dependencies [3b3de11]
- Updated dependencies [cd45219]
- Updated dependencies [4d05d7b]
- Updated dependencies [cd45219]
- Updated dependencies [4d05d7b]
  - @adapttable/ai@0.1.0
  - @adapttable/react@1.0.0
  - @adapttable/core@3.0.0

## 0.1.0

### Minor Changes

- Bind an AdaptTable AI session from a React table. `tableAgent` publishes
  the live manifest. `useTableAssistant` owns the conversation.
  `@adapttable/ai` stays React-free. Kit widgets stay on
  `@adapttable/<kit>/assistant`.
