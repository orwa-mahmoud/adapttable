# @adapttable/cli

## 3.4.0

### Minor Changes

- 35abf7a: Angular toolbar controls read the state their feature publishes. `injectDensityToolbar`, `injectFullscreenToolbar`, `injectExportToolbar`, `injectPrintToolbar` and `injectUndoRedoToolbar` return the control's state as a signal, and every toolbar entry receives `ToolbarEntrySlotProps` (labels and class map) in place of core's `ToolbarExtrasSlotProps`. Saved views and the Columns menu are toolbar entries (`SAVED_VIEWS_ENTRY`, `COLUMN_MENU_ENTRY` on the new `@adapttable/angular/toolbar` entry) that each kit adds beside its menu, so every kit's template draws one toolbar outlet fed `toolbarEntry`, and the table view no longer carries `toolbarExtras`, `savedViews`, `columnMenu` or `columnMenuProps`. Inside a slot component, `[adaptSlot]` draws in that component's table when `[adaptSlotTable]` is left out. `adapttable migrate-v4` reports the removed names.
- 5545290: A kit draws each optional cell control with `FeatureSlot` and its slot key; `FeatureSlot` takes a `fallback` for a position the table draws without the feature. `CellContent` draws a body cell's content and replaces `OptionalEditableCell`; the other `Optional*` cell wrappers are removed, and `adapttable migrate-v4` reports each one. A header whose column can be renamed keeps its label when no column menu is composed.
- 1bf65dd: A React table runs its column layout, grouping, tree, selection, row actions, pins, expansion, editing and edit history as chrome stages, each after the stages whose values it reads, so the order follows from what each feature reads and writes rather than a fixed list. Find marks its matches from its own stage. `CHROME_EXTRA_SLOT_ORDER`, `HistoryLiveGate`, `EDIT_HISTORY_LIVE` and its props and draw types are removed; `EDIT_HISTORY_STAGE`, `ChromeStageKey` and `LiveStagePhase` name the new pieces, and `adapttable migrate-v4` reports the removed names.
- 36823c4: `adapttable migrate-v4 [paths...] [--check]` upgrades v3 source: it moves every import v4 moved to the entry that serves it now, keeps a renamed export under the name the file already uses, redirects moved subpaths, and reports each change of meaning or shape with its file, line and column.
- bee0c9f: `@adapttable/core/binding` no longer re-exports a value that `@adapttable/core` already exports and that the binding entry's own signatures do not name. Import `visibleColumns`, `filterLabel`, `aggregate`, `declaredAggregates`, `computedAggregateKeys`, `autoSizeColumns`, `cellValue`, `conditionToExtra`, `sourceCapabilities`, `treeColumnKey`, `approvalArgumentPairs` and `approvalValueText` from `@adapttable/core`. `adapttable migrate-v4` moves those imports.
  
  `applyTableFeatures` is only on `@adapttable/react/features`. `useTableFeatures` is only on `@adapttable/react/adapter`. `adapttable migrate-v4` moves an import that still uses the other entry.
  
  A kit no longer publishes a `/features` barrel. Import each factory from its own subpath. A React kit's `/features` only forwarded `@adapttable/react/features`, so those imports move there. `adapttable migrate-v4` rewrites both.
  
  A table takes `data` or a `source` and infers no tier from its other props. A server table builds its source with `useServerData` (React, Vue) or `injectServerData` (Angular) and passes it as `source`; the table props `mode`, `onQueryChange`, `total`, `aggregates`, `responseKey`, `supports`, `facetKeys` and `facets`, and React's `DataModeProps`, are gone. `onViewChange` tells a table over `data` what the reader changed. `serverFilterKeys({ columns, filters })` gives a server source the filter keys its first request needs. A table over `data` no longer ships the server tier: the Unstyled table loads 1.8 KiB less up front and 5.9 KiB less in total in each framework. `adapttable migrate-v4` reports every table that passes the removed props.
  
  Filter placement, column rename, and cell cut, paste and fill are options of `filters()`, `headerFilters()`, `columnMenu()` and `cellNavigation()`. A table prop no longer sets them. `isCellFlashing` stays on the table: it marks cells the base already draws. Vue's `DataTable` no longer accepts `onCellCut`, `onCellPaste`, `onCellFill` or `onColumnRename`.
- 8af4736: A feature's `setup(host)` only registers; what outlives a render goes in its `mount(context)`, which returns what releases it. Every binding keeps a mounted feature by id: declaring it again with new options, inline included, keeps the resource and hands `context.feature()` the new declaration, and only removing the feature, changing its `dependencies` or unmounting the table releases it, exactly once. A render the framework discards acquires nothing, and a failed mount rolls back what its pass acquired. React publishes the table runtime and its feature ids in layout effects, so AI and event callbacks read the last committed table; `PublishTableRuntime` is the chrome's publisher. `createFeatureMounts` and `composeMounts` on `@adapttable/core/binding` are the shared lifecycle. A `setup` that returns a cleanup is refused, and `onDispose` is no longer on the feature host. Vue's and Angular's table agent follows its latest declaration's options. `adapttable migrate-v4` reports `onDispose` calls.
- d2beb5a: Find, the keyboard grid, export, fullscreen and the selection figures run their hooks from their own live stages. `FIND_LIVE`, `CELL_NAV_LIVE`, `EXPORT_LIVE`, `FULLSCREEN_LIVE`, `SELECTION_STATS_LIVE` and their draw types are removed, as are React's `*LiveSlotProps` exports; `adapttable migrate-v4` reports each removed name.
- 03d7f36: The React column layout publishes its sizing actions as `COLUMN_SIZING_STATE` (`ColumnSizingState`); the table chrome no longer carries `autoSizeColumns`, `autoSizeColumn` or `columnLayoutLive`, and the finished shell's `autoSizeColumns` and `autoSizeColumn` carry them. `adapttable migrate-v4` reports the removed fields.
- ad4c90a: The React editing feature publishes its bundle as `EDITING_STATE`, and the edit history stays on `EDIT_HISTORY_STATE`; the table chrome no longer carries `editing` or `editHistory`. `overlayChromeExtras(shell, base, channels)` and `TableRuntimePublisher.stage(chrome, actions, channels)` take what the features published (`RuntimeChannels`) apart from the chrome, so the runtime view carries editing and the filter definitions. `FeatureStateScope` accepts `undefined` to publish nothing. `adapttable migrate-v4` reports the removed names.
- 3ecb133: The React filters feature publishes its chips and badge count as `FILTER_CHIPS_STATE` (`FilterChipsState`), which the toolbar badge, the chips bar and the command palette read. The table chrome no longer carries `mergedChips`, `activeFilterCount`, `filterDefs` or `filterRegistry`, the toolbar props drop `activeFilterCount`, and a table without the filters feature publishes no chips. `useChromeScrollReset(ref, props)` takes the root and the props. `adapttable migrate-v4` reports the removed names.
- 5a791f2: React grouping publishes its grouped rows as `GROUPING_STATE` (`GroupingState`) and the tree its hierarchy as `TREE_STATE` (`TreeState`); the table chrome no longer carries `grouping`, `tree`, `groupingArmed` or `treeShaped`, and the finished shell's `tableProps` carries them to the body. `KitPagerView` takes `tableProps.grouping` in place of `chrome.grouping`. Core's `BodyChrome` requires its `grouping` and `tree` keys, and `finishShellBody` reads them from `tableProps`. The grouping panel publishes its strip state as `GROUPING_PANEL_VIEW_STATE`, which the finished shell's `tableProps.groupingPanel` carries to the strip, the column menu and the header drag; the chrome's `groupingPanel`, the shell's `groupingPanelProps` and `DataTableShellGroupingPanelProps` are removed, and a table without the panel carries none of its code. `adapttable migrate-v4` reports the removed fields.
- 6612d37: React row actions publish the trailing column and the row mutations as `ROW_ACTIONS_STATE` (`RowActionsState`), and row pinning publishes its pins as `ROW_PINNING_STATE`; the table chrome no longer carries `rowMutations`, `rowActions`, `hasRowActions` or `rowPinning`, and core's `OverlayChrome` treats `rowMutations` and `hasRowActions` as optional. The finished shell's `tableProps` carries them to the body, and the runtime view reads the pins. Row reorder's state is read from `ROW_REORDER`, now on `@adapttable/react/adapter`: the chrome no longer carries `hasRowReorder` or `rowReorder`, and the finished shell carries `hasRowReorder` and `tableProps.rowReorder`. `adapttable migrate-v4` reports the removed fields.
- c60895f: React row detail publishes its renderer and expansion as `ROW_DETAIL_STATE` (`RowDetailState`); the table chrome no longer carries `detail`, and the finished shell's `tableProps.renderRowDetail` and `tableProps.expansion` carry it to the body. `adapttable migrate-v4` reports the removed field.
- 48cea86: React toolbar controls read the state their feature publishes. Undo/redo, export, print, density and fullscreen draw from `EDIT_HISTORY_STATE`, `EXPORT_STATE`, `FULLSCREEN_STATE` and the finished table props in `TABLE_PROPS_STATE` through `useFeatureState`, and the toolbar hands them only `ToolbarEntrySlotProps` (labels and class map). The toolbar props no longer carry the undo/redo, print, density, fullscreen and export fields, `finishShellLive` leaves the toolbar alone, and `adapttable migrate-v4` reports `ToolbarExtrasSlotProps`.
- d1b7ece: The saved-views and column-menu features add their own toolbar entries, drawn in `TOOLBAR_EXTRAS` right after Filters, so a kit's toolbar no longer receives `savedViewsMenu` or `columnMenu`. `ToolbarChromeProps` is removed and `undoRedoToolbar` returns `UndoRedoToolbarProps`. `adapttable migrate-v4` reports the removed names.
- 3b2a5bd: Each Vue feature with a toolbar control adds its own toolbar entry. Density, fullscreen, saved views, the column menu, undo/redo, find, the command palette, export and print read the state they publish and draw their kit control; the shell names none of them. `TOOLBAR_EXTRAS` takes `ToolbarEntryProps`, `toolbarEntry` and `FeatureSlotDrawer` build an entry, a kit's filters trigger and panel fill `FILTERS_PANEL`, and `UNDO_REDO_CONTROL` takes `UndoRedoControlProps` in place of `ToolbarExtrasSlotProps`. The shell's `toolbarExtrasProps` and `hasActionToolbar` are removed.
  
  A feature's `rank` places its fills in a slot several features fill, lower first, then feature id. Saved views and the column menu lead the toolbar, so every Vue kit draws Filters, Saved views, Columns, Density, Export, Find, Fullscreen, Print and Undo/Redo in that order. Core names `UndoRedoToolbarProps`, and `adapttable migrate-v4` reports the removed Vue names.

## 3.3.1

### Patch Changes

- 0fca0b0: Server, CLI and i18n read from core.
  
  - `@adapttable/core/query` carries everything a server needs to read a table link: the parameter names, `DEFAULT_LIMIT` and `MAX_LIMIT`, `FILTER_TYPE_OPS`, `parseDateOp`, `isListFilterOp`, `isValuelessFilterOp`, `parseGroupAggregateOverrides`, `splitListParam` and `safeDecode`.
  - `@adapttable/server`'s `parseTableQuery` takes its limits, parameter names, operators and filter types from there, so every state the table writes reads back as the same query. It reads group aggregation (`groupAgg`) into `groupAggregates`, refusing columns outside the schema, and never throws on a sort key whose escape is not valid UTF-8. `splitListParam` replaces `splitFilterValues`, kept as a deprecated alias.
  - A table that moves onto the server tier at runtime, or whose `onQueryChange` returns after a page change, asks the host for the page it is showing.
  - `init` writes the React, Angular and Vue starters from one scaffold core; the files, commands and steps it prints are unchanged.
  - Every locale is checked against core's per-feature label groups, so each language carries every string of every feature.

## 3.3.0

### Minor Changes

- 92ae449: Detect plain Vue projects and scaffold all eight native Vue kits with a sortable, filterable SFC, kit-specific styles and required application/Vite setup. Add explicit `init --kit` selection within the detected framework, preserve host files, and identify Nuxt applications without writing incompatible Vite providers.

## 3.2.0

### Minor Changes

- 143d5bf: Add discovery and registry-install scaffolding for Angular Material,
  ng-bootstrap, Spartan, Taiga UI, Angular Aria, Angular CDK and ngx-bootstrap
  as their first public `0.1.0` releases are prepared. Install commands include
  the Angular binding, selected adapter and missing native peers, with scoped
  styling, provider and asset guidance. Check registry availability before
  installing; npm publication remains a separate release step.

## 3.1.0

### Minor Changes

- 42a4349: Detect Angular workspaces and scaffold a standalone table for the Angular unstyled or NG-ZORRO kit. Export `detectFramework` and `Framework`, add framework-aware kit detection, retain existing React defaults, and print the required Angular peer/style setup guidance.

## 3.0.1

### Patch Changes

- cbe937e: The docs and live demo now live at [adapttable.orwamahmoud.com](https://adapttable.orwamahmoud.com/), with React docs under `/react/`. Package homepages and README links point there; the previous addresses redirect.

## 3.0.0

### Major Changes

- 65fcbed: Raise the supported Node.js minimum from 18.18.0 to 22.12.0.
  Consumers using an earlier Node release must upgrade their development,
  build and server environments.
  
  Browser React integrations continue to support React 18 and 19. Package
  versions are independent; consumers do not need to match version numbers
  across AdaptTable packages.

### Minor Changes

- cd45219: Move from v2's React-based core to a framework-neutral engine with an optional
  React binding and independently imported table features.
  
  ### Package imports
  
  React hooks and React column types move from `@adapttable/core` to
  `@adapttable/react`. React feature factories and adapter-building helpers move
  to `@adapttable/react/features` and `@adapttable/react/adapter`.
  `@adapttable/core/adapter` is no longer an import path. Neutral models, data
  operations and value-oriented helpers remain in core; use the React versions
  of render callbacks, column builders, slots and mobile-card types when
  returning React elements.
  
  ### Feature composition
  
  Replace DataTable enabling props and their companion callbacks with feature
  factories imported from the kit's feature subpaths and passed in `features`.
  Optional features own their providers and native controls, including
  virtualization, so a plain table does not import those implementations.
  
  For a convenient starting point, import `standardFeatures` from
  `@adapttable/<kit>/preset`. It includes column controls, density, CSV export,
  find, fitting, fullscreen, header filters, multi-sort, resizing and status.
  Configured filters, grouping, bulk actions and saved views join when
  requested. Import individual features when you do not need the preset.
  
  ### Other v2 migrations
  
  - Replace deprecated main-entry adapter aliases with their React builder
    replacements from `@adapttable/react/adapter`.
  - Replace `useChromeBodyData` with the explicit plain or virtual hook on the
    React binding.
  - Register custom filter types through a feature host or the kit's
    `filterTypes()` feature instead of `FilterTypeRegistry.register` / `extend`.
  - Replace MUI's `size` prop with `density`.
  
  Run `npx @adapttable/cli migrate-v3` for supported import rewrites and a report
  of behavior-dependent migrations that need a developer's decision. Follow the
  [v2 migration guide](https://github.com/orwa-mahmoud/adapttable/blob/main/docs/migrate-from-v2.md)
  for the complete package split and enabling-prop replacements.

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

## 1.1.4

### Patch Changes

- a7e51ba: Give these three package pages a Features section and a clip per feature.

  The eight adapters listed their features; `core`, `cli` and `i18n` listed none, so
  their npm pages described the packages without ever saying what they do. Each now
  carries a Features section written for what it actually is — the headless engine, the
  scaffolder, the locale sets — plus clips cut from the cross-kit tour (`core`, `cli`)
  and from the Arabic recording (`i18n`, where every feature is shown running RTL).

## 1.1.3

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

## 1.1.2

### Patch Changes

- b77bcdc: Point each README's demo image at the live demo instead of a raw `.mp4` file,
  and deep-link it to that package's own adapter (`/demo/?kit=mui`,
  `?kit=radix`, …) now that the kit selector is URL-addressable. Clicking the
  image lands on a table you can actually use rather than a video download.
- a719db6: List inline cell editing and row grouping in each README's feature links. Both
  shipped in 1.2.0 but the package pages never mentioned them, so anyone reading
  on npm had no way to learn they exist.

## 1.1.1

### Patch Changes

- e909bf7: Use an animated GIF for the core tour on npm READMEs (click through to mp4), matching the adapter package demos.

## 1.1.0

### Minor Changes

- ba0d42b: Add `@adapttable/base-ui` — a batteries-included Base UI (`@base-ui/react`) adapter with the same DataTable API as the other kits. The CLI detects `@base-ui/react` and scaffolds this adapter.

## 1.0.0

### Major Changes

- 536169c: cli: promote to 1.0.0 — the version story now matches the stable library.

  `npx @adapttable/cli init` is AdaptTable's first-touch experience, so the CLI
  sitting on 0.x while every library package shipped at 1.0.0 undercut the
  "stable 1.0" message even though the scaffolder itself has been stable in
  practice. A `major` bump on a 0.x package moves it 0.2.0 → 1.0.0. The CLI stays
  outside the library fixed group and keeps its own release cadence, exactly as
  documented in the versioning policy.

## 0.2.0

### Minor Changes

- 347a6cb: `init` now detects Radix Themes and shadcn/ui. A project depending on
  `@radix-ui/themes` scaffolds the `@adapttable/radix` adapter, and a Tailwind
  project with a `components.json` scaffolds `@adapttable/shadcn`. The Chakra
  version hint is also corrected: it now warns when Chakra **v2** is detected (the
  adapter targets v3) instead of telling v3 users — the supported setup — to
  downgrade.

## 0.1.3

### Patch Changes

- 6ab1391: docs: every package README now leads with a click-to-play demo — a poster (with
  a play button) that links to an mp4 of the table in action — replacing the
  autoplaying GIF. Republishing so the new READMEs land on npm.

## 0.1.2

### Patch Changes

- a90a2c2: Add a demo animation to the package README.

## 0.1.1

### Patch Changes

- dd60cf0: docs: each package readme now links the docs site, live demo, and getting-started guide (top links + a Documentation section deep-linking each feature), the `homepage` field points at the docs site, and the root readme gains npm badges. Tailwind/shadcn is reframed as the unstyled adapter path rather than a batteries-included styled adapter.

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
