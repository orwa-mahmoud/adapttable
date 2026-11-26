# @adapttable/ngx-bootstrap

## 0.5.0

### Minor Changes

- 7dbd509: Angular kits ship the feature families: `editingFamily(save)` from `/editing`, `filteringFamily(defs)` from `/filtering` and `columnLayoutFamily()` from `/column-layout`, each passed to `features` as one entry and each on its own entry, so a member imported alone still loads alone. The kit preset is `standardFeatures` with `StandardFeatureOptions`, the same members and options as the React and Vue kits: columns menu, resizing, fitting, density, CSV export, keyboard Find (`findButton: true` adds its toolbar control), fullscreen, multi-sort, header filters and status bar. `standardPreset` and `StandardPresetOptions` are removed.
- 35abf7a: Angular toolbar controls read the state their feature publishes. `injectDensityToolbar`, `injectFullscreenToolbar`, `injectExportToolbar`, `injectPrintToolbar` and `injectUndoRedoToolbar` return the control's state as a signal, and every toolbar entry receives `ToolbarEntrySlotProps` (labels and class map) in place of core's `ToolbarExtrasSlotProps`. Saved views and the Columns menu are toolbar entries (`SAVED_VIEWS_ENTRY`, `COLUMN_MENU_ENTRY` on the new `@adapttable/angular/toolbar` entry) that each kit adds beside its menu, so every kit's template draws one toolbar outlet fed `toolbarEntry`, and the table view no longer carries `toolbarExtras`, `savedViews`, `columnMenu` or `columnMenuProps`. Inside a slot component, `[adaptSlot]` draws in that component's table when `[adaptSlotTable]` is left out. `adapttable migrate-v4` reports the removed names.
- bee0c9f: `@adapttable/core/binding` no longer re-exports a value that `@adapttable/core` already exports and that the binding entry's own signatures do not name. Import `visibleColumns`, `filterLabel`, `aggregate`, `declaredAggregates`, `computedAggregateKeys`, `autoSizeColumns`, `cellValue`, `conditionToExtra`, `sourceCapabilities`, `treeColumnKey`, `approvalArgumentPairs` and `approvalValueText` from `@adapttable/core`. `adapttable migrate-v4` moves those imports.
  
  `applyTableFeatures` is only on `@adapttable/react/features`. `useTableFeatures` is only on `@adapttable/react/adapter`. `adapttable migrate-v4` moves an import that still uses the other entry.
  
  A kit no longer publishes a `/features` barrel. Import each factory from its own subpath. A React kit's `/features` only forwarded `@adapttable/react/features`, so those imports move there. `adapttable migrate-v4` rewrites both.
  
  A table takes `data` or a `source` and infers no tier from its other props. A server table builds its source with `useServerData` (React, Vue) or `injectServerData` (Angular) and passes it as `source`; the table props `mode`, `onQueryChange`, `total`, `aggregates`, `responseKey`, `supports`, `facetKeys` and `facets`, and React's `DataModeProps`, are gone. `onViewChange` tells a table over `data` what the reader changed. `serverFilterKeys({ columns, filters })` gives a server source the filter keys its first request needs. A table over `data` no longer ships the server tier: the Unstyled table loads 1.8 KiB less up front and 5.9 KiB less in total in each framework. `adapttable migrate-v4` reports every table that passes the removed props.
  
  Filter placement, column rename, and cell cut, paste and fill are options of `filters()`, `headerFilters()`, `columnMenu()` and `cellNavigation()`. A table prop no longer sets them. `isCellFlashing` stays on the table: it marks cells the base already draws. Vue's `DataTable` no longer accepts `onCellCut`, `onCellPaste`, `onCellFill` or `onColumnRename`.

### Patch Changes

- 1ea5a0b: The Angular table view builds a feature's state only while that feature is composed: `commandPalette` and `contextMenu` are `undefined` unless their feature is composed, and `rowMutations` is `undefined` unless row actions wire an add, duplicate or delete handler. The palette's and the menu's props are built by code their features bring (`withCommandPaletteView` and `withContextMenuView` on `@adapttable/angular/adapter`, which every kit's `commandPalette()` and `contextMenu()` apply), so a plain table neither ships nor runs it, and every kit's template draws those regions behind the same check.
- Updated dependencies [b94b20c]
- Updated dependencies [bc19944]
- Updated dependencies [7dbd509]
- Updated dependencies [06e676e]
- Updated dependencies [72b4cde]
- Updated dependencies [35abf7a]
- Updated dependencies [1ea5a0b]
- Updated dependencies [35a1ec0]
- Updated dependencies [ee0f202]
- Updated dependencies [536aa89]
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
- Updated dependencies [ffd1a07]
- Updated dependencies [4effc96]
- Updated dependencies [eb084d0]
- Updated dependencies [5b7bc3c]
- Updated dependencies [b36d160]
- Updated dependencies [3b2a5bd]
  - @adapttable/angular@0.12.0

## 0.4.0

### Minor Changes

- 6bee472: Filters can be composed with only the widgets a table draws. `filtersWith([textFilterWidget, rangeFilterWidget])` from any kit's filters entry is the `filters` feature with those fields alone, so the other widgets stay out of the bundle: a text-only filter form is 4.4 KiB lighter on MUI, 1.3–2.4 KiB on the Vue kits and 4.8 KiB on the Angular native kit (min+gzip). Each kit exports `textFilterWidget`, `booleanFilterWidget`, `selectFilterWidget`, `multiSelectFilterWidget`, `checklistFilterWidget` and `rangeFilterWidget`; a filter whose widget was not composed throws, naming the widget to add. `filters` keeps drawing every widget.

### Patch Changes

- Updated dependencies [6bee472]
  - @adapttable/angular@0.11.0

## 0.3.3

### Patch Changes

- fb0e3af: Doc comments name a link target only when the entry point that publishes the comment exports it; any other name is written as code. Editor hovers and the API reference show no broken links.
- Updated dependencies [75dbf94]
- Updated dependencies [fb0e3af]
- Updated dependencies [2582d80]
  - @adapttable/angular@0.10.0

## 0.3.2

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
- a0a4eb8: Angular Material's editor validation state and ngx-bootstrap's pager link attributes follow their signal inputs directly.
- 68db6b2: Cell editors hand their focus target to the table after they render and again whenever it changes, and the editor layer and ngx-bootstrap's pager links attach their browser listeners only in the browser.
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
- 64069d0: Pinned columns paint their kit's surface in every kit, header and rails included, so cells scrolling beneath them no longer show through. In the Columns menu, a pinned column's pin button is filled with the kit's primary colour. Angular marks the expand, reorder and selection rails `data-pinned` while they stick with the start-pinned columns, as Vue does.
- 64069d0: A row action with an `icon` renders as an icon-only button in every Vue and Angular kit, its label kept as the accessible name. Vue kits read it through `rowActionContent` / `RowActionContent` (a vnode, component or glyph); Angular kits through `rowActionIcon` (an `ng-template` or a standalone component).
- 0fca0b0: Features are typed end to end.
  
  - `defineFeature` declares a feature with types: the table options it sets, the store slices and named actions it adds, the labels it needs and the URL params it owns. `featureState(features)` returns exactly the installed features' slices and actions.
  - The built-in feature factories in `@adapttable/core/binding` take typed parameters (edit handlers for the table's row type, row and bulk actions, extra and pinned rows, cell spans, filter definitions, edit history). `RowEditHandler`, `BatchEditHandler` and `EditHistoryInput` are exported from `@adapttable/core`, `/editing` and `/binding`.
  - Row callbacks are `RowCallback`s and slots that carry the row type are `RowSlotKey`s (`rowSlotKey`), so a column or state typed over your row type is assignable where a slot reads rows as `unknown`, and the row type is still inferred. The live slots are row slot keys with their fill types, exported from `@adapttable/core/binding` and `@adapttable/react/adapter`; grouping and resize props read structural events, so a framework's own events spread onto its elements as they are. New: `overlayFeatureOptions`.
  - Feature options and slot props reach the table without type casts in React, Vue and Angular. React's `filters` accepts filter definitions or a hand-built form; Angular's edit handlers are core's and its feature lists hold features typed for any row; Angular slot props read rows as `unknown`. Vue's `GROUP_ROW` is a row slot key (`GroupRowDraw`); `groupRowSlotKey()` is deprecated and returns it.
  - A kit's `standardFeatures({ filters })` takes its row type from a filter's `getValue` again, so `features={standardFeatures({ … })}` compiles on a typed table without a type argument. Vue's grouping panel compiles against the oldest supported Vue.
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [1ee0ea3]
- Updated dependencies [2ecf579]
- Updated dependencies [68db6b2]
- Updated dependencies [39057e0]
- Updated dependencies [39057e0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [39057e0]
- Updated dependencies [64069d0]
- Updated dependencies [0fca0b0]
- Updated dependencies [64069d0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [0fca0b0]
- Updated dependencies [39057e0]
  - @adapttable/angular@0.9.0

## 0.3.1

### Patch Changes

- Updated dependencies [7dee39f]
  - @adapttable/core@3.13.1
  - @adapttable/angular@0.8.1

## 0.3.0

### Minor Changes

- 5b8adbd: The table takes `stickyHeader` and `stickyTop` inputs. A sticky header stays in view inside a `maxHeight` box, in a table that scrolls sideways, or on the page below an app bar of `stickyTop` pixels, and pinned rows sit below it.

### Patch Changes

- a353b2d: Each grouping chip shows its level, as in "1. Team · 2. Status".
- a353b2d: A column's header filter opens as a dialog named for that column, and its funnel announces the dialog it opens.
- Updated dependencies [46f6212]
- Updated dependencies [5b8adbd]
- Updated dependencies [f009a47]
- Updated dependencies [d9bca8c]
- Updated dependencies [a3f3c45]
- Updated dependencies [91ea216]
- Updated dependencies [549ee08]
- Updated dependencies [702a702]
- Updated dependencies [7ee7489]
- Updated dependencies [b4f2c66]
- Updated dependencies [e50c6c8]
- Updated dependencies [2e930c2]
- Updated dependencies [858ef5b]
  - @adapttable/angular@0.8.0
  - @adapttable/core@3.13.0

## 0.2.7

### Patch Changes

- Updated dependencies [e3e40e7]
- Updated dependencies [ffc8540]
  - @adapttable/core@3.12.0
  - @adapttable/angular@0.7.0

## 0.2.6

### Patch Changes

- Updated dependencies [0f1df5a]
  - @adapttable/angular@0.6.2

## 0.2.5

### Patch Changes

- 07b4440: Improve mobile cards with responsive field tiles, clearer identity and action sections, native kit surfaces, larger mobile action targets, and readable light and dark theme labels. Preserve automatic mobile cards and the explicit horizontal table option. Fix horizontal table scrolling in Reka UI and mobile action contrast in Taiga UI. Mobile selection, Save/Cancel and hierarchy controls also receive comfortable native touch surfaces. Restore visible loading placeholders and shared loading parts across Angular kits.
- Updated dependencies [b33a9ee]
- Updated dependencies [426d44f]
  - @adapttable/core@3.11.0
  - @adapttable/angular@0.6.1

## 0.2.4

### Patch Changes

- 66aa1f8: Make descending sorting reachable from mobile cards with each kit's native direction button. Preserve the selected column, localized labels, keyboard activation and shared URL/Saved Views state.
  
  The Angular binding adds the protected `AdaptDataTableShell.sortDirection()` transition for native adapter templates.
- c7d999d: Reopen the native column menu reliably after Escape, including rapid keyboard activation before the close/open input values render separately. Render prepared placement inputs before the native popup opens so short-screen menus open above their trigger, and cancel a second activation while opening is pending. Apply the height and scrolling budget to the complete native popup, including its border and padding, so the outer edge stays on screen.
- Updated dependencies [019364c]
- Updated dependencies [753873b]
- Updated dependencies [66aa1f8]
- Updated dependencies [c201ffb]
- Updated dependencies [330566b]
- Updated dependencies [d35c348]
- Updated dependencies [d7ddec5]
  - @adapttable/angular@0.6.0
  - @adapttable/core@3.10.0

## 0.2.3

### Patch Changes

- c8d10ab: Align assistant headers, composers, conversation alignment and viewport placement with the Mantine reference while retaining each adapter's native controls. Correct native dialog offsets, mobile focus handoff and nested shortcuts dismissal.
- Updated dependencies [c8d10ab]
  - @adapttable/angular@0.5.2

## 0.2.2

### Patch Changes

- eaac515: Give column resize handles visible, focusable targets at their header's inline edge. Kit theme tokens provide the grip and focus colors, while logical positioning supports both text directions.
- e940dc7: Reset native dialog start offsets so floating assistants follow their logical trailing-edge placement. Keep native example menus above the composer without browser list markers or changes to the composer layout.
- 62c9b3f: Keep editable Vue cell values as their accessible names, with editing instructions provided as descriptions. Reduce button chrome on Vue Unstyled, Element Plus, Reka UI and Nuxt UI cell activation controls, and align the native Vue search icon with its input.
  
  Give unlabeled mobile card values the full row width and clear heading emphasis in all eight Vue adapters.
  
  Restore visible keyboard focus on Angular editable cells without resetting the focus styles supplied by their native controls.
  
  Arrange Vue grouping and aggregation controls in compact, responsive rows with visible section labels, bounded selects, and borderless aggregation pickers. Preserve each kit's own controls and consumer class hooks. Give Element Plus column-menu icon buttons usable hit areas and keep Quasar resize handles visually light without reducing their drag targets.
  
  Keep Angular aggregation labels, operations and removal controls aligned, and add spacing and a visible grouping label across all nine adapters.
  
  Expose stable, visible grouping insertion targets during pointer drags and a clearly marked removal target in Vue and Angular adapters. Respect kit theme colors and highlight the current destination without shifting the chips. Restore native pointer dragging from Naive UI buttons, including grouping handles and sortable headers.
  
  Style active Vue filters as wrapping chips instead of browser-default lists, preserve native remove/clear controls, and provide phone-sized touch targets. Separate group labels from counts, and reduce the chrome on Naive UI sort and group-toggle buttons.
- Updated dependencies [7bedef1]
- Updated dependencies [29ff08e]
- Updated dependencies [9213f9a]
  - @adapttable/angular@0.5.1
  - @adapttable/core@3.9.1

## 0.2.1

### Patch Changes

- 00df62b: Constrain native Bootstrap and NG-ZORRO column menus to the available room beside their triggers and keep the complete menu scrollable on short viewports. Keep NG-ZORRO's native filter popover host aligned with CDK viewport coordinates across scrollbar gutters and viewport resizing.
- 2098049: Keep Angular selection, row-reorder and expand columns compact in wide tables and both reading directions. Preserve native control targets and give unused width to data columns instead of auxiliary controls.
  
  Give NG-ZORRO, CDK and Taiga UI column menus aligned rows, readable column names and native control targets.
  
  Keep Vuetify's filter trigger accessible name stable when its native menu adds an owned dialog to the accessibility tree.

## 0.2.0

### Minor Changes

- f7f62c6: Allow Angular column `headerActions` to render host templates or components,
  alongside plain text. All nine native kits pass the current header context and
  place the action outside the sortable caption. Export `AdaptHeaderActions` for
  custom adapter structure. Header actions appear in desktop headers; mobile cards
  keep their existing presentation.

### Patch Changes

- 7e33aa2: Organize the Angular 0.5 binding around canonical public entries: application
  hooks, column/rendering contracts, composition and `AdaptCellTemplate` at the
  root; headless factories/options under `/features`; structural Chrome, kit models,
  directives and controllers under `/adapter`. Specialized formula, pivot, router,
  sparkline and stream entries retain their declaration and DI-token identities.
  
  All nine native kits and Angular AI consume those entries; kit feature imports
  remain unchanged. Custom renderers/adapters must update binding imports using
  the migration guide. Each entry re-exports the public types its signatures return.
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
- Updated dependencies [7e33aa2]
- Updated dependencies [f7f62c6]
- Updated dependencies [f81d849]
- Updated dependencies [32e1255]
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
  - @adapttable/angular@0.5.0
  - @adapttable/core@3.9.0

## 0.1.0

### Minor Changes

- 143d5bf: Add the first public Angular 22 zoneless ngx-bootstrap adapter with scoped
  Bootstrap styles, native overlays, feature entries and assistant controls.
  
  With ngx-bootstrap 22.0.0 and Angular 22.2, early pagination-anchor clicks queued
  before hydration can fail during event replay. Ordinary hydration and paging
  after hydration work. Users must click again after hydration; the adapter does
  not automatically retry the lost early click.

### Patch Changes

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
- d57e69c: Keep native header-filter menus open while choosing multiple checkbox values. Let ngx-bootstrap handle outside presses for its portaled menus, while preserving Escape dismissal and configured single-choice completion.
- Updated dependencies [089d5d5]
- Updated dependencies [143d5bf]
- Updated dependencies [0a9cb40]
- Updated dependencies [8d1e749]
  - @adapttable/angular@0.4.0
  - @adapttable/core@3.8.1
