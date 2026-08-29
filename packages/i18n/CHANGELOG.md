# @adapttable/i18n

## 2.4.0

### Minor Changes

- f8ba086: Say what changed when the rows change. Sorting, filtering, paging and changing the page size rewrote
  the table body with nothing a screen reader could perceive, so activating "Sort ascending" produced no
  feedback at all. The table now announces politely: the new order when a sort settles ("Sorted by Name,
  ascending", "Sorting cleared"), and otherwise the new count in the same words the footer shows
  ("Page 2 of 4. Showing 26–50 of 87"). A filter being typed announces once when the results arrive
  rather than once per keystroke, and a filter that matches nothing is announced by the empty state.
  
  Adapters render the announcement through the new `TableStatusAnnouncer`, and
  `useTableStatusAnnouncement` computes the message for custom markup. Two new label keys, `sortedBy`
  and `sortingCleared`, are translated in all 17 locales.

### Patch Changes

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

## 2.3.1

### Patch Changes

- 3223a18: When an opted-in feature cannot run, the person at the table sees it (off, disabled, or this page) — not only a console warning. Chrome exposes kit-agnostic notices; export-all without a full dataset labels the button “Export this page”.
- Updated dependencies [2524306]
- Updated dependencies [3223a18]
  - @adapttable/core@2.7.0

## 2.3.0

### Minor Changes

- 245eeaf: Every bundled locale preset carries the 33 labels the newest chrome needs, in
  all 16 non-English languages: the pivot panel (its three zones, add, remove,
  move up and down, the aggregation chooser, subtotal and grand total),
  saved-view management (apply, rename, reorder, set default, plus the default
  and read-only badges), the command palette and its search and empty states,
  context menus with cell copy and cut, the side panel, the print button,
  density, fullscreen, redo, and the column-select checkbox.

### Patch Changes

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

- 96a0b6e: The live-edit conflict notice shows the incoming value (`labels.theirsValue`)
  so Keep mine / Take theirs is a choice the reader can see.
- 2b184ca: `pivotTableModel(result)` turns a pivot into the props a `DataTable` takes, so
  the pivot is rendered by your kit instead of by markup of your own.

  The column tree becomes `column.group` — one header row per level, spans
  included — every line becomes a row, and the grand total becomes the table's
  `summaryRow`, the column-aligned footer it already had. The row-header column
  carries the indent and each line's caption; `renderRowHeader` is where a fold
  control goes, since core ships no user-facing controls.

  Two new labels ride with it, localized in every locale: `pivotTotal` captions
  the grand-total column and `pivotGrandTotal` the grand-total line.

- 8845b98: Row actions can stay as today's button strip, collapse into a 3-dot menu, or be replaced entirely. Omit `rowActionsLayout` (or pass `"buttons"`) for the strip; `"menu"` uses each kit's own Menu; `renderRowActions` wins over the layout.
- fb30d4a: `sidePanel` docks table settings beside the table instead of in a popover over
  them — a column list, a filter form, anything the host supplies. With more than
  one panel the labels become a tab strip with the keyboard behaviour a tab strip
  owes: one tab stop, wrapping arrows that carry the selection, Home and End,
  Escape to close.

  It is controlled — `{ panels, open, onOpenChange, side }` — because the control
  that opens it is yours; `toolbarSlots` is where it usually goes. Omit it and
  nothing renders and the table's markup is unchanged.

  New labels `sidePanel` and `closePanel`, translated in all 17 locales.

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

## 2.2.0

### Minor Changes

- ec12556: Boolean filter type

  A tri-state any / true / false widget — never a checkbox — with chips and
  `f_<key>=true|false` URL serialization.

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

- 5af9a99: Paste a spreadsheet into the table with Ctrl/Cmd+V

  With `cellNavigation` on, Ctrl/Cmd+V parses the tab-separated text Excel, Google
  Sheets, Numbers and LibreOffice write — quoted tabs and newlines intact — and
  commits it through `onCellEdit`, the same channel inline editing uses. A table
  that can be edited can now be pasted into with nothing extra wired. Set
  `onCellPaste` to take the batch whole instead, and `onCellCut` to receive what
  Ctrl/Cmd+X covered.

  The clipboard's shape decides the destination: a 3×2 block pasted into one
  focused cell writes 3×2. Cells landing outside the loaded rows or the rendered
  columns are dropped, columns that are not `editable` are skipped, and every
  value goes through the column's `parseValue`. The outcome is announced in all
  seventeen locales.

  Headless: `readClipboardText`, `parseClipboardTable`, `pasteRangeEdits` and
  `cellPasteHandler`.

- b050673: Relative date filter tokens

  Date filters gain a Relative operator that stores `today` / `last:7` / …
  in the URL — never a resolved calendar day — and resolves the window at
  query time.

- 69c2338: Rich filter operators per datatype

  Text, number and date filters are operator-first. The comparison is stored
  as `f_<key>Op` so it survives the URL and Saved Views. Existing links
  without an operator keep their old meaning.

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

- 8f55d33: Ctrl/Cmd+C copies the selected cell rectangle as tab-separated text — the format
  Excel, Google Sheets, Numbers and LibreOffice read — so it pastes into columns
  rather than one cell. Ctrl/Cmd+X copies and then calls `onCut(range)`; the table
  clears nothing itself, because a cut that emptied cells before the clipboard
  accepted them would lose the data.

  Values resolve exactly as an export's do, so a copy and a downloaded file agree.
  The outcome is announced through `labels.gridRangeCopied` and
  `gridRangeCopyFailed`, translated in all seventeen locales — the Clipboard API
  needs a secure context and can be refused, and a copy that silently did nothing
  is the thing worth avoiding.

  `clipboardRangeText` and `writeClipboardText` are the headless halves.

- 24a7199: Undo and redo for edits

  `editHistory` remembers edits so Ctrl/Cmd+Z can take them back, with
  Ctrl/Cmd+Shift+Z and Ctrl+Y to put them forward again. One gesture is one entry:
  a paste of two hundred cells undoes in a single press, as does a fill.

  An undo commits the previous value back through `onCellEdit`, the same call the
  original edit made, so validation, mutations and optimistic updates all run on
  the way back exactly as they ran on the way out — the table still never writes
  to data it does not own. Fifty gestures are kept by default; pass
  `{ depth: 200 }` for more, and `table.editHistory` exposes `undo`, `redo`,
  `canUndo`, `canRedo` and `clear` for your own buttons.

  Announced in all seventeen locales.

### Patch Changes

- c2ea3ef: Excel-style checklist filter

  A `checklist` filter type lists distinct values with search, select-all,
  clear, and counts. Frontend reads `allFilteredRows`; a server page that
  omits that list does not offer the widget. Labels land in all 17 locales.

- 9239898: Collapsible multi-level column groups

  `column.group` accepts a path; `collapsibleColumnGroups` adds a toggle.
  A collapsed group keeps its first leaf. State is `collapsedGroups` and
  the URL `colGroupCollapse`.

- bd52b39: Column menu 2.0

  Search, bulk show/hide/unpin, per-column submenu (sort, pin, hide,
  auto-size, filter, reset one), and `lockPosition` / `lockVisibility` /
  `lockWidth` / `lockPin` that gray out the matching controls.

- 2c97e75: Edit conflict handling under live updates

  A row that changes under an open editor is a conflict, not a discard.
  `onEditConflict` and `editConflictPolicy` (`keep` / `take` / `ask`, default
  `ask`) decide; `"ask"` surfaces Keep mine / Take theirs on the validation
  channel (`data-conflict`). `rowVersion` treats any version change as a
  conflict. The same notice appears on a mobile card.

- 9ac9635: Full-width and separator rows via `extraRows`

  Host-injected slots splice into the body by `beforeRowId`. A separator is
  a rule; a full-width row is one spanning cell. Mobile cards keep the same
  slots. Nothing goes in the URL.

- 74a0544: AND/OR filter tree builder

  The filter panel now has a kit-agnostic builder — add condition, add
  group, AND/OR — over the versioned `ft` tree. Leaves show as chips;
  Clear all drops the tree. Labels land in all 17 locales.

- d256fe7: Header filter row

  `headerFilters` adds a compact per-column filter row under the header,
  bound to the same defs and extra bag as the panel. Desktop only; mobile
  cards keep the Filters button. Labels land in all 17 locales.

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

## 2.1.0

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

### Patch Changes

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

- a7e51ba: Give these three package pages a Features section and a clip per feature.

  The eight adapters listed their features; `core`, `cli` and `i18n` listed none, so
  their npm pages described the packages without ever saying what they do. Each now
  carries a Features section written for what it actually is — the headless engine, the
  scaffolder, the locale sets — plus clips cut from the cross-kit tour (`core`, `cli`)
  and from the Arabic recording (`i18n`, where every feature is shown running RTL).

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
- 101d426: Add zh-TW, ko, ru, tr, hi, fa, and ur locale presets (17 total). `getLabels` now prefers an exact BCP-47 tag before the primary subtag so Traditional Chinese resolves correctly.
- c402908: Add opt-in inline cell editing. Pass `onCellEdit` to enable; mark columns with `editable` / `editor` / `editValue`. Kit-native text, number, and select editors on every adapter (desktop + mobile). New `editCell` label in core defaults and all i18n locales. Without `onCellEdit`, editing stays fully dormant.
- 4546dcd: Add opt-in single-level row grouping. Pass `groupBy` to group by one column (frontend tier only; server sources devWarn and ignore). Optional `groupAggregates` shares the `summaryRow` mapper signature for per-group subtotals. Expand/collapse group headers on every adapter (desktop + mobile), with tri-state group selection when checkboxes are on. New `expandGroup`, `collapseGroup`, and `groupCount` labels in core defaults and all i18n locales. Without `groupBy`, grouping stays fully dormant.

### Patch Changes

- Updated dependencies [e36b3ee]
- Updated dependencies [c402908]
- Updated dependencies [4546dcd]
  - @adapttable/core@1.2.0

## 1.1.2

### Patch Changes

- e909bf7: Use an animated GIF for the RTL demo on the npm README (click through to mp4), matching the other packages.
- Updated dependencies [e909bf7]
  - @adapttable/core@1.1.2

## 1.1.1

### Patch Changes

- @adapttable/core@1.1.1

## 1.1.0

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

## 0.2.1

### Patch Changes

- 6ab1391: docs: every package README now leads with a click-to-play demo — a poster (with
  a play button) that links to an mp4 of the table in action — replacing the
  autoplaying GIF. Republishing so the new READMEs land on npm.
- Updated dependencies [6ab1391]
  - @adapttable/core@0.3.1

## 0.2.0

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

### Patch Changes

- Updated dependencies [a90a2c2]
- Updated dependencies [a90a2c2]
  - @adapttable/core@0.3.0

## 0.1.4

### Patch Changes

- Updated dependencies [0fe5eca]
  - @adapttable/core@0.2.2

## 0.1.3

### Patch Changes

- dd60cf0: docs: each package readme now links the docs site, live demo, and getting-started guide (top links + a Documentation section deep-linking each feature), the `homepage` field points at the docs site, and the root readme gains npm badges. Tailwind/shadcn is reframed as the unstyled adapter path rather than a batteries-included styled adapter.
- Updated dependencies [dd60cf0]
  - @adapttable/core@0.2.1

## 0.1.2

### Patch Changes

- Updated dependencies [83610ec]
  - @adapttable/core@0.2.0

## 0.1.1

### Patch Changes

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
