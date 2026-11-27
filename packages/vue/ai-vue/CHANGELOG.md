# @adapttable/ai-vue

## 0.1.13

### Patch Changes

- Updated dependencies [ea5761c]
  - @adapttable/vue@0.8.1
  - @adapttable/ai@0.8.1

## 0.1.12

### Patch Changes

- 923b252: A table agent loads the WebMCP registrar only when it sets `webmcp`. The controller is also on the new `@adapttable/ai/agent` entry, which the React, Vue and Angular bindings now use, so `tableAgent` starts 0.54–0.58 KiB smaller in each framework and the registrar arrives as a 1.1 KiB chunk the first time a table offers itself to a page agent.
- 8af4736: A feature's `setup(host)` only registers; what outlives a render goes in its `mount(context)`, which returns what releases it. Every binding keeps a mounted feature by id: declaring it again with new options, inline included, keeps the resource and hands `context.feature()` the new declaration, and only removing the feature, changing its `dependencies` or unmounting the table releases it, exactly once. A render the framework discards acquires nothing, and a failed mount rolls back what its pass acquired. React publishes the table runtime and its feature ids in layout effects, so AI and event callbacks read the last committed table; `PublishTableRuntime` is the chrome's publisher. `createFeatureMounts` and `composeMounts` on `@adapttable/core/binding` are the shared lifecycle. A `setup` that returns a cleanup is refused, and `onDispose` is no longer on the feature host. Vue's and Angular's table agent follows its latest declaration's options. `adapttable migrate-v4` reports `onDispose` calls.
- Updated dependencies [923b252]
- Updated dependencies [d1f33b7]
- Updated dependencies [501fb5c]
- Updated dependencies [e0ed9dd]
- Updated dependencies [ee0f202]
- Updated dependencies [536aa89]
- Updated dependencies [9c18ce9]
- Updated dependencies [cdbba81]
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
- Updated dependencies [4effc96]
- Updated dependencies [eb084d0]
- Updated dependencies [5b7bc3c]
- Updated dependencies [3c15620]
- Updated dependencies [97ca02e]
- Updated dependencies [d174bb1]
- Updated dependencies [3b2a5bd]
- Updated dependencies [9382e94]
- Updated dependencies [054986e]
  - @adapttable/ai@0.8.0
  - @adapttable/vue@0.8.0

## 0.1.11

### Patch Changes

- Updated dependencies [6bee472]
  - @adapttable/vue@0.7.0
  - @adapttable/ai@0.7.2

## 0.1.10

### Patch Changes

- Updated dependencies [fb0e3af]
- Updated dependencies [2582d80]
  - @adapttable/ai@0.7.1
  - @adapttable/vue@0.6.0

## 0.1.9

### Patch Changes

- 0fca0b0: The AI packages run one definition per command.
  
  - Each built-in agent capability is one command object — schema, argument reading, live guide, preview and apply — and the session runs every capability, built-in or custom, through the same registry. `@adapttable/ai/openai` no longer loads the capability guides (about 2.7 KB gzip off that entry).
  - `describe` publishes output schemas matching what each capability returns (`rows.read`'s row envelope, `view.describe`'s columns, filters and pagination, and write results with `partial` approval, `approvalReason` and per-row `results`).
  - Dictation and the assistant run on shared helpers (`createSpeechSession` on `@adapttable/ai/voice`; `tableAssistantInputs`, `tableAssistantFields`, `assistantUndoView` on `@adapttable/ai/assistant`), so React, Vue and Angular behave the same: choosing a dictation language with voice off writes nothing, and a panel inside the table reports a write waiting on the reader as awaiting approval.
  - Approvals answer the keyboard in every binding: Vue's strip above the table moves focus to Reject when a change arrives and Escape rejects it; in Angular, Escape belongs to an open approval dialog and leaves the assistant panel open.
  - The transports and the agent contract are organized into modules by responsibility, with every export unchanged.
- 39057e0: Vue and Angular tables take `animate`: rows and cards stagger in on mount with the shared timing, and stay still when the reader prefers reduced motion. Both mount the shared high-contrast stylesheet, so focus, selection, dirty cells, validation and find hits keep an outline under forced colors.
  
  Vue compact density shortens rows, the status bar no longer repeats the footer count, and opening a context menu no longer overflows the Vue shell. Compact and comfortable density reach cells inside nested Angular Aria hosts.
  
  The Filters panel can hold only the AND/OR tree, opened on first paint: `[filterFields]="false"` on an Angular table, `fields: false` in Vue's `filters()` options.
  
  `scheduleTick` from `@adapttable/vue/adapter` runs work after Vue commits the DOM and rethrows its failure; every Vue kit and `@adapttable/ai-vue` use it.
  
  A custom mobile card supplied after a Vue table has mounted is drawn.
  
  A Vue table in an error state shows the alert and its retry action in place of the rows.
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [d92b039]
- Updated dependencies [39057e0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [39057e0]
- Updated dependencies [0fca0b0]
- Updated dependencies [64069d0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [39057e0]
- Updated dependencies [0e7e0bb]
- Updated dependencies [64069d0]
  - @adapttable/vue@0.5.0
  - @adapttable/ai@0.7.0

## 0.1.8

### Patch Changes

- @adapttable/ai@0.6.6
  - @adapttable/vue@0.4.1

## 0.1.7

### Patch Changes

- Updated dependencies [b4f2c66]
- Updated dependencies [2e930c2]
- Updated dependencies [5ff3cee]
- Updated dependencies [20122b2]
- Updated dependencies [e21f5a5]
  - @adapttable/vue@0.4.0
  - @adapttable/ai@0.6.5

## 0.1.6

### Patch Changes

- Updated dependencies [e3e40e7]
- Updated dependencies [ffc8540]
  - @adapttable/vue@0.3.0
  - @adapttable/ai@0.6.4

## 0.1.5

### Patch Changes

- Updated dependencies [b33a9ee]
- Updated dependencies [426d44f]
- Updated dependencies [2bdf4e3]
  - @adapttable/ai@0.6.3
  - @adapttable/vue@0.2.0

## 0.1.4

### Patch Changes

- Updated dependencies [330566b]
- Updated dependencies [d35c348]
  - @adapttable/vue@0.1.4
  - @adapttable/ai@0.6.2

## 0.1.3

### Patch Changes

- Updated dependencies [c8d10ab]
  - @adapttable/vue@0.1.3

## 0.1.2

### Patch Changes

- Updated dependencies [7bedef1]
- Updated dependencies [54dd62a]
- Updated dependencies [b267b30]
- Updated dependencies [eaac515]
  - @adapttable/vue@0.1.2
  - @adapttable/ai@0.6.1

## 0.1.1

### Patch Changes

- Updated dependencies [00df62b]
  - @adapttable/vue@0.1.1

## 0.1.0

### Minor Changes

- 2153f11: Add optional Vue agents, conversations and speech input with native assistant
  and approval surfaces in every kit. The binding adapts neutral execution stores,
  host-confirmed controlled updates, KeepAlive suspension and disposal; dedicated
  assistant UI entries remain free of AI runtime dependencies.
  
  Approval widgets can open a full review with Back/Escape focus return and
  controlled expansion. Reviews follow the approval's identity across snapshots;
  receipts expose scoped action/turn undo, blocked explanations, speaker/question
  structure and a dedicated live region. Examples are keyboard-accessible native
  menus. Retained actions retire with their displayed message or conversation.

### Patch Changes

- Updated dependencies [0120bd4]
- Updated dependencies [1946b61]
- Updated dependencies [aebbd39]
- Updated dependencies [1946b61]
- Updated dependencies [a06027e]
- Updated dependencies [7ba801b]
- Updated dependencies [78f6e38]
- Updated dependencies [dedb4b1]
- Updated dependencies [2153f11]
- Updated dependencies [1e47ceb]
  - @adapttable/ai@0.6.0
  - @adapttable/vue@0.1.0
