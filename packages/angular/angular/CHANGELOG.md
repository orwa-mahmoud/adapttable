# @adapttable/angular

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
