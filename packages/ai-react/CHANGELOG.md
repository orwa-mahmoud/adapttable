# @adapttable/ai-react

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
