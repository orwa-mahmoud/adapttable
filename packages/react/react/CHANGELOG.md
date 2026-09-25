# @adapttable/react

## 1.3.2

### Patch Changes

- cbe937e: The docs and live demo now live at [adapttable.orwamahmoud.com](https://adapttable.orwamahmoud.com/), with React docs under `/react/`. Package homepages and README links point there; the previous addresses redirect.
- Updated dependencies [cbe937e]
  - @adapttable/core@3.2.2

## 1.3.1

### Patch Changes

- 308effa: In a virtualized desktop table, an open row detail panel keeps counting toward the row's height after it scrolls out of the window, so rows below it no longer jump.
- Updated dependencies [32677fd]
- Updated dependencies [068ba7e]
- Updated dependencies [6911b24]
- Updated dependencies [46a9ec3]
- Updated dependencies [7565dc4]
- Updated dependencies [79c9956]
- Updated dependencies [57d1217]
  - @adapttable/core@3.2.1

## 1.3.0

### Minor Changes

- 338e626: In a virtualized antd table, find brings a match outside the window into view — antd's own virtual table on desktop, and the card and grouped windows. `RowScrollContext` and `KeyedWindow` (with `scrollToIndex`) are exported from `@adapttable/react/adapter` for kits that render their own body.

## 1.2.0

### Minor Changes

- 3cf4297: `mobileIdentityColumns` is deprecated and removed in v4: it never changed which fields a card shows, and `hideOnMobile` decides that. The prop and the `useDataTable` option are still accepted and ignored, and the third argument of `visibleColumns` is deprecated with them.
- 06c3694: `standardFeatures({ findButton: true })` draws the toolbar Find control; without it the preset is unchanged. Ctrl/Cmd+F opens find after a click inside the table, even on a cell that takes no focus, and a click elsewhere hands the shortcut back to the browser. With `virtualize()`, find brings a match outside the window into view; Ant Design’s desktop table virtualizes through antd and is not covered.

### Patch Changes

- 5e66063: `editing(commit, { onDirtyChange })` tracks unsaved edits on its own and reports the real count without `dirtyIndicators()`; `dirtyIndicators()` adds the cell and row marks for the same set.
- 14ba2ea: A frontend table whose columns declare a default aggregate no longer warns that its source does not declare `supports.aggregates`.
- 037c2a5: Row grouping follows the column's locale path: with `locale="ar"`, a column declaring `i18n: { ar: "teamAr" }` groups by `teamAr` and heads each group in Arabic, matching its cells and sort. A column's own `groupValue` and `sortValue` still decide the bucket first.
- 1039051: With `multiSort()`, the first shift-click (or shift-Enter) keeps the current sort as level one: click Name, then shift-click Salary sorts Name → Salary.
- Updated dependencies [3cf4297]
- Updated dependencies [037c2a5]
  - @adapttable/core@3.2.0

## 1.1.0

### Minor Changes

- 96110a1: `tableAgent` offers every row and bulk action the host composed as a governed agent capability — `rowAction.<key>` on one row, `bulkAction.<key>` on the current selection. The table's write policy and approval apply, an action's `ai.approval` overrides them, an action with a `confirm` block asks a person, and `ai: false` keeps an action away from the agent. `tableActionCapabilities` builds the same definitions for `createAgentSession`.
- 42f4117: A bare `rowPinning()` pins rows: every row gets Pin to top, Pin to bottom and Unpin, the table holds the lists, writes them to the URL as `rowPin` and Saved Views keep them. Controlled `pinnedRowIds` and observed `onPinnedRowIdsChange` behave as before.
- bd95c61: Find in table works without `cellNavigation()`: Ctrl/Cmd+F with focus anywhere in the table opens the bar, the matches are marked and the current one is scrolled into view. `findInTable({ button: true })` adds a Find control to the toolbar, drawn with each kit's own button (`classNames.findButton` on unstyled and shadcn).
- e82b90f: A `<DataTable>` hands its edit state to the host through the features that own it: `editHistory({ onChange })` gives undo, redo, `canUndo`, `canRedo` and `clear` for your own buttons, `editing(commit, { onDirtyChange })` the unsaved-edit count with `confirm`, `confirmRow` and `confirmAll`, and `cellNavigation({ onRangeChange })` the selected cell range. Each reports on mount and whenever it changes.
- 832d63d: A backend-mode voice clip can be the assistant's turn: `useSpeechInput({ onClip: assistant.sendClip })` sends it through the HTTP transport on the turn's first round, and the backend's `transcript` becomes the reader's message, with a localized "Voice message" placeholder until it arrives. `createAgentHttpClient().send` takes `audio` and `onTranscript`, and `AssistantTransport.send` receives `audio`.
- d6e7d65: `commandPalette({ button: true })` adds a toolbar control that opens the palette, and `commandPalette({ open, onOpenChange })` lets a host open it from its own control. The context menu offers Pin to top, Pin to bottom and Unpin on rows when `rowPinning()` is composed, and Cut on cells when `cellNavigation()` and `onCellCut` are both wired. Unstyled and shadcn style the new control through `classNames.commandPaletteButton`.
- 0a5aa1b: `rowActions` accepts add, duplicate and delete handlers: `rowActions(actions, { onAddRow, onDuplicateRow, onDeleteRow, confirmDeleteRow })` puts Add row in the toolbar and Duplicate / Delete on every row. Every `/row-actions` entry also exports the `RowMutationHandlers` type.

### Patch Changes

- 9c0d3ef: The context menu's Copy copies the right-clicked cell when `cellNavigation()` is not composed, and the menu opens on pinned rows too. The Ant Design context menu opens at the pointer.
- c587812: The 62 adapter-machinery helpers still exported from `@adapttable/core` (column-group, extra-row, pinned-row, row-span and row-style math, the column-menu actions), and `xlsxWriter` / `buildTableXlsx` on the main entry, are deprecated there. They keep working; import them from `@adapttable/react/adapter` and `@adapttable/core/xlsx`.
- d90cdd1: `groupFilter` receives a typed `GroupNode` — its `value`, `label`, `level`, `groupBy` and `leafRows` — and an `AggregateSpec` accepts a name registered with `registerAggregator` without a cast.
- 81eeb48: A tree node whose `onLoadChildren` fetch fails closes again, so one click retries it. `useLazyChildren` takes `onLoadFailed`.
- e245987: Client-side sorting reads a column's `i18n` path for the active `locale`, the same path its cells and filters read. A column with its own `sortValue` sorts as before.
- 65306b8: MUI draws Undo and Redo after Print, where every other kit puts them.
- 84fbb7d: `paginationMode="auto"` follows the table's `mobileBreakpoint` and `forceMobile`, so infinite scroll and the card layout switch together, and a server render with `forceMobile` resolves the same mode as the first client render. `useFrontendData`, `useServerData` and `useQuerySource` take `mobileBreakpoint`.
- d91b4f1: The command palette's Export entry names the configured writer's format — "Export XLSX", "Export PDF" — as the toolbar button does.
- ad6532c: Ctrl+Shift+Z redoes on Windows and Linux, and undo and redo work with Caps Lock on.
- 67d276d: A table that composes both `rowDetail()` and `nestedTable()` draws one expand toggle per row.
- 091be10: Reference comments name the current entry points (`@adapttable/react/stream`, `@adapttable/react/features`), the `exportCsv({ writer })` feature form, the writer-derived default filename, the headless table's `table` role and the HTTP client's `full` default context profile.
- aa57a3a: `selectionStats()` figures stay visible while a feature notice shows in the status strip, with or without `statusBar()`.
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

## 1.0.0

### Major Changes

- 3b3de11: Introduce the first stable release of `@adapttable/react`, the headless React
  binding for the framework-neutral engine in `@adapttable/core`.
  
  - The root provides React hooks and column types; `/features` provides feature
    composition, and `/adapter` provides structural Chrome, slots and builder
    helpers for custom adapters.
  - React-specific `computed`, `aggregate`, `buildFormulaColumns`,
    `SummaryRowFn`, `Slot`, `fillSlot` and `ReactMobileCardRenderer` support
    React-rendered values without introducing React into the neutral engine.
  - Rendering prepares a private engine candidate and publishes it at commit.
    Abandoned or suspended renders do not publish data or revisions to
    subscribers.
  - `useQuerySource` supports `selectorKey` to re-project unchanged fetched pages
    when the selector's inputs change.
  - The binding supplies live feature composition and named shell contracts.
    Adapters share cell-display resolution through `EditableCellRenderProps`,
    while the engine owns checklist values and row-reorder digests.
  
  This is a new package, not an upgrade from a previously published
  `@adapttable/react`. Existing v2 core consumers should follow the
  [v2 migration guide](https://github.com/orwa-mahmoud/adapttable/blob/main/docs/migrate-from-v2.md).

### Minor Changes

- 278a6d5: Add optional native table assistants through `TableAssistant` and
  `tableAssistant()` on `@adapttable/<kit>/assistant`. Importing a table
  without this feature does not include the widget; custom interfaces can use
  the headless controller and approval contracts instead.
  
  ### Conversation experience
  
  The panel supports floating, panel and sheet presentations, container
  boundaries and native mobile overlays. Messages lead the conversation;
  action details open on request beneath a reply. Receipts name the columns,
  values and operations involved, distinguish proposals from completed
  changes, and offer eligible view Undo controls. `receipts={false}` hides
  the action UI without removing the underlying receipts from conversation
  state.
  
  While a long capability works, the conversation counts what it has done rather
  than spinning. A released connection reads as work that may still be running,
  with a control that rejoins it, and a turn the reader stopped reads as stopped.
  
  Suggested prompts open from the composer menu and reflect the table's
  available capabilities. Structured questions appear in the conversation with
  choices and optional free-text answers. Streaming text, Stop, dictation and
  a language chooser use the same conversation interface.
  
  Hosts can customize the greeting and `avatars`; a name can supply initials
  instead of a custom React element. Remembered approval allowances have
  readable names and a revoke control.
  
  ### Approval and accessibility
  
  Approvals use one active presentation: in the widget, above the table or in
  a native modal. Reviews pair before/after values, summarize bulk changes and
  show an initial preview with expansion. Independently executable changes
  support individual and remaining-item decisions; a single change receives a
  single decision. `approvalReview` exposes the shared review model.
  
  Every kit supplies its own controls over shared structure, keyboard behavior
  and part hooks. The composer supports Enter, Shift+Enter and IME input.
  Opening and closing manage focus, nested controls can handle Escape, overlays
  respect viewport boundaries and RTL direction, and motion respects reduced
  motion preferences. Labels are available in all 17 locales.
- cd45219: Expand data processing, table organization and accessible interaction.
  
  - Add spreadsheet-compatible `POWER` and `SQRT`, including numeric coercion
    and formula error handling.
  - Support row reordering within groups and tree parents, cross-group and
    reparent moves, cycle prevention, and host-owned move policies and
    confirmation.
  - Add independent pinned summary rows above or below grouped, tree and
    virtualized data.
  - Add column renaming with stable keys and propagation to filters, exports,
    accessibility, mobile cards, URL state and Saved Views.
  - Preserve find queries in URL state and recover from malformed, unsupported
    or oversized versioned state. Existing supported shared links remain
    readable.
  - Window expanded group and tree entries when virtualization is enabled,
    including on paginated tables.
  - Expose stable row/column lookup through the React grid-focus contract.
    Context-menu Copy targets the clicked cell outside a selection, preserves
    a selection when opened inside it, and is unavailable without a cell target.
  
  Server-built all-row exports report progress, support cancellation and retry,
  and accept host-provided download URLs. Completed progress can be dismissed.
  Configure a retrieval route to enable all-row export; declaring the capability
  alone does not fetch data or silently substitute the current page.
  
  Improve high-contrast/forced-colors rendering, Ant Design header/cell grid
  association, header-filter focus and persistence, row-move cancellation,
  row-action event isolation, and Escape handling in nested controls.
  
  The neutral engine does not publish a view revision when `setSearch`,
  `setPage` or `setLimit` receives its current value. Subscribers are notified
  when state changes, rather than for redundant setter calls.
- 4d05d7b: Improve row editing, keyboard access and incoming-data conflict handling.
  
  Mark a row action `editsRow` to open the row's editing form from that action.
  It replaces the built-in Edit row trigger, needs no `onClick`, and appears
  only where row editing is available. `resolveRowEditTrigger` is available
  from `@adapttable/react/adapter` for custom adapters.
  
  Row-edit controls use each kit's pencil, check and cancel glyphs with
  localized accessible names and hover titles. `rowEditIcons` overrides
  individual glyphs; `false` uses the text label. Composing `editing()` with
  `rowEditing()` does not duplicate the controls. Enter and F2 open the focused
  editable cell.
  
  Incoming changes are compared with the row a form opened against. Affected
  fields show Keep mine / Take theirs, and a newer incoming update replaces the
  value awaiting a decision. Unresolved conflicts block saves through keyboard,
  row, batch and custom-editor routes while leaving Cancel available.
  `editConflictPolicy` and `onEditConflict` also apply to row forms.
  
  Custom editors receive `CustomCellEditorConflict` with the incoming value
  and decision controls. `isRowContested` exposes the row's pending-conflict
  state, and `EditConflict.previous` carries the row the editor opened against.
- 4d05d7b: Add a native grouping panel with draggable, removable and reorderable chips,
  mobile controls, multiple active aggregations, and URL/Saved Views support.
  
  ### Column-owned configuration
  
  - `groupable: false` excludes a column from grouping controls.
  - `groupValue` lets a column group rows by a category, date bucket or range
    rather than its sort value.
  - `aggregatable` declares whether a column can be aggregated, its available
    built-in or custom operations, and an optional default.
  - Developer defaults drive the initial panel, calculations and server
    requests. Readers can add columns, change operations, remove an aggregation
    or restore the declared defaults. Suppression and operation choices are
    validated at execution, and custom operation IDs survive state round-trips.
  - Date minimum and maximum compare ISO values. Grouped columns remain
    eligible for aggregation.
  - A custom operation takes a `description`. Anything reading the table rather
    than looking at it is told what the operation does in the author's words;
    a built-in needs none.
  
  Changes to aggregation choices invalidate cached group calculations through
  `IncrementalViewConfig.derivedKey`. Stored multi-column grouping is read as
  individual keys. Drag targets keep stable widths, and the remove target has
  its own row rather than shifting the chips during a drag.
  
  ### Aggregate presentation and server responses
  
  `formatAggregate(value, context)` formats group-header, group-footer and
  mobile-card aggregates without changing their stored or exported values.
  `AggregateFormatContext` supplies the column key and, when known, the
  operation that produced the value, so a money column can display sums as
  currency and counts as counts. `groupRowLayout`, `groupAggregateEntries` and
  `groupAggregateNode` share this presentation path.
  
  The existing `aggregate({ format })` option still formats at calculation
  time, including for summary rows. If both formatters are configured, the
  column receives the mapper's output; use raw group values with column
  formatting, or explicitly handle already-formatted values.
  
  Server-mode `DataTable` accepts host-declared `aggregates`. `useQuerySource`
  and `useServerData` publish response-associated operations through
  `TableSource.groupAggregations`; reader choices layer over host defaults.
  The query binding associates responses with request keys and
  `dataUpdatedAt`. Controlled sources return `responseKey` using the key
  supplied by `onQueryChange` in `info.key`. Unmatched responses and unknown
  custom operations remain unknown rather than inheriting another response's
  operation. `queryAggregateOps` supports custom source implementations.

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
