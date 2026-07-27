# Migrating from v1 to v2

v2 is a truth-and-consistency release: every documented behavior now works
as written, the same word always means the same thing across all eight
adapters, and a batch of silent traps became loud. Nothing deprecated
ships — v1 names were removed, not aliased, so the compiler walks you
through the rename table below.

## The rename table

| v1                                                            | v2                                                | Where                                                         |
| ------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| `enabled`                                                     | `urlSync`                                         | source hooks + `useTableUrlState`                             |
| `adapter`                                                     | `urlAdapter`                                      | source hooks + `UseSavedViewsOptions`                         |
| `useBackendData` / `UseBackendDataOptions`                    | `useQuerySource` / `UseQuerySourceOptions`        | the query-library source builder                              |
| `defaultLayout`                                               | `defaultColumnLayout`                             | column-layout hooks                                           |
| `selected` / `onChange`                                       | `selectedIds` / `onSelectionChange`               | `useSelection` options                                        |
| `collapsedIds` / `onCollapsedIdsChange`                       | `collapsedGroupIds` / `onCollapsedGroupIdsChange` | row grouping                                                  |
| `customToolbar`                                               | `toolbar`                                         | `ToolbarChromeProps`                                          |
| `PaginatedResponse.items` / `.hasNext`                        | `.rows` / `.hasNextPage`                          | response envelope                                             |
| `SortState`                                                   | `SortLevel` (one merged type)                     | sorting types                                                 |
| `colorScheme` (Chakra accent)                                 | `accentColor`                                     | Chakra adapter (frees the light/dark type name)               |
| `hideSearch`                                                  | `searchable` (positive polarity, default `true`)  | all adapters                                                  |
| `isMobile` prop                                               | `forceMobile`                                     | all adapters                                                  |
| `labels.applyFilters`                                         | `labels.filtersDone`                              | labels (the button closes; filters apply live)                |
| `SavedViewsMenuLabels` (and per-kit variants)                 | `SavedViewsLabels`                                | every adapter, one exported name                              |
| `PageSelector` returning `{ items }`                          | `{ rows }`                                        | `useQuerySource` custom `selectPage`                          |
| `GroupCollapseState.collapsedIds` (and the model option)      | `collapsedGroupIds`                               | headless grouping                                             |
| `useDataTable` option `isMobile`                              | `forceMobile` (result field stays `isMobile`)     | headless tier                                                 |
| `emptyState` / `loadingState` props                           | `slots.empty` / `slots.skeleton`                  | unstyled / shadcn (one override surface)                      |
| `classNames.rowsPerPageSelect`                                | `classNames.rowsPerPage`                          | unstyled / shadcn                                             |
| `classNames.pageButton`                                       | `pagePrev` / `pageNext` / `pageNumber`            | unstyled / shadcn (one key per rendered part)                 |
| `data-adapttable-part="group-row/group-cell"` (header groups) | `header-group-row` / `header-group-cell`          | header groups; `group-row`/`group-cell` now mean ROW grouping |
| `data-adapttable-part="retry"`                                | `retry-button`                                    | error state                                                   |
| antd `virtualHeight` / `virtualWidth`                         | removed — bound the scroller with `maxHeight`     | antd adapter                                                  |

## Behavior changes (and why)

- **The adapter-builder tier moved to `@adapttable/core/adapter`.** The
  ~65 exports only adapter implementations consume — `useDataTableShell`,
  the render prelude, chrome prop bundles, pinning and pager math, the
  inline icons — import from the new entry; `@adapttable/core` keeps the
  app-facing API. _Why: autocomplete and docs at the main entry now show
  only what app code is meant to use._

- **React 18 works again.** v1.2 accidentally required React 19.2
  (`useEffectEvent`); v2 runs the declared `^18 || ^19` range and CI
  proves it on 18.3 / 19.0 / 19.2.
- **Explicit `mode` prop.** `mode="server"` requires `onQueryChange` at
  compile time; `mode="frontend"` turns `onQueryChange` into a pure
  notification (the table keeps processing your `data`). Omitting `mode`
  keeps v1 inference exactly. _Why: the frontend tier had no way to
  observe query changes without surrendering the data path._
- **`onGroupByChange` and `onClearFilters` are observers.** The table
  always performs the change itself, then notifies. _Why: providing a
  logging handler used to silently replace the built-in mutation._ Take
  full control via `source.setGroupBy` / `source.clearExtras`.
- **One source-flag contract (TanStack semantics).** `isLoading` = first
  load only; `isFetching` = any in-flight; `hasNextPage`/`fetchNextPage` =
  infinite-append only (false / no-op when paged); `refetch` really
  re-runs. The `onQueryChange` tier now APPENDS on `fetchNextPage`
  (accumulating across round-trips) instead of replacing the page, and it
  resolves `paginationMode: "auto"` like the other tiers — mobile becomes
  infinite cards; pass `paginationMode="paged"` for the v1 behavior.
- **`baseParams` never beat live state, and filters are namespaced.**
  Query hooks receive filter values under `params.filters` instead of
  spread at the top level. _Why: a static param could silently override an
  active filter, and a filter named `sortBy` clobbered the sort._
- **The headless tier renders real tables.** `useDataTable` resolves
  bare-key columns (headers + accessors) like `<DataTable>` does, and
  `getRowProps` no longer smuggles `key` inside its spreadable result —
  read `getRowKey(row)`; `getCellContent(column, row, index)` renders
  Cell-or-accessor without casts.
- **`defaults`, `searchDebounceMs` and `paginationMode` are real
  component props** (they were documented but didn't exist), and
  `virtualize` on a paged table dev-warns instead of silently doing
  nothing.
- **An explicit `hideOnMobile: true` always wins** — the mobile identity
  anchor no longer forces hidden columns onto cards. A column marked
  `editable` without a table-level `onCellEdit` dev-warns instead of
  doing nothing.
- **The selection contract is settled**: uncontrolled =` onSelectionChange`
  observes (mount fire with the empty set, auto-reset on search/filter
  change included); controlled = change-request handler, no mount fire.
- **`clearAll` clears the multi-sort chain too** (it used to leave rows
  visibly sorted).
- **Grouped tables are a full-set view**: footer count, select-all scope
  and page-scope CSV all describe the rendered (full filtered) set.
- **CSV export**: formula-prefixed cells are neutralised by default
  (`escapeFormulas: false` opts out), and the export always contains the
  full exportable column set regardless of viewport.
- **`defaultConfirm` fails safe**: no dialog available (SSR, webviews)
  now DENIES a destructive action instead of auto-approving it.
- **Persisted state hydrates after mount** (column layout, saved views) —
  no SSR hydration mismatch; blocked storage is tolerated.
- **Styling surface is 1:1** — every `classNames` key maps to a rendered
  `data-adapttable-part` and vice versa (127 keys, enforced by tests);
  the shadcn preset styles every part; MUI and antd gained structural
  `classNames`; Chakra/Radix/Base UI export their `DataTableClassNames`.
- **`density` has a visual effect in every adapter** and kit `size`
  overrides it; `stickyTop` means the sticky-header inset everywhere
  (Mantine's toolbar stickiness became an explicit `stickyToolbar` prop);
  Mantine's `SavedViewsMenu` takes the same `options` shape as the other
  kits.
- **Accessibility**: editable cells expose the VALUE as their accessible
  name (edit hint as title); Enter-commit restores focus; clickable rows
  use a roving tab stop and activate on Space; menus restore focus on
  Escape; antd multi-sort chains from the keyboard (Shift+Enter); bulk
  selection announces via a live region; the pager announces the current
  page.
- **i18n**: one locale-resolution algorithm for labels AND per-column
  `i18n` paths (`ar_EG` ≡ `AR-eg`); count-aware plural forms; a new
  `labels.removeFilter` names chip removal; the RTL list is script-based
  (Hausa out, Assyrian Neo-Aramaic / Western Punjabi / South Azerbaijani
  in).
- **Packaging**: truthful peer floors (Chakra `^3.13`, MUI `^6`,
  Mantine `^7.2`); `"use client"` in every hook-bearing build (Next App
  Router imports work without wrappers); LICENSE in every tarball; the
  CLI gained a CJS entry and stopped scaffolding on a bare invocation.

## Suggested path

1. Update the packages; let the compiler surface the renames (table above).
2. If you consume the `onQueryChange` tier: move filter reads to
   `query.filters` / `params.filters`, and re-test infinite flows (append
   semantics).
3. If you relied on replacing behavior through `onGroupByChange` /
   `onClearFilters`, switch to `source.setGroupBy` / `source.clearExtras`.
4. Re-run your visual checks on mobile if you used the server tier
   (auto → infinite cards) or relied on identity-anchored hidden columns.
