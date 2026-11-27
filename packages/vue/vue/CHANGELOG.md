# @adapttable/vue

## 0.8.1

### Patch Changes

- ea5761c: React, Vue and Angular warn about a duplicate column key with the same development message, from one check: `warnDuplicateColumnKeys(columns)` on `@adapttable/core/binding`.
- Updated dependencies [ea5761c]
- Updated dependencies [93bf6f1]
  - @adapttable/core@4.1.0
  - @adapttable/i18n@4.0.1

## 0.8.0

### Minor Changes

- ee0f202: High-contrast rules load with the features that draw them. Every table adds the base rules (focus, validation, pinned edges) to the page's one stylesheet; cell navigation, find, the editing features, saved views, the side panel, the command palette and the grouping panel each add their own, so a plain table carries 1.2 kB of rules instead of 2.1 kB. A feature, or a host plugin, carries its rules in a `contrast` field.
  
  `FORCED_COLORS_CSS` is removed, and `@adapttable/react/adapter` no longer exports `ForcedColorsStyle` or `ensureForcedColorsStyles`: `FeatureProviders` mounts the rules. `mountForcedColorsStyles` in the Vue and Angular bindings takes a reader of the composed features.
- bee0c9f: `@adapttable/core/binding` no longer re-exports a value that `@adapttable/core` already exports and that the binding entry's own signatures do not name. Import `visibleColumns`, `filterLabel`, `aggregate`, `declaredAggregates`, `computedAggregateKeys`, `autoSizeColumns`, `cellValue`, `conditionToExtra`, `sourceCapabilities`, `treeColumnKey`, `approvalArgumentPairs` and `approvalValueText` from `@adapttable/core`. `adapttable migrate-v4` moves those imports.
  
  `applyTableFeatures` is only on `@adapttable/react/features`. `useTableFeatures` is only on `@adapttable/react/adapter`. `adapttable migrate-v4` moves an import that still uses the other entry.
  
  A kit no longer publishes a `/features` barrel. Import each factory from its own subpath. A React kit's `/features` only forwarded `@adapttable/react/features`, so those imports move there. `adapttable migrate-v4` rewrites both.
  
  A table takes `data` or a `source` and infers no tier from its other props. A server table builds its source with `useServerData` (React, Vue) or `injectServerData` (Angular) and passes it as `source`; the table props `mode`, `onQueryChange`, `total`, `aggregates`, `responseKey`, `supports`, `facetKeys` and `facets`, and React's `DataModeProps`, are gone. `onViewChange` tells a table over `data` what the reader changed. `serverFilterKeys({ columns, filters })` gives a server source the filter keys its first request needs. A table over `data` no longer ships the server tier: the Unstyled table loads 1.8 KiB less up front and 5.9 KiB less in total in each framework. `adapttable migrate-v4` reports every table that passes the removed props.
  
  Filter placement, column rename, and cell cut, paste and fill are options of `filters()`, `headerFilters()`, `columnMenu()` and `cellNavigation()`. A table prop no longer sets them. `isCellFlashing` stays on the table: it marks cells the base already draws. Vue's `DataTable` no longer accepts `onCellCut`, `onCellPaste`, `onCellFill` or `onColumnRename`.
- 636d0ad: A family composes every member of an area in one call and goes into `features` as one entry: `editingFamily(save)` from each kit's `/editing` (cell editing, dirty marks, edit history and undo controls), `filteringFamily(defs)` from `/filtering` (the filter panel and header filters) and `columnLayoutFamily()` from `/column-layout` (columns menu, resizing and fitting). Each family has its own entry, so a member imported alone still loads alone. `standardFeatures` is built from the column-layout and filtering families. A Vue or Angular kit's `/features` entry gathers the families with the other factories.
- 8af4736: A feature's `setup(host)` only registers; what outlives a render goes in its `mount(context)`, which returns what releases it. Every binding keeps a mounted feature by id: declaring it again with new options, inline included, keeps the resource and hands `context.feature()` the new declaration, and only removing the feature, changing its `dependencies` or unmounting the table releases it, exactly once. A render the framework discards acquires nothing, and a failed mount rolls back what its pass acquired. React publishes the table runtime and its feature ids in layout effects, so AI and event callbacks read the last committed table; `PublishTableRuntime` is the chrome's publisher. `createFeatureMounts` and `composeMounts` on `@adapttable/core/binding` are the shared lifecycle. A `setup` that returns a cleanup is refused, and `onDispose` is no longer on the feature host. Vue's and Angular's table agent follows its latest declaration's options. `adapttable migrate-v4` reports `onDispose` calls.
- 97ca02e: `classNames.actionButton` styles a row action and `classNames.tableStatusAnnouncer` the status announcer; the `rowAction` and `status` keys are gone from Vue's `DataTableClassNames` and every Vue kit.
- d174bb1: `groupRowSlotKey()` is gone from `@adapttable/vue/adapter`; `GROUP_ROW` is the group-row slot for every row type. `@adapttable/nuxt-ui`'s `columnSelectionCheckbox` comes from `@adapttable/nuxt-ui/column-selection` only.
- 3b2a5bd: Each Vue feature with a toolbar control adds its own toolbar entry. Density, fullscreen, saved views, the column menu, undo/redo, find, the command palette, export and print read the state they publish and draw their kit control; the shell names none of them. `TOOLBAR_EXTRAS` takes `ToolbarEntryProps`, `toolbarEntry` and `FeatureSlotDrawer` build an entry, a kit's filters trigger and panel fill `FILTERS_PANEL`, and `UNDO_REDO_CONTROL` takes `UndoRedoControlProps` in place of `ToolbarExtrasSlotProps`. The shell's `toolbarExtrasProps` and `hasActionToolbar` are removed.
  
  A feature's `rank` places its fills in a slot several features fill, lower first, then feature id. Saved views and the column menu lead the toolbar, so every Vue kit draws Filters, Saved views, Columns, Density, Export, Find, Fullscreen, Print and Undo/Redo in that order. Core names `UndoRedoToolbarProps`, and `adapttable migrate-v4` reports the removed Vue names.

### Patch Changes

- e0ed9dd: `@adapttable/react` and `@adapttable/vue` ship a production build with no development warnings and a development build, selected by the `development` export condition, that keeps them. A plain React table measures 20.6 KiB gzip instead of 20.8 and a Vue Unstyled table 53.3 instead of 53.5.
- 536aa89: Live-update conflict handling loads when the first edit opens. A table that edits carries a small holder instead of the conflict store, about 0.5 KiB gzip less in every framework, and the store arrives before any conflict can. `createDeferredEditConflictStore` and `loadEditConflictStore` replace `createEditConflictStore` on `@adapttable/core/binding` and `@adapttable/core/editing`; the main-entry alias is gone.
- 9c18ce9: Each draft and each cell's editing state stays distinct. Dirty marks, saves, validation and conflicts key every cell by an encoding no row id or column key can collide with, and a row's state is looked up by row, so confirming one cell no longer clears another's mark and a draft change after a `;` redraws its row. The dirty, save and batch states gain `rowSignature(rowId)`, which brings the row editing digest for 500 rows with 1,000 pending drafts from 10 ms to 0.1 ms.
- cdbba81: A feature id resolves to one declaration everywhere: when two features share an id, the last one supplies the table's options, labels, registrations and slot fills, and the earlier one contributes nothing. `resolveFeatureIds` on `@adapttable/core/binding` applies the rule and warns in development.
- cb9f9db: `@adapttable/core`'s main entry serves the names a table uses. Binding and kit machinery comes from `@adapttable/core/binding`, and the editing, pivot, formula, grouping, stream and selection names from their own entries: `@adapttable/core/editing`, `/pivot`, `/formula`, `/grouping`, `/stream` and `/selection`. Importing every core export drops from 107.2 to 47.2 KiB gzip. The query codecs and engine constructors stay on the main entry. `@adapttable/react`'s kit machinery (the chrome, column, filter-chip and body-data hooks and their types) comes from `@adapttable/react/adapter`, which also exports `columnHeaderLabel` and `exportViewFromChrome`.
- da4baa0: The Excel and PDF writers load on the first export instead of with the table, and start loading in the background once the table is mounted, so an export still works after the connection drops. A Vue table with `exportPdf` loads 8.1 KiB gzip less up front and one with `exportXlsx` 2.4 KiB less; either now costs 0.2 KiB more than CSV export. A writer that cannot load is a failed export — no download, no `onAfterExport`, the button stays usable — and the next export loads it again. `deferredXlsxWriter`, `deferredPdfWriter` and `deferredExportWriter` give the same behaviour to a writer you configure yourself.
  
  `xlsxWriter` and `buildTableXlsx` are no longer on the main entry; import them from `@adapttable/core/xlsx`.
- 633e23c: Find in table reads only the previous hits when a query gets more specific, instead of every loaded cell on each keystroke. The matches are the same.
- ed8a86d: `@adapttable/i18n` loads no label data from its root: `getDirection`, `isRtlLocale`, `hasLocale` and the on-demand `loadLabels` read 2 files (6 kB) in Node instead of 23 (380 kB). `getLabels` and `locales` come from `@adapttable/i18n/catalog`, one language alone from `@adapttable/i18n/locales/<tag>` (21 kB for Arabic), and `@adapttable/i18n/load` is part of the root. A tag that names a script picks the preset written in it: `zh-Hant` and `zh-Hant-TW` read Traditional Chinese, `zh-Hans` Simplified; `az-Arab` and `pa-Arab` are right-to-left, `ar-Latn` and `ks-Deva` left-to-right.
- a96cfee: A kit locale whose labels fail to load no longer raises an unhandled promise rejection in React and Vue: the table keeps its current labels, logs the error with the locale, and loads the language on the next locale change or mount. In Angular the server-rendering task for the labels settles on a failure as it does on success.
- 31e5510: With entrance animation off or reduced motion preferred, the table no longer searches its rows for animation marks at mount and on every refresh.
- fbc52e8: Feature notices and disabled-control reasons take their text from the resolved labels only, in every locale: `collectFeatureNotices`, `chromeFeatureNotices` and `resolveExportDisabledReason` take resolved labels, `capabilityReason(capability, labels)` reads the `"grouping"` or `"exportScope"` sentence from them, and React's `useExportHandler(handler, labels)` requires them. A plain Unstyled table measures 64.2 KiB gzip instead of 64.4. Every other built-in string a model or chrome falls back to is its label group's default, so English lives only in the label groups: `defaultPendingRows` is gone, React's assistant shortcuts menu reads "Shortcuts" like Vue and Angular, and its revoke button names the capability ("Ask about editing cells again").
- 4effc96: An update keeps a row's id: `updateRow` whose changes give the row a new id is refused with an error naming `rekeyRow`. `rekeyRow(id, changes)` changes the id in place, a later patch in the batch finds the row by its new id, and an id another row already holds throws `RowIdConflictError` without touching the rows. `rowRekeys(log)` maps each row's id before a batch to its id after it, and a rekeyed row's update event carries `from`. `applyRowPatches(…, { rekeyUpdates: true })` reads stored or sent id-changing updates as rekeys; row patch streams apply their frames that way (`STREAMED_ROW_PATCHES`) and accept `rekey` frames. `@adapttable/angular` re-exports `rekeyRow` and `RowIdConflictError`. In React, Vue and Angular, a rekey moves the selection (a host-held selection is asked to move), the pinned rows, the open row details, the expanded tree nodes, the focused cell and an open editor's draft, dirty marks, validation and save errors and conflict question to the new id in the change that brought the patched data; new data that is not a patch of the old moves nothing. A row reorder checks the dragged and target rows by id in every binding and hands the host each row as it is at the drop. Every editing store takes `rekey(moves)`; `onRowRekeys`, `onRowRekeyMoves`, `rowRekeyMoves`, `rekeyTableRows`, `commitRowRekeys`, `rekeyedIds` and the id remappers on `@adapttable/core/binding` are what a binding carries a rekey with.
- eb084d0: When a table's source is replaced, the runtime view and the agent read the new source's rows and columns at once, on every scope, instead of reading page rows from the old one in React. The released reader keeps answering from its own last render, and an ordinary update keeps the same handle.
- 5b7bc3c: The runtime view a feature above the table reads is built the first time it is read and kept until the next render, so a table nobody reads never builds it, and reading a rendered row no longer builds it. `TableRuntimePublisher` stages each render with `stage(chrome, actions)` and serves `view()` and `visibleRows()`; React's `usePublishTableRuntime(reader)` takes a `TableRuntimeReader` of `rows()`, `labels()` and `view()`.
- 3c15620: A table drawing desktop rows no longer builds the mobile card projection for every row on mount and on every data refresh; the cards are built when the table draws them.
- 9382e94: A virtualized Vue table re-reads its geometry only for changes that can move or resize it — its own content, its ancestors, the window — and at most once per frame. Twelve class changes elsewhere on the page used to cause twelve scans; they now cause none.
- 054986e: A virtualized Vue table builds row attributes, styles and cells only for the rows it draws, on the surface the reader is on. With 10,000 rows and 20 columns, startup calls `rowStyle` 30 times instead of 20,000 and `rowKey` 30,030 times instead of 130,000.
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

## 0.7.0

### Minor Changes

- 6bee472: Filters can be composed with only the widgets a table draws. `filtersWith([textFilterWidget, rangeFilterWidget])` from any kit's filters entry is the `filters` feature with those fields alone, so the other widgets stay out of the bundle: a text-only filter form is 4.4 KiB lighter on MUI, 1.3–2.4 KiB on the Vue kits and 4.8 KiB on the Angular native kit (min+gzip). Each kit exports `textFilterWidget`, `booleanFilterWidget`, `selectFilterWidget`, `multiSelectFilterWidget`, `checklistFilterWidget` and `rangeFilterWidget`; a filter whose widget was not composed throws, naming the widget to add. `filters` keeps drawing every widget.

### Patch Changes

- Updated dependencies [6bee472]
- Updated dependencies [8c8eb0a]
  - @adapttable/core@3.16.0
  - @adapttable/i18n@3.4.2

## 0.6.0

### Minor Changes

- 2582d80: A headless table that keeps its view state in memory no longer bundles the URL code. React and Vue gain `useLocalFrontendData` and `useLocalTableViewState`, Angular `injectLocalFrontendData` and `injectLocalTableViewState`, over core's `createLocalTableViewStore`. Search, sort, filters, grouping and paging behave as with `urlSync: false`; the table measures about 2.3 KiB smaller in React and Vue and 2.5 KiB smaller in Angular.

### Patch Changes

- Updated dependencies [308e2f8]
- Updated dependencies [fb0e3af]
- Updated dependencies [e8d3443]
- Updated dependencies [2582d80]
- Updated dependencies [55d0118]
- Updated dependencies [e1bad04]
  - @adapttable/core@3.15.0
  - @adapttable/i18n@3.4.1

## 0.5.0

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
- 0fca0b0: Editing, filtering and layout behave the same in every framework.
  
  - Row editing and batch editing apply `validateRow` in React and Angular as in Vue: a refused row is not saved and its message shows. `rowEditorControl` and `batchEditorControl` are on `@adapttable/core`.
  - The "no results" view's "Clear all" clears the search as well as the filters (`clearSearchAndFilters` on `@adapttable/core/binding`, the React table chrome and the Angular table).
  - A pinned column stays put while the table scrolls sideways, past the expand, reorder, selection and actions columns at their rendered widths; in Vue those columns stick too, and an Angular table's minimum width holds them, so widening a column scrolls instead of squeezing. New: `readRailWidths` and `observeRailWidths` on `@adapttable/core/binding`, `railCellAttrs` and `TableRail` on `@adapttable/vue/adapter`.
  - A Vue row action that opens the row form (`editsRow`) renders only where row-mode editing gives it a form. Material's fill handle stays above a cell's content, and its saved-views panel fits a 320px screen with icon buttons. Vuetify's compact rows are 36px, with row actions on one line. Angular CDK cells take 6px of block padding when comfortable and 4px when compact.
  - In Vue, Ctrl or Cmd+Z on a control inside a cell undoes the last committed edit; an open editor keeps its own keys.
  - React's grouping panel shows a group total the app computes as the app set it.
  - ngx-bootstrap's edit activator fills its cell, so a double-click anywhere in a wrapped row opens the editor.
  - An editable cell taller than one line grows its edit button instead of spilling past it in Angular Material, Vuetify and shadcn-vue.
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
- 0fca0b0: A table redraws only what changed.
  
  - Selecting one row or editing one cell redraws that row alone in React, Vue and Angular. An edit the host writes back into `data` redraws only the edited row, with cell navigation and with selection on.
  - React's `useFrontendData`, `useServerData` and `useTableData` return the same source object while nothing in it changes, and a table with a column layout keeps its columns across renders that leave them unchanged, so a host re-rendering for its own state no longer re-renders every row.
  - Vue draws each body row and card in a component of its own (`tableRowView`, `keepTableControls`, `NO_CLASS_NAMES`); `rowAttrs` and `cardAttrs` take an optional `state` whose `selected` is used in place of the table's selection.
  - Angular writes row, cell and control attributes only when their value changes; a controlled `checked` or `value` the element changed is still put back.
  - A Vue table's sync option copy reads the raw record, so writing one option does not schedule another copy of the same record.
- 64069d0: A row action with an `icon` renders as an icon-only button in every Vue and Angular kit, its label kept as the accessible name. Vue kits read it through `rowActionContent` / `RowActionContent` (a vnode, component or glyph); Angular kits through `rowActionIcon` (an `ng-template` or a standalone component).
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
- 39057e0: Vue and Angular tables take `animate`: rows and cards stagger in on mount with the shared timing, and stay still when the reader prefers reduced motion. Both mount the shared high-contrast stylesheet, so focus, selection, dirty cells, validation and find hits keep an outline under forced colors.
  
  Vue compact density shortens rows, the status bar no longer repeats the footer count, and opening a context menu no longer overflows the Vue shell. Compact and comfortable density reach cells inside nested Angular Aria hosts.
  
  The Filters panel can hold only the AND/OR tree, opened on first paint: `[filterFields]="false"` on an Angular table, `fields: false` in Vue's `filters()` options.
  
  `scheduleTick` from `@adapttable/vue/adapter` runs work after Vue commits the DOM and rethrows its failure; every Vue kit and `@adapttable/ai-vue` use it.
  
  A custom mobile card supplied after a Vue table has mounted is drawn.
  
  A Vue table in an error state shows the alert and its retry action in place of the rows.

### Patch Changes

- 0fca0b0: The AI packages run one definition per command.
  
  - Each built-in agent capability is one command object — schema, argument reading, live guide, preview and apply — and the session runs every capability, built-in or custom, through the same registry. `@adapttable/ai/openai` no longer loads the capability guides (about 2.7 KB gzip off that entry).
  - `describe` publishes output schemas matching what each capability returns (`rows.read`'s row envelope, `view.describe`'s columns, filters and pagination, and write results with `partial` approval, `approvalReason` and per-row `results`).
  - Dictation and the assistant run on shared helpers (`createSpeechSession` on `@adapttable/ai/voice`; `tableAssistantInputs`, `tableAssistantFields`, `assistantUndoView` on `@adapttable/ai/assistant`), so React, Vue and Angular behave the same: choosing a dictation language with voice off writes nothing, and a panel inside the table reports a write waiting on the reader as awaiting approval.
  - Approvals answer the keyboard in every binding: Vue's strip above the table moves focus to Reject when a change arrives and Escape rejects it; in Angular, Escape belongs to an open approval dialog and leaves the assistant panel open.
  - The transports and the agent contract are organized into modules by responsibility, with every export unchanged.
- 39057e0: `@adapttable/core/engine`, `/grouping`, `/editing` and `/selection` let an app import one domain without the whole root, and every root import keeps working. `createBasicTableEngine` builds the filter, sort, search and page session on its own.
  
  Grouping no longer throws on rows that carry the basic engine's view, and changing how a group total is formatted no longer recomputes it. A batch of row patches rebuilds its position indexes once instead of once per patch, so streaming updates on large tables do far less work with the same results.
  
  Decisions every binding makes the same way — source refresh, cell text, approval lines, virtualizer fields, column-select names, the built-in English labels — have one implementation in `@adapttable/core/binding`, which also exports `KitEnvironment` and `withKitEnvironment`. `renderedRowsOf` again accepts a tree entry that only carries its row.
  
  `sameItems` compares two lists item by item with `Object.is`, and `retainItems` keeps the previous list while its items are unchanged; both are exported from `@adapttable/core/binding`, with `isRecord` for a plain-record check. `sameRows` is deprecated in favour of `sameItems` and keeps working. `approvalProposalText` writes one proposed change as its review line, and `rowMoveMenuProps` builds a row's move menu and its confirmation, for every binding.
- 0e7e0bb: Feature state is read wherever Vue allows `inject`, including `app.runWithContext`.
- 64069d0: The Vue toolbar lays its controls out in the same order as React and Angular — host content, Filters, Saved views, Columns, then undo, find, display and export — whatever order the features were installed in. In every Vue kit the search icon sits inside the field and the controls sit at the end of the row.
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

## 0.4.1

### Patch Changes

- Updated dependencies [7dee39f]
  - @adapttable/core@3.13.1

## 0.4.0

### Minor Changes

- 5ff3cee: The table takes `onRowClick`, which activates a row or phone card by click, Enter or Space, and `isCellFlashing`, which marks changed cells and card values with `data-flash`. `useChangedCellFlash` from `/stream` tracks the cells a live patch changed, and stays dark for readers who prefer reduced motion.
- 20122b2: The table takes a `searchPlaceholder` prop for the search box, ahead of the `searchPlaceholder` label.
- e21f5a5: The table takes the server tier as props: `data` as the current page with `onQueryChange` fetches each query, described by `total`, `supports`, `aggregates`, `responseKey`, `facetKeys` and `facets`. `mode="frontend"` keeps the table's own processing and makes `onQueryChange` a notice of each change.

### Patch Changes

- b4f2c66: An AND/OR filter-tree condition still waiting for its value no longer acts as a filter: it gets no chip, is not counted on the Filters badge, cannot widen an OR group to every row, and is not sent to a server. `isFilterTreeConditionSet` and `settledFilterTree`, from `@adapttable/core` and `@adapttable/core/query`, give a backend the same rule.
- 2e930c2: A leaf row in a tree is the same height as a parent row, with its text on the row's centre line instead of a few pixels low.
- Updated dependencies [549ee08]
- Updated dependencies [702a702]
- Updated dependencies [7ee7489]
- Updated dependencies [b4f2c66]
- Updated dependencies [e50c6c8]
- Updated dependencies [858ef5b]
  - @adapttable/core@3.13.0

## 0.3.0

### Minor Changes

- e3e40e7: Add `editActivation: "click"` to open a cell's editor on the first click, the way a form field does; set it on the table or in `editing(handler, { editActivation: "click" })`. The default stays a double-click, and Enter and F2 open the editor either way. The rest of a double-click that opened an editor no longer acts inside it, so it never ticks a checkbox or toggles a list.

### Patch Changes

- ffc8540: Opening a cell editor no longer changes the table's layout: the column keeps its width, the row keeps its height, and the editor fits inside its cell in every kit and density.
- Updated dependencies [e3e40e7]
  - @adapttable/core@3.12.0

## 0.2.0

### Minor Changes

- 426d44f: Add `maxHeight` for bounded Vue table/card scrolling and a custom `card` body slot to all Vue kits, supplying prepared native field renderers and editors while retaining selection, expansion and row actions. Preserve active editor focus and text selection through responsive layout changes, and leave focus on explicit layout controls. Expose the neutral `preserveEditorFocusOnLayoutChange` binding helper. Connect React and Angular row-validation failures to the affected native editors.

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
- 2bdf4e3: Narrow select-all-matching scope when the host replaces controlled selected IDs, including when restoring a query and selection together. Preserve the supplied IDs without emitting a selection-change callback, so bulk actions target only those rows.
- Updated dependencies [b33a9ee]
- Updated dependencies [426d44f]
  - @adapttable/core@3.11.0

## 0.1.4

### Patch Changes

- 330566b: Render supplied dictation errors as wrapping alerts below the native composer controls. Keep typing and retries available, and stop active recognition when a React or Angular assistant is dismissed or unmounted.
- d35c348: Align a single-column group caption with its leaf header and values, honor group alignment in Vue renderers, and let pivot configuration zones fill their container with responsive axis panels and a full-width measures panel. Keep explicit group alignment, spanning headers and native kit controls intact.
- Updated dependencies [c201ffb]
- Updated dependencies [d35c348]
- Updated dependencies [d7ddec5]
  - @adapttable/core@3.10.0

## 0.1.3

### Patch Changes

- c8d10ab: Align assistant headers, composers, conversation alignment and viewport placement with the Mantine reference while retaining each adapter's native controls. Correct native dialog offsets, mobile focus handoff and nested shortcuts dismissal.

## 0.1.2

### Patch Changes

- 7bedef1: Keep expanded assistant action details across the transcript width without squeezing reply text, and expose the composer input container for application layout styling. Remove presentation colors from the Angular structural composer.
- 54dd62a: Handle Escape inside modal approval content so every Vue kit settles cancellation as rejection. Preserve nested controls' consumed Escape events and input composition ownership.
- b267b30: Lay out assistant headers, messages and composers through structural chrome, keeping the title, transcript and native controls readable without relying on browser list defaults.
- eaac515: Anchor enabled column resize handles to their own header cells, preserving sticky positioning for pinned columns. Handles no longer overlap at the edge of the page or span the full viewport height.
- Updated dependencies [9213f9a]
  - @adapttable/core@3.9.1

## 0.1.1

### Patch Changes

- 00df62b: Dismiss Element Plus filter popovers on Escape while focus is still on the trigger. Constrain selection columns and provide scrollable filter and column-menu structure. Keep Vue Unstyled overlays adjacent to their triggers, within the viewport and within the table's theme and fullscreen ancestry. Bound filter content before each native vendor surface measures its popup, keeping dismissal visible while fields scroll. Supply shadcn-vue’s scoped border color baseline and size Quasar filter headings for their compact panels.

## 0.1.0

### Minor Changes

- 1946b61: Add Vue column management, header rename, command palettes, context menus,
  Saved Views and controlled side panels across all eight native kits. URL and
  browser-storage layout persistence support reactive destinations and SSR-safe
  hydration; saving or applying a view flushes pending layout and Find state.
  
  Menus preserve native keyboard/typeahead navigation, labels and nested Escape
  handling. Stable anchors and accepted focus survive ordinary rerenders; retired
  callbacks, superseded destinations and disposed owners reject late work. Side
  panels keep valid tab/body associations for opaque and Unicode keys.
- a06027e: Add focused Vue kit factories for grid navigation, Find, range and column
  selection, virtualization, row pinning/reordering, grouping, trees, row details,
  nested tables, summaries, footer renderers, pivoting, formulas, streams and
  sparklines. All eight adapters supply native controls through the shared Vue
  models, including dedicated grouping, movement, status and selection panels.
  
  Preserve controlled updates, authoritative row identity, mobile layouts and
  pinned-column geometry. Release removed row measurements, invalidate delayed
  moves and focus requests when their owner changes, and report grouping/stream
  updates through the current callback. Existing column-selection and nested-table
  aliases remain available alongside the canonical feature paths.
- 7ba801b: Add opt-in filtering, compact header filters, removable filter chips, cell and
  row editing, batch editing and edit history to the Vue binding and all eight
  native kits. Host-owned writes keep drafts, saving state and errors attached to
  the active edit session. Native editors preserve generic row/column inference.
  
  Filter drawers and popovers keep native dismissal, nested Select Escape handling,
  input labels and focus restoration. Retained controls stop acting after their
  field, feature, component or KeepAlive activity is replaced or retired.
- 78f6e38: Add Vue kit standard-feature presets, bulk actions, print and export factories.
  The canonical export entry retains the CSV alias; focused PDF and XLSX entries
  keep format writers out of plain-table, CSV and preset bundles.
  
  Exports follow the active source and ignore late outcomes after replacement or
  retirement. Native bulk confirmations cannot write through a retired owner.
  All data changes remain host-controlled.
- dedb4b1: Introduce the experimental Vue binding and eight native adapters: Unstyled,
  Element Plus, Naive UI, Nuxt UI, Quasar, Reka UI, shadcn-vue and Vuetify.
  Tables support controlled selection, sorting, search, pagination, responsive
  cards, column layout, loading states and host-rendered header actions. Each kit
  renders its own controls and exposes the shared semantic parts and class hooks.
  
  Include localized, keyboard-accessible density choices, RTL layouts, SSR-safe
  controls and native fullscreen ownership. Keep labels on native inputs, table
  headers aligned with selection controls, and checkbox/button colors readable
  without a host CSS reset. The packages require Vue 3.5.0 or newer; Nuxt UI
  requires Vue 3.5.18 or newer. The first release is 0.1.0.
- 2153f11: Add optional Vue agents, conversations and speech input with native assistant
  and approval surfaces in every kit. The binding adapts neutral execution stores,
  host-confirmed controlled updates, KeepAlive suspension and disposal; dedicated
  assistant UI entries remain free of AI runtime dependencies.
  
  Approval widgets can open a full review with Back/Escape focus return and
  controlled expansion. Reviews follow the approval's identity across snapshots;
  receipts expose scoped action/turn undo, blocked explanations, speaker/question
  structure and a dedicated live region. Examples are keyboard-accessible native
  menus. Retained actions retire with their displayed message or conversation.
- 1e47ceb: Expose generic table props, slots and class hooks through
  `@adapttable/vue/adapter`, with structural table Chrome and required native
  control contracts for custom adapters. Add managed panel renderers, shared
  compound presentations and scoped reactive element-ref handoff.
  
  Public types remain nameable from the entry that returns them, including
  focused feature entries. Generic controls and shallow-ref declarations support
  the declared Vue floor; type-only re-exports do not claim runtime values. Native
  Unstyled consumers forward the same contracts. Unused presentation components
  can be removed by consumer bundlers.

### Patch Changes

- 1946b61: Allow `measureLabel` and `pivotPanelZones` to receive aggregation captions so hosts
  can localize pivot measure labels without changing field/aggregation keys or
  configuration. Default captions and authored labels remain unchanged. Vue pivot
  chips and remove controls use the same localized captions as their selector.
- aebbd39: Add optional tree-shape readers to export contexts. React, Angular and Vue all
  and selected exports include loaded descendants across filtered roots/pages;
  page files follow visible expansion. File, hook and request data agree, while
  summary callbacks and page request metadata retain original source-shaped rows.
  
  Headless contexts without shape readers retain conservative membership filtering.
  Runtime tree inventories and server export routes keep their existing behavior.
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
