# @adapttable/react

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
