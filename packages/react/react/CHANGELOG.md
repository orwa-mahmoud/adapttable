# @adapttable/react

## 2.0.1

### Patch Changes

- ea5761c: React, Vue and Angular warn about a duplicate column key with the same development message, from one check: `warnDuplicateColumnKeys(columns)` on `@adapttable/core/binding`.
- 93bf6f1: Row reorder reports positions in your data while a search or filter hides rows. On a table given `data`, React and Angular now pass `onRowReorder(from, to, row)` the row's index in that array, as Vue does, so `applyRowReorder(rows, from, to)` moves the row that was dragged, and a pointer drop lands on the edge its drop line shows. The table engine gains `rowIndex(rowKey)`.
- Updated dependencies [ea5761c]
- Updated dependencies [93bf6f1]
  - @adapttable/core@4.1.0
  - @adapttable/i18n@4.0.1

## 2.0.0

### Major Changes

- 5545290: A kit draws each optional cell control with `FeatureSlot` and its slot key; `FeatureSlot` takes a `fallback` for a position the table draws without the feature. `CellContent` draws a body cell's content and replaces `OptionalEditableCell`; the other `Optional*` cell wrappers are removed, and `adapttable migrate-v4` reports each one. A header whose column can be renamed keeps its label when no column menu is composed.
- 1bf65dd: A React table runs its column layout, grouping, tree, selection, row actions, pins, expansion, editing and edit history as chrome stages, each after the stages whose values it reads, so the order follows from what each feature reads and writes rather than a fixed list. Find marks its matches from its own stage. `CHROME_EXTRA_SLOT_ORDER`, `HistoryLiveGate`, `EDIT_HISTORY_LIVE` and its props and draw types are removed; `EDIT_HISTORY_STAGE`, `ChromeStageKey` and `LiveStagePhase` name the new pieces, and `adapttable migrate-v4` reports the removed names.
- ee0f202: High-contrast rules load with the features that draw them. Every table adds the base rules (focus, validation, pinned edges) to the page's one stylesheet; cell navigation, find, the editing features, saved views, the side panel, the command palette and the grouping panel each add their own, so a plain table carries 1.2 kB of rules instead of 2.1 kB. A feature, or a host plugin, carries its rules in a `contrast` field.
  
  `FORCED_COLORS_CSS` is removed, and `@adapttable/react/adapter` no longer exports `ForcedColorsStyle` or `ensureForcedColorsStyles`: `FeatureProviders` mounts the rules. `mountForcedColorsStyles` in the Vue and Angular bindings takes a reader of the composed features.
- 04d741f: `mobileIdentityColumns` is gone from the table props, the `useDataTable` options and `visibleColumns`, whose signature is `visibleColumns(columns, layout)`: `hideOnMobile` decides what a card shows. `sameRows` is gone in favour of `sameItems`, `SHELL_LIVE_STAGE_ORDER` and `ShellLiveStageId` in favour of `liveStageKey` and `liveStagesOf`, and the `noticeReorderNested` label leaves `TableLabels` and every locale. `sortRows` and `sortRowsMulti` leave `@adapttable/core/binding`; the engine sorts through `compareValues` and its row model. Six labels no surface draws leave `TableLabels` and every locale: `pendingProposals`, `assistantReceipt`, `rowMoveOptions`, `moveToTopLevel`, `groupingAggregateColumn` and `groupingAggregationDefault`.
- cb9f9db: `@adapttable/core`'s main entry serves the names a table uses. Binding and kit machinery comes from `@adapttable/core/binding`, and the editing, pivot, formula, grouping, stream and selection names from their own entries: `@adapttable/core/editing`, `/pivot`, `/formula`, `/grouping`, `/stream` and `/selection`. Importing every core export drops from 107.2 to 47.2 KiB gzip. The query codecs and engine constructors stay on the main entry. `@adapttable/react`'s kit machinery (the chrome, column, filter-chip and body-data hooks and their types) comes from `@adapttable/react/adapter`, which also exports `columnHeaderLabel` and `exportViewFromChrome`.
- bee0c9f: `@adapttable/core/binding` no longer re-exports a value that `@adapttable/core` already exports and that the binding entry's own signatures do not name. Import `visibleColumns`, `filterLabel`, `aggregate`, `declaredAggregates`, `computedAggregateKeys`, `autoSizeColumns`, `cellValue`, `conditionToExtra`, `sourceCapabilities`, `treeColumnKey`, `approvalArgumentPairs` and `approvalValueText` from `@adapttable/core`. `adapttable migrate-v4` moves those imports.
  
  `applyTableFeatures` is only on `@adapttable/react/features`. `useTableFeatures` is only on `@adapttable/react/adapter`. `adapttable migrate-v4` moves an import that still uses the other entry.
  
  A kit no longer publishes a `/features` barrel. Import each factory from its own subpath. A React kit's `/features` only forwarded `@adapttable/react/features`, so those imports move there. `adapttable migrate-v4` rewrites both.
  
  A table takes `data` or a `source` and infers no tier from its other props. A server table builds its source with `useServerData` (React, Vue) or `injectServerData` (Angular) and passes it as `source`; the table props `mode`, `onQueryChange`, `total`, `aggregates`, `responseKey`, `supports`, `facetKeys` and `facets`, and React's `DataModeProps`, are gone. `onViewChange` tells a table over `data` what the reader changed. `serverFilterKeys({ columns, filters })` gives a server source the filter keys its first request needs. A table over `data` no longer ships the server tier: the Unstyled table loads 1.8 KiB less up front and 5.9 KiB less in total in each framework. `adapttable migrate-v4` reports every table that passes the removed props.
  
  Filter placement, column rename, and cell cut, paste and fill are options of `filters()`, `headerFilters()`, `columnMenu()` and `cellNavigation()`. A table prop no longer sets them. `isCellFlashing` stays on the table: it marks cells the base already draws. Vue's `DataTable` no longer accepts `onCellCut`, `onCellPaste`, `onCellFill` or `onColumnRename`.
- 8af4736: A feature's `setup(host)` only registers; what outlives a render goes in its `mount(context)`, which returns what releases it. Every binding keeps a mounted feature by id: declaring it again with new options, inline included, keeps the resource and hands `context.feature()` the new declaration, and only removing the feature, changing its `dependencies` or unmounting the table releases it, exactly once. A render the framework discards acquires nothing, and a failed mount rolls back what its pass acquired. React publishes the table runtime and its feature ids in layout effects, so AI and event callbacks read the last committed table; `PublishTableRuntime` is the chrome's publisher. `createFeatureMounts` and `composeMounts` on `@adapttable/core/binding` are the shared lifecycle. A `setup` that returns a cleanup is refused, and `onDispose` is no longer on the feature host. Vue's and Angular's table agent follows its latest declaration's options. `adapttable migrate-v4` reports `onDispose` calls.
- bb9ee7a: A filters feature carries only the filter types its widgets draw. Each widget can name its rules (`textFilterSpecs()`, `rangeFilterSpecs()`, …) and `filterEngineForWidgets` builds an engine from them, so an Unstyled table with `filtersWith([textFilterWidget])` loads 1.7 KiB gzip less; custom `filterTypes` still layer on top. `evaluateFilterTree`, `conditionToExtra` and the React `FilterTreeChrome` / `FilterTreeBuilder` now take the table's `registry` instead of defaulting to every built-in type.
- d2beb5a: Find, the keyboard grid, export, fullscreen and the selection figures run their hooks from their own live stages. `FIND_LIVE`, `CELL_NAV_LIVE`, `EXPORT_LIVE`, `FULLSCREEN_LIVE`, `SELECTION_STATS_LIVE` and their draw types are removed, as are React's `*LiveSlotProps` exports; `adapttable migrate-v4` reports each removed name.
- fbc52e8: Feature notices and disabled-control reasons take their text from the resolved labels only, in every locale: `collectFeatureNotices`, `chromeFeatureNotices` and `resolveExportDisabledReason` take resolved labels, `capabilityReason(capability, labels)` reads the `"grouping"` or `"exportScope"` sentence from them, and React's `useExportHandler(handler, labels)` requires them. A plain Unstyled table measures 64.2 KiB gzip instead of 64.4. Every other built-in string a model or chrome falls back to is its label group's default, so English lives only in the label groups: `defaultPendingRows` is gone, React's assistant shortcuts menu reads "Shortcuts" like Vue and Angular, and its revoke button names the capability ("Ask about editing cells again").
- 03d7f36: The React column layout publishes its sizing actions as `COLUMN_SIZING_STATE` (`ColumnSizingState`); the table chrome no longer carries `autoSizeColumns`, `autoSizeColumn` or `columnLayoutLive`, and the finished shell's `autoSizeColumns` and `autoSizeColumn` carry them. `adapttable migrate-v4` reports the removed fields.
- ad4c90a: The React editing feature publishes its bundle as `EDITING_STATE`, and the edit history stays on `EDIT_HISTORY_STATE`; the table chrome no longer carries `editing` or `editHistory`. `overlayChromeExtras(shell, base, channels)` and `TableRuntimePublisher.stage(chrome, actions, channels)` take what the features published (`RuntimeChannels`) apart from the chrome, so the runtime view carries editing and the filter definitions. `FeatureStateScope` accepts `undefined` to publish nothing. `adapttable migrate-v4` reports the removed names.
- 3ecb133: The React filters feature publishes its chips and badge count as `FILTER_CHIPS_STATE` (`FilterChipsState`), which the toolbar badge, the chips bar and the command palette read. The table chrome no longer carries `mergedChips`, `activeFilterCount`, `filterDefs` or `filterRegistry`, the toolbar props drop `activeFilterCount`, and a table without the filters feature publishes no chips. `useChromeScrollReset(ref, props)` takes the root and the props. `adapttable migrate-v4` reports the removed names.
- 5a791f2: React grouping publishes its grouped rows as `GROUPING_STATE` (`GroupingState`) and the tree its hierarchy as `TREE_STATE` (`TreeState`); the table chrome no longer carries `grouping`, `tree`, `groupingArmed` or `treeShaped`, and the finished shell's `tableProps` carries them to the body. `KitPagerView` takes `tableProps.grouping` in place of `chrome.grouping`. Core's `BodyChrome` requires its `grouping` and `tree` keys, and `finishShellBody` reads them from `tableProps`. The grouping panel publishes its strip state as `GROUPING_PANEL_VIEW_STATE`, which the finished shell's `tableProps.groupingPanel` carries to the strip, the column menu and the header drag; the chrome's `groupingPanel`, the shell's `groupingPanelProps` and `DataTableShellGroupingPanelProps` are removed, and a table without the panel carries none of its code. `adapttable migrate-v4` reports the removed fields.
- 6612d37: React row actions publish the trailing column and the row mutations as `ROW_ACTIONS_STATE` (`RowActionsState`), and row pinning publishes its pins as `ROW_PINNING_STATE`; the table chrome no longer carries `rowMutations`, `rowActions`, `hasRowActions` or `rowPinning`, and core's `OverlayChrome` treats `rowMutations` and `hasRowActions` as optional. The finished shell's `tableProps` carries them to the body, and the runtime view reads the pins. Row reorder's state is read from `ROW_REORDER`, now on `@adapttable/react/adapter`: the chrome no longer carries `hasRowReorder` or `rowReorder`, and the finished shell carries `hasRowReorder` and `tableProps.rowReorder`. `adapttable migrate-v4` reports the removed fields.
- c60895f: React row detail publishes its renderer and expansion as `ROW_DETAIL_STATE` (`RowDetailState`); the table chrome no longer carries `detail`, and the finished shell's `tableProps.renderRowDetail` and `tableProps.expansion` carry it to the body. `adapttable migrate-v4` reports the removed field.
- 48cea86: React toolbar controls read the state their feature publishes. Undo/redo, export, print, density and fullscreen draw from `EDIT_HISTORY_STATE`, `EXPORT_STATE`, `FULLSCREEN_STATE` and the finished table props in `TABLE_PROPS_STATE` through `useFeatureState`, and the toolbar hands them only `ToolbarEntrySlotProps` (labels and class map). The toolbar props no longer carry the undo/redo, print, density, fullscreen and export fields, `finishShellLive` leaves the toolbar alone, and `adapttable migrate-v4` reports `ToolbarExtrasSlotProps`.
- d1b7ece: The saved-views and column-menu features add their own toolbar entries, drawn in `TOOLBAR_EXTRAS` right after Filters, so a kit's toolbar no longer receives `savedViewsMenu` or `columnMenu`. `ToolbarChromeProps` is removed and `undoRedoToolbar` returns `UndoRedoToolbarProps`. `adapttable migrate-v4` reports the removed names.
- 5b7bc3c: The runtime view a feature above the table reads is built the first time it is read and kept until the next render, so a table nobody reads never builds it, and reading a rendered row no longer builds it. `TableRuntimePublisher` stages each render with `stage(chrome, actions)` and serves `view()` and `visibleRows()`; React's `usePublishTableRuntime(reader)` takes a `TableRuntimeReader` of `rows()`, `labels()` and `view()`.

### Minor Changes

- 340c486: The Ant Design table draws through the binding's composition: the toolbar, bars, find, keyboard grid, export, context menu, side panel, footer and overlays are the ones every kit shares, and only the body stays antd's own `<Table>` and cards. A plain antd table loads 65.8 KiB instead of 71.0 (72.2 instead of 77.5 in total). antd's `virtualize` keeps windowing desktop rows through antd's virtual table. `@adapttable/react/adapter` exports `coreVirtualize` and `KEYED_WINDOW_RENDER` for a kit that brings its own `virtualize`.
- 636d0ad: A family composes every member of an area in one call and goes into `features` as one entry: `editingFamily(save)` from each kit's `/editing` (cell editing, dirty marks, edit history and undo controls), `filteringFamily(defs)` from `/filtering` (the filter panel and header filters) and `columnLayoutFamily()` from `/column-layout` (columns menu, resizing and fitting). Each family has its own entry, so a member imported alone still loads alone. `standardFeatures` is built from the column-layout and filtering families. A Vue or Angular kit's `/features` entry gathers the families with the other factories.
- ffd1a07: Each editing feature carries only its own code. Cell editing no longer brings the row form, the batch or edit history: on the Unstyled kit a table with only `editing` adds 10.8 KiB gzip instead of 19.3, `editHistory` alone 1.7 KiB and `dirtyIndicators` 0.4 KiB. `dirtyIndicators` only turns the marks on; the editing feature it marks brings the editing code, in React and Angular alike. Kits build each editing export with its own call through `createAdapterEditing`, `createAdapterRowEditing`, `createAdapterBatchEditing`, `createAdapterEditHistory` and `createAdapterUndoRedoButtons`.
- b36d160: A React table clears its selection when only the advanced filter tree changes, so a row the new filter hides no longer stays selected; React and Angular reset on one shared key, which reads the filter tree without serializing its values. A React table with selection off reads no row ids for it; `useSelection` takes `enabled: false` for the same in a headless table.

### Patch Changes

- 35abf7a: Angular toolbar controls read the state their feature publishes. `injectDensityToolbar`, `injectFullscreenToolbar`, `injectExportToolbar`, `injectPrintToolbar` and `injectUndoRedoToolbar` return the control's state as a signal, and every toolbar entry receives `ToolbarEntrySlotProps` (labels and class map) in place of core's `ToolbarExtrasSlotProps`. Saved views and the Columns menu are toolbar entries (`SAVED_VIEWS_ENTRY`, `COLUMN_MENU_ENTRY` on the new `@adapttable/angular/toolbar` entry) that each kit adds beside its menu, so every kit's template draws one toolbar outlet fed `toolbarEntry`, and the table view no longer carries `toolbarExtras`, `savedViews`, `columnMenu` or `columnMenuProps`. Inside a slot component, `[adaptSlot]` draws in that component's table when `[adaptSlotTable]` is left out. `adapttable migrate-v4` reports the removed names.
- f94d978: A grouped antd table and its phone cards, windowed by `virtualize()` on a page-scrolled layout, draw the rows on screen: the window measures where the list starts on the page, as every other kit's does. A row brought into view under the sticky header stops below it.
- e0ed9dd: `@adapttable/react` and `@adapttable/vue` ship a production build with no development warnings and a development build, selected by the `development` export condition, that keeps them. A plain React table measures 20.6 KiB gzip instead of 20.8 and a Vue Unstyled table 53.3 instead of 53.5.
- 536aa89: Live-update conflict handling loads when the first edit opens. A table that edits carries a small holder instead of the conflict store, about 0.5 KiB gzip less in every framework, and the store arrives before any conflict can. `createDeferredEditConflictStore` and `loadEditConflictStore` replace `createEditConflictStore` on `@adapttable/core/binding` and `@adapttable/core/editing`; the main-entry alias is gone.
- cdbba81: A feature id resolves to one declaration everywhere: when two features share an id, the last one supplies the table's options, labels, registrations and slot fills, and the earlier one contributes nothing. `resolveFeatureIds` on `@adapttable/core/binding` applies the rule and warns in development.
- da4baa0: The Excel and PDF writers load on the first export instead of with the table, and start loading in the background once the table is mounted, so an export still works after the connection drops. A Vue table with `exportPdf` loads 8.1 KiB gzip less up front and one with `exportXlsx` 2.4 KiB less; either now costs 0.2 KiB more than CSV export. A writer that cannot load is a failed export — no download, no `onAfterExport`, the button stays usable — and the next export loads it again. `deferredXlsxWriter`, `deferredPdfWriter` and `deferredExportWriter` give the same behaviour to a writer you configure yourself.
  
  `xlsxWriter` and `buildTableXlsx` are no longer on the main entry; import them from `@adapttable/core/xlsx`.
- 633e23c: Find in table reads only the previous hits when a query gets more specific, instead of every loaded cell on each keystroke. The matches are the same.
- ed8a86d: `@adapttable/i18n` loads no label data from its root: `getDirection`, `isRtlLocale`, `hasLocale` and the on-demand `loadLabels` read 2 files (6 kB) in Node instead of 23 (380 kB). `getLabels` and `locales` come from `@adapttable/i18n/catalog`, one language alone from `@adapttable/i18n/locales/<tag>` (21 kB for Arabic), and `@adapttable/i18n/load` is part of the root. A tag that names a script picks the preset written in it: `zh-Hant` and `zh-Hant-TW` read Traditional Chinese, `zh-Hans` Simplified; `az-Arab` and `pa-Arab` are right-to-left, `ar-Latn` and `ks-Deva` left-to-right.
- a96cfee: A kit locale whose labels fail to load no longer raises an unhandled promise rejection in React and Vue: the table keeps its current labels, logs the error with the locale, and loads the language on the next locale change or mount. In Angular the server-rendering task for the labels settles on a failure as it does on success.
- 7ad8d9a: The filter chips, batch-edit, agent-approval and bulk-action bars are built by their features, so a table without them no longer bundles their wiring. When an agent's approval bar and the batch-edit bar show together, the approval bar comes first.
- 08245ea: The grid-focus and row-move announcers, the find bar, the command palette, the grouping strip, the side panel, the filter drawer and the status bar are built by their features, so a table without them no longer bundles their wiring. The grid-focus announcer now follows the table's status announcer.
- 5d503be: The context menu builds its own inputs and wraps the table's root through its feature, so a table without `contextMenu()` no longer bundles that wiring.
- bb4e606: A table whose columns declare `editable` while no editing feature is composed warns in development, whatever else it composes; a table that edits by row or by batch no longer gets that warning.
- 3c0ae19: Find in table, cell navigation, export, fullscreen and selection stats each bring their own live stage, and the table runs only the stages its features composed. A plain table no longer bundles their wiring.
- 1bfa985: The column menu and saved views build their own toolbar controls through their features, so a table without them no longer bundles that wiring.
- 4effc96: An update keeps a row's id: `updateRow` whose changes give the row a new id is refused with an error naming `rekeyRow`. `rekeyRow(id, changes)` changes the id in place, a later patch in the batch finds the row by its new id, and an id another row already holds throws `RowIdConflictError` without touching the rows. `rowRekeys(log)` maps each row's id before a batch to its id after it, and a rekeyed row's update event carries `from`. `applyRowPatches(…, { rekeyUpdates: true })` reads stored or sent id-changing updates as rekeys; row patch streams apply their frames that way (`STREAMED_ROW_PATCHES`) and accept `rekey` frames. `@adapttable/angular` re-exports `rekeyRow` and `RowIdConflictError`. In React, Vue and Angular, a rekey moves the selection (a host-held selection is asked to move), the pinned rows, the open row details, the expanded tree nodes, the focused cell and an open editor's draft, dirty marks, validation and save errors and conflict question to the new id in the change that brought the patched data; new data that is not a patch of the old moves nothing. A row reorder checks the dragged and target rows by id in every binding and hands the host each row as it is at the drop. Every editing store takes `rekey(moves)`; `onRowRekeys`, `onRowRekeyMoves`, `rowRekeyMoves`, `rekeyTableRows`, `commitRowRekeys`, `rekeyedIds` and the id remappers on `@adapttable/core/binding` are what a binding carries a rekey with.
- eb084d0: When a table's source is replaced, the runtime view and the agent read the new source's rows and columns at once, on every scope, instead of reading page rows from the old one in React. The released reader keeps answering from its own last render, and an ordinary update keeps the same handle.
- 3b2a5bd: Each Vue feature with a toolbar control adds its own toolbar entry. Density, fullscreen, saved views, the column menu, undo/redo, find, the command palette, export and print read the state they publish and draw their kit control; the shell names none of them. `TOOLBAR_EXTRAS` takes `ToolbarEntryProps`, `toolbarEntry` and `FeatureSlotDrawer` build an entry, a kit's filters trigger and panel fill `FILTERS_PANEL`, and `UNDO_REDO_CONTROL` takes `UndoRedoControlProps` in place of `ToolbarExtrasSlotProps`. The shell's `toolbarExtrasProps` and `hasActionToolbar` are removed.
  
  A feature's `rank` places its fills in a slot several features fill, lower first, then feature id. Saved views and the column menu lead the toolbar, so every Vue kit draws Filters, Saved views, Columns, Density, Export, Find, Fullscreen, Print and Undo/Redo in that order. Core names `UndoRedoToolbarProps`, and `adapttable migrate-v4` reports the removed Vue names.
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
- Updated dependencies [ed8a86d]
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
  - @adapttable/i18n@4.0.0

## 1.12.0

### Minor Changes

- 6bee472: Filters can be composed with only the widgets a table draws. `filtersWith([textFilterWidget, rangeFilterWidget])` from any kit's filters entry is the `filters` feature with those fields alone, so the other widgets stay out of the bundle: a text-only filter form is 4.4 KiB lighter on MUI, 1.3–2.4 KiB on the Vue kits and 4.8 KiB on the Angular native kit (min+gzip). Each kit exports `textFilterWidget`, `booleanFilterWidget`, `selectFilterWidget`, `multiSelectFilterWidget`, `checklistFilterWidget` and `rangeFilterWidget`; a filter whose widget was not composed throws, naming the widget to add. `filters` keeps drawing every widget.

### Patch Changes

- Updated dependencies [6bee472]
- Updated dependencies [8c8eb0a]
  - @adapttable/core@3.16.0
  - @adapttable/i18n@3.4.2

## 1.11.0

### Minor Changes

- 75dbf94: `ActionAiOptions`, the type of a row or bulk action's `ai` options, is exported from `@adapttable/react` and `@adapttable/angular`, as it already is from `@adapttable/vue`.
- 2582d80: A headless table that keeps its view state in memory no longer bundles the URL code. React and Vue gain `useLocalFrontendData` and `useLocalTableViewState`, Angular `injectLocalFrontendData` and `injectLocalTableViewState`, over core's `createLocalTableViewStore`. Search, sort, filters, grouping and paging behave as with `urlSync: false`; the table measures about 2.3 KiB smaller in React and Vue and 2.5 KiB smaller in Angular.

### Patch Changes

- fb0e3af: Doc comments name a link target only when the entry point that publishes the comment exports it; any other name is written as code. Editor hovers and the API reference show no broken links.
- 42282d3: Smaller React bundles with the same rendering: a plain adapter `DataTable` is 1.6–2.5 KiB lighter and a table with the standard preset 3.0–4.3 KiB lighter (min+gzip). The table's live-feature gate, its chrome hook and every kit's filter form are no longer compiled by the React Compiler, whose caches there never saved a render.
- Updated dependencies [308e2f8]
- Updated dependencies [fb0e3af]
- Updated dependencies [e8d3443]
- Updated dependencies [2582d80]
- Updated dependencies [55d0118]
- Updated dependencies [e1bad04]
  - @adapttable/core@3.15.0
  - @adapttable/i18n@3.4.1

## 1.10.0

### Minor Changes

- 0fca0b0: Every kit exposes the same structure and accessibility.
  
  - Tree tables are a `treegrid` with its `aria-rowcount`, and each row names its level, expanded state and position (`treeTableAria(entryCount)` returns the pair) in every kit.
  - Busy buttons keep their accessible name and report `aria-busy` (Chakra, MUI); a mixed checkbox reports the mixed state (Chakra); a rejected text value sets `aria-invalid` (Ant Design); a popover opening a menu says `aria-haspopup="menu"` (Mantine); Base UI's menu divider carries its part and data attributes.
  - A header's caption carries `data-adapttable-part="header-caption-control"` in every kit, styled through `classNames.headerCaptionControl` in React unstyled and the Vue kits; the virtualized spacer row and card carry `virtual-spacer` in every kit.
  - `watchOverlayDismiss` and `usePointerDismiss` take `OverlayDismissOptions`; an Escape an input method is composing with, or that an earlier handler took, no longer closes an overlay. The MUI, Mantine and Ant Design filters popovers ignore the press that opened them, close on touch, and hand focus back to the Filters button after Escape.
  - Ctrl/Cmd+F opens Ant Design's find bar only when `findInTable` is set; Spartan's fill handle is outside the tab order; Reka UI's and shadcn-vue's `contextMenu()` take `true` or `false`; ng-zorro's saved-views menu types its direction as `Direction`.
  - The columns menu has one accessible name in the React kits.
  - The loading placeholder exposes `loading` with `loading-table` or `loading-cards` in MUI, Chakra, Ant Design, Radix, Base UI and Mantine.
  - Closing a dialog or the filters drawer returns focus to the control that opened it in every Angular kit, including after the browser drops focus onto the page; `watchClickedOpener` on `@adapttable/core/binding` and `@adapttable/angular/adapter` records that control.
  - The Filters button carries `data-adapttable-part="filters-button"` and `data-active` while open in every kit.
  - Escape closes a native row actions menu and returns focus to its trigger in the React unstyled, Angular unstyled and Angular Aria kits, as it does in Vue.
  - Ant Design's dropdown panels and column menu draw as the platform's non-modal dialog element.
- 693ad8e: An Ant Design grouped table describes its full grouped set in the footer ("Showing 1–30 of 30" on one page) and, with `virtualize`, windows its group and row lines on a paged table like every other kit; a three-level grouped drop redraws in about 45 ms instead of 140–190 ms. `@adapttable/react/adapter` re-exports `isBodyEligible`.
- 0fca0b0: Each entry point serves one audience, and the three bindings publish the same ones.
  
  - `@adapttable/core`'s main entry advertises the names a table reaches for. 651 names only the bindings use, or that no table, guide or example uses, are exported from `@adapttable/core/binding` (internal to AdaptTable packages) and stay on the main entry as deprecated aliases of the same value or type, so existing imports keep working. Undeprecated main-entry names: 1,494 → 845. The bindings take that machinery from `@adapttable/core/binding`.
  - React's main entry moves the 41 names only kits use to `@adapttable/react/adapter`, with deprecated aliases left on the main entry.
  - `@adapttable/react/pdf`, `/xlsx` and `@adapttable/angular/pdf`, `/xlsx` carry `exportPdf` / `exportXlsx` and core's PDF and XLSX helpers, as `@adapttable/vue` does; Angular's `exportPdf` and `exportXlsx` on `/features` are deprecated. Every Vue kit publishes the same entry points (`/export-csv`, `/export-pdf`, `/export-xlsx`, `/columns`, `/rows` where they were missing).
  - New on the bindings so hosts and kits do not reach into core: `applyRowPatches`, `updateRow`, `createMemoryAdapter` on `@adapttable/angular`; `createTableEngine` on `@adapttable/vue`; `treeRowAria` / `treeTableAria` on `@adapttable/react/adapter`. New on core: `filterTreeConditionChips`, `checklistSlice`, `nextChecklistViewport` (the three bindings' chips and checklists are built on them) and `EditableCellEditorCtrl`.
- 39057e0: Tables follow their UI library's app-wide settings. An explicit `dir`, `labels`, `density` or `size` still wins, and a setting the app left at its default stays with the page:
  
  - Ant Design: ConfigProvider direction, locale, component size and `theme.token.motion`.
  - Chakra: `LocaleProvider`. Mantine and Base UI: `DirectionProvider`. MUI: a right-to-left `theme.direction`.
  - Element Plus: `ElConfigProvider` locale and size. Naive UI: `n-config-provider` locale, `rtl` and table size. Nuxt UI: a parent `UApp` locale and `dir`. Quasar: the active language pack and its `rtl`. Reka UI and shadcn-vue: a parent `ConfigProvider`'s direction and locale. Vuetify: the locale, its RTL map and `defaults.global.density`.
  - Angular Material, Angular CDK, Angular Aria and Spartan: CDK `Directionality`. NG-ZORRO: `Directionality`, a provided `NZ_I18N` locale and `NZ_CONFIG` table size. ng-bootstrap: `NgbConfig.animation`. Taiga UI: `TUI_LANGUAGE` and reduced or disabled animation.
  
  A followed locale loads only that language's labels, the first time it is seen, so a plain table carries no label data. Server rendering and the first client render show the current labels until the language arrives; pass `labels` to render it from the first paint. `@adapttable/i18n/load` exports `loadLabels(locale)`, and `useLocaleLabels` in `@adapttable/react/adapter` and `@adapttable/vue/adapter` turns a library locale into those labels for a kit.
- 39057e0: Every React kit draws its desktop table and phone cards through one shared structure, `DesktopTableChrome` and `MobileCardsChrome`. Each kit still supplies its own table, rows, cells, cards and controls, and every table looks and behaves as before. `mobileCardSlots` builds the card list (order, pinned totals, groups, extra rows and each card's list-item attributes) and `mobileCardPropsEqual` is its card body's memo comparator, so a kit draws only its card host and body. A card now re-renders when the host passes a new `renderCard`, and a card offers no expand toggle without `renderRowDetail`, as the desktop table does.
  
  A plain React table no longer loads the editing session or the extra-row splicer: enter-to-edit and batch undo come with the cell-navigation and editing features, and extra rows are spliced only when `extraRows()` is composed.
  
  The MUI filters panel stays within the window below its trigger after the page shifts while it is open, and inside its left edge in a right-to-left page with a scrollbar.
  
  A React kit can hand the binding one typed set of primitives (`KitPrimitives`: button, icon button, text input, select, checkbox, popover, menu, text) and get each feature's controls built from them: `createFindBar`, `createRowEditActions`, `createBatchEditBar`, `createAgentApproval`, `createTreeToggle`, `createTreeCell`, `createColumnGroupToggle`, `createGroupMoreButton`, `createRowReorderHandle`, `createRowReorderButtons`, `createEditableCellSlots`, `createFilterHeaderRow` and `createFilterHeaderControl`, all from `@adapttable/react/adapter`. `TableComposition` draws the whole table from a kit's `KitTable`: the kit supplies a frame that lays the regions out, its toolbar, body, state views and pager, and the binding wires everything else. The MUI kit draws its table and these controls this way; its header multi-choice filter carries `filter-header-menu` on the panel that takes `classNames.filterHeaderMenu`, as the other kits do. `createColumnMenu(kit, useLook)` builds the Columns menu the same way, with the kit's spacing in a `KitColumnMenuLook`; MUI's Columns menu uses it, Mantine draws its table, feature controls and Columns menu the same way (keeping its own row-move menu through the factories' `MoveMenu`), and in a right-to-left page its rows, bulk buttons and rename buttons are spaced as the mirror of left-to-right. A kit whose text input draws its own label and error passes a `RenameField` to `createColumnMenu`. Escape in the Columns menu puts focus back on its button.
  
  `createDesktopTable(kit)` draws the desktop table's rows, rails, header cells, spacers and column summary from a kit's table elements and paint; MUI's and Mantine's desktop tables use it, and `createMobileCards(kit)` does the same for the phone cards: each card's controls, fields, actions and detail, arranged by the kit's own frame. `createToolbar(kit)` and `createGroupHeader(kit)` build the toolbar and the group rows and cards the same way for MUI and Mantine. The toolbar controls the features add (undo and redo, CSV export, print, density, fullscreen, the command palette and find) each come from their own factory, and a primitive button marked `busy` shows the kit's working state. `createRowActionButtons(kit)` decides a row's actions once (which show, why one is disabled, confirm, strip or menu) for MUI and Mantine. `createCellEditor(kit)` and `createEditableCell(kit)` pick and wire the in-place editor once; each kit gives its checkbox, selects and input. `createBulkBar(kit)` decides the bulk action bar once: Mantine's scope offer now counts the rows on the page, and MUI marks the scope offer as `select-all-banner` only while it is offered, as every other kit does; the offer is a `status` region in both. Chakra builds its find bar, header filters, row edit, batch, approval, tree, column-group, show-more, reorder and editable-cell controls through the binding from its own primitives. Chakra's row actions come from `createRowActionButtons`, and `accentColor` reaches every Chakra control from the table root. Chakra's cell editor and bulk action bar come from the binding too; its scope offer is a `status` region. Chakra's toolbar feature controls (undo and redo, export, print, density, fullscreen, palette, find) come from the binding's per-control factories. Chakra's toolbar is laid out by the binding's `createToolbar`. Chakra's desktop table is drawn by `createDesktopTable`; a kit's paint can shape a column heading's caption row with `captionRow`. Chakra's phone cards come from `createMobileCards`, whose field look now also receives whether the list is compact. Chakra's group rows and cards come from `createGroupHeader`. Chakra's Columns menu comes from `createColumnMenu` and holds its rows in a group named for the menu, as the other kits' menus do. Chakra's table is laid out by `TableComposition` in its own bordered frame. `createColumnHeaderRename(kit, useLook)` builds a column header's rename button and form on the same rename form the Columns menu opens; a kit's `RenameField` receives the part names for wherever the form opens (`KitRenameFieldParts`). MUI, Mantine and Chakra draw their header rename this way. `createSavedViewsMenu(kit, useLook)` builds the saved-views menu: applying a view closes it, deleting one keeps it open, the rule under the list shows only while there is a list, Escape closes it from anywhere inside and returns focus to its button, and after saving the name field keeps focus for the next name. MUI, Mantine and Chakra draw their saved-views menu this way, and its button, panel, rows, items, delete buttons, save row, field and save button carry `views-*` parts as the unstyled kit's do. `createPager(kit)` builds the table footer (page size, range, "page n of m" and the page controls) from a kit's frame and pieces, and `createPageButtons(kit, look)` builds windowed page buttons for a kit without its own pagination component; MUI and Mantine keep their pagination components, and Chakra's page buttons carry the `page-*` parts the unstyled kit's do. Base UI builds its find bar, header filters, row edit, batch, approval, tree, column-group, show-more, reorder and editable-cell controls through the binding from its own primitives, and its touch-target context is the binding's. Base UI's row actions, cell editor, bulk action bar and toolbar feature controls come from the binding too, and `accentColor` reaches its controls from the table root. Base UI's toolbar is laid out by `createToolbar` and its desktop table drawn by `createDesktopTable`. Its phone cards come from `createMobileCards` and its group rows and cards from `createGroupHeader`. Its Columns menu and header rename come from `createColumnMenu` and `createColumnHeaderRename`. In every kit, Enter in a rename field saves from the field itself. A kit's Columns menu look may space its fixed rows apart (`fixedRow`), and its header rename may put the button before the caption (`buttonFirst`). Base UI's saved-views menu, pager and table frame come from `createSavedViewsMenu`, `createPager` and `TableComposition`, and its context menu opens inside the fullscreen table from its own `container`. Radix builds its small controls through the binding from its own primitives, and its touch-target context is the binding's. Radix's row actions, cell editor, bulk action bar, toolbar feature controls and toolbar come from the binding too, and `accentColor` reaches its controls from the table root. Radix's desktop table and phone cards come from `createDesktopTable` and `createMobileCards`; a kit's paint may give pinned totals its own weight (`summaryCell`). Radix's group rows, Columns menu, header rename, saved-views menu, pager and table frame come from the binding as well, and its context menu and Columns menu open inside a fullscreen table. A kit whose popover scrolls may keep the Columns and saved-views panels from scrolling too (`panel.overflowY`). antd builds its small controls through the binding from its own primitives, and its touch-target context is the binding's. antd's row actions, cell editor, bulk action bar (its `Alert`), toolbar feature controls and toolbar come from the binding too. The header filter factories take a kit's own multiple choice (`Multi`, in a `KitFilterHeader`) in place of the shared popover one. The unstyled kit, and shadcn and Tailwind on it, build their small controls through the binding from native elements, keeping their disclosure-based multiple choice and move menu, and share the binding's touch-target context. The unstyled kit's row actions, cell editor, bulk action bar and toolbar feature controls come from the binding too, each control taking the class of its part's `classNames` key. Its toolbar is laid out by `createToolbar`. Its desktop table is drawn by `createDesktopTable`, and its expand column sticks with the other leading columns while columns are pinned. In every kit's desktop table, rails and headers carry `data-pinned` while they stick, header cells `data-sticky` while the header sticks, column headers `data-sorted`, and virtual spacer rows the `virtual-spacer` part. A kit's desktop paint can leave selected and matched cells to its classes (`classHighlight`), and `usePartClass` (`KitUsePartClass`) gives the host's class to the parts the binding draws itself; `createMobileCards` takes it too, along with an extra row's and a group card's list-item props (`extraProps`, `groupProps`) and the list's `dir`. The unstyled phone cards come from `createMobileCards`. Its group rows and cards come from `createGroupHeader`; a group footer or "show more" card lines its label up with the group's label, after the toggle's space. Every kit's Columns menu names its panel `column-menu-panel`, its title, each item (the reorder and actions rows too, as `data-reorder` and `data-actions` items) with its grip, visibility, label, pin and more controls, the rule, and the size and reset buttons; visibility and pin carry `data-active` while on, pins state `aria-pressed`, and a hidden column's label carries `data-hidden`. `KitColumnMenuLook` takes `flatItem` and `footerDivider`, and `createColumnMenu` and `createColumnHeaderRename` take `usePartClass`. The unstyled Columns menu and header rename come from the binding. Every kit's saved-views button carries `data-active` while open and its rule is `views-divider`; `createSavedViewsMenu` takes `usePartClass`, and the unstyled saved-views menu comes from it. The unstyled pager comes from `createPager` and `createPageButtons`. `KitTableClassNames` takes the host's `tableFooter`, the frame receives the table's `density`, the skeleton renderer a `KitSkeletonShape`, and the toolbar `loadsMore`; the unstyled table is laid out by `TableComposition`. Rows stagger in again only when the table holds a different number of rows, not when a regroup or a move redraws them. `KitColumnMenuLook` takes `panelInset`, the room a kit's popover adds around the panel. antd's Columns menu, header rename and saved-views menu come from the binding; its saved-views menu carries the `views-*` parts. antd's table footer comes from `createPager` with antd's pagination. `createChecklistFilter(kit, look)` builds the checklist filter from a kit's text input, button and checkbox; a labelled `Checkbox` primitive takes `rootPart` and `style` for its root (`KitChecklistLook`), and the MUI, antd and unstyled checklists come from it. The React kits no longer list `@adapttable/core` as a dependency; their types name `@adapttable/react`, which declares `BatchRowEdit` itself. Every data and summary cell carries the column's cell attributes, and the expand column's header is named for screen readers.
- b8b52f4: Dragging a row redraws only the rows it crosses, not the table. In Mantine, MUI, Chakra and Ant Design each row a drag passes now takes about 10 ms instead of 13–25 ms on the row-reordering demos.
  
  `RowReorderController.getTableSnapshot()` returns the state the table draws from, `RowReorderState.hover` follows the drop edge as a drag moves, and `withRowDropTarget` from `@adapttable/react/adapter` applies that edge to a row.
- 0fca0b0: A table ships only the code and strings it uses.
  
  - Strings: a plain table carries the base strings and each composed feature brings its own, so a plain kit table is 3–4 KiB gzip smaller in React, Vue and Angular. A host's `labels` still override any string, and `defaultLabels` still holds every string.
  - Server tier: its engine ships as its own file and loads the first time a table is on the server tier (`createLazyServerSource()` on `@adapttable/core/binding`). `mode="server"` and `onQueryChange` work as before: the first query goes out on mount while the engine loads beside it, and a query asking for aggregates follows the engine. A failed load reaches the app's error handler. Every plain table is about 2.4 KiB gzip smaller.
  - Production build: `@adapttable/core`'s default export condition compiles out every development warning; the `development` condition keeps them (Node needs `--conditions=development`). About 0.8 KiB gzip off every plain table.
  - A table without editing no longer carries the code that keeps an editor's focus across a responsive layout change (`notifyLayoutChange()` on `@adapttable/core/binding`), about 0.4 KiB gzip; `toggleGroupLeaves` no longer brings the grouping selection model into a table without grouping, about 0.1 KiB; `applyGroupLeafSelection` applies the same rule as `toggleIds`; bundlers drop the lookup tables of core modules a table does not use (the pivot entry 0.6 KiB smaller).
- 0fca0b0: One store owns each table's state.
  
  - A table's view state, selection, column layout, row and tree expansion, group collapse, row pinning, edit drafts, saves, validation, conflicts, undo history and cell focus are slices of one table store in React, Vue and Angular. One action publishes once, to exactly the readers of what it changed, so an edit and the focus move it causes reach their readers together.
  - A synced URL mirrors the store: a change rewrites exactly the URL params it set, and a URL change reads back into the store. A table's listeners hear a view change only when the view itself changes.
  - `@adapttable/core/binding` exports the store (`createTableStore`, `defineSlice`, `defineAction`), the selection slice (`SELECTED_IDS`, its actions, `rowSelectedReader`) and `controllableSlice`; `createTableViewStore`, `createControllableStore` and `createColumnLayoutController` take a table's store, and `TableStore.scope` gives a part of a store slices of its own.
  - Configuring a table's view state writes no store, rendering a table writes none of its stores, and a Vue table reads its options one by one, so a new options object with one value changed updates only what reads that value.
- 0fca0b0: Features are typed end to end.
  
  - `defineFeature` declares a feature with types: the table options it sets, the store slices and named actions it adds, the labels it needs and the URL params it owns. `featureState(features)` returns exactly the installed features' slices and actions.
  - The built-in feature factories in `@adapttable/core/binding` take typed parameters (edit handlers for the table's row type, row and bulk actions, extra and pinned rows, cell spans, filter definitions, edit history). `RowEditHandler`, `BatchEditHandler` and `EditHistoryInput` are exported from `@adapttable/core`, `/editing` and `/binding`.
  - Row callbacks are `RowCallback`s and slots that carry the row type are `RowSlotKey`s (`rowSlotKey`), so a column or state typed over your row type is assignable where a slot reads rows as `unknown`, and the row type is still inferred. The live slots are row slot keys with their fill types, exported from `@adapttable/core/binding` and `@adapttable/react/adapter`; grouping and resize props read structural events, so a framework's own events spread onto its elements as they are. New: `overlayFeatureOptions`.
  - Feature options and slot props reach the table without type casts in React, Vue and Angular. React's `filters` accepts filter definitions or a hand-built form; Angular's edit handlers are core's and its feature lists hold features typed for any row; Angular slot props read rows as `unknown`. Vue's `GROUP_ROW` is a row slot key (`GroupRowDraw`); `groupRowSlotKey()` is deprecated and returns it.
  - A kit's `standardFeatures({ filters })` takes its row type from a filter's `getValue` again, so `features={standardFeatures({ … })}` compiles on a typed table without a type argument. Vue's grouping panel compiles against the oldest supported Vue.

### Patch Changes

- 39057e0: `@adapttable/core/engine`, `/grouping`, `/editing` and `/selection` let an app import one domain without the whole root, and every root import keeps working. `createBasicTableEngine` builds the filter, sort, search and page session on its own.
  
  Grouping no longer throws on rows that carry the basic engine's view, and changing how a group total is formatted no longer recomputes it. A batch of row patches rebuilds its position indexes once instead of once per patch, so streaming updates on large tables do far less work with the same results.
  
  Decisions every binding makes the same way — source refresh, cell text, approval lines, virtualizer fields, column-select names, the built-in English labels — have one implementation in `@adapttable/core/binding`, which also exports `KitEnvironment` and `withKitEnvironment`. `renderedRowsOf` again accepts a tree entry that only carries its row.
  
  `sameItems` compares two lists item by item with `Object.is`, and `retainItems` keeps the previous list while its items are unchanged; both are exported from `@adapttable/core/binding`, with `isRecord` for a plain-record check. `sameRows` is deprecated in favour of `sameItems` and keeps working. `approvalProposalText` writes one proposed change as its review line, and `rowMoveMenuProps` builds a row's move menu and its confirmation, for every binding.
- 0fca0b0: Editing, filtering and layout behave the same in every framework.
  
  - Row editing and batch editing apply `validateRow` in React and Angular as in Vue: a refused row is not saved and its message shows. `rowEditorControl` and `batchEditorControl` are on `@adapttable/core`.
  - The "no results" view's "Clear all" clears the search as well as the filters (`clearSearchAndFilters` on `@adapttable/core/binding`, the React table chrome and the Angular table).
  - A pinned column stays put while the table scrolls sideways, past the expand, reorder, selection and actions columns at their rendered widths; in Vue those columns stick too, and an Angular table's minimum width holds them, so widening a column scrolls instead of squeezing. New: `readRailWidths` and `observeRailWidths` on `@adapttable/core/binding`, `railCellAttrs` and `TableRail` on `@adapttable/vue/adapter`.
  - A Vue row action that opens the row form (`editsRow`) renders only where row-mode editing gives it a form. Material's fill handle stays above a cell's content, and its saved-views panel fits a 320px screen with icon buttons. Vuetify's compact rows are 36px, with row actions on one line. Angular CDK cells take 6px of block padding when comfortable and 4px when compact.
  - In Vue, Ctrl or Cmd+Z on a control inside a cell undoes the last committed edit; an open editor keeps its own keys.
  - React's grouping panel shows a group total the app computes as the app set it.
  - ngx-bootstrap's edit activator fills its cell, so a double-click anywhere in a wrapped row opens the editor.
  - An editable cell taller than one line grows its edit button instead of spilling past it in Angular Material, Vuetify and shadcn-vue.
- 8bc96c5: Moving the cell focus or dragging a cell range repaints only the rows the focus, range, fill handle or find matches touch. With 30 rows on screen an arrow key takes 7–12 ms in Chakra, MUI and Mantine instead of 21–54 ms, and each cell a range drag crosses takes 11–22 ms instead of 27–55 ms.
  
  `gridRowFocusSignature` digests what the focus draws on one row.
- f20f914: Dragging over the grouping strip redraws only the strip. The table redraws when a column header's drag starts or ends, never while a drag hovers: on a table of 161 grouped rows each drag move takes under 10 ms instead of about 90 ms.
  
  `GroupingPanelController.getTableSnapshot()` returns the state the table draws from, and the panel interactions carry `live`, the drag and announcement the strip follows.
- 0fca0b0: A table redraws only what changed.
  
  - Selecting one row or editing one cell redraws that row alone in React, Vue and Angular. An edit the host writes back into `data` redraws only the edited row, with cell navigation and with selection on.
  - React's `useFrontendData`, `useServerData` and `useTableData` return the same source object while nothing in it changes, and a table with a column layout keeps its columns across renders that leave them unchanged, so a host re-rendering for its own state no longer re-renders every row.
  - Vue draws each body row and card in a component of its own (`tableRowView`, `keepTableControls`, `NO_CLASS_NAMES`); `rowAttrs` and `cardAttrs` take an optional `state` whose `selected` is used in place of the table's selection.
  - Angular writes row, cell and control attributes only when their value changes; a controlled `checked` or `value` the element changed is still put back.
  - A Vue table's sync option copy reads the raw record, so writing one option does not schedule another copy of the same record.
- Updated dependencies [0fca0b0]
- Updated dependencies [cbda297]
- Updated dependencies [39057e0]
- Updated dependencies [0fca0b0]
- Updated dependencies [9897b46]
- Updated dependencies [0fca0b0]
- Updated dependencies [8bc96c5]
- Updated dependencies [f20f914]
- Updated dependencies [39057e0]
- Updated dependencies [aa07a99]
- Updated dependencies [b8b52f4]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
  - @adapttable/core@3.14.0
  - @adapttable/i18n@3.4.0

## 1.9.1

### Patch Changes

- Updated dependencies [7dee39f]
  - @adapttable/core@3.13.1

## 1.9.0

### Minor Changes

- e50c6c8: Pinned columns carry `data-pinned="start"` or `"end"` on their header and body cells in every React kit, so the pinned edge shows in Windows high-contrast mode. The desktop row wiring adds `bodyPinSide` for kits that render their own cells.

### Patch Changes

- 7cd8e5c: A paged antd table no longer remounts on every render: a batch-edit field keeps focus and its typing, and scroll position holds. The windowed row and column counts a paged table reports are now built once per table shape in every kit.
- 91ea216: In the inline assistant panel the composer stays at the end of the panel instead of sticking to the bottom of the screen over the conversation and the approval review. The floating window and the sheet still hold it at their bottom edge.
- aa06136: A page that renders the table assistant closed keeps its focus and scroll position on load. The launcher takes focus only when an open panel closes.
- b4f2c66: An AND/OR filter-tree condition still waiting for its value no longer acts as a filter: it gets no chip, is not counted on the Filters badge, cannot widen an OR group to every row, and is not sent to a server. `isFilterTreeConditionSet` and `settledFilterTree`, from `@adapttable/core` and `@adapttable/core/query`, give a backend the same rule.
- 4b3a395: The fullscreen button works on its first press after the table mounts, without waiting for something else to re-render the table.
- 2e930c2: A leaf row in a tree is the same height as a parent row, with its text on the row's centre line instead of a few pixels low.
- Updated dependencies [549ee08]
- Updated dependencies [702a702]
- Updated dependencies [7ee7489]
- Updated dependencies [b4f2c66]
- Updated dependencies [e50c6c8]
- Updated dependencies [858ef5b]
  - @adapttable/core@3.13.0

## 1.8.0

### Minor Changes

- e3e40e7: Add `editActivation: "click"` to open a cell's editor on the first click, the way a form field does; set it on the table or in `editing(handler, { editActivation: "click" })`. The default stays a double-click, and Enter and F2 open the editor either way. The rest of a double-click that opened an editor no longer acts inside it, so it never ticks a checkbox or toggles a list.

### Patch Changes

- ffc8540: Opening a cell editor no longer changes the table's layout: the column keeps its width, the row keeps its height, and the editor fits inside its cell in every kit and density.
- Updated dependencies [e3e40e7]
  - @adapttable/core@3.12.0

## 1.7.4

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
- 426d44f: Add `maxHeight` for bounded Vue table/card scrolling and a custom `card` body slot to all Vue kits, supplying prepared native field renderers and editors while retaining selection, expansion and row actions. Preserve active editor focus and text selection through responsive layout changes, and leave focus on explicit layout controls. Expose the neutral `preserveEditorFocusOnLayoutChange` binding helper. Connect React and Angular row-validation failures to the affected native editors.
- Updated dependencies [b33a9ee]
- Updated dependencies [426d44f]
  - @adapttable/core@3.11.0

## 1.7.3

### Patch Changes

- 753873b: Expose rejected batch saves as accessible batch-level status messages and mark pending batch saves busy. Preserve drafts and native retry/cancel controls, including partial-save reconciliation without resubmitting accepted rows.
- 330566b: Render supplied dictation errors as wrapping alerts below the native composer controls. Keep typing and retries available, and stop active recognition when a React or Angular assistant is dismissed or unmounted.
- d35c348: Align a single-column group caption with its leaf header and values, honor group alignment in Vue renderers, and let pivot configuration zones fill their container with responsive axis panels and a full-width measures panel. Keep explicit group alignment, spanning headers and native kit controls intact.
- d7ddec5: Keep row-save failures visible through native React and Angular row actions. Preserve drafts for retry or cancel, and include commit transitions in the row memo signature so pending and failed saves repaint without another edit.
- Updated dependencies [c201ffb]
- Updated dependencies [d35c348]
- Updated dependencies [d7ddec5]
  - @adapttable/core@3.10.0

## 1.7.2

### Patch Changes

- c8d10ab: Align assistant headers, composers, conversation alignment and viewport placement with the Mantine reference while retaining each adapter's native controls. Correct native dialog offsets, mobile focus handoff and nested shortcuts dismissal.

## 1.7.1

### Patch Changes

- 29ff08e: Keep assistant input-container and modal-content part markers on equivalent structural elements across React, Angular and Vue.
- Updated dependencies [9213f9a]
  - @adapttable/core@3.9.1

## 1.7.0

### Minor Changes

- f187f9e: Expose `renderedRowsOf` from the React adapter entry and retain row-only reorder
  compatibility with loaded-row/session safety. Ant Design uses that inventory for
  handles/drop targets, so synthetic group headers cannot redirect a row move.
  
  Ant Design, Base UI, Chakra, Mantine, MUI, Radix and Unstyled mobile cards retain
  their full content height in constrained layouts. Base UI loads drawer motion CSS
  only when its drawer renders while preserving shared theme tokens. Chakra native
  portals retain dark semantic colors and rename inputs focus on each open.
  MUI restores saved-view name focus after saving. Radix header filters preserve
  native nested Select interactions. Unstyled search and filter popovers fit narrow
  viewports and flip above low triggers while keeping keyboard dismissal/focus.
- 11cea28: Export `ReactColumnGroupDef` from `@adapttable/react/adapter` so custom adapters
  can name grouped-column inputs accepted by `flattenReactColumnTree`.
- aebbd39: Add optional tree-shape readers to export contexts. React, Angular and Vue all
  and selected exports include loaded descendants across filtered roots/pages;
  page files follow visible expansion. File, hook and request data agree, while
  summary callbacks and page request metadata retain original source-shaped rows.
  
  Headless contexts without shape readers retain conservative membership filtering.
  Runtime tree inventories and server export routes keep their existing behavior.

### Patch Changes

- d32983f: Add `FindController.flush()` so captured views include queries waiting for the
  URL debounce. Pending writes stay with the adapter/namespace that accepted them;
  React synchronizes source changes after render.
  
  Find and grid announcements use supported primitive/Date accessor values before
  sort/backing fields, preserving explicit format/export projections and avoiding
  object stringification. Retire clipboard results when row/column context changes
  and deferred focus when another cell receives focus, while preserving newly
  issued requests.
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

## 1.6.0

### Minor Changes

- 8d1e749: Correct native control labels, separator and list-item semantics, and keyboard scroll-region metadata. Preserve established Angular binding names and signal access while removing alias declarations. Share live bulk-action coordination, consolidate CSS rules, and simplify re-exports and controller code without changing subscription snapshots or filter memo invalidation.

### Patch Changes

- 143d5bf: Bound build memory by generating JavaScript and production declarations in sequential processes. Preserve both module formats, public APIs, React Compiler transforms, and complete test/typecheck coverage.
- Updated dependencies [143d5bf]
- Updated dependencies [8d1e749]
  - @adapttable/core@3.8.1

## 1.5.0

### Minor Changes

- 42a4349: Expose optional `UseFrontendDataOptions.filterKey` and forward neutral filter-semantic keys so replacing declarative filter definitions refreshes matching rows with unchanged data and query state. Direct custom predicates can explicitly invalidate through `filterKey`.
  
  Expose the shared `resize-handle` styling hook on the real column-resize control while preserving its pointer and keyboard callbacks.

### Patch Changes

- Updated dependencies [42a4349]
  - @adapttable/core@3.8.0

## 1.4.0

### Minor Changes

- 96e5cc0: A kit now talks only to its binding. `@adapttable/react/adapter` re-exports the core names the kits use (`defaultLabels`, `resolveLabels`, the filter registry helpers and 46 more), and `@adapttable/react/pivot` re-exports everything `@adapttable/core/pivot` exports, so no kit imports `@adapttable/core`. Each kit's `/pivot` entry forwards `@adapttable/react/pivot`, and so also offers `pivotTableModel` and `usePivotUrlState`. Nothing is removed or renamed, and bundle sizes are unchanged.
  
  Core's deprecated main-entry copies of the adapter helpers now name their replacement in `@adapttable/core/binding`.

### Patch Changes

- d6e065c: Core owns the rest of what a second binding would otherwise copy from React. `@adapttable/core/binding` gains the state shapes the binding hooks return (`SelectionState`, `GridFocusState`, `TreeExpansionState`, `RowPinningState`, the URL-state results, `UseTableDataResult` and others), the `DENSITY_STATE` and `ROW_REORDER` keys with their state types, and the column-default and same-rows helpers (`resolveColumnDefaults`, `resolveColumnHeaders`, `columnPathText`, `sameRows`). `@adapttable/core` gains the column menu's drag-and-drop rules and state (`createColumnDragController`, `startColumnDrag`, `acceptColumnDrag`, `dropColumn`, `columnReorderKeyDown`), and `@adapttable/core/formula` the formula URL-state result. `@adapttable/ai` owns `TABLE_AGENT_STATE`.
  
  `@adapttable/react`, `@adapttable/ai-react` and `@adapttable/angular` re-export or call these under their existing names; their public APIs and behaviour are unchanged.
- 643545d: The table's feature controllers are framework-neutral. `@adapttable/core` now holds the logic the React binding used to own, so a second binding can drive the same behavior:
  
  - Columns: the column layout controller (`createColumnLayoutController`, with the rename baselines a reset restores), the layout storage write policy (`writeStoredColumnLayout`), the column reorder model and the inline rename editor.
  - Filters: the operator-first range, text and boolean fields, the AND/OR filter-tree builder, the active-filter chips, the checklist filter and its window, and the per-column header filter cells.
  - Rows and grouping: the grouping panel and its runtime, group paging and collapse, lazy tree children, row actions and row reorder runtimes, cell navigation and context-menu copy.
  - Panels and bars: the find bar, shortcuts, the bulk action runner, the saved views panel, export progress, the status bar, the side panel, sticky toolbar and density, Escape-to-close and focus restore, row highlights and changed-cell flash, the all-matching selection scope, the pivot layout and panel, sparkline geometry and nested table defaults.
  
  The React hooks and Chrome run on them with their public API unchanged; names React exported before are now re-exported from core. Filter-tree chips now label a custom filter type's operators through its registry widget, the same words the builder shows, instead of the raw operator strings.
- ed815b3: `@adapttable/core/binding` now owns the whole slot contract, so a binding other than React can fill every position a kit fills today:
  
  - Every slot key the React binding declared (the status bar, find bar, batch-edit bar, command palette, context menu, side panel, bulk bar, filters form, editable cell, fill handle, toolbar extras, tree, row editing, row reorder, group headers, column select and every `*_LIVE` key), with the same ids and `single` flags.
  - The props every kit control receives, from the checklist, filter tree, header filters, grouping and pivot panels, saved views, side panel, command palette, context menu, row and batch editing, editable cell, row reorder, tree toggle, column select, fill handle, multi-select editor, find bar, status bar, export progress, agent approval and table assistant. Rendered content is a `TNode` type parameter and key, drag and style types are parameters too.
  - The agent feature-state keys (`AGENT_APPROVAL_STATE` and its relatives), `FILTER_ENGINE`, `GROUPING_PANEL_STATE`, `TableAssistantView`, `assistantIsBusy` and `assistantIsUsable`.
  - The table's glyphs as path data (`FILTERS_ICON`, `SEARCH_ICON`, `expandChevronIcon`, `GRIP_ICON`, `eyeIcon`, `PIN_ICON` and the assistant's avatars and glyphs), `OVERLAY_MOTION`, `MOUNT_STAGGER`, `FORCED_COLORS_CSS` with `ensureForcedColorsStyles`, and the display helpers (`groupRowParts`, `mergedCellStyle`, `cellHighlightKind`, `cellHighlightStyle`, `groupIndentStyle`, `pinnedEdgeCellStyle`, `logicalAlign`, `sortArrow`, `resolveMobileLabel` and the rest).
  
  `@adapttable/react` imports all of these from core and re-exports each under its current name and entry point; its API and rendering are unchanged.
- Updated dependencies [d6e065c]
- Updated dependencies [643545d]
- Updated dependencies [ed815b3]
- Updated dependencies [96e5cc0]
  - @adapttable/core@3.7.0

## 1.3.6

### Patch Changes

- 6bec4e8: `useQuerySource` returns to page 1 when a sort, grouping or filter change restarts its cursor trail, instead of asking for a later page without its token.
- 73d62b5: Data, editing, table assembly and the assistant panel run on the new `@adapttable/core` controllers. The public API is unchanged.
- Updated dependencies [4613ab6]
- Updated dependencies [73d62b5]
- Updated dependencies [8c6aeda]
- Updated dependencies [6bec4e8]
- Updated dependencies [1bce1a4]
  - @adapttable/core@3.6.0

## 1.3.5

### Patch Changes

- e5615bd: The frontend tier is framework-neutral: `createFrontendSource` in `@adapttable/core` holds the rules an in-memory table runs on — the per-row search text cache and its invalidation on row patches, restaging the engine only when a value-level input moved, the facet rows (searched, before filters), one page slice per engine revision, and whether an infinite list has more. `resolvePaginationMode`, `defaultSearchText` and `defaultFrontendRowId` move to core with it. `useFrontendData` runs on the source with its API unchanged, and now reads the right page when a render stages more than one change before React commits it.
- Updated dependencies [e5615bd]
  - @adapttable/core@3.5.0

## 1.3.4

### Patch Changes

- Updated dependencies [7ee30f8]
- Updated dependencies [343239c]
  - @adapttable/core@3.4.0

## 1.3.3

### Patch Changes

- 36d14b9: Core exports the Chrome model: the pure derivation from table state to layout, rows, `data-adapttable-part` names and prop getters, generic over the binding's render node. React's shell and chrome render from it.
- 36d14b9: Core exports the table's interaction controllers: cell editing (drafts, validation, save state, undo and redo), grid focus and cell navigation (ranges, fill, clipboard, paste and announcements against a container element), the row reorder engine (keyboard grab, drag and drop, grouped and tree moves), and the models behind find in table, the context menu, the command palette, the export handler, saved views, the header-filter overlay and the status announcements. React's hooks subscribe to them with their API and behaviour unchanged.
- 36d14b9: Core exports the table's state layer for any framework binding: `TableOptions` and the runtime contracts, the history and memory URL adapters, a view-state store for everything the table writes to the URL, the data-tier controller (tier resolution, `onQueryChange`, aborts, `refetch`, cursor and infinite paging), and controllable selection, expansion, pinning and column-layout stores. `@adapttable/react` runs on them with its API and behaviour unchanged.
- 36d14b9: A selectable row's `aria-selected` follows its checkbox, so screen readers hear a row become selected. Ant Design rows also carry `data-index` and `aria-selected`, as every other kit's rows do.
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
- Updated dependencies [36d14b9]
  - @adapttable/core@3.3.0

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
