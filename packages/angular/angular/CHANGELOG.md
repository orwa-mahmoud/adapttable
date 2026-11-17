# @adapttable/angular

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
