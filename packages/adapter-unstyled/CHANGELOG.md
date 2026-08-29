# @adapttable/unstyled

## 2.6.0

### Minor Changes

- f8ba086: `<kit>/features` now re-exports every type `@adapttable/core/features` publishes,
  not just the feature factories. Writing a `TableFeature` of your own means naming
  `Aggregator`, `Command`, `CustomCellEditorRender`, `ExportWriter`,
  `FilterTypeSpec` or `SidePanelEntry` to register anything on the host, and those
  were only reachable from `@adapttable/core` — so composing a feature meant
  importing from two packages instead of the one you mount.
- f8ba086: Each kit now exports `MobileCardRenderer`, `RowActionsRenderer` and
  `ToolbarSlots`. `renderCard`, `renderRowActions` and `toolbarSlots` are props
  on the kit's own `DataTable`, so writing one of those callbacks as a named
  function — rather than inline, where TypeScript infers it — meant importing its
  type from `@adapttable/core`, which is the dependency importing from your kit
  is meant to spare you.
- f8ba086: Export `DataTablePropsBase`, the half of each `DataTableProps` that carries every
  prop except the data mode. Extending or wrapping a table's props meant restating
  them, because the base was declared but never exported — the same shape core has
  always exported as `BaseDataTableProps`.
  
  `@adapttable/unstyled` also exports `IconProps`, which its icons already took.

### Patch Changes

- f8ba086: The filter drawer now slides in and out in every kit.
  
  `@adapttable/unstyled` — and so `@adapttable/shadcn` — mounted and unmounted the
  panel on the same tick it opened, so it appeared and vanished with no motion.
  It now travels in from the inline-end edge with the backdrop fading alongside,
  and leaves the same way. While it leaves it is inert and out of the
  accessibility tree, and focus returns to the trigger immediately rather than
  when the animation ends.
  
  `@adapttable/base-ui` had no transition on its drawer at all, which also meant
  the swipe-to-dismiss gesture it already enabled moved nothing on screen. The
  panel now follows the swipe and the backdrop fades with its progress.
  
  `@adapttable/radix` ran its panel and Radix's own scrim on different durations
  and curves, so they finished at different moments, and the panel lost its
  opacity a moment before it started sliding. Both now run on one pair of tokens,
  and reduced motion falls through to Radix's unanimated dialog.
  
  Mantine, MUI, Chakra and Ant Design keep their own kit's drawer motion.
- f8ba086: Share the rule that keeps an editor's own keys out of the table's key handler, as `stopEditKeys` on
  `@adapttable/core/adapter`. Enter, Escape and Tab mean something to both an open editor and the grid
  around it, and custom adapters need the same rule. Behaviour is unchanged in the seven adapters that
  now share it.
- f8ba086: Move the rule that decides whether a column header's funnel is lit into core, as
  `hasActiveHeaderFilter`, so custom markup can light its own headers the way the adapters do.
  Behaviour is unchanged in the seven adapters that now share it.
- f8ba086: State the real dataset size on a windowed mobile card list. The cards are a real `<ul>`, so a
  virtualized or paged list now carries `aria-setsize` on each card with its absolute
  `aria-posinset` — the list-shaped counterpart to the table's `aria-rowcount`. A list that holds
  every card says nothing extra, because assistive technology can simply count.
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
- Updated dependencies [f8ba086]
  - @adapttable/core@2.9.0

## 2.5.0

### Minor Changes

- 1c4b8bf: Compose opt-in features from kit subpath imports (`features={[rowReorder(fn)]}`). Enabling props stay until v3 with a deprecation warning; there is no bundle saving yet.

### Patch Changes

- 192fb7a: Virtualize the mobile card list through the same `virtualize` switch as desktop rows. Cards attach the `maxHeight` scroll box, measure their own height (including nested row detail), and never dump the whole dataset while the window is empty. `bindMobileCardList` / `mobileCardListStyle` are the adapter helpers.
- Updated dependencies [5009373]
- Updated dependencies [2dc46ca]
- Updated dependencies [1c4b8bf]
- Updated dependencies [5d32aa7]
- Updated dependencies [8b3e01d]
- Updated dependencies [efc02f6]
- Updated dependencies [4d881e2]
- Updated dependencies [65e17bd]
- Updated dependencies [192fb7a]
  - @adapttable/core@2.8.0

## 2.4.1

### Patch Changes

- ce5cfe7: Internal code-quality refactor. No behavior or API change.
- 2524306: Add a desktop table assembly helper on `@adapttable/core/adapter` and thin the six HTML-table adapters onto it. `tableRenderModel` and `getRowProps` stay; adapters keep painting with kit tags.
- 3223a18: When an opted-in feature cannot run, the person at the table sees it (off, disabled, or this page) — not only a console warning. Chrome exposes kit-agnostic notices; export-all without a full dataset labels the button “Export this page”.
- Updated dependencies [2524306]
- Updated dependencies [3223a18]
  - @adapttable/core@2.7.0

## 2.4.0

### Minor Changes

- 894a534: Collapsible column groups are first-class tree parents (`ColumnGroupDef` with
  `children`) rather than a collapsed-to-first-leaf shortcut. Each group decides
  what remains: an arrow stub, `collapsedKey`, or `collapsedRender`. The spanning
  header hides the stub caption; the toggle's `aria-label` names the group.
  `align` on a group defaults to `"center"` (the previous hardcoded look).
  `columns` is `ColumnInput[]`; flatten and collapse live in core.
- 6f2be24: `commandPalette` opens a palette on Cmd/Ctrl+K listing every action the table
  can perform: type to filter, arrows to move, Enter to run, Escape to close.

  Its entries are the same objects the context menus take, so an action is
  written once and offered in both rather than drifting between them. Matching
  is case- and accent-folded, so "resume" finds "Résumé sync".

  Shortcuts are data — a chord and a command key — because remapping is not a
  preference when your app may already own Cmd/Ctrl+K. `mod` means Cmd on a Mac
  and Ctrl elsewhere; pass `shortcuts: []` to bind nothing.

  `onPrint` makes Print a command. Print opens a browser dialog, so it stays the
  host's call rather than a permanent button.

  New labels `commandPalette`, `commandSearch`, `commandEmpty` and `print` in all
  17 locales.

- fa40ade: `contextMenu` arms right-click menus for headers, rows and cells. A header
  offers sort, filter, pin and hide; a cell offers copy and cut. Each entry
  appears only when the handler behind it is wired and the column allows it, and
  `{ items }` appends your own behind a divider.

  Every route in works: right-click, Shift+F10 and the menu key for the keyboard,
  and a long press for touch. Escape closes and puts focus back where it came
  from.

  `copyCells` on the grid-focus state copies a given cell, or the selection when
  given none — the route a context menu needs and the key handler never did.

  Every kit renders it with its own overlay — MUI's and Mantine's menus, Radix's
  dropdown, and the Popover each of Chakra, antd and Base UI already builds its
  column menu on — so positioning, portalling and dismissal behave the way that
  kit's overlays always do.

- 2401b28: `densityChooser` puts a density control in the toolbar and `fullscreen` puts a
  fullscreen toggle beside it. `useDensityUrlState` keeps the density in the URL
  beside sort and filters, so a reload and a shared link reproduce it.

  Fullscreen hides everything outside the table, which is what breaks overlays: a
  menu portalled to `document.body` sits inside the part being hidden, still
  mounted and still focused. The table's own overlays are re-pointed at the
  fullscreen element; `useFullscreen` exposes `container` for any you portal
  yourself.

  The fullscreen toggle hides itself where the browser will not allow fullscreen
  at all, because a control that cannot work is worse than no control.

  New labels `density`, `densityComfortable`, `densityCompact`, `enterFullscreen`
  and `exitFullscreen` in all 17 locales.

- e575a79: `PivotPanel` — the pivot configuration panel, built from this kit's own
  buttons and selects.

  Three zones, the fields in each, and controls that move them. It is drivable
  with Tab and Enter alone: the move controls are buttons, not a drag handle, so
  the panel works for anyone who does not use a pointer.

- b93b52d: `SavedViewsPanel` is a titled card in every kit: the view's own name applies it,
  the five management controls are the kit's icon buttons, and a read-only view
  shows them disabled beside its badge. The new `footer` prop renders your own
  note inside the card, under the list.
- 3c9db4b: `SavedViewsPanel` — manage saved views with this kit's own controls: apply,
  rename in place, reorder, choose the default, delete.

  Drivable from the keyboard throughout. Reordering is buttons rather than drag,
  and the move a row cannot make is disabled rather than removed so the row does
  not jump as the list is reordered.

### Patch Changes

- 8845b98: Spanned cells now look like a spreadsheet merge: centered content and one fill across the span. Pass `cellSpanAppearance="plain"` to keep geometry only.
- 340f14b: The columns and saved-views cards honor `classNames` padding and border again.
  Portalling them had left inline zeros that hid the Tailwind / shadcn look.
- 340f14b: The columns menu carries `dir` onto its portalled panel so Arabic row chrome
  mirrors instead of staying left-to-right after leaving the table root.
- e4bfb52: `columnSelectionCheckbox` puts a checkbox in every column header that selects
  that column. Ctrl/Cmd+click on a header still does what it always did; this is
  the same selection reached two ways it cannot be — by a finger, which has no
  modifier key to hold, and by a screen reader, which cannot discover a gesture
  nothing announces. It needs `cellNavigation` for a selection to exist, so either
  prop alone renders nothing.

  The name is `labels.selectColumn` plus the column's own name, translated in all
  seventeen locales. The control is each kit's own checkbox in core's
  `ColumnSelectCheckboxChrome`, which owns the layout, the accessible name and
  keeping the click off the header underneath — otherwise the same click would
  sort the column it just selected. It carries
  `data-adapttable-part="column-select"` and the `columnSelect` classNames key.

  Where the pointer can hover, the box holds its space and fades in on hover or
  focus, so a wide header row is not a row of checkboxes; a selected column keeps
  its box visible. Where there is no hover, it is always visible.

  `GridFocusState` gains `columnCheckbox`, `isColumnSelected(col)` and
  `toggleColumn(col)`.

- c7f7537: An emptied editable cell keeps a full-cell hit area, so a second double-click
  opens the editor again.
- eec7ebc: `slots.error` replaces the load-failure state, in every adapter — the last
  piece of chrome that was not replaceable.

  It takes a node like the other slots, and it also takes a function, because an
  error state is about something: the function receives the error being reported,
  the retry the source can actually perform, and whether a retry is already in
  flight. `retry` is absent when there is nothing to re-fetch, so a replacement
  can hide its retry control rather than render one that does nothing.

- 2ac7bbd: A full-width extra with `beforeRowId` stays in front of that person when
  they are pinned. Drag-reorder already followed the id; pin sections now
  splice the same extras instead of dropping them.
- 31a5bf5: A named extra stays a full-width row in front of its person, with its own
  height. It uses that person's `rowStyle` fill and sits above a continuing
  Team span so the note is not hidden under the merge.
- b3475de: `filterFields={false}` keeps only the AND/OR tree in the Filters chrome — the per-field form is not mounted.
- 42b6d58: Put the AND/OR builder at the top of the Filters panel, keep the Filters button in header mode when the tree is on, separate Advanced from the field list with kit-native spacing and a rule, and indent nested groups on a rail so depth is visible.
- 8845b98: Header-filter overlays stay open after picking an operator on a multi-input field. Nested kit dropdowns are not treated as outside clicks. Auto-close after a finished single-control write is opt-in via `closeHeaderFilterOnSelect` (default off).
- b3475de: The rows-per-page list keeps the table's default size after you pick another one, so a 500-row scale view can switch to 10 and back to 500.
- d4fbbce: Built-in row actions and the header-filter trigger use each kit's own icons. Duplicate, delete and pin are icon-only; the label is the tooltip and accessible name. Host `rowActions` still pass `icon` for the same treatment, or omit it for a text button.
- 75994c6: Toolbar overlays (filters, columns, saved views) stay under their trigger and
  paint above sticky headers. They no longer flip into the page chrome or
  disappear under the table head.
- 5c3d728: The command palette closes on an outside click from core, beside Escape,
  instead of each adapter hanging a handler on its own scrim.

  A scrim that listens has to carry an ARIA role to justify the handler, and
  `presentation` is ignored on an element wrapping a dialog — so the markup was
  claiming something ARIA will not honour. The scrims are now inert.

- 31a5bf5: Consecutive Team (or any row span) stays one cell across a pin. Pinned
  rows render in the same tbody as the scroll body so HTML can express the
  span; sticky is skipped while a cell is taller than one row.
- 50ca0c5: `printButton` puts Print in the toolbar. It renders only when the option and
  `onPrint` are both set — the option alone would open nothing, and the handler
  alone stays what it was, the palette's Print command. The caption is
  `labels.print`, already translated in every locale. The button carries
  `data-adapttable-part="print-button"` in all seven kits and honours the
  `printButton` classNames key in unstyled and shadcn.

  `printToolbar(wanted, onPrint, labels)` is the one rule that resolves the pair,
  exported from `@adapttable/core/adapter` beside `undoRedoToolbar`.

- 241f9d4: `renderCard` replaces a mobile card's body with your own layout, in every
  adapter.

  Only the body: the list-item semantics, selection checkbox, expand and tree
  toggles, reorder controls, row actions and detail panel keep rendering around
  what you return, so a custom card cannot drop the parts that make the list
  usable.

  It is handed the fields the built-in would have laid out — each one's column,
  resolved label and value node, cell renderers and editors included — so a custom
  card is a layout decision rather than a re-implementation. Omit it and the
  built-in card renders, byte for byte.

- 8845b98: Row actions can stay as today's button strip, collapse into a 3-dot menu, or be replaced entirely. Omit `rowActionsLayout` (or pass `"buttons"`) for the strip; `"menu"` uses each kit's own Menu; `renderRowActions` wins over the layout.
- d490ff8: Body rows carry `data-adapttable-part="row"` in every kit, and every row carries
  `data-row-id`. Six kits named no body row at all, so an app styling or testing
  `[data-adapttable-part="row"]` got nothing from them.
- 010beb4: A saved view's row keeps its controls together in a narrow panel. The chrome
  owns the row's layout and every kit spreads it, so the name never runs into its
  read-only badge, and Apply / Rename / ↑ / ↓ / Set as default / Delete wrap as
  one group under the name instead of being truncated to "Set a" or spilling into
  the next view's row.

  Two part names come with it — `saved-view-caption` around the name and its
  badges, `saved-view-controls` around the buttons — on the same elements in
  every kit.

- ba98a1d: The saved-views management panel honors the `views*` class-map keys — the
  surface, each row, its controls and the rename box — so one preset styles the
  panel and the saved-views menu alike. `@adapttable/shadcn` ships the panel
  pre-wired with `shadcnClassNames`, the way its `DataTable` already is, and your
  own `classNames` still merge over the preset per part.
- 8359d83: Saved views can live on a server: pass `useSavedViews` a `store` and it replaces
  `localStorage`, which stays the zero-config default.

  Views gain `visibility` (`"private"` or `"team"`) and `readOnly`. A shared view
  someone else owns is visibly read-only in every adapter — a Read-only badge with
  its rename, reorder, set-default and delete controls disabled — and the hook
  refuses those operations too, so the UI and the state agree. Applying it stays
  enabled, which is the point of a shared view.

  The store is asked for one view at a time rather than the whole list, so a save
  cannot overwrite what someone else changed in the meantime, and a store that
  cannot be reached leaves the list empty instead of throwing into a render.

- fb30d4a: `sidePanel` docks table settings beside the table instead of in a popover over
  them — a column list, a filter form, anything the host supplies. With more than
  one panel the labels become a tab strip with the keyboard behaviour a tab strip
  owes: one tab stop, wrapping arrows that carry the selection, Home and End,
  Escape to close.

  It is controlled — `{ panels, open, onOpenChange, side }` — because the control
  that opens it is yours; `toolbarSlots` is where it usually goes. Omit it and
  nothing renders and the table's markup is unchanged.

  New labels `sidePanel` and `closePanel`, translated in all 17 locales.

- b3475de: A sticky header now keeps search and page-size pinned with it on page-scroll tables, in every adapter. Pass `stickyToolbar={false}` to let the toolbar scroll away.
- 864ef5d: Three pieces of optional chrome, each off unless asked for.

  `toolbarSlots` puts a host's own controls at either end of the toolbar —
  `{ start, end }` — where `toolbar` has always filled the middle.

  `undoRedoButtons` shows Undo and Redo in the toolbar. The buttons render only
  when `editHistory` is armed and disable rather than disappear, so the toolbar
  does not reflow as someone works. The shortcuts and `table.editHistory` are
  unchanged.

  `statusBar` shows a strip under the table: the row range, how many rows are
  selected, and what a multi-cell selection adds up to. It reads the same range
  as the pagination footer and hosts the selection statistics rather than
  repeating them.

  New label `redoEdit`, translated in all 17 locales.

- Updated dependencies [0bfd172]
- Updated dependencies [8845b98]
- Updated dependencies [1bb8ad7]
- Updated dependencies [894a534]
- Updated dependencies [e4bfb52]
- Updated dependencies [6f2be24]
- Updated dependencies [aec669e]
- Updated dependencies [fa40ade]
- Updated dependencies [d506851]
- Updated dependencies [e27bd64]
- Updated dependencies [0a2dbfc]
- Updated dependencies [2401b28]
- Updated dependencies [96a0b6e]
- Updated dependencies [eec7ebc]
- Updated dependencies [dc8dfda]
- Updated dependencies [57dde1f]
- Updated dependencies [2ac7bbd]
- Updated dependencies [31a5bf5]
- Updated dependencies [b3475de]
- Updated dependencies [42b6d58]
- Updated dependencies [96515e8]
- Updated dependencies [7fd1e26]
- Updated dependencies [0dee45f]
- Updated dependencies [5df7f9f]
- Updated dependencies [340f14b]
- Updated dependencies [8845b98]
- Updated dependencies [29d155e]
- Updated dependencies [b3475de]
- Updated dependencies [1a20be6]
- Updated dependencies [5c3d728]
- Updated dependencies [19467ec]
- Updated dependencies [31a5bf5]
- Updated dependencies [b30f8ae]
- Updated dependencies [25d4981]
- Updated dependencies [9384217]
- Updated dependencies [ce10f8e]
- Updated dependencies [2b184ca]
- Updated dependencies [d1753b2]
- Updated dependencies [50ca0c5]
- Updated dependencies [241f9d4]
- Updated dependencies [7477cde]
- Updated dependencies [aec3bf8]
- Updated dependencies [8845b98]
- Updated dependencies [d490ff8]
- Updated dependencies [853385d]
- Updated dependencies [d9bbd70]
- Updated dependencies [aa88f46]
- Updated dependencies [26d6855]
- Updated dependencies [010beb4]
- Updated dependencies [6997d72]
- Updated dependencies [adbd98e]
- Updated dependencies [44df311]
- Updated dependencies [c4ffc69]
- Updated dependencies [8e9c854]
- Updated dependencies [8359d83]
- Updated dependencies [4b8e0aa]
- Updated dependencies [0b58368]
- Updated dependencies [fb30d4a]
- Updated dependencies [2ac7bbd]
- Updated dependencies [b3475de]
- Updated dependencies [864ef5d]
- Updated dependencies [b3475de]
  - @adapttable/core@2.6.0

## 2.3.0

### Minor Changes

- 6065cb5: User-facing controls no longer ship on `@adapttable/core`. Import `FilterTreeBuilder`, `ChecklistFilter`, `FilterHeaderRow`, `FilterHeaderControl`, `FindBar`, `RowEditActions`, `BatchEditBar`, `TreeToggle`, `TreeCell`, `ColumnGroupToggle`, `GroupMoreButton`, `RowReorderHandle`, `RowReorderButtons`, `FillHandle`, and `SelectionStatsBar` from the adapter you use. The filter-tree disclosure is adapter-owned too. Core keeps the headless hooks, state machines, and `*Chrome` slot layouts on `@adapttable/core/adapter`. Days-old public exports, no v3.

  Adapter-generated filter forms now use their kit-native select, multiselect, disclosure, and popover controls. Long filter overlays remain viewport-bound and scroll internally, including nested kit menus.

### Patch Changes

- 7563c29: Filters popover is the compact auto form again: Advanced stays collapsed, operator and value share a row, and checklist / multi-select options wrap instead of stacking one value per line. Overlay menus cap to the viewport.
- Updated dependencies [7563c29]
- Updated dependencies [6065cb5]
  - @adapttable/core@2.5.0

## 2.2.2

### Patch Changes

- 6028b15: One filter chrome at a time. `filtersMode="header"` (and the `headerFilters` alias) hides the toolbar Filters button; header multi-selects open a compact menu instead of a stacked `<select multiple>`.
- Updated dependencies [6028b15]
- Updated dependencies [6028b15]
- Updated dependencies [49c49f0]
- Updated dependencies [56c7ce6]
- Updated dependencies [28195bb]
  - @adapttable/core@2.4.0

## 2.2.1

### Patch Changes

- a9992c9: A save the reader can see, and an undo when it fails

  Return a promise from `onCellEdit` and the cell says it is saving until that
  promise settles (`data-save="saving"`, `aria-busy`), then says why if it rejects —
  in a live region beside it, so a failure is heard as well as seen.

  `onEditRollback` puts the row back: a table that showed the new value before the
  server agreed has to restore the old one when it disagrees, and only the host can
  write to its own rows. The failed cell then offers an Undo (`labels.undoEdit`,
  localized in all seventeen locales); without the handler the message shows
  without one, which is right for a table that refetches instead.
  `formatEditError` words the failure.

  A newer save supersedes an older one, so a slow rejection can never mark a value
  the reader has already replaced. A host that saves synchronously pays nothing.

  Headless: `useCellSaveState`, `CellSaveStatus`, `FailedCellSave`; the editable-cell
  controller carries `saveStatus`, `saveFailure`, `canRollback`, `rollback` and
  `dismissFailure`. The unstyled and shadcn kits add `editCellSaveError` and
  `editCellRollback` class hooks.

- ac998d0: Batch editing: many rows, one write

  `batchEditing` + `onBatchEdit` turn every editable cell into a field and hold
  every change until the reader saves them all — the shape of a review pass, where
  someone walks a list correcting values and wants one write at the end rather than
  one per row.

  `onBatchEdit` is called once, with every pending row as `{ row, rowId, patch }`,
  which is what lets the whole batch be a single request. A bar appears as soon as
  something is pending — the count, Save all, Cancel all — and is a live region, so
  the count is heard as well as seen. Cancel restores everything, because nothing
  was ever applied.

  The count is rows, not cells, and a value typed back to what it was stops
  counting. Changed cells carry `data-changed`.

  Labels `pendingRows`, `saveAll` and `cancelAll` are translated in all seventeen
  locales. Headless: `useBatchEditing`, with `BatchEditCell` and `BatchEditBar`
  from `@adapttable/core/adapter`.

- ec12556: Boolean filter type

  A tri-state any / true / false widget — never a checkbox — with chips and
  `f_<key>=true|false` URL serialization.

- c2ea3ef: Excel-style checklist filter

  A `checklist` filter type lists distinct values with search, select-all,
  clear, and counts. Frontend reads `allFilteredRows`; a server page that
  omits that list does not offer the widget. Labels land in all 17 locales.

- cdcb992: Size a column to its content

  Double-click a resize handle and the column takes the width of its widest
  rendered cell; the Columns menu's "Size columns to content" does every column at
  once.

  Measurement comes from the DOM rather than the data, because a cell rendering a
  badge, an avatar and a name has no width the data knows. It reads each cell's
  content width, so a column currently clipping its text is sized to fit it, and a
  column with nothing measurable on screen is left alone rather than collapsed.

  The result is an ordinary layout width: it persists, serializes to the URL and
  saved views, and a later drag overrides it. Every cell now carries
  `data-column-key`, which is also a stable hook for styling one column across any
  kit.

  Headless: `measureColumnWidth` and `autoSizeColumns`.

- 9239898: Collapsible multi-level column groups

  `column.group` accepts a path; `collapsibleColumnGroups` adds a toggle.
  A collapsed group keeps its first leaf. State is `collapsedGroups` and
  the URL `colGroupCollapse`.

- bd52b39: Column menu 2.0

  Search, bulk show/hide/unpin, per-column submenu (sort, pin, hide,
  auto-size, filter, reset one), and `lockPosition` / `lockVisibility` /
  `lockWidth` / `lockPin` that gray out the matching controls.

- 96c74d0: Column virtualization

  `virtualizeColumns` windows the horizontal axis: a 500-column table renders the
  two dozen columns a reader can see, plus a margin, with two spacer cells holding
  the rest open. In the benchmark suite that is **45x fewer DOM cells** — 11,001
  down to 243 — on the same table.

  Both axes compose off one scroll box. Pinned columns are never windowed out,
  since a pinned column is on screen by definition, and the spacers are logical,
  so a wide RTL table scrolls correctly. `aria-colindex` stays absolute, so a
  screen reader still hears "column 74 of 120".

  It needs a horizontal scroll container and renders every column until that
  container reports a width — an unmeasured table shows everything rather than
  guessing. Not available in the Ant Design adapter, which renders through antd's
  own `<Table>`.

  Headless: `useColumnWindow` and `ColumnSpacer` from `@adapttable/core/adapter`.

- c20c888: Bring your own cell editor

  `editor: { type: "custom", render }` puts any React component in the cell — an
  autocomplete, a rich-text field, a colour picker. The table keeps everything it
  already owned: double-click / Enter / F2 activates, focus returns to the cell
  afterwards, Enter commits, Escape cancels, Tab moves on, and validators gate the
  commit.

  What the component receives is `draft` and the calls that change it — `setDraft`,
  `commit` (for a picker, where choosing IS the gesture), `cancel`, `onKeyDown`,
  `onBlur`, and `focusRef` to point at what should take focus — plus `error`,
  `validating` and `errorId` so it can mark itself invalid. `parseValue` still
  turns the draft into whatever gets stored.

  Rendered by the gate, so it is the same component in all nine adapters.

  Headless: `CustomCellEditorRender`, `CustomCellEditorCtrl`, `isCustomEditor`, and
  `commit` / `cancel` on the editable-cell controller.

- 1c53d5c: Custom header and footer components

  `renderHeader` / `renderFooter` / `headerTooltip` / `headerActions` on a
  column, plus a `tableFooter` slot. Sort, resize and the menu stay on the
  cell; a custom caption receives a controller.

- 1819d00: Dirty marks on changes nobody has confirmed

  `dirtyIndicators` marks a changed cell with `data-dirty` until its value settles,
  and marks its row too so a long table can be scanned without hunting for the cell
  inside it.

  A mark clears when the save resolves, and stays when it fails — the value is
  still at risk until the reader undoes it or tries again. A rollback clears it,
  since the value it belonged to is gone. Nothing clears on a timer.

  Off by default: a mark is a claim about what the server has agreed to. A host
  that settles its own state another way can call `confirm`, `confirmRow` or
  `confirmAll` on `table.editing?.dirty`, which also carries a `count` for an
  "unsaved changes" line.

  Headless: `useDirtyCells`, `DirtyCellState`, and `rowIsDirty(editing, rowId)`
  from `@adapttable/core/adapter`.

- 2c97e75: Edit conflict handling under live updates

  A row that changes under an open editor is a conflict, not a discard.
  `onEditConflict` and `editConflictPolicy` (`keep` / `take` / `ask`, default
  `ask`) decide; `"ask"` surfaces Keep mine / Take theirs on the validation
  channel (`data-conflict`). `rowVersion` treats any version change as a
  conflict. The same notice appears on a mobile card.

- 71de77b: Editing lifecycle events

  `onEditStart`, `onEditCancel`, `onEditCommit`, `onValidationFail` and
  `onEditError` observe a cell, row or batch edit. They cannot change the
  outcome — a throw is swallowed — so analytics and toasts never rewind a
  commit. The shared payload is `EditEvent`: row, rowId, columnKey, value,
  previousValue, unit, and optional error. The same events fire on a mobile
  card. Headless: `useCellEditing` accepts `UseCellEditingOptions` for start
  and cancel.

- 4c2f4d2: Validation that gates a commit

  A column's `validate(value, row)` judges one value; the table's `validateRow(row)`
  judges the row an edit would produce and answers what no single cell can — an end
  date before its start, a total that must match its parts. Return a message to
  reject, a map of column key → message to mark individual cells, or nothing to
  allow it.

  A rejected value never reaches `onCellEdit`. The editor stays open holding what
  the reader typed, and the message is announced rather than only painted: Mantine
  and MUI show it in their own input's error slot, every other kit renders
  `data-adapttable-part="edit-cell-error"` with `role="alert"` and points the
  editor's `aria-describedby` at it. Escape clears it with the draft.

  Both levels may be async — "is this SKU real" is a request. The editor carries
  `aria-busy` while a check runs, and a newer draft supersedes an older check so a
  stale answer can never mark a value the reader has already changed. A column with
  no validator commits synchronously, exactly as before.

  Headless: `useEditValidation`, `CellValidator` / `RowValidator`,
  `resolveCommitValue`, and `editorValidationProps` / `editorBusyProps` from
  `@adapttable/core/adapter`. The unstyled and shadcn kits add an `editCellError`
  class hook.

- f06b849: Five more cell editors: boolean, date, datetime, time, multi-select

  `editor: "boolean"` renders a checkbox and commits `true` / `false` on the tick —
  a checkbox has one gesture, and a ticked box that changed nothing reads as a bug.
  `"date"`, `"datetime"` and `"time"` use the browser's own controls and commit the
  strings those controls hold (`"2026-08-13"`, `"2026-08-13T14:05"`, `"09:30"`); a
  column storing a `Date` seeds them from its local parts, because converting to an
  instant moves the day for most of the world. `{ type: "multi-select", options }`
  commits the array of chosen values and seeds itself from a stored array, so a
  host stores back exactly what it gave — an empty selection is `[]`, not `""`.

  Headless: `editorInputType`, `isBooleanEditor` / `isSelectEditor` /
  `isMultiSelectEditor`, `booleanDraft` / `isDraftChecked`, `formatMultiDraft` /
  `readMultiDraft`, and `NativeBooleanEditor` / `NativeMultiSelectEditor` with
  `commitBooleanDraft` / `multiDraftFromSelect` from `@adapttable/core/adapter`.

- 9ac9635: Full-width and separator rows via `extraRows`

  Host-injected slots splice into the body by `beforeRowId`. A separator is
  a rule; a full-width row is one spanning cell. Mobile cards keep the same
  slots. Nothing goes in the URL.

- 6e26b32: Facet counts exclude the facet's own filter

  Checklist counts describe what selecting a value would keep. Frontend
  computes them from `allSearchedRows`; a server that declares
  `supports.facets` returns the same map on the page.

- c14991d: Fill handle on the selection's corner

  Select cells with `cellNavigation` on and a small square appears on the bottom
  corner of the selection. Drag it and the values carry on — down, up or sideways
  — with the cells it would write highlighted before anything is committed. Two or
  more numbers a constant step apart continue the series; anything else repeats.
  Ctrl/Cmd+D fills the selection down from its top row and announces what it
  wrote.

  The edits arrive through `onCellEdit`, or `onCellFill` for the batch, so the
  handle appears as soon as a table can be edited and never when it cannot. All
  eight adapters, RTL included.

  Headless: `fillDirection`, `fillTargetRange`, `fillRangeEdits`,
  `cellFillHandler`, and `FillHandle` from `@adapttable/core/adapter`.

- e6d5d28: The filter popover stops at the viewport edge

  The form grows while it is open — an operator can reveal a second bound, a
  checklist can run long — and a card taller than the window painted its lower
  fields off-screen, where scrolling to reach them dismissed the card instead. It
  now caps its height and scrolls inside, as the Radix and Base UI adapters
  already did.

- 74a0544: AND/OR filter tree builder

  The filter panel now has a kit-agnostic builder — add condition, add
  group, AND/OR — over the versioned `ft` tree. Leaves show as chips;
  Clear all drops the tree. Labels land in all 17 locales.

- 5bdb072: Public filter type registry

  `filterTypes` registers a custom type (widget, predicate, chips,
  serialization) or `registry.extend`s a built-in. Built-ins are the
  first consumers — no `switch (def.type)` remains in the engine.

- d3309cc: Find in table

  `findInTable` puts a find bar over the table on Ctrl/Cmd+F. It leaves every row
  where it is and walks the cells whose text contains the query — Enter forward,
  Shift+Enter back, Escape to close — marking each hit and taking focus to the one
  you are on, so the cell is scrolled into view, announced and selected.

  Matching reads what a cell shows, so a formatted date is found by its formatted
  text, and only the loaded rows are searched: a hit the table cannot take you to
  would be a lie. Hits are painted in the amber browsers use for their own find,
  overridable through `--adapttable-find-match` (or the `cellMatch` /
  `cellMatchCurrent` class hooks in `@adapttable/unstyled`, which the shadcn preset
  fills in).

  Every word is localizable in all seventeen locales. Headless: `findMatches`,
  `useFindInTable` and `FindBar` from `@adapttable/core/adapter`.

- b166133: Flex columns, bounds, and filling the container

  A column now takes `minWidth`, `maxWidth` and `flex` beside its `width`.
  `fitColumns` makes the columns share the container instead of overflowing it:
  columns with a width keep it, columns with a flex take that share, and the rest
  divide what remains — with a width the user dragged winning over all of it.

  Underneath is CSS the browser already knows — a fixed table layout with
  percentage widths — so nothing measures or reflows in JavaScript. The Ant Design
  adapter renders through antd's own `<Table>`, which sets its own layout mode;
  the per-column widths, bounds and shares still apply there.

  Headless: `columnFlexShares`, `columnSizeStyle` and `fittedTableStyle`.

- 51deb4b: Group footers

  `groupFooters` closes every group with a row carrying the same aggregates its
  header carries, so the totals read at the bottom of a long group as well as the
  top. A footer shows no chevron and no checkbox — the header owns both — nested
  groups each get their own innermost first, and a collapsed group shows none at
  all.

  `summaryRow` remains the grand total and, under grouping, totals the whole
  filtered set. On mobile the footer is a card of its own; exports are untouched,
  since a footer is chrome rather than a row.

  Captioned through `labels.groupTotal` in all seventeen locales, with
  `group-footer-row` / `group-footer-cell` parts and matching class hooks in
  `@adapttable/unstyled`.

- 9f9ed08: Page the groups, and the rows inside them

  `groupPageSize` shows a screenful of top-level groups and offers the rest;
  `groupRowPageSize` does the same for the rows inside each group. Each limit adds
  one row — "Show 42 more groups", "Show 8 more in this group" — that reveals the
  next page when clicked.

  Only the top level pages: a nested level is already inside a group the reader
  opened. On a server tier, where the rest of a group is not in the browser yet,
  `onGroupLoadMore(groupKey)` fires with the group that needs filling.

  Localized in all seventeen locales, with `group-more-row` / `group-more-cell` /
  `group-more` parts and `groupMoreRow` / `groupMoreCell` class hooks in
  `@adapttable/unstyled`.

- b321249: Grouped rows carry their cells

  A grouped body renders `grouping.entries`, a list of its own — so its leaves now
  have body cells built for them, and a grouped table draws its rows whatever the
  window is showing.

- d256fe7: Header filter row

  `headerFilters` adds a compact per-column filter row under the header,
  bound to the same defs and extra bag as the panel. Desktop only; mobile
  cards keep the Filters button. Labels land in all 17 locales.

- 61d20c9: Nested row grouping

  `groupBy` takes an ordered list — `groupBy={["team", "status"]}` — and each key
  nests inside the one before it. Every header describes its whole subtree: the
  count beside a team is all of its people, and `groupAggregates` totals the same
  set. Deeper levels indent by logical padding, so nesting mirrors in RTL.

  Each node collapses on its own, because a node's key carries its whole path:
  "Core > blocked" and "Platform > blocked" are different groups, and closing a
  parent hides its subtree in one step.

  The keys travel as one comma-separated value (`?groupBy=team,status`), so links
  and saved views built for a single key keep working; `onGroupByChange` now
  reports the keys as a list.

  Headless: `parseGroupBy`, `formatGroupBy`, and `groupIndentStyle` from
  `@adapttable/core/adapter`.

- e990107: Range selection reaches the pointer and whole columns. Drag across cells to
  select a block; click a column header to select that column — Ctrl/Cmd+click
  where the header already sorts, so sorting keeps the click it has always had.
  A column selection covers the loaded rows only, never rows the browser has not
  seen.

  The selection is also spoken: `labels.gridRangeSelection` announces the
  rectangle's edges and size when it changes, translated in all seventeen locales,
  and stays quiet for a single cell.

- b050673: Relative date filter tokens

  Date filters gain a Relative operator that stores `today` / `last:7` / …
  in the URL — never a resolved calendar day — and resolves the window at
  query time.

- 69c2338: Rich filter operators per datatype

  Text, number and date filters are operator-first. The comparison is stored
  as `f_<key>Op` so it survives the URL and Saved Views. Existing links
  without an operator keep their old meaning.

- 4e19a68: Row editing: one commit for the whole row

  `rowEditing` + `onRowEdit` change the commit unit from a cell to a row. Every
  editable field of a row opens together, holds its draft, and reaches the host as
  ONE patch of only what changed — the right unit for a row whose fields constrain
  each other, which cannot be edited a cell at a time without passing through
  states that are invalid on the way.

  Each row grows an Edit control; Save hands over the patch, Cancel throws the
  drafts away, and Enter and Escape do the same from any field. An untouched row
  reports nothing. One row is open at a time. The same editors, the same
  `parseValue`, the same per-column `editable` predicate, and the same behaviour on
  a mobile card.

  `onCellEdit` is not required: a table that only wants row-level commits leaves it
  out, and its cells stay display-only until a row is opened.

  Labels `editRow` and `saveRow` are translated in all seventeen locales. Parts:
  `row-edit-begin`, `row-edit-actions`, `row-edit-save`, `row-edit-cancel`.

  Headless: `useRowEditing`, with `RowEditCell`, `RowEditActions` and
  `rowEditControls` from `@adapttable/core/adapter`. Every kit's editor now takes
  its focus ref from the controller (`ctrl.focusRef`), so the table decides which
  field takes focus.

- 9bccc0b: Add, duplicate and delete rows

  Three handlers, three controls. `onAddRow` puts an Add row button in the
  toolbar; `onDuplicateRow` and `onDeleteRow` put Duplicate row and Delete row on
  every row, after your own `rowActions` so a delete stays last. They ride the
  actions column like any other row action — hideable and end-pinnable from the
  Columns menu, buttons on desktop and card buttons on mobile.

  A delete asks first, through the same confirmation dialog a `rowActions` entry
  uses; `confirmDeleteRow={false}` skips it.

  The table stores nothing. A row you add arrives through the source like every
  other row, so it is editable, filterable, sortable, grouped, counted and
  virtualized from the moment it lands.

  Labels `addRow`, `duplicateRow`, `deleteRow` and `deleteRowConfirm` are
  translated in all seventeen locales. Headless: `useRowMutations`.

- 670b772: Row pinning via sticky top and bottom sections

  `pinnedRowIds` / `onPinnedRowIdsChange` take `{ top, bottom }` id lists.
  Pinned rows leave the virtual window and stick above or below the scroll
  box; column pins still apply. Grouping and trees refuse it with a
  `devWarn`. Mobile cards get the actions and no sticky chrome. The lists
  round-trip in the URL (`rowPin`) and in saved views.

- 5392ae4: Row reordering via a reserved drag-handle column

  `onRowReorder(from, to, row)` is the write — dataset-relative indices, never
  a mutate (`applyRowReorder` for in-memory hosts). Keyboard is a grab: Space
  lifts, arrows move, Space drops, Escape cancels, each step announced.
  Grouping and trees refuse it with a `devWarn`. Mobile cards get up/down
  buttons. The column hides and start-pins from the Columns menu
  (`REORDER_COLUMN_KEY`).

- 3c1699e: Row and column spanning via a per-row cell list

  `getCellSpan` and `column.colSpan` / `column.rowSpan` emit one cell list
  per row; covered cells are omitted. Arrow keys skip them, CSV writes the
  origin once. Mobile cards ignore geometry. Nothing goes in the URL.

- df87e16: Conditional row styling and heights via `rowStyle` and `rowHeight`

  A function of the row sets inline style; a number or function sets height
  and the virtualizer's `estimateSize`. Mobile cards keep the same hooks.
  Nothing goes in the URL.

- f0cf1c0: Selection statistics

  `selectionStats` puts a strip under the table saying what the selected cells
  add up to: count, sum, average, min and max. The count covers every selected
  cell and the arithmetic covers the numeric ones, so a rectangle spanning a name
  and a budget still has a sum. Numbers are read the way an export reads them, so
  the total on screen matches the total a spreadsheet computes from the same
  cells.

  A single cell shows nothing. The strip is a status region, so the figures are
  read after the range announcement, and every word is localizable in all
  seventeen locales. Number formatting follows the table's `locale`.

  Headless: `selectionStats` and `SelectionStatsBar` from
  `@adapttable/core/adapter`.

- 2ab6c3a: Grouping on the server

  A source that declares `supports: { grouping: true }` now receives the grouping
  keys with every query — as an array, outermost first — and, with
  `supports: { aggregates: true }`, the `aggregates` it was asked for. Return
  `groups` on the source and the table renders them exactly as it renders local
  groups: same headers, collapsing, footers and selection.

  The counts and aggregates displayed are the server's, so a group of 4,000 whose
  response carried 20 rows says 4,000. A server can send counts only and fill each
  group's rows in when it opens.

  The response shape and a reference endpoint are documented in
  [row grouping](https://adapttable.dev/docs/row-grouping). Headless:
  `serverGroupEntries`, `QueryGroupRow`, `QueryGroupsPage`, `groupLeafCount`.

- bc1b903: Tree data — hierarchical rows in all nine adapters

  Pass `getChildren(row)` for nested data, or `getParentId(row)` for a flat list
  with a parent column, and the table renders the hierarchy: one chevron per
  parent, one indent step per level, in the first column or the one `treeColumn`
  names. `expandedIds` / `onExpandedIdsChange` hand the open set to the host.
  Without either prop the table is the flat list it always was.

  This is a separate model from `groupBy`, deliberately: a group is derived from
  values and regroups when the reader changes the question, a tree is declared by
  the data and holds its shape through a sort.

  Mobile cards keep the hierarchy — each card steps in by its depth and carries
  the same chevron. A tree windows through the same virtualizer a grouped model
  does, so 50,000 hierarchical rows render about 20 of them; the benchmark suite
  records the scenario.

  Headless: `buildTreeEntries`, `useTreeExpansion`, `filterTreeRows`,
  `treeColumnKey`, `treeIndentStyle`, `treeCardStyle`, `bodyRowEntries`, and
  `TreeCell` / `TreeToggle` from `@adapttable/core/adapter`. The unstyled and
  shadcn kits add `treeCell`, `treeToggle` and `treeSpacer` class hooks.

- 8cc2690: Row detail works under virtualization

  A table cannot nest a detail panel inside the row it belongs to, so the two are
  separate elements — and a window that measured the row alone reported 56px for
  something 300px tall, which is why `renderRowDetail` carried a "not recommended
  with `virtualize`" warning.

  The window now measures the pair. An open panel reports its real height, one
  that grows later corrects itself, and the warning is gone.

  Headless: `useRowPairMeasurer` from `@adapttable/core/adapter`.

- Updated dependencies [a9992c9]
- Updated dependencies [ac998d0]
- Updated dependencies [ec12556]
- Updated dependencies [9d334bd]
- Updated dependencies [c2ea3ef]
- Updated dependencies [cdcb992]
- Updated dependencies [9239898]
- Updated dependencies [bd52b39]
- Updated dependencies [96c74d0]
- Updated dependencies [c20c888]
- Updated dependencies [1c53d5c]
- Updated dependencies [1819d00]
- Updated dependencies [2c97e75]
- Updated dependencies [71de77b]
- Updated dependencies [4c2f4d2]
- Updated dependencies [f06b849]
- Updated dependencies [9ac9635]
- Updated dependencies [6e26b32]
- Updated dependencies [424bdbc]
- Updated dependencies [c14991d]
- Updated dependencies [74a0544]
- Updated dependencies [9227de5]
- Updated dependencies [5bdb072]
- Updated dependencies [d3309cc]
- Updated dependencies [b166133]
- Updated dependencies [62a788e]
- Updated dependencies [51deb4b]
- Updated dependencies [9f9ed08]
- Updated dependencies [daaa7c0]
- Updated dependencies [b321249]
- Updated dependencies [d256fe7]
- Updated dependencies [428e1ce]
- Updated dependencies [61d20c9]
- Updated dependencies [a28a2de]
- Updated dependencies [5af9a99]
- Updated dependencies [e990107]
- Updated dependencies [b050673]
- Updated dependencies [69c2338]
- Updated dependencies [4e19a68]
- Updated dependencies [9bccc0b]
- Updated dependencies [670b772]
- Updated dependencies [5392ae4]
- Updated dependencies [3c1699e]
- Updated dependencies [df87e16]
- Updated dependencies [f0cf1c0]
- Updated dependencies [2ab6c3a]
- Updated dependencies [774cd87]
- Updated dependencies [8f55d33]
- Updated dependencies [e43e87c]
- Updated dependencies [bc1b903]
- Updated dependencies [24a7199]
- Updated dependencies [8cc2690]
  - @adapttable/core@2.3.0

## 2.2.0

### Minor Changes

- 33e249b: Keyboard cell navigation. Set `cellNavigation` and the table becomes one tab
  stop whose interior is reachable by arrow keys, Home/End, Ctrl+Home/End and
  PageUp/PageDown, with `role="grid"` and a live region announcing the column, the
  cell's text and the absolute position.

  The ARIA indices are dataset-absolute, so a virtualized table rendering 24 rows
  of 100,000 reports row 40,002 rather than row 3 of 24 — and Ctrl+End reaches a
  cell the virtualizer has not mounted by scrolling it into existence first.

  Edges stop rather than wrap, the arrows swap under RTL, and Enter/F2 open the
  editor through the existing editing gate. The position phrase is localizable via
  `labels.gridCellPosition` and ships translated in all seventeen locales.

  Off means absent: with the prop omitted there is no role change, no `tabIndex`,
  no key handler and no live region — asserted as byte-identical markup in every
  adapter.

- 203d725: A new `slots.noResults` replaces the empty state shown when a search or filter
  matched nothing, separately from `slots.empty`. Setting only `empty` still
  covers both states, so nothing changes until you use it — reach for `noResults`
  when the filtered case needs its own message and its own way back to the full
  list.

  The sticky header's surface and hairline read from `--adapttable-surface` and
  `--adapttable-header-border`, so a panel whose background is not the page
  background can set them in CSS rather than overriding inline styles (Mantine).

### Patch Changes

- 6cdc2dd: A per-group subtotal now renders in its own column's cell, so it sits under the
  column it totals and inherits that column's alignment. It used to share one
  spanning cell with the group label and settle at the row's end — on a table wide
  enough to scroll, past the right edge of what the user could see.

  Mobile cards show the same numbers captioned by their column, since a card has
  no columns to align to.

  `groupRowLayout` and `groupAggregateEntries` place them, for a custom group
  header that should match.

- 4b0e572: `resolveMobileLabel` from `@adapttable/core/adapter` resolves a mobile card
  field's caption — an explicit `mobileLabel`, then a text `header`, then the
  column's key, with `mobileLabel: ""` meaning no caption at all. Every adapter's
  card layout now reads it from there, so a custom card can match them exactly.
- 203d725: Sticky tables draw their row separators again. A sticky header switches the
  table to separate borders, where a browser ignores borders set on a row, so
  the dividers are painted on the cells instead (Mantine).

  Mobile cards carry `data-selected` when selected, so a card can be styled from
  CSS the way a desktop row already could.

  A column with `mobileLabel: ""` now renders no label at all, instead of an
  empty line that still took space or the header substituted back in.

- fc6e9cf: The export button names the format it produces. With the spreadsheet writer it
  reads "Export XLSX", and a custom writer calling itself `tsv` gets "Export TSV" —
  from a new `labels.exportFile(format)`, translated in all seventeen locales.

  CSV is untouched: it still reads `labels.exportCsv`, so its existing
  translations, and any wording a host overrode, stand exactly as they were.

- d3568ea: A host-handled export now shows each kit's own loading affordance instead of a
  greyed-out button — Mantine's, MUI's, Chakra's and Ant Design's loading buttons,
  Radix's and Base UI's spinners, and a styleable `exportSpinner` element in the
  unstyled and shadcn presets.

  The outcome is announced. A download is silent and a failed one is silent in the
  same way, so a polite live region beside the button reads `labels.exportDone` or
  `labels.exportFailed`, translated in all seventeen locales. `useExportHandler`
  also returns `exportStatus` — `"idle"`, `"busy"`, `"done"` or `"failed"` — for a
  toolbar that wants to show more.

- 21c680f: Spreadsheet export and a range scope. `import { xlsxWriter } from
"@adapttable/core/xlsx"` and pass it as `exportCsv={{ writer: xlsxWriter() }}`
  to download a real `.xlsx`: numbers and booleans stay typed so a spreadsheet can
  sum them, text that looks numeric stays text so a postal code of `01730` is not
  `1730`, and no dependency is added. It is a separate entry point, so a table
  exporting CSV ships none of it.

  `scope: "range"` exports the highlighted cell rectangle from `cellNavigation`.
  The rectangle names its own columns, and with nothing selected the current page
  is exported instead.

  Every scope works with every format: rows and columns are resolved once, and a
  writer turns the result into bytes. `csvWriter`, `buildExportTable`,
  `matrixToCsv` and `downloadExportFile` are the pieces, `ExportWriter` the type
  to implement for a format of your own, and a backend `request` now receives
  `format` alongside the query.

- 8507bba: Server-side export. `exportCsv.request` hands the user's current view — search,
  filters, sort, paging and the chosen scope — to your backend instead of
  building the file in the browser, which stops being viable once the rows no
  longer fit in a tab. Return a promise and the Export button disables itself
  with `aria-busy` until it settles, so the same export cannot be started twice.

  Also fixes `scope: "selected"` and `columns: "all"` in the Ant Design and
  unstyled adapters, which built their export handler without the table's
  selection and so silently fell back to the current page.

- Updated dependencies [6cdc2dd]
- Updated dependencies [5a6f7d9]
- Updated dependencies [007d9d9]
- Updated dependencies [453ba05]
- Updated dependencies [4b0e572]
- Updated dependencies [33e249b]
- Updated dependencies [58933b0]
- Updated dependencies [4c5de79]
- Updated dependencies [b0681ed]
- Updated dependencies [265a58f]
- Updated dependencies [fc6e9cf]
- Updated dependencies [2e3a6ce]
- Updated dependencies [d3568ea]
- Updated dependencies [108b6c4]
- Updated dependencies [21c680f]
- Updated dependencies [8507bba]
- Updated dependencies [65a8949]
  - @adapttable/core@2.2.0

## 2.1.2

### Patch Changes

- f121a41: `urlSync={false}` now really stops URL writes, and a lone table no longer warns
  about itself.

  `useResolvedAdapter` resolved an explicitly passed adapter before it checked
  whether the hook was syncing, so `enabled: false` was ignored whenever a caller
  supplied an adapter. Two things followed:

  - A hook told not to sync still wrote through the caller's adapter — with a
    router adapter that meant `urlSync={false}` state landing in the real address
    bar.
  - A table mounts both data tiers on one adapter and disables the inactive one.
    Both tiers therefore claimed the same URL namespace, and every single table
    logged the duplicate-namespace warning about itself. No prop could silence
    it: `urlKey` renamed both sides equally, and the warning that exists to report
    a real two-table collision could not be told apart from the false positive.

  `enabled` is now checked first and beats an explicit adapter, so a disabled hook
  always resolves to its own memory store. The genuine collision — two syncing
  tables sharing a namespace — still warns.

  The table shells that pre-resolve a URL backend no longer forward `urlSync` to
  the tier hooks as well: the choice is already expressed by which adapter they
  resolved, and applying it twice would route the active tier to a private store
  that the saved-views menu could not read.

- Updated dependencies [f121a41]
  - @adapttable/core@2.1.2

## 2.1.1

### Patch Changes

- 6934219: The automatic mobile card layout leads each package's Features list, with
  links to the live mobile demo and the responsive-table guide. Docs only —
  no runtime changes.
- Updated dependencies [6934219]
  - @adapttable/core@2.1.1

## 2.1.0

### Minor Changes

- 4b4baa5: The saved-views menu behaves the same in every adapter.

  Two behaviours were split across kits and are now uniform: **applying a view
  closes the panel** (mantine, chakra, radix and base-ui kept it open), and the
  panel no longer repeats the trigger's "Saved views" label as an inner title
  (those same four printed it twice). Saving still clears the field and keeps
  the panel open, so several views can be captured in one sitting. chakra, radix
  and base-ui move to controlled popovers, which is what let their panels ignore
  the close.

  `@adapttable/unstyled` adds `viewsRow` and `viewsSaveRow` class hooks with
  matching `data-adapttable-part` names — its two panel rows carried neither, so
  their spacing could not be styled at all — plus a structural gap so they are
  not flush with no classes set. In the `@adapttable/shadcn` preset the name
  field now takes the row's free space, so the save button no longer overflows
  the panel.

- 4b4baa5: The toolbar reads **Filters · Saved views · Columns · Export CSV** in every
  adapter.

  `ToolbarChromeProps` gains a `savedViewsMenu` slot beside `columnMenu`, so the
  menu has one named place to mount. Previously core offered no slot for it and
  each adapter improvised: four declared the same local prop, mantine passed it
  inside the `columnMenu` slot, and mui injected it into the caller's `toolbar` —
  so a custom `toolbar` no longer has the saved-views node mixed into it.

  The button moves for antd, mui, mantine and the unstyled/shadcn pair. An
  order test now runs in each adapter.

### Patch Changes

- Updated dependencies [4b4baa5]
- Updated dependencies [4b4baa5]
  - @adapttable/core@2.1.0

## 2.0.0

### Major Changes

- 7382e6a: AdaptTable 2.0.0 — a truth-and-consistency major. Every documented behavior
  now works as written, the same word means the same thing across all eight
  adapters, and the silent traps became loud. Full guide:
  [Migrating from v1](https://orwa-mahmoud.github.io/adapttable/migrate-from-v1/).

  ### BREAKING CHANGES
  - **v1 names are removed, not aliased** — the compiler surfaces every rename:

    | v1                                         | v2                                                |
    | ------------------------------------------ | ------------------------------------------------- |
    | `useBackendData` / `UseBackendDataOptions` | `useQuerySource` / `UseQuerySourceOptions`        |
    | `enabled` / `adapter` (URL hooks)          | `urlSync` / `urlAdapter`                          |
    | `defaultLayout`                            | `defaultColumnLayout`                             |
    | `selected` / `onChange` (`useSelection`)   | `selectedIds` / `onSelectionChange`               |
    | `collapsedIds` / `onCollapsedIdsChange`    | `collapsedGroupIds` / `onCollapsedGroupIdsChange` |
    | `customToolbar`                            | `toolbar`                                         |
    | `PaginatedResponse.items` / `.hasNext`     | `.rows` / `.hasNextPage`                          |
    | `SortState`                                | `SortLevel`                                       |
    | `hideSearch`                               | `searchable` (positive polarity, default `true`)  |
    | `isMobile` prop                            | `forceMobile`                                     |
    | `labels.applyFilters`                      | `labels.filtersDone`                              |
    | Chakra `colorScheme`                       | `accentColor`                                     |
    | `SavedViewsMenuLabels`                     | `SavedViewsLabels`                                |
    | `classNames.rowsPerPageSelect`             | `classNames.rowsPerPage`                          |
    | `classNames.pageButton`                    | `pagePrev` / `pageNext` / `pageNumber`            |
    | antd `virtualHeight` / `virtualWidth`      | removed — bound the scroller with `maxHeight`     |
    | `PageSelector` returning `{ items }`       | `{ rows }`                                        |
    | `GroupCollapseState.collapsedIds`          | `collapsedGroupIds`                               |
    | `useDataTable` option `isMobile`           | `forceMobile`                                     |
    | unstyled `emptyState` / `loadingState`     | `slots.empty` / `slots.skeleton`                  |

    ```tsx
    // before (v1)
    const source = useBackendData({ usePaginatedQuery, enabled: false });
    <DataTable source={source} hideSearch isMobile customToolbar={<Extra />} />;

    // after (v2)
    const source = useQuerySource({ usePaginatedQuery, urlSync: false });
    <DataTable
      source={source}
      searchable={false}
      forceMobile
      toolbar={<Extra />}
    />;
    ```

  - **One source-flag contract.** `isLoading` is
    first-load only; `isFetching` is any in-flight request;
    `hasNextPage` / `fetchNextPage` are infinite-append only; `refetch`
    really re-runs. The `onQueryChange` tier now **appends** on
    `fetchNextPage` instead of replacing the page, and resolves
    `paginationMode: "auto"` like the other tiers (mobile becomes infinite
    cards — pass `paginationMode="paged"` for the v1 behavior).

    ```tsx
    // before (v1): mobile server tables stayed paged, fetchNextPage replaced rows
    <DataTable data={rows} total={total} onQueryChange={load} />
    // after (v2): auto resolves to infinite cards on mobile; append accumulates
    <DataTable data={rows} total={total} onQueryChange={load} paginationMode="paged" />
    ```

  - **`onGroupByChange` / `onClearFilters` are observers.** The table always
    performs the change itself, then notifies; take full control via
    `source.setGroupBy` / `source.clearExtras`.
  - **Query params are namespaced.** Filter values reach query hooks under
    `params.filters` instead of spread at the top level, and `baseParams`
    never override live state.
  - **Grouped tables render the full filtered set** — footer count,
    select-all scope and page-scope CSV all describe what is on screen; the
    rows-per-page control hides while grouped.
  - **`defaultConfirm` fails safe**: with no dialog available (SSR,
    webviews) destructive actions are now DENIED instead of auto-approved.
  - **CSV export neutralises formula-prefixed cells by default**
    (`escapeFormulas: false` opts out) and always exports the full
    exportable column set regardless of viewport.
  - **An explicit `hideOnMobile: true` always wins** over the mobile
    identity anchor.
  - **Peer floors are truthful**: Chakra `^3.13`, MUI `^6`, Mantine `^7.2`,
    antd `^6`, Radix Themes `^3` — and React 18 works again (v1.2
    accidentally required 19.2; CI now proves 18.3 / 19.0 / 19.2).
  - **~30 internal plumbing exports were removed from `@adapttable/core`**
    (editing/grouping keyboard micro-steps, internal constants, layout math
    helpers). Everything the adapters use remains public and documented.
  - **The adapter-builder tier ships from `@adapttable/core/adapter`.**
    `useDataTableShell`, the render prelude, chrome prop bundles, pinning
    and pager math, keyed virtualization and the inline icons moved to the
    new entry point; `@adapttable/core` keeps the app-facing API. Same
    package, same semver promise — update imports if you consumed these.

  ### Features
  - Explicit `mode` prop: `mode="server"` requires `onQueryChange` at
    compile time; `mode="frontend"` makes it a pure notification.
  - `defaults`, `searchDebounceMs`, `paginationMode` and `error` are real
    component props on every batteries-included `<DataTable>`.
  - The headless tier renders real tables: `useDataTable` resolves bare-key
    columns, `getRowKey` / `getCellContent` cover keys and cell rendering
    without casts, and `getRowProps` is spread-clean.
  - Styling surface is 1:1 — all 127 `classNames` keys map to rendered
    `data-adapttable-part` attributes (enforced by tests); the shadcn preset
    styles every part; MUI and antd gained structural `classNames`.
  - Accessibility: value-named editable cells, focus-restoring menus and
    drawers, roving tab stops on clickable rows, keyboard multi-sort on
    antd, live-region bulk announcements, `aria-current` pagers.
  - i18n: one locale-resolution algorithm for labels and per-column `i18n`
    paths (`ar_EG` ≡ `AR-eg`), count-aware plurals, `labels.removeFilter`,
    script-based RTL list.
  - Packaging: `"use client"` banners in every hook-bearing build, LICENSE
    in every tarball, CLI CJS entry, `adapttable init` usage text on bare
    invocation.
  - The docs now cover the complete export surface of all eleven packages,
    and a gate script keeps it that way.

  ### Fixes
  - Server-tier infinite scroll no longer double-renders rows delivered
    during an in-flight window.
  - `clearAll` clears the multi-sort chain.
  - Persisted column layout and saved views hydrate after mount — no SSR
    hydration mismatch; blocked storage is tolerated.
  - `virtualize` on a paged desktop table dev-warns instead of silently
    doing nothing; `editable` without `onCellEdit` dev-warns too.
  - Plural forms corrected in es / it / pt / he / ru / ur locales; Hausa
    removed from and Assyrian Neo-Aramaic, Western Punjabi and South
    Azerbaijani added to the RTL list.

### Patch Changes

- Updated dependencies [7382e6a]
  - @adapttable/core@2.0.0

## 2.0.0-rc.0

### Major Changes

- 7382e6a: AdaptTable 2.0.0 — a truth-and-consistency major. Every documented behavior
  now works as written, the same word means the same thing across all eight
  adapters, and the silent traps became loud. Full guide:
  [Migrating from v1](https://orwa-mahmoud.github.io/adapttable/migrate-from-v1/).

  ### BREAKING CHANGES
  - **v1 names are removed, not aliased** — the compiler surfaces every rename:

    | v1                                         | v2                                                |
    | ------------------------------------------ | ------------------------------------------------- |
    | `useBackendData` / `UseBackendDataOptions` | `useQuerySource` / `UseQuerySourceOptions`        |
    | `enabled` / `adapter` (URL hooks)          | `urlSync` / `urlAdapter`                          |
    | `defaultLayout`                            | `defaultColumnLayout`                             |
    | `selected` / `onChange` (`useSelection`)   | `selectedIds` / `onSelectionChange`               |
    | `collapsedIds` / `onCollapsedIdsChange`    | `collapsedGroupIds` / `onCollapsedGroupIdsChange` |
    | `customToolbar`                            | `toolbar`                                         |
    | `PaginatedResponse.items` / `.hasNext`     | `.rows` / `.hasNextPage`                          |
    | `SortState`                                | `SortLevel`                                       |
    | `hideSearch`                               | `searchable` (positive polarity, default `true`)  |
    | `isMobile` prop                            | `forceMobile`                                     |
    | `labels.applyFilters`                      | `labels.filtersDone`                              |
    | Chakra `colorScheme`                       | `accentColor`                                     |
    | `SavedViewsMenuLabels`                     | `SavedViewsLabels`                                |
    | `classNames.rowsPerPageSelect`             | `classNames.rowsPerPage`                          |
    | `classNames.pageButton`                    | `pagePrev` / `pageNext` / `pageNumber`            |
    | antd `virtualHeight` / `virtualWidth`      | removed — bound the scroller with `maxHeight`     |
    | `PageSelector` returning `{ items }`       | `{ rows }`                                        |
    | `GroupCollapseState.collapsedIds`          | `collapsedGroupIds`                               |
    | `useDataTable` option `isMobile`           | `forceMobile`                                     |
    | unstyled `emptyState` / `loadingState`     | `slots.empty` / `slots.skeleton`                  |

    ```tsx
    // before (v1)
    const source = useBackendData({ usePaginatedQuery, enabled: false });
    <DataTable source={source} hideSearch isMobile customToolbar={<Extra />} />;

    // after (v2)
    const source = useQuerySource({ usePaginatedQuery, urlSync: false });
    <DataTable
      source={source}
      searchable={false}
      forceMobile
      toolbar={<Extra />}
    />;
    ```

  - **One source-flag contract.** `isLoading` is
    first-load only; `isFetching` is any in-flight request;
    `hasNextPage` / `fetchNextPage` are infinite-append only; `refetch`
    really re-runs. The `onQueryChange` tier now **appends** on
    `fetchNextPage` instead of replacing the page, and resolves
    `paginationMode: "auto"` like the other tiers (mobile becomes infinite
    cards — pass `paginationMode="paged"` for the v1 behavior).

    ```tsx
    // before (v1): mobile server tables stayed paged, fetchNextPage replaced rows
    <DataTable data={rows} total={total} onQueryChange={load} />
    // after (v2): auto resolves to infinite cards on mobile; append accumulates
    <DataTable data={rows} total={total} onQueryChange={load} paginationMode="paged" />
    ```

  - **`onGroupByChange` / `onClearFilters` are observers.** The table always
    performs the change itself, then notifies; take full control via
    `source.setGroupBy` / `source.clearExtras`.
  - **Query params are namespaced.** Filter values reach query hooks under
    `params.filters` instead of spread at the top level, and `baseParams`
    never override live state.
  - **Grouped tables render the full filtered set** — footer count,
    select-all scope and page-scope CSV all describe what is on screen; the
    rows-per-page control hides while grouped.
  - **`defaultConfirm` fails safe**: with no dialog available (SSR,
    webviews) destructive actions are now DENIED instead of auto-approved.
  - **CSV export neutralises formula-prefixed cells by default**
    (`escapeFormulas: false` opts out) and always exports the full
    exportable column set regardless of viewport.
  - **An explicit `hideOnMobile: true` always wins** over the mobile
    identity anchor.
  - **Peer floors are truthful**: Chakra `^3.13`, MUI `^6`, Mantine `^7.2`,
    antd `^6`, Radix Themes `^3` — and React 18 works again (v1.2
    accidentally required 19.2; CI now proves 18.3 / 19.0 / 19.2).
  - **~30 internal plumbing exports were removed from `@adapttable/core`**
    (editing/grouping keyboard micro-steps, internal constants, layout math
    helpers). Everything the adapters use remains public and documented.
  - **The adapter-builder tier ships from `@adapttable/core/adapter`.**
    `useDataTableShell`, the render prelude, chrome prop bundles, pinning
    and pager math, keyed virtualization and the inline icons moved to the
    new entry point; `@adapttable/core` keeps the app-facing API. Same
    package, same semver promise — update imports if you consumed these.

  ### Features
  - Explicit `mode` prop: `mode="server"` requires `onQueryChange` at
    compile time; `mode="frontend"` makes it a pure notification.
  - `defaults`, `searchDebounceMs`, `paginationMode` and `error` are real
    component props on every batteries-included `<DataTable>`.
  - The headless tier renders real tables: `useDataTable` resolves bare-key
    columns, `getRowKey` / `getCellContent` cover keys and cell rendering
    without casts, and `getRowProps` is spread-clean.
  - Styling surface is 1:1 — all 127 `classNames` keys map to rendered
    `data-adapttable-part` attributes (enforced by tests); the shadcn preset
    styles every part; MUI and antd gained structural `classNames`.
  - Accessibility: value-named editable cells, focus-restoring menus and
    drawers, roving tab stops on clickable rows, keyboard multi-sort on
    antd, live-region bulk announcements, `aria-current` pagers.
  - i18n: one locale-resolution algorithm for labels and per-column `i18n`
    paths (`ar_EG` ≡ `AR-eg`), count-aware plurals, `labels.removeFilter`,
    script-based RTL list.
  - Packaging: `"use client"` banners in every hook-bearing build, LICENSE
    in every tarball, CLI CJS entry, `adapttable init` usage text on bare
    invocation.
  - The docs now cover the complete export surface of all eleven packages,
    and a gate script keeps it that way.

  ### Fixes
  - Server-tier infinite scroll no longer double-renders rows delivered
    during an in-flight window.
  - `clearAll` clears the multi-sort chain.
  - Persisted column layout and saved views hydrate after mount — no SSR
    hydration mismatch; blocked storage is tolerated.
  - `virtualize` on a paged desktop table dev-warns instead of silently
    doing nothing; `editable` without `onCellEdit` dev-warns too.
  - Plural forms corrected in es / it / pt / he / ru / ur locales; Hausa
    removed from and Assyrian Neo-Aramaic, Western Punjabi and South
    Azerbaijani added to the RTL list.

### Patch Changes

- Updated dependencies [7382e6a]
  - @adapttable/core@2.0.0-rc.0

## 1.2.3

### Patch Changes

- a7e51ba: Depend on sibling packages by caret range instead of an exact pin.

  Adapters declared `workspace:*`, which publishes as an exact version — `@adapttable/mantine@1.2.2` required precisely `@adapttable/core@1.2.2`. Installing an adapter alongside `@adapttable/core` therefore produced **two copies of core**:

  ```
  node_modules/@adapttable/core                                  1.2.2
  node_modules/@adapttable/mantine/node_modules/@adapttable/core 1.2.1
  ```

  Most of core is per-instance state, so a second copy is mainly waste — but the URL-namespace registry is module-level, so two copies means two registries, and two tables that do not set an explicit `urlKey` can claim the same namespace and overwrite each other's URL state.

  The exact pin also forced all eight adapters to republish on every core patch, even when nothing about them changed.

  `workspace:^` publishes as `^1.2.2`: the resolver keeps one copy, and a future core patch releases core alone. This release ships that range into every adapter, which is why all of them are included here — it is the last time a core change requires them.

- Updated dependencies [a7e51ba]
- Updated dependencies [a7e51ba]
  - @adapttable/core@1.2.3

## 1.2.2

### Patch Changes

- feed13d: Fix the broken hero image on every npm package page, and add a clip per feature.

  npm renders README images through GitHub's camo proxy, which refuses anything
  over 5 MB. Every demo GIF was 5.2–8.7 MB, so camo returned `Content length
exceeded` and each package page showed a broken image instead of the table.

  The clips are now cut per feature — row grouping, cell editing, filtering,
  column management and RTL — cropped to the table at native resolution rather
  than downscaling the whole page. Each is 232 KB–2.3 MB, and each is sharper
  than the 8 MB version it replaces, because a shorter clip spends its budget on
  pixels instead of length.

- Updated dependencies [feed13d]
  - @adapttable/core@1.2.2

## 1.2.1

### Patch Changes

- b535c41: Fix inline editing on grouped rows outside the current page slice. The editing
  guard validated the active cell against the page slice while the grouped body
  renders the full filtered set, so only each group's first rows accepted edits.
  The guard and Tab-advance now follow the rendered leaf set via the new
  `chrome.editingRows`.
- b77bcdc: Point each README's demo image at the live demo instead of a raw `.mp4` file,
  and deep-link it to that package's own adapter (`/demo/?kit=mui`,
  `?kit=radix`, …) now that the kit selector is URL-addressable. Clicking the
  image lands on a table you can actually use rather than a video download.
- a719db6: List inline cell editing and row grouping in each README's feature links. Both
  shipped in 1.2.0 but the package pages never mentioned them, so anyone reading
  on npm had no way to learn they exist.
- Updated dependencies [b535c41]
- Updated dependencies [b77bcdc]
- Updated dependencies [a719db6]
  - @adapttable/core@1.2.1

## 1.2.0

### Minor Changes

- e36b3ee: Add an opt-in `exportCsv` toolbar button on every adapter. Exports the visible columns in display order for the current page (or the full filtered set with `scope: "all"`). New `exportCsv` label key in core defaults and all i18n locales.
- c402908: Add opt-in inline cell editing. Pass `onCellEdit` to enable; mark columns with `editable` / `editor` / `editValue`. Kit-native text, number, and select editors on every adapter (desktop + mobile). New `editCell` label in core defaults and all i18n locales. Without `onCellEdit`, editing stays fully dormant.
- 4546dcd: Add opt-in single-level row grouping. Pass `groupBy` to group by one column (frontend tier only; server sources devWarn and ignore). Optional `groupAggregates` shares the `summaryRow` mapper signature for per-group subtotals. Expand/collapse group headers on every adapter (desktop + mobile), with tri-state group selection when checkboxes are on. New `expandGroup`, `collapseGroup`, and `groupCount` labels in core defaults and all i18n locales. Without `groupBy`, grouping stays fully dormant.

### Patch Changes

- Updated dependencies [e36b3ee]
- Updated dependencies [c402908]
- Updated dependencies [4546dcd]
  - @adapttable/core@1.2.0

## 1.1.2

### Patch Changes

- e909bf7: Refresh adapter npm README demos: animated GIFs (click through to mp4) replace static posters so npm package pages show motion without leaving the page.
- Updated dependencies [e909bf7]
  - @adapttable/core@1.1.2

## 1.1.1

### Patch Changes

- 5a8fed4: Keep the filters popover inside the viewport on narrow screens. The card is
  anchored to the trigger's inline edge, so on a phone it could hang past the
  screen (a 320px card under a button near the edge rendered ~170px off-screen,
  cutting off the filter controls). It now shifts back inside after opening and
  on resize, and is capped to the viewport width. `@adapttable/shadcn` inherits
  the fix.
  - @adapttable/core@1.1.1

## 1.1.0

### Minor Changes

- 6c7030b: Bring the whole adapter set to feature parity.

  - **Entrance animation on every adapter.** The opt-in `animate` mount stagger —
    a dependency-free row/card entrance that honours `prefers-reduced-motion` —
    now works on MUI, Chakra, Ant Design, Radix, shadcn/ui and unstyled, not just
    Mantine. `useMountStagger` moved into `@adapttable/core`; the existing
    `@adapttable/mantine` import path is unchanged.
  - **Ant Design mobile-card windowing.** antd already virtualized desktop rows
    through its native table; under `virtualize` its mobile card list now windows
    through the shared engine as well, like every other adapter.
  - **Popover keyboard a11y fix (MUI, Chakra, Ant Design).** Pressing Escape in
    the filter popover now hands focus back to the Filters trigger instead of
    stranding keyboard users, matching the Mantine/Radix/unstyled behaviour and
    the documented overlay contract.
  - Docs and README polish: the `ColumnDef` `filter` JSDoc is attached to the
    right field, and each package README gains a "Try in StackBlitz" link (with
    migration guides where a source library exists); the Chakra README now
    correctly targets v3.

### Patch Changes

- Updated dependencies [6c7030b]
  - @adapttable/core@1.1.0

## 1.0.0

### Major Changes

- a94745e: AdaptTable 1.0 — the public API is now stable under semantic versioning.

  This release freezes the committed-stable surface: the `@adapttable/core` engine
  (source builders, `useDataTable` and its prop-getters, the core types, and the
  URL-state hooks), every adapter's `<DataTable>` props and extension points
  (`slots`, `classNames`, `toolbar`, `confirm`), and the `@adapttable/i18n` locale
  presets. From this release on, breaking changes to that surface ship only in a
  major version. There are no runtime behavior changes — this marks the stability
  commitment. `@adapttable/cli` is a scaffolding tool and keeps its own cadence.

### Patch Changes

- Updated dependencies [a94745e]
  - @adapttable/core@1.0.0

## 0.3.3

### Patch Changes

- Updated dependencies [761be36]
  - @adapttable/core@0.3.3

## 0.3.2

### Patch Changes

- 682d3b7: Road-to-1.0 prep: document the versioning & stability contract, mark the
  `mergeProps`/`Props` prop-getter plumbing as `@internal` (consumers use the
  `useDataTable` prop-getters, not the merge helper), add a `smoke-dist`
  post-build check that asserts every advertised `exports`/`main`/`module`/`types`
  target is actually emitted, and harden `getPath`/`humanizeKey` to tolerate an
  empty/undefined key so a transiently-malformed column key can never crash a
  render. No behaviour changes; no breaking changes.
- Updated dependencies [682d3b7]
  - @adapttable/core@0.3.2

## 0.3.1

### Patch Changes

- 6ab1391: docs: every package README now leads with a click-to-play demo — a poster (with
  a play button) that links to an mp4 of the table in action — replacing the
  autoplaying GIF. Republishing so the new READMEs land on npm.
- Updated dependencies [6ab1391]
  - @adapttable/core@0.3.1

## 0.3.0

### Minor Changes

- a90a2c2: Logical column pinning, so pinning stays correct under RTL.

  **Breaking.** Pinned-side values are now `"start"` / `"end"` (were `"left"` /
  `"right"`) — this is the public `pinned` layout value and the `colPin` URL token
  (e.g. `colPin=name:start`); pre-existing `left`/`right` URLs no longer parse. The
  label keys `pinLeft` / `pinRight` / `moveLeft` / `moveRight` are renamed to
  `pinStart` / `pinEnd` / `moveStart` / `moveEnd`, with logical display strings
  shipped for every locale. Pinning a data column is now a start-only toggle; the
  injected actions column keeps its one-click end-pin.

  To migrate: update any `defaultColumnLayout={{ pinned: { x: "left" } }}` to
  `"start"` (and `"right"` → `"end"`), any persisted `colPin` URLs, and any custom
  `labels` overriding the renamed keys.

- a90a2c2: Numbered page buttons in every adapter's pagination (with first/last and
  ellipsis truncation), replacing the prev/next-only control — driven by a shared
  `paginationItems` builder in `@adapttable/core`.

### Patch Changes

- Updated dependencies [a90a2c2]
- Updated dependencies [a90a2c2]
  - @adapttable/core@0.3.0

## 0.2.2

### Patch Changes

- 0fe5eca: Ship the **React Compiler**. The published packages are now built with `babel-plugin-react-compiler` (target 18, **production build only** — not the test build), so components and hooks are auto-memoized for fewer wasted re-renders. Tests still run against un-compiled source, so coverage is unaffected; the compiled output adds `react-compiler-runtime` as a small runtime dependency.
- Updated dependencies [0fe5eca]
  - @adapttable/core@0.2.2

## 0.2.1

### Patch Changes

- dd60cf0: docs: each package readme now links the docs site, live demo, and getting-started guide (top links + a Documentation section deep-linking each feature), the `homepage` field points at the docs site, and the root readme gains npm badges. Tailwind/shadcn is reframed as the unstyled adapter path rather than a batteries-included styled adapter.
- Updated dependencies [dd60cf0]
  - @adapttable/core@0.2.1

## 0.2.0

### Minor Changes

- 83610ec: Support React 19 and the latest major of every UI kit.

  - **core / unstyled**: hook and chrome ref types follow React 19's
    `useRef<T>(null) → RefObject<T | null>` change, and the deprecated
    `MutableRefObject` is replaced with `RefObject`. The prop-getters
    (`getTableProps`, `getHeaderCellProps`, `getSortButtonProps`,
    `getCellProps`, `getSearchInputProps`) now return precise element-prop
    interfaces instead of a bare `Record<string, unknown>`, so adapters spread
    them without unsafe casts. React peer stays `^18 || ^19`.
  - **mantine**: adds `@mantine/core` / `@mantine/hooks` `^9` to the peer range
    (now `^7 || ^8 || ^9`); Mantine 9 requires React 19.
  - **mui**: adds `@mui/material` `^8 || ^9` to the peer range. System props
    that v7 removed from `Stack` / `Box` / `Typography` (`alignItems`, `py`,
    `fontWeight`, …) moved into `sx`, which is backward-compatible to v5.
  - **chakra**: rebuilt for Chakra UI **v3** — compound components
    (`Table.Root`, `Menu.Root`, `Popover.Root`, `Drawer.Root`, …),
    `ChakraProvider value={defaultSystem}`, and the v3 prop renames
    (`colorScheme → colorPalette`, `isOpen → open`, …). Peer is now
    `@chakra-ui/react@^3`; Chakra v2 is no longer supported.
  - **antd**: rebuilt for Ant Design **v6** — `Alert` `message → title`,
    `Drawer` `width → size`, `Popover` `styles.body → styles.content`, `Space`
    `direction → orientation`, `Tag` `bordered={false} → variant="filled"`, and
    the logical fixed-column class names. Peer is now `antd@^6`; Ant Design v5 is
    no longer supported.

### Patch Changes

- Updated dependencies [83610ec]
  - @adapttable/core@0.2.0

## 0.1.1

### Patch Changes

- 4584081: Three fixes surfaced by the new demo pages:
  - **core**: in infinite mode, the window growing at the bottom (the
    sentinel incrementing the page) no longer triggers the scroll-to-top
    reset — only real paged navigation does. Reaching the end of a long
    virtualized list no longer teleports the reader back to the top.
  - **mantine**: `stickyHeader` now actually pins in page-scroll mode —
    Chromium cannot stick a `th` inside a `border-collapse: collapse`
    table (Mantine's default), so the sticky header switches the table to
    separate borders (visually identical).
  - **unstyled**: the chips clear-all button rendered as a bare `<li>` —
    an unstylable stray list bullet. It now carries the same `chip`
    part/class as its siblings, so consumer styling applies.

- Updated dependencies [4584081]
  - @adapttable/core@0.1.1

## 0.1.0

### Minor Changes

- 845ff41: Initial public release of AdaptTable — a headless, UI-agnostic React data
  table: one API, rendered natively by your design system.
  - `@adapttable/core`: the headless engine — declarative `columns` (bare
    keys, dot-paths, auto headers) and `filters` (one definition drives the
    widget, URL params, chips, and predicate, with `"auto"` and async option
    sources), three data tiers (in-memory, server via one consolidated
    `onQueryChange(query, { signal })`, or a full custom `TableSource`),
    URL-synced state with an injectable adapter (`urlSync={false}` for
    in-memory), multi-sort, summary rows, header groups, row expansion,
    saved views, select-all-N-matching, keyboard row navigation, and opt-in
    row/card virtualization that tracks the page or any `maxHeight` scroll
    box — 50,000 rows stay a handful of DOM nodes.
  - Batteries-included adapters for **Mantine**, **MUI**, **Chakra UI**,
    **Ant Design**, and **Tailwind/shadcn** (`@adapttable/unstyled`): native
    filter forms with operator-first number/date ranges, column management
    (hide / reorder / pin / resize — the row-actions column included), a
    built-in saved-views menu, mobile card layouts, and memoized rows.
  - `@adapttable/i18n`: label presets for ten locales (en, ar, de, es, fr,
    he, it, ja, pt, zh) with RTL helpers — headers, cells, sorting and
    filtering can all follow per-locale data paths.
  - `@adapttable/cli`: `npx @adapttable/cli init` detects your kit and
    scaffolds a working table.

  Highlights: shareable URL state, paging and true infinite scroll (auto by
  device), first-class RTL, seamless dark mode, 100% test coverage, and a
  full headless escape hatch at every layer.

### Patch Changes

- Updated dependencies [845ff41]
  - @adapttable/core@0.1.0
