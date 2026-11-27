# @adapttable/ai-angular

## 0.1.15

### Patch Changes

- Updated dependencies [ea5761c]
- Updated dependencies [93bf6f1]
  - @adapttable/angular@0.12.1
  - @adapttable/ai@0.8.1

## 0.1.14

### Patch Changes

- 923b252: A table agent loads the WebMCP registrar only when it sets `webmcp`. The controller is also on the new `@adapttable/ai/agent` entry, which the React, Vue and Angular bindings now use, so `tableAgent` starts 0.54–0.58 KiB smaller in each framework and the registrar arrives as a 1.1 KiB chunk the first time a table offers itself to a page agent.
- 8af4736: A feature's `setup(host)` only registers; what outlives a render goes in its `mount(context)`, which returns what releases it. Every binding keeps a mounted feature by id: declaring it again with new options, inline included, keeps the resource and hands `context.feature()` the new declaration, and only removing the feature, changing its `dependencies` or unmounting the table releases it, exactly once. A render the framework discards acquires nothing, and a failed mount rolls back what its pass acquired. React publishes the table runtime and its feature ids in layout effects, so AI and event callbacks read the last committed table; `PublishTableRuntime` is the chrome's publisher. `createFeatureMounts` and `composeMounts` on `@adapttable/core/binding` are the shared lifecycle. A `setup` that returns a cleanup is refused, and `onDispose` is no longer on the feature host. Vue's and Angular's table agent follows its latest declaration's options. `adapttable migrate-v4` reports `onDispose` calls.
- Updated dependencies [923b252]
- Updated dependencies [d1f33b7]
- Updated dependencies [501fb5c]
- Updated dependencies [b94b20c]
- Updated dependencies [bc19944]
- Updated dependencies [7dbd509]
- Updated dependencies [06e676e]
- Updated dependencies [72b4cde]
- Updated dependencies [35abf7a]
- Updated dependencies [1ea5a0b]
- Updated dependencies [35a1ec0]
- Updated dependencies [ee0f202]
- Updated dependencies [536aa89]
- Updated dependencies [cb9f9db]
- Updated dependencies [da4baa0]
- Updated dependencies [bee0c9f]
- Updated dependencies [636d0ad]
- Updated dependencies [8af4736]
- Updated dependencies [633e23c]
- Updated dependencies [ed8a86d]
- Updated dependencies [a96cfee]
- Updated dependencies [31e5510]
- Updated dependencies [fbc52e8]
- Updated dependencies [ffd1a07]
- Updated dependencies [4effc96]
- Updated dependencies [eb084d0]
- Updated dependencies [5b7bc3c]
- Updated dependencies [b36d160]
- Updated dependencies [3b2a5bd]
  - @adapttable/ai@0.8.0
  - @adapttable/angular@0.12.0

## 0.1.13

### Patch Changes

- Updated dependencies [6bee472]
  - @adapttable/angular@0.11.0
  - @adapttable/ai@0.7.2

## 0.1.12

### Patch Changes

- fb0e3af: Doc comments name a link target only when the entry point that publishes the comment exports it; any other name is written as code. Editor hovers and the API reference show no broken links.
- Updated dependencies [75dbf94]
- Updated dependencies [fb0e3af]
- Updated dependencies [2582d80]
  - @adapttable/angular@0.10.0
  - @adapttable/ai@0.7.1

## 0.1.11

### Patch Changes

- 0fca0b0: The AI packages run one definition per command.
  
  - Each built-in agent capability is one command object — schema, argument reading, live guide, preview and apply — and the session runs every capability, built-in or custom, through the same registry. `@adapttable/ai/openai` no longer loads the capability guides (about 2.7 KB gzip off that entry).
  - `describe` publishes output schemas matching what each capability returns (`rows.read`'s row envelope, `view.describe`'s columns, filters and pagination, and write results with `partial` approval, `approvalReason` and per-row `results`).
  - Dictation and the assistant run on shared helpers (`createSpeechSession` on `@adapttable/ai/voice`; `tableAssistantInputs`, `tableAssistantFields`, `assistantUndoView` on `@adapttable/ai/assistant`), so React, Vue and Angular behave the same: choosing a dictation language with voice off writes nothing, and a panel inside the table reports a write waiting on the reader as awaiting approval.
  - Approvals answer the keyboard in every binding: Vue's strip above the table moves focus to Reject when a change arrives and Escape rejects it; in Angular, Escape belongs to an open approval dialog and leaves the assistant panel open.
  - The transports and the agent contract are organized into modules by responsibility, with every export unchanged.
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [d92b039]
- Updated dependencies [1ee0ea3]
- Updated dependencies [2ecf579]
- Updated dependencies [68db6b2]
- Updated dependencies [39057e0]
- Updated dependencies [39057e0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [39057e0]
- Updated dependencies [64069d0]
- Updated dependencies [0fca0b0]
- Updated dependencies [64069d0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [39057e0]
  - @adapttable/angular@0.9.0
  - @adapttable/ai@0.7.0

## 0.1.10

### Patch Changes

- @adapttable/angular@0.8.1
  - @adapttable/ai@0.6.6

## 0.1.9

### Patch Changes

- Updated dependencies [46f6212]
- Updated dependencies [5b8adbd]
- Updated dependencies [f009a47]
- Updated dependencies [d9bca8c]
- Updated dependencies [a3f3c45]
- Updated dependencies [91ea216]
- Updated dependencies [b4f2c66]
- Updated dependencies [2e930c2]
  - @adapttable/angular@0.8.0
  - @adapttable/ai@0.6.5

## 0.1.8

### Patch Changes

- Updated dependencies [e3e40e7]
- Updated dependencies [ffc8540]
  - @adapttable/angular@0.7.0
  - @adapttable/ai@0.6.4

## 0.1.7

### Patch Changes

- Updated dependencies [0f1df5a]
  - @adapttable/angular@0.6.2

## 0.1.6

### Patch Changes

- Updated dependencies [b33a9ee]
- Updated dependencies [426d44f]
  - @adapttable/ai@0.6.3
  - @adapttable/angular@0.6.1

## 0.1.5

### Patch Changes

- Updated dependencies [019364c]
- Updated dependencies [753873b]
- Updated dependencies [66aa1f8]
- Updated dependencies [330566b]
- Updated dependencies [d35c348]
- Updated dependencies [d7ddec5]
  - @adapttable/angular@0.6.0
  - @adapttable/ai@0.6.2

## 0.1.4

### Patch Changes

- Updated dependencies [c8d10ab]
  - @adapttable/angular@0.5.2

## 0.1.3

### Patch Changes

- Updated dependencies [7bedef1]
- Updated dependencies [29ff08e]
  - @adapttable/angular@0.5.1
  - @adapttable/ai@0.6.1

## 0.1.2

### Patch Changes

- 7e33aa2: Organize the Angular 0.5 binding around canonical public entries: application
  hooks, column/rendering contracts, composition and `AdaptCellTemplate` at the
  root; headless factories/options under `/features`; structural Chrome, kit models,
  directives and controllers under `/adapter`. Specialized formula, pivot, router,
  sparkline and stream entries retain their declaration and DI-token identities.
  
  All nine native kits and Angular AI consume those entries; kit feature imports
  remain unchanged. Custom renderers/adapters must update binding imports using
  the migration guide. Each entry re-exports the public types its signatures return.
- Updated dependencies [7e33aa2]
- Updated dependencies [f7f62c6]
- Updated dependencies [f81d849]
- Updated dependencies [32e1255]
- Updated dependencies [0120bd4]
- Updated dependencies [aebbd39]
  - @adapttable/angular@0.5.0
  - @adapttable/ai@0.6.0

## 0.1.1

### Patch Changes

- Updated dependencies [089d5d5]
- Updated dependencies [0a9cb40]
- Updated dependencies [8d1e749]
  - @adapttable/angular@0.4.0
  - @adapttable/ai@0.5.2

## 0.1.0

### Minor Changes

- 42a4349: Prepare the first public release of `tableAgent`, `injectTableAssistant` and `injectSpeechInput` over the neutral AI controllers.
  
  Connect mounted Angular tables to approvals, conversation state, speech and the existing HTTP, JSON tools, OpenAI, MCP/MCP Apps, WebMCP, AG-UI and AI SDK integrations. Retained sessions follow replaced sources and editing callbacks, revoke removed write capabilities and disconnect cleanly when the table is destroyed.

### Patch Changes

- Updated dependencies [42a4349]
- Updated dependencies [6fd7108]
  - @adapttable/ai@0.5.1
  - @adapttable/angular@0.3.0
