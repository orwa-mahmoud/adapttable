# @adapttable/angular

## 0.12.0

### Minor Changes

- bc19944: `@adapttable/angular/xlsx` and `@adapttable/angular/pdf` each load only their own writer, and they are the one home of `exportXlsx` and `exportPdf`: `@adapttable/angular/features` no longer forwards them. A native Node import of the XLSX entry no longer reads the 59.2 kB PDF writer.
- 7dbd509: Angular kits ship the feature families: `editingFamily(save)` from `/editing`, `filteringFamily(defs)` from `/filtering` and `columnLayoutFamily()` from `/column-layout`, each passed to `features` as one entry and each on its own entry, so a member imported alone still loads alone. The kit preset is `standardFeatures` with `StandardFeatureOptions`, the same members and options as the React and Vue kits: columns menu, resizing, fitting, density, CSV export, keyboard Find (`findButton: true` adds its toolbar control), fullscreen, multi-sort, header filters and status bar. `standardPreset` and `StandardPresetOptions` are removed.
- 35abf7a: Angular toolbar controls read the state their feature publishes. `injectDensityToolbar`, `injectFullscreenToolbar`, `injectExportToolbar`, `injectPrintToolbar` and `injectUndoRedoToolbar` return the control's state as a signal, and every toolbar entry receives `ToolbarEntrySlotProps` (labels and class map) in place of core's `ToolbarExtrasSlotProps`. Saved views and the Columns menu are toolbar entries (`SAVED_VIEWS_ENTRY`, `COLUMN_MENU_ENTRY` on the new `@adapttable/angular/toolbar` entry) that each kit adds beside its menu, so every kit's template draws one toolbar outlet fed `toolbarEntry`, and the table view no longer carries `toolbarExtras`, `savedViews`, `columnMenu` or `columnMenuProps`. Inside a slot component, `[adaptSlot]` draws in that component's table when `[adaptSlotTable]` is left out. `adapttable migrate-v4` reports the removed names.
- 1ea5a0b: The Angular table view builds a feature's state only while that feature is composed: `commandPalette` and `contextMenu` are `undefined` unless their feature is composed, and `rowMutations` is `undefined` unless row actions wire an add, duplicate or delete handler. The palette's and the menu's props are built by code their features bring (`withCommandPaletteView` and `withContextMenuView` on `@adapttable/angular/adapter`, which every kit's `commandPalette()` and `contextMenu()` apply), so a plain table neither ships nor runs it, and every kit's template draws those regions behind the same check.
- 35a1ec0: Row windowing ships with `virtualize()`. A table that does not compose it no longer bundles the virtualizer: the Unstyled table drops from 95.7 to 87.0 KiB gzip and the lean structural host from 46.8 to 38.0 KiB. `FEATURE_IMPLEMENTATIONS.virtualize` and its `VirtualizeImplementation` type carry the windowing code.
- ee0f202: High-contrast rules load with the features that draw them. Every table adds the base rules (focus, validation, pinned edges) to the page's one stylesheet; cell navigation, find, the editing features, saved views, the side panel, the command palette and the grouping panel each add their own, so a plain table carries 1.2 kB of rules instead of 2.1 kB. A feature, or a host plugin, carries its rules in a `contrast` field.
  
  `FORCED_COLORS_CSS` is removed, and `@adapttable/react/adapter` no longer exports `ForcedColorsStyle` or `ensureForcedColorsStyles`: `FeatureProviders` mounts the rules. `mountForcedColorsStyles` in the Vue and Angular bindings takes a reader of the composed features.
- bee0c9f: `@adapttable/core/binding` no longer re-exports a value that `@adapttable/core` already exports and that the binding entry's own signatures do not name. Import `visibleColumns`, `filterLabel`, `aggregate`, `declaredAggregates`, `computedAggregateKeys`, `autoSizeColumns`, `cellValue`, `conditionToExtra`, `sourceCapabilities`, `treeColumnKey`, `approvalArgumentPairs` and `approvalValueText` from `@adapttable/core`. `adapttable migrate-v4` moves those imports.
  
  `applyTableFeatures` is only on `@adapttable/react/features`. `useTableFeatures` is only on `@adapttable/react/adapter`. `adapttable migrate-v4` moves an import that still uses the other entry.
  
  A kit no longer publishes a `/features` barrel. Import each factory from its own subpath. A React kit's `/features` only forwarded `@adapttable/react/features`, so those imports move there. `adapttable migrate-v4` rewrites both.
  
  A table takes `data` or a `source` and infers no tier from its other props. A server table builds its source with `useServerData` (React, Vue) or `injectServerData` (Angular) and passes it as `source`; the table props `mode`, `onQueryChange`, `total`, `aggregates`, `responseKey`, `supports`, `facetKeys` and `facets`, and React's `DataModeProps`, are gone. `onViewChange` tells a table over `data` what the reader changed. `serverFilterKeys({ columns, filters })` gives a server source the filter keys its first request needs. A table over `data` no longer ships the server tier: the Unstyled table loads 1.8 KiB less up front and 5.9 KiB less in total in each framework. `adapttable migrate-v4` reports every table that passes the removed props.
  
  Filter placement, column rename, and cell cut, paste and fill are options of `filters()`, `headerFilters()`, `columnMenu()` and `cellNavigation()`. A table prop no longer sets them. `isCellFlashing` stays on the table: it marks cells the base already draws. Vue's `DataTable` no longer accepts `onCellCut`, `onCellPaste`, `onCellFill` or `onColumnRename`.
- 636d0ad: A family composes every member of an area in one call and goes into `features` as one entry: `editingFamily(save)` from each kit's `/editing` (cell editing, dirty marks, edit history and undo controls), `filteringFamily(defs)` from `/filtering` (the filter panel and header filters) and `columnLayoutFamily()` from `/column-layout` (columns menu, resizing and fitting). Each family has its own entry, so a member imported alone still loads alone. `standardFeatures` is built from the column-layout and filtering families. A Vue or Angular kit's `/features` entry gathers the families with the other factories.
- 8af4736: A feature's `setup(host)` only registers; what outlives a render goes in its `mount(context)`, which returns what releases it. Every binding keeps a mounted feature by id: declaring it again with new options, inline included, keeps the resource and hands `context.feature()` the new declaration, and only removing the feature, changing its `dependencies` or unmounting the table releases it, exactly once. A render the framework discards acquires nothing, and a failed mount rolls back what its pass acquired. React publishes the table runtime and its feature ids in layout effects, so AI and event callbacks read the last committed table; `PublishTableRuntime` is the chrome's publisher. `createFeatureMounts` and `composeMounts` on `@adapttable/core/binding` are the shared lifecycle. A `setup` that returns a cleanup is refused, and `onDispose` is no longer on the feature host. Vue's and Angular's table agent follows its latest declaration's options. `adapttable migrate-v4` reports `onDispose` calls.
- 4effc96: An update keeps a row's id: `updateRow` whose changes give the row a new id is refused with an error naming `rekeyRow`. `rekeyRow(id, changes)` changes the id in place, a later patch in the batch finds the row by its new id, and an id another row already holds throws `RowIdConflictError` without touching the rows. `rowRekeys(log)` maps each row's id before a batch to its id after it, and a rekeyed row's update event carries `from`. `applyRowPatches(…, { rekeyUpdates: true })` reads stored or sent id-changing updates as rekeys; row patch streams apply their frames that way (`STREAMED_ROW_PATCHES`) and accept `rekey` frames. `@adapttable/angular` re-exports `rekeyRow` and `RowIdConflictError`. In React, Vue and Angular, a rekey moves the selection (a host-held selection is asked to move), the pinned rows, the open row details, the expanded tree nodes, the focused cell and an open editor's draft, dirty marks, validation and save errors and conflict question to the new id in the change that brought the patched data; new data that is not a patch of the old moves nothing. A row reorder checks the dragged and target rows by id in every binding and hands the host each row as it is at the drop. Every editing store takes `rekey(moves)`; `onRowRekeys`, `onRowRekeyMoves`, `rowRekeyMoves`, `rekeyTableRows`, `commitRowRekeys`, `rekeyedIds` and the id remappers on `@adapttable/core/binding` are what a binding carries a rekey with.

### Patch Changes

- b94b20c: Every development warning in `@adapttable/angular` is guarded by `ngDevMode`, so an `ng build` production application drops the checks and their messages and a development build still prints them. A headless Angular table measures 27.1 KiB gzip instead of 27.3 and an Angular Unstyled table 86.7 instead of 87.0.
- 06e676e: An Angular table and every stateful part inside it, kit parts included, share the table's one store: the shell provides `TABLE_STORE` from `@adapttable/angular`, where the column layout, selection, editing, focus, expansion and URL state read it.
- 72b4cde: Rows without cell spans share one list of cell views, so each body refresh builds one list instead of one per drawn row.
- 536aa89: Live-update conflict handling loads when the first edit opens. A table that edits carries a small holder instead of the conflict store, about 0.5 KiB gzip less in every framework, and the store arrives before any conflict can. `createDeferredEditConflictStore` and `loadEditConflictStore` replace `createEditConflictStore` on `@adapttable/core/binding` and `@adapttable/core/editing`; the main-entry alias is gone.
- cb9f9db: `@adapttable/core`'s main entry serves the names a table uses. Binding and kit machinery comes from `@adapttable/core/binding`, and the editing, pivot, formula, grouping, stream and selection names from their own entries: `@adapttable/core/editing`, `/pivot`, `/formula`, `/grouping`, `/stream` and `/selection`. Importing every core export drops from 107.2 to 47.2 KiB gzip. The query codecs and engine constructors stay on the main entry. `@adapttable/react`'s kit machinery (the chrome, column, filter-chip and body-data hooks and their types) comes from `@adapttable/react/adapter`, which also exports `columnHeaderLabel` and `exportViewFromChrome`.
- da4baa0: The Excel and PDF writers load on the first export instead of with the table, and start loading in the background once the table is mounted, so an export still works after the connection drops. A Vue table with `exportPdf` loads 8.1 KiB gzip less up front and one with `exportXlsx` 2.4 KiB less; either now costs 0.2 KiB more than CSV export. A writer that cannot load is a failed export — no download, no `onAfterExport`, the button stays usable — and the next export loads it again. `deferredXlsxWriter`, `deferredPdfWriter` and `deferredExportWriter` give the same behaviour to a writer you configure yourself.
  
  `xlsxWriter` and `buildTableXlsx` are no longer on the main entry; import them from `@adapttable/core/xlsx`.
- 633e23c: Find in table reads only the previous hits when a query gets more specific, instead of every loaded cell on each keystroke. The matches are the same.
- ed8a86d: `@adapttable/i18n` loads no label data from its root: `getDirection`, `isRtlLocale`, `hasLocale` and the on-demand `loadLabels` read 2 files (6 kB) in Node instead of 23 (380 kB). `getLabels` and `locales` come from `@adapttable/i18n/catalog`, one language alone from `@adapttable/i18n/locales/<tag>` (21 kB for Arabic), and `@adapttable/i18n/load` is part of the root. A tag that names a script picks the preset written in it: `zh-Hant` and `zh-Hant-TW` read Traditional Chinese, `zh-Hans` Simplified; `az-Arab` and `pa-Arab` are right-to-left, `ar-Latn` and `ks-Deva` left-to-right.
- a96cfee: A kit locale whose labels fail to load no longer raises an unhandled promise rejection in React and Vue: the table keeps its current labels, logs the error with the locale, and loads the language on the next locale change or mount. In Angular the server-rendering task for the labels settles on a failure as it does on success.
- 31e5510: With entrance animation off or reduced motion preferred, the table no longer searches its rows for animation marks at mount and on every refresh.
- fbc52e8: Feature notices and disabled-control reasons take their text from the resolved labels only, in every locale: `collectFeatureNotices`, `chromeFeatureNotices` and `resolveExportDisabledReason` take resolved labels, `capabilityReason(capability, labels)` reads the `"grouping"` or `"exportScope"` sentence from them, and React's `useExportHandler(handler, labels)` requires them. A plain Unstyled table measures 64.2 KiB gzip instead of 64.4. Every other built-in string a model or chrome falls back to is its label group's default, so English lives only in the label groups: `defaultPendingRows` is gone, React's assistant shortcuts menu reads "Shortcuts" like Vue and Angular, and its revoke button names the capability ("Ask about editing cells again").
- ffd1a07: Each editing feature carries only its own code. Cell editing no longer brings the row form, the batch or edit history: on the Unstyled kit a table with only `editing` adds 10.8 KiB gzip instead of 19.3, `editHistory` alone 1.7 KiB and `dirtyIndicators` 0.4 KiB. `dirtyIndicators` only turns the marks on; the editing feature it marks brings the editing code, in React and Angular alike. Kits build each editing export with its own call through `createAdapterEditing`, `createAdapterRowEditing`, `createAdapterBatchEditing`, `createAdapterEditHistory` and `createAdapterUndoRedoButtons`.
- eb084d0: When a table's source is replaced, the runtime view and the agent read the new source's rows and columns at once, on every scope, instead of reading page rows from the old one in React. The released reader keeps answering from its own last render, and an ordinary update keeps the same handle.
- 5b7bc3c: The runtime view a feature above the table reads is built the first time it is read and kept until the next render, so a table nobody reads never builds it, and reading a rendered row no longer builds it. `TableRuntimePublisher` stages each render with `stage(chrome, actions)` and serves `view()` and `visibleRows()`; React's `usePublishTableRuntime(reader)` takes a `TableRuntimeReader` of `rows()`, `labels()` and `view()`.
- b36d160: A React table clears its selection when only the advanced filter tree changes, so a row the new filter hides no longer stays selected; React and Angular reset on one shared key, which reads the filter tree without serializing its values. A React table with selection off reads no row ids for it; `useSelection` takes `enabled: false` for the same in a headless table.
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

## 0.11.0

### Minor Changes

- 6bee472: Filters can be composed with only the widgets a table draws. `filtersWith([textFilterWidget, rangeFilterWidget])` from any kit's filters entry is the `filters` feature with those fields alone, so the other widgets stay out of the bundle: a text-only filter form is 4.4 KiB lighter on MUI, 1.3–2.4 KiB on the Vue kits and 4.8 KiB on the Angular native kit (min+gzip). Each kit exports `textFilterWidget`, `booleanFilterWidget`, `selectFilterWidget`, `multiSelectFilterWidget`, `checklistFilterWidget` and `rangeFilterWidget`; a filter whose widget was not composed throws, naming the widget to add. `filters` keeps drawing every widget.

### Patch Changes

- Updated dependencies [6bee472]
- Updated dependencies [8c8eb0a]
  - @adapttable/core@3.16.0
  - @adapttable/i18n@3.4.2

## 0.10.0

### Minor Changes

- 75dbf94: `ActionAiOptions`, the type of a row or bulk action's `ai` options, is exported from `@adapttable/react` and `@adapttable/angular`, as it already is from `@adapttable/vue`.
- 2582d80: A headless table that keeps its view state in memory no longer bundles the URL code. React and Vue gain `useLocalFrontendData` and `useLocalTableViewState`, Angular `injectLocalFrontendData` and `injectLocalTableViewState`, over core's `createLocalTableViewStore`. Search, sort, filters, grouping and paging behave as with `urlSync: false`; the table measures about 2.3 KiB smaller in React and Vue and 2.5 KiB smaller in Angular.

### Patch Changes

- fb0e3af: Doc comments name a link target only when the entry point that publishes the comment exports it; any other name is written as code. Editor hovers and the API reference show no broken links.
- Updated dependencies [308e2f8]
- Updated dependencies [fb0e3af]
- Updated dependencies [e8d3443]
- Updated dependencies [2582d80]
- Updated dependencies [55d0118]
- Updated dependencies [e1bad04]
  - @adapttable/core@3.15.0
  - @adapttable/i18n@3.4.1

## 0.9.0

### Minor Changes

- 1ee0ea3: A table bundles only the code of the features it composes. Editing, edit history, find, CSV export, filters, header filters, grouping, the grouping panel, row reorder, row pinning and the tree each bring their implementation on the feature, so every Angular kit's plain table is about 32 KiB smaller gzipped (the unstyled kit: 129.0 KiB to 97.4 KiB). New exports: `withFeatureImplementation`, `featureImplementation` and the `FEATURE_IMPLEMENTATIONS` keys with their implementation types.
- 39057e0: Angular kits draw the desktop table and the phone cards through one structure, `AdaptDesktopStructure` and `AdaptMobileStructure`. Each kit still supplies its own table, rows, cells, cards and controls, and `AdaptDesktopTable` and `AdaptMobileCards` keep the same inputs.
  
  `injectTableSurfaceHost` from `@adapttable/angular/adapter` composes a lean structural table from the features it is given and returns a `TableSurfaceView`, with `editingBundleFor` and the surface tokens in `@adapttable/angular`; kit tables keep typing their view as `TableView`. `AdaptHeaderTemplate` and `AdaptHeaderTemplateSlot` let a kit declare its header cell inside its table template.
  
  `AdaptDesktopTableHost` and `AdaptMobileCardsHost` carry a kit table's inputs and scroll box, `AdaptTableSurface` is the base the structures share, `provideAdaptTableState()` provides the find, palette and context-menu state a kit's data table needs, and `scrollBoxStyle` is the scroll box's style rule.
  
  The Angular kits no longer list `@adapttable/core` as a dependency; their types name `@adapttable/angular`.
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
- 64069d0: A row action with an `icon` renders as an icon-only button in every Vue and Angular kit, its label kept as the accessible name. Vue kits read it through `rowActionContent` / `RowActionContent` (a vnode, component or glyph); Angular kits through `rowActionIcon` (an `ng-template` or a standalone component).
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
- 0fca0b0: The AI packages run one definition per command.
  
  - Each built-in agent capability is one command object — schema, argument reading, live guide, preview and apply — and the session runs every capability, built-in or custom, through the same registry. `@adapttable/ai/openai` no longer loads the capability guides (about 2.7 KB gzip off that entry).
  - `describe` publishes output schemas matching what each capability returns (`rows.read`'s row envelope, `view.describe`'s columns, filters and pagination, and write results with `partial` approval, `approvalReason` and per-row `results`).
  - Dictation and the assistant run on shared helpers (`createSpeechSession` on `@adapttable/ai/voice`; `tableAssistantInputs`, `tableAssistantFields`, `assistantUndoView` on `@adapttable/ai/assistant`), so React, Vue and Angular behave the same: choosing a dictation language with voice off writes nothing, and a panel inside the table reports a write waiting on the reader as awaiting approval.
  - Approvals answer the keyboard in every binding: Vue's strip above the table moves focus to Reject when a change arrives and Escape rejects it; in Angular, Escape belongs to an open approval dialog and leaves the assistant panel open.
  - The transports and the agent contract are organized into modules by responsibility, with every export unchanged.
- 2ecf579: The lean table host follows its features after mount: adding, removing or adding again cell navigation, editing or grouping updates its grid, editing and grouping state and the body built over them.
- 68db6b2: Cell editors hand their focus target to the table after they render and again whenever it changes, and the editor layer and ngx-bootstrap's pager links attach their browser listeners only in the browser.
- 39057e0: `@adapttable/core/engine`, `/grouping`, `/editing` and `/selection` let an app import one domain without the whole root, and every root import keeps working. `createBasicTableEngine` builds the filter, sort, search and page session on its own.
  
  Grouping no longer throws on rows that carry the basic engine's view, and changing how a group total is formatted no longer recomputes it. A batch of row patches rebuilds its position indexes once instead of once per patch, so streaming updates on large tables do far less work with the same results.
  
  Decisions every binding makes the same way — source refresh, cell text, approval lines, virtualizer fields, column-select names, the built-in English labels — have one implementation in `@adapttable/core/binding`, which also exports `KitEnvironment` and `withKitEnvironment`. `renderedRowsOf` again accepts a tree entry that only carries its row.
  
  `sameItems` compares two lists item by item with `Object.is`, and `retainItems` keeps the previous list while its items are unchanged; both are exported from `@adapttable/core/binding`, with `isRecord` for a plain-record check. `sameRows` is deprecated in favour of `sameItems` and keeps working. `approvalProposalText` writes one proposed change as its review line, and `rowMoveMenuProps` builds a row's move menu and its confirmation, for every binding.
- 39057e0: Tables follow their UI library's app-wide settings. An explicit `dir`, `labels`, `density` or `size` still wins, and a setting the app left at its default stays with the page:
  
  - Ant Design: ConfigProvider direction, locale, component size and `theme.token.motion`.
  - Chakra: `LocaleProvider`. Mantine and Base UI: `DirectionProvider`. MUI: a right-to-left `theme.direction`.
  - Element Plus: `ElConfigProvider` locale and size. Naive UI: `n-config-provider` locale, `rtl` and table size. Nuxt UI: a parent `UApp` locale and `dir`. Quasar: the active language pack and its `rtl`. Reka UI and shadcn-vue: a parent `ConfigProvider`'s direction and locale. Vuetify: the locale, its RTL map and `defaults.global.density`.
  - Angular Material, Angular CDK, Angular Aria and Spartan: CDK `Directionality`. NG-ZORRO: `Directionality`, a provided `NZ_I18N` locale and `NZ_CONFIG` table size. ng-bootstrap: `NgbConfig.animation`. Taiga UI: `TUI_LANGUAGE` and reduced or disabled animation.
  
  A followed locale loads only that language's labels, the first time it is seen, so a plain table carries no label data. Server rendering and the first client render show the current labels until the language arrives; pass `labels` to render it from the first paint. `@adapttable/i18n/load` exports `loadLabels(locale)`, and `useLocaleLabels` in `@adapttable/react/adapter` and `@adapttable/vue/adapter` turns a library locale into those labels for a kit.
- 64069d0: Pinned columns paint their kit's surface in every kit, header and rails included, so cells scrolling beneath them no longer show through. In the Columns menu, a pinned column's pin button is filled with the kit's primary colour. Angular marks the expand, reorder and selection rails `data-pinned` while they stick with the start-pinned columns, as Vue does.
- 0fca0b0: A table redraws only what changed.
  
  - Selecting one row or editing one cell redraws that row alone in React, Vue and Angular. An edit the host writes back into `data` redraws only the edited row, with cell navigation and with selection on.
  - React's `useFrontendData`, `useServerData` and `useTableData` return the same source object while nothing in it changes, and a table with a column layout keeps its columns across renders that leave them unchanged, so a host re-rendering for its own state no longer re-renders every row.
  - Vue draws each body row and card in a component of its own (`tableRowView`, `keepTableControls`, `NO_CLASS_NAMES`); `rowAttrs` and `cardAttrs` take an optional `state` whose `selected` is used in place of the table's selection.
  - Angular writes row, cell and control attributes only when their value changes; a controlled `checked` or `value` the element changed is still put back.
  - A Vue table's sync option copy reads the raw record, so writing one option does not schedule another copy of the same record.
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

## 0.8.1

### Patch Changes

- Updated dependencies [7dee39f]
  - @adapttable/core@3.13.1

## 0.8.0

### Minor Changes

- 5b8adbd: The table takes `stickyHeader` and `stickyTop` inputs. A sticky header stays in view inside a `maxHeight` box, in a table that scrolls sideways, or on the page below an app bar of `stickyTop` pixels, and pinned rows sit below it.
- d9bca8c: The table takes `locale`, `mobileBreakpoint` and `searchDebounceMs` inputs. With `locale`, columns that read by `i18n` path show, filter, search and sort that locale's field.

### Patch Changes

- 46f6212: A table whose sized columns outgrow its box scrolls sideways inside the table instead of widening the page.
- f009a47: Pinned summary rows read semibold, so a total stands apart from the rows of data around it.
- a3f3c45: A table whose columns set a width keeps those widths and scrolls sideways when they do not fit, instead of squeezing them; resizing a column widens it.
- 91ea216: In the inline assistant panel the composer stays at the end of the panel instead of sticking to the bottom of the screen over the conversation and the approval review. The floating window and the sheet still hold it at their bottom edge.
- b4f2c66: An AND/OR filter-tree condition still waiting for its value no longer acts as a filter: it gets no chip, is not counted on the Filters badge, cannot widen an OR group to every row, and is not sent to a server. `isFilterTreeConditionSet` and `settledFilterTree`, from `@adapttable/core` and `@adapttable/core/query`, give a backend the same rule.
- 2e930c2: A leaf row in a tree is the same height as a parent row, with its text on the row's centre line instead of a few pixels low.
- Updated dependencies [549ee08]
- Updated dependencies [702a702]
- Updated dependencies [7ee7489]
- Updated dependencies [b4f2c66]
- Updated dependencies [e50c6c8]
- Updated dependencies [858ef5b]
  - @adapttable/core@3.13.0

## 0.7.0

### Minor Changes

- e3e40e7: Add `editActivation: "click"` to open a cell's editor on the first click, the way a form field does; set it on the table or in `editing(handler, { editActivation: "click" })`. The default stays a double-click, and Enter and F2 open the editor either way. The rest of a double-click that opened an editor no longer acts inside it, so it never ticks a checkbox or toggles a list.

### Patch Changes

- ffc8540: Opening a cell editor no longer changes the table's layout: the column keeps its width, the row keeps its height, and the editor fits inside its cell in every kit and density.
- Updated dependencies [e3e40e7]
  - @adapttable/core@3.12.0

## 0.6.2

### Patch Changes

- 0f1df5a: Restore Angular 20 template compatibility by keeping conditional aliases on primary `@if` blocks. Preserve component renderers, filters, row details, mobile cards and editing branches when consuming the built packages with the minimum supported compiler.

## 0.6.1

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

## 0.6.0

### Minor Changes

- 66aa1f8: Make descending sorting reachable from mobile cards with each kit's native direction button. Preserve the selected column, localized labels, keyboard activation and shared URL/Saved Views state.
  
  The Angular binding adds the protected `AdaptDataTableShell.sortDirection()` transition for native adapter templates.

### Patch Changes

- 019364c: Refresh rendered summary rows and cards when the host replaces, removes or restores its summary callback. Pivot grand totals now stay in sync with aggregation changes without rebuilding the table.
- 753873b: Expose rejected batch saves as accessible batch-level status messages and mark pending batch saves busy. Preserve drafts and native retry/cancel controls, including partial-save reconciliation without resubmitting accepted rows.
- 330566b: Render supplied dictation errors as wrapping alerts below the native composer controls. Keep typing and retries available, and stop active recognition when a React or Angular assistant is dismissed or unmounted.
- d35c348: Align a single-column group caption with its leaf header and values, honor group alignment in Vue renderers, and let pivot configuration zones fill their container with responsive axis panels and a full-width measures panel. Keep explicit group alignment, spanning headers and native kit controls intact.
- d7ddec5: Keep row-save failures visible through native React and Angular row actions. Preserve drafts for retry or cancel, and include commit transitions in the row memo signature so pending and failed saves repaint without another edit.
- Updated dependencies [c201ffb]
- Updated dependencies [d35c348]
- Updated dependencies [d7ddec5]
  - @adapttable/core@3.10.0

## 0.5.2

### Patch Changes

- c8d10ab: Align assistant headers, composers, conversation alignment and viewport placement with the Mantine reference while retaining each adapter's native controls. Correct native dialog offsets, mobile focus handoff and nested shortcuts dismissal.

## 0.5.1

### Patch Changes

- 7bedef1: Keep expanded assistant action details across the transcript width without squeezing reply text, and expose the composer input container for application layout styling. Remove presentation colors from the Angular structural composer.
- 29ff08e: Keep assistant input-container and modal-content part markers on equivalent structural elements across React, Angular and Vue.
- Updated dependencies [9213f9a]
  - @adapttable/core@3.9.1

## 0.5.0

### Minor Changes

- 7e33aa2: Organize the Angular 0.5 binding around canonical public entries: application
  hooks, column/rendering contracts, composition and `AdaptCellTemplate` at the
  root; headless factories/options under `/features`; structural Chrome, kit models,
  directives and controllers under `/adapter`. Specialized formula, pivot, router,
  sparkline and stream entries retain their declaration and DI-token identities.
  
  All nine native kits and Angular AI consume those entries; kit feature imports
  remain unchanged. Custom renderers/adapters must update binding imports using
  the migration guide. Each entry re-exports the public types its signatures return.
- f7f62c6: Allow Angular column `headerActions` to render host templates or components,
  alongside plain text. All nine native kits pass the current header context and
  place the action outside the sortable caption. Export `AdaptHeaderActions` for
  custom adapter structure. Header actions appear in desktop headers; mobile cards
  keep their existing presentation.
- f81d849: Let Angular row selection follow live source capabilities and reset keys while
  preserving host-controlled IDs and selection across paging/sorting. Current
  cell-range callbacks receive changes; attaching a callback observes the current
  range without replaying unchanged ranges to replacements.
  
  Virtualized bodies react when `maxHeight` changes between element and page
  scrolling without replacing the table or feature runtime. Live direction updates
  reach command palettes and compact headers. Browser-only controls and overlays
  respect the Angular server platform, including window-like server globals.
  Retired row/bulk controls and delayed confirmations cannot start host writes or
  clear a replacement selection. Side-panel declarations retain logical start/end.
- 32e1255: Keep Angular native filter cards and toolbar menus within the viewport on phones
  and in RTL layouts. Material filters can flip above a low trigger, retain native
  placement on rendered-size changes and scrollbar gutters, and scroll their body
  while headers/actions remain visible. The optional `injectPopoverSpace`
  `allowAbove` getter preserves existing below-only defaults.
  
  Material Clear all labels fit a text button; resize handles keep their 48px
  native targets inside the header. Aria, CDK and Unstyled menus cap/flip within the
  viewport, and Taiga UI menus preserve readable name fields and a viewport gutter.
  NG-ZORRO, ngx-bootstrap and Taiga UI restore name-field focus after saving.
  Palettes handle Escape and Tab from command buttons; rename focus work retires
  with its owner. Spartan header filters follow live inherited writing direction.

### Patch Changes

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

## 0.4.0

### Minor Changes

- 089d5d5: Share Angular table orchestration and desktop, mobile, filter, column-menu and group models through the binding. All nine adapters inherit the shared signals while retaining their native controls, templates, overlays, styling hooks and public table inputs and outputs. Export the shared model bases and view contracts for adapter authors, and preserve existing adapter type imports as re-exports.
- 0a9cb40: Keep native Angular filter cards beneath their triggers with readable fields,
  scrolling bodies and reachable dismissal. Correct native portal coordinates
  and RTL alignment, preserve each kit's controls and themes, and refine table
  toolbars and Material fields through the supported kit tokens. Export
  `injectPopoverSpace` so adapters share viewport measurement without sharing
  surfaces, positioning or controls.
  
  Keep Angular assistants in floating native windows with usable phone sheets,
  readable titles, growing composers and nonblocking tooltip overlays. Preserve
  native search groups and icons, drawer geometry, and accessible filter counts.
  
  Keep Unstyled and Aria text filter controls paired without relying on
  platform-specific native input widths.
- 8d1e749: Correct native control labels, separator and list-item semantics, and keyboard scroll-region metadata. Preserve established Angular binding names and signal access while removing alias declarations. Share live bulk-action coordination, consolidate CSS rules, and simplify re-exports and controller code without changing subscription snapshots or filter memo invalidation.

### Patch Changes

- Updated dependencies [143d5bf]
- Updated dependencies [8d1e749]
  - @adapttable/core@3.8.1

## 0.3.0

### Minor Changes

- 6fd7108: Add signal-based controllers for local, server and Angular Query tables; Router/URL state, realtime updates and SSR; and structural Chrome for grouping, trees, mobile cards, virtualization, editing, selection, filtering, menus, export, saved views and assistants. Add `/formula`, `/pivot`, `/router`, `/sparkline` and `/stream` entry points. Core owns table behavior, and kit-provided slots supply visible controls.
  
  Controlled tree expansion, row pinning and command-palette visibility accept host signals. Registered custom filters render live Angular templates/components in forms and header filters. Replacing sources, features or URL inputs updates the mounted table, retires obsolete behavior and preserves unrelated state. Controlled density changes are reported to the host.

### Patch Changes

- Updated dependencies [42a4349]
  - @adapttable/core@3.8.0

## 0.2.0

### Minor Changes

- 2472d0d: The Angular binding composes features with slots. An `AdaptTableFeature` can
  now `apply` configuration and `renders` components into named slots, drawn by
  `AdaptSlot`; `extendFeature` lets a kit add its own controls to a core
  feature. New for kits and hosts:
  
  - column layout: `ColumnLayoutOptions` on `injectDataTable`, the table's
    `layout` signal, `injectColumnDrag` and `injectColumnRenameEditor`;
  - filters: `filterRuntimeFor`, `filterChipsFor`, `filterOptionsFor`, the
    field widgets `textFilterFor`, `rangeFilterFor` and `booleanFilterFor`, and
    the `AdaptFilterTreeChrome` and `AdaptChecklistChrome` structures that draw
    a kit's own controls;
  - actions: `injectBulkActionRunner` and `rowActionsFor`;
  - toolbar: `injectDensity`, `injectFullscreen`, `injectExportCsv`,
    `injectSavedViews` and `urlAdapterFor`;
  - `AdaptControl` and `AdaptIcon` for drawing kit controls and core glyphs.
- 986711c: The Angular binding gains what a full table needs beside its rows:
  `injectRowSelection` (row selection with the checkbox attributes),
  `injectGridFocus` (keyboard cell navigation over core's grid-focus
  controller) and `AdaptLiveRegion` (a polite, visually hidden live region).
  `injectDataTable` now takes a `selection` and reports the body region, the
  empty-state variant, the pager's pages and page sizes, loading more rows of
  an infinite list, the card attributes and the status sentence a sort or a page speaks; `AdaptAttrs` applies key,
  focus and mouse handlers, the `checked` and `indeterminate` properties and
  a `ref`.

### Patch Changes

- d6e065c: Core owns the rest of what a second binding would otherwise copy from React. `@adapttable/core/binding` gains the state shapes the binding hooks return (`SelectionState`, `GridFocusState`, `TreeExpansionState`, `RowPinningState`, the URL-state results, `UseTableDataResult` and others), the `DENSITY_STATE` and `ROW_REORDER` keys with their state types, and the column-default and same-rows helpers (`resolveColumnDefaults`, `resolveColumnHeaders`, `columnPathText`, `sameRows`). `@adapttable/core` gains the column menu's drag-and-drop rules and state (`createColumnDragController`, `startColumnDrag`, `acceptColumnDrag`, `dropColumn`, `columnReorderKeyDown`), and `@adapttable/core/formula` the formula URL-state result. `@adapttable/ai` owns `TABLE_AGENT_STATE`.
  
  `@adapttable/react`, `@adapttable/ai-react` and `@adapttable/angular` re-export or call these under their existing names; their public APIs and behaviour are unchanged.
- Updated dependencies [d6e065c]
- Updated dependencies [643545d]
- Updated dependencies [ed815b3]
- Updated dependencies [96e5cc0]
  - @adapttable/core@3.7.0

## 0.1.0

### Minor Changes

- 5c9a865: New package: `@adapttable/angular`, the headless Angular binding (Angular 20 and newer). Core's stores become signals: `injectFrontendData` is the in-memory tier, `injectTableUrlState` the URL-synced view state, and `injectDataTable` the headless table with its attribute getters. `ColumnDef` renders cells, headers and footers with an `ng-template` or a standalone component, and `provideAdaptTableFeatures` composes features through dependency injection. It draws no controls; the markup is the host's.

### Patch Changes

- Updated dependencies [4613ab6]
- Updated dependencies [73d62b5]
- Updated dependencies [8c6aeda]
- Updated dependencies [6bec4e8]
- Updated dependencies [1bce1a4]
  - @adapttable/core@3.6.0
