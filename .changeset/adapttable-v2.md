---
"@adapttable/core": major
"@adapttable/i18n": major
"@adapttable/cli": major
"@adapttable/antd": major
"@adapttable/base-ui": major
"@adapttable/chakra": major
"@adapttable/mantine": major
"@adapttable/mui": major
"@adapttable/radix": major
"@adapttable/shadcn": major
"@adapttable/unstyled": major
---

AdaptTable 2.0.0 — a truth-and-consistency major. Every documented behavior
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

- **One source-flag contract (TanStack semantics).** `isLoading` is
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
