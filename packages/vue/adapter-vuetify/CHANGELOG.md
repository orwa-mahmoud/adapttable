# @adapttable/vuetify

## 0.4.1

### Patch Changes

- Updated dependencies [2582d80]
  - @adapttable/vue@0.6.0

## 0.4.0

### Minor Changes

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

### Patch Changes

- 0fca0b0: Editing, filtering and layout behave the same in every framework.
  
  - Row editing and batch editing apply `validateRow` in React and Angular as in Vue: a refused row is not saved and its message shows. `rowEditorControl` and `batchEditorControl` are on `@adapttable/core`.
  - The "no results" view's "Clear all" clears the search as well as the filters (`clearSearchAndFilters` on `@adapttable/core/binding`, the React table chrome and the Angular table).
  - A pinned column stays put while the table scrolls sideways, past the expand, reorder, selection and actions columns at their rendered widths; in Vue those columns stick too, and an Angular table's minimum width holds them, so widening a column scrolls instead of squeezing. New: `readRailWidths` and `observeRailWidths` on `@adapttable/core/binding`, `railCellAttrs` and `TableRail` on `@adapttable/vue/adapter`.
  - A Vue row action that opens the row form (`editsRow`) renders only where row-mode editing gives it a form. Material's fill handle stays above a cell's content, and its saved-views panel fits a 320px screen with icon buttons. Vuetify's compact rows are 36px, with row actions on one line. Angular CDK cells take 6px of block padding when comfortable and 4px when compact.
  - In Vue, Ctrl or Cmd+Z on a control inside a cell undoes the last committed edit; an open editor keeps its own keys.
  - React's grouping panel shows a group total the app computes as the app set it.
  - ngx-bootstrap's edit activator fills its cell, so a double-click anywhere in a wrapped row opens the editor.
  - An editable cell taller than one line grows its edit button instead of spilling past it in Angular Material, Vuetify and shadcn-vue.
- 64069d0: Pinned columns paint their kit's surface in every kit, header and rails included, so cells scrolling beneath them no longer show through. In the Columns menu, a pinned column's pin button is filled with the kit's primary colour. Angular marks the expand, reorder and selection rails `data-pinned` while they stick with the start-pinned columns, as Vue does.
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
- a1638fa: Every Vue kit component declares its prop defaults by destructuring `defineProps`, with the same defaults as before.
- 64069d0: The Vue toolbar lays its controls out in the same order as React and Angular — host content, Filters, Saved views, Columns, then undo, find, display and export — whatever order the features were installed in. In every Vue kit the search icon sits inside the field and the controls sit at the end of the row.
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
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

## 0.3.3

### Patch Changes

- @adapttable/vue@0.4.1

## 0.3.2

### Patch Changes

- Updated dependencies [b4f2c66]
- Updated dependencies [2e930c2]
- Updated dependencies [5ff3cee]
- Updated dependencies [20122b2]
- Updated dependencies [e21f5a5]
  - @adapttable/vue@0.4.0

## 0.3.1

### Patch Changes

- 39b2e49: Select cell editors take keyboard focus when they open, so typing, arrow keys and Escape work at once and Escape returns focus to the cell.
- ffc8540: Opening a cell editor no longer changes the table's layout: the column keeps its width, the row keeps its height, and the editor fits inside its cell in every kit and density.
- Updated dependencies [e3e40e7]
- Updated dependencies [ffc8540]
  - @adapttable/vue@0.3.0

## 0.3.0

### Minor Changes

- 426d44f: Add `maxHeight` for bounded Vue table/card scrolling and a custom `card` body slot to all Vue kits, supplying prepared native field renderers and editors while retaining selection, expansion and row actions. Preserve active editor focus and text selection through responsive layout changes, and leave focus on explicit layout controls. Expose the neutral `preserveEditorFocusOnLayoutChange` binding helper. Connect React and Angular row-validation failures to the affected native editors.

### Patch Changes

- 07b4440: Improve mobile cards with responsive field tiles, clearer identity and action sections, native kit surfaces, larger mobile action targets, and readable light and dark theme labels. Preserve automatic mobile cards and the explicit horizontal table option. Fix horizontal table scrolling in Reka UI and mobile action contrast in Taiga UI. Mobile selection, Save/Cancel and hierarchy controls also receive comfortable native touch surfaces. Restore visible loading placeholders and shared loading parts across Angular kits.
- Updated dependencies [b33a9ee]
- Updated dependencies [426d44f]
- Updated dependencies [2bdf4e3]
  - @adapttable/vue@0.2.0

## 0.2.0

### Minor Changes

- d9f78ab: Add an optional `./features` entry collecting each kit's native feature factories and their existing signatures. Preserve individual feature subpaths and keep optional composition out of the base DataTable graph.

### Patch Changes

- d35c348: Align a single-column group caption with its leaf header and values, honor group alignment in Vue renderers, and let pivot configuration zones fill their container with responsive axis panels and a full-width measures panel. Keep explicit group alignment, spanning headers and native kit controls intact.
- Updated dependencies [330566b]
- Updated dependencies [d35c348]
  - @adapttable/vue@0.1.4

## 0.1.3

### Patch Changes

- c8d10ab: Align assistant headers, composers, conversation alignment and viewport placement with the Mantine reference while retaining each adapter's native controls. Correct native dialog offsets, mobile focus handoff and nested shortcuts dismissal.
- Updated dependencies [c8d10ab]
  - @adapttable/vue@0.1.3

## 0.1.2

### Patch Changes

- 62c9b3f: Keep editable Vue cell values as their accessible names, with editing instructions provided as descriptions. Reduce button chrome on Vue Unstyled, Element Plus, Reka UI and Nuxt UI cell activation controls, and align the native Vue search icon with its input.
  
  Give unlabeled mobile card values the full row width and clear heading emphasis in all eight Vue adapters.
  
  Restore visible keyboard focus on Angular editable cells without resetting the focus styles supplied by their native controls.
  
  Arrange Vue grouping and aggregation controls in compact, responsive rows with visible section labels, bounded selects, and borderless aggregation pickers. Preserve each kit's own controls and consumer class hooks. Give Element Plus column-menu icon buttons usable hit areas and keep Quasar resize handles visually light without reducing their drag targets.
  
  Keep Angular aggregation labels, operations and removal controls aligned, and add spacing and a visible grouping label across all nine adapters.
  
  Expose stable, visible grouping insertion targets during pointer drags and a clearly marked removal target in Vue and Angular adapters. Respect kit theme colors and highlight the current destination without shifting the chips. Restore native pointer dragging from Naive UI buttons, including grouping handles and sortable headers.
  
  Style active Vue filters as wrapping chips instead of browser-default lists, preserve native remove/clear controls, and provide phone-sized touch targets. Separate group labels from counts, and reduce the chrome on Naive UI sort and group-toggle buttons.
- a6c8243: Animate filter drawers from their inline edge and fade the backdrop without scaling the full viewport. Respect right-to-left layouts and reduced motion.
- Updated dependencies [7bedef1]
- Updated dependencies [54dd62a]
- Updated dependencies [b267b30]
- Updated dependencies [eaac515]
  - @adapttable/vue@0.1.2

## 0.1.1

### Patch Changes

- 2098049: Keep Angular selection, row-reorder and expand columns compact in wide tables and both reading directions. Preserve native control targets and give unused width to data columns instead of auxiliary controls.
  
  Give NG-ZORRO, CDK and Taiga UI column menus aligned rows, readable column names and native control targets.
  
  Keep Vuetify's filter trigger accessible name stable when its native menu adds an owned dialog to the accessibility tree.
- Updated dependencies [00df62b]
  - @adapttable/vue@0.1.1

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

### Patch Changes

- Updated dependencies [1946b61]
- Updated dependencies [aebbd39]
- Updated dependencies [1946b61]
- Updated dependencies [a06027e]
- Updated dependencies [7ba801b]
- Updated dependencies [78f6e38]
- Updated dependencies [dedb4b1]
- Updated dependencies [2153f11]
- Updated dependencies [1e47ceb]
  - @adapttable/vue@0.1.0
