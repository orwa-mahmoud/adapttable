# @adapttable/angular

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
