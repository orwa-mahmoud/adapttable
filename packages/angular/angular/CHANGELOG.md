# @adapttable/angular

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
