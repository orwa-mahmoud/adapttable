# @adapttable/mui

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

### Patch Changes

- Updated dependencies [7382e6a]
  - @adapttable/core@2.0.0

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

### Patch Changes

- Updated dependencies [7382e6a]
  - @adapttable/core@2.0.0-rc.0

## 1.2.3

### Patch Changes

- a7e51ba: Depend on sibling packages by caret range instead of an exact pin.

  Adapters declared `workspace:*`, which publishes as an exact version — `@adapttable/mantine@1.2.2` required precisely `@adapttable/core@1.2.2`. Installing an adapter alongside `@adapttable/core` therefore produced **two copies of core**:

  ```
  node_modules/@adapttable/core                                  1.2.2
  node_modules/@adapttable/mantine/node_modules/@adapttable/core 1.2.1
  ```

  Most of core is per-instance state, so a second copy is mainly waste — but the URL-namespace registry is module-level, so two copies means two registries, and two tables that do not set an explicit `urlKey` can claim the same namespace and overwrite each other's URL state.

  The exact pin also forced all eight adapters to republish on every core patch, even when nothing about them changed.

  `workspace:^` publishes as `^1.2.2`: the resolver keeps one copy, and a future core patch releases core alone. This release ships that range into every adapter, which is why all of them are included here — it is the last time a core change requires them.

- Updated dependencies [a7e51ba]
- Updated dependencies [a7e51ba]
  - @adapttable/core@1.2.3

## 1.2.2

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

- Updated dependencies [feed13d]
  - @adapttable/core@1.2.2

## 1.2.1

### Patch Changes

- b535c41: Fix inline editing on grouped rows outside the current page slice. The editing
  guard validated the active cell against the page slice while the grouped body
  renders the full filtered set, so only each group's first rows accepted edits.
  The guard and Tab-advance now follow the rendered leaf set via the new
  `chrome.editingRows`.
- b77bcdc: Point each README's demo image at the live demo instead of a raw `.mp4` file,
  and deep-link it to that package's own adapter (`/demo/?kit=mui`,
  `?kit=radix`, …) now that the kit selector is URL-addressable. Clicking the
  image lands on a table you can actually use rather than a video download.
- a719db6: List inline cell editing and row grouping in each README's feature links. Both
  shipped in 1.2.0 but the package pages never mentioned them, so anyone reading
  on npm had no way to learn they exist.
- b77bcdc: Fix RTL and popover defects found while filming the adapter demos.

  **Radix, right-to-left.** Three separate faults stacked: `dir` never reached
  the `<table>` (it stopped at the outer box), the ScrollArea that `Table.Root`
  wraps the table in writes its own `dir="ltr"` which outranked any inherited
  direction, and `justify` compiles to physical `rt-r-ta-left` / `rt-r-ta-right`
  classes rather than logical `start` / `end`. Under an Arabic locale the labels
  translated but the columns rendered left-to-right, and after the first two
  fixes every header and cell still hugged the left edge. All three are handled
  now; LTR is untouched.

  **Column menu ignored direction (Mantine, MUI, Radix, Base UI).** The menu
  portals to `<body>`, so it loses the table's direction unless it is passed
  explicitly — only Chakra did. Under RTL the grip and pin controls stayed on
  the wrong sides. Every adapter now forwards `dir` to its portalled menu.

  **Filter popover jumped over the trigger (Radix, Base UI).** Choosing the
  "between" operator reveals a second bound input, and the default collision
  handling answered that growth by flipping the whole panel above the trigger,
  covering the page header and the control just clicked. The panel now stays
  anchored below and scrolls if it runs out of room.

  **Ant Design column menu rendered a card inside a card.** The menu repainted
  the elevated surface antd's Popover already provides; only spacing belongs to
  the adapter now.

  **Ant Design mobile cards re-rendered on every keystroke.** Each card compared
  the shared editing bundle, whose identity changes whenever any draft changes,
  so typing in one cell re-rendered every card on screen and the per-row digest
  that exists to prevent exactly that was dead weight. Cards are now memoized on
  their visual inputs plus that digest, matching every other adapter.

- Updated dependencies [b535c41]
- Updated dependencies [b77bcdc]
- Updated dependencies [a719db6]
  - @adapttable/core@1.2.1

## 1.2.0

### Minor Changes

- e36b3ee: Add an opt-in `exportCsv` toolbar button on every adapter. Exports the visible columns in display order for the current page (or the full filtered set with `scope: "all"`). New `exportCsv` label key in core defaults and all i18n locales.
- c402908: Add opt-in inline cell editing. Pass `onCellEdit` to enable; mark columns with `editable` / `editor` / `editValue`. Kit-native text, number, and select editors on every adapter (desktop + mobile). New `editCell` label in core defaults and all i18n locales. Without `onCellEdit`, editing stays fully dormant.
- 4546dcd: Add opt-in single-level row grouping. Pass `groupBy` to group by one column (frontend tier only; server sources devWarn and ignore). Optional `groupAggregates` shares the `summaryRow` mapper signature for per-group subtotals. Expand/collapse group headers on every adapter (desktop + mobile), with tri-state group selection when checkboxes are on. New `expandGroup`, `collapseGroup`, and `groupCount` labels in core defaults and all i18n locales. Without `groupBy`, grouping stays fully dormant.

### Patch Changes

- Updated dependencies [e36b3ee]
- Updated dependencies [c402908]
- Updated dependencies [4546dcd]
  - @adapttable/core@1.2.0

## 1.1.2

### Patch Changes

- e909bf7: Refresh adapter npm README demos: animated GIFs (click through to mp4) replace static posters so npm package pages show motion without leaving the page.
- Updated dependencies [e909bf7]
  - @adapttable/core@1.1.2

## 1.1.1

### Patch Changes

- @adapttable/core@1.1.1

## 1.1.0

### Minor Changes

- 6c7030b: Bring the whole adapter set to feature parity.

  - **Entrance animation on every adapter.** The opt-in `animate` mount stagger —
    a dependency-free row/card entrance that honours `prefers-reduced-motion` —
    now works on MUI, Chakra, Ant Design, Radix, shadcn/ui and unstyled, not just
    Mantine. `useMountStagger` moved into `@adapttable/core`; the existing
    `@adapttable/mantine` import path is unchanged.
  - **Ant Design mobile-card windowing.** antd already virtualized desktop rows
    through its native table; under `virtualize` its mobile card list now windows
    through the shared engine as well, like every other adapter.
  - **Popover keyboard a11y fix (MUI, Chakra, Ant Design).** Pressing Escape in
    the filter popover now hands focus back to the Filters trigger instead of
    stranding keyboard users, matching the Mantine/Radix/unstyled behaviour and
    the documented overlay contract.
  - Docs and README polish: the `ColumnDef` `filter` JSDoc is attached to the
    right field, and each package README gains a "Try in StackBlitz" link (with
    migration guides where a source library exists); the Chakra README now
    correctly targets v3.

### Patch Changes

- Updated dependencies [6c7030b]
  - @adapttable/core@1.1.0

## 1.0.0

### Major Changes

- a94745e: AdaptTable 1.0 — the public API is now stable under semantic versioning.

  This release freezes the committed-stable surface: the `@adapttable/core` engine
  (source builders, `useDataTable` and its prop-getters, the core types, and the
  URL-state hooks), every adapter's `<DataTable>` props and extension points
  (`slots`, `classNames`, `toolbar`, `confirm`), and the `@adapttable/i18n` locale
  presets. From this release on, breaking changes to that surface ship only in a
  major version. There are no runtime behavior changes — this marks the stability
  commitment. `@adapttable/cli` is a scaffolding tool and keeps its own cadence.

### Patch Changes

- Updated dependencies [a94745e]
  - @adapttable/core@1.0.0

## 0.3.3

### Patch Changes

- Updated dependencies [761be36]
  - @adapttable/core@0.3.3

## 0.3.2

### Patch Changes

- 682d3b7: Road-to-1.0 prep: document the versioning & stability contract, mark the
  `mergeProps`/`Props` prop-getter plumbing as `@internal` (consumers use the
  `useDataTable` prop-getters, not the merge helper), add a `smoke-dist`
  post-build check that asserts every advertised `exports`/`main`/`module`/`types`
  target is actually emitted, and harden `getPath`/`humanizeKey` to tolerate an
  empty/undefined key so a transiently-malformed column key can never crash a
  render. No behaviour changes; no breaking changes.
- Updated dependencies [682d3b7]
  - @adapttable/core@0.3.2

## 0.3.1

### Patch Changes

- 6ab1391: docs: every package README now leads with a click-to-play demo — a poster (with
  a play button) that links to an mp4 of the table in action — replacing the
  autoplaying GIF. Republishing so the new READMEs land on npm.
- Updated dependencies [6ab1391]
  - @adapttable/core@0.3.1

## 0.3.0

### Minor Changes

- a90a2c2: Logical column pinning, so pinning stays correct under RTL.

  **Breaking.** Pinned-side values are now `"start"` / `"end"` (were `"left"` /
  `"right"`) — this is the public `pinned` layout value and the `colPin` URL token
  (e.g. `colPin=name:start`); pre-existing `left`/`right` URLs no longer parse. The
  label keys `pinLeft` / `pinRight` / `moveLeft` / `moveRight` are renamed to
  `pinStart` / `pinEnd` / `moveStart` / `moveEnd`, with logical display strings
  shipped for every locale. Pinning a data column is now a start-only toggle; the
  injected actions column keeps its one-click end-pin.

  To migrate: update any `defaultColumnLayout={{ pinned: { x: "left" } }}` to
  `"start"` (and `"right"` → `"end"`), any persisted `colPin` URLs, and any custom
  `labels` overriding the renamed keys.

- a90a2c2: Numbered page buttons in every adapter's pagination (with first/last and
  ellipsis truncation), replacing the prev/next-only control — driven by a shared
  `paginationItems` builder in `@adapttable/core`.

### Patch Changes

- 07db665: Accessibility: give the filter overlay an accessible name — the Chakra and
  Radix filter popovers and the MUI filter drawer now set `aria-label` on their
  `role="dialog"` wrapper, fixing an `aria-dialog-name` violation. Locked in with
  axe assertions across every adapter's filter overlay (popover + drawer).
- Updated dependencies [a90a2c2]
- Updated dependencies [a90a2c2]
  - @adapttable/core@0.3.0

## 0.2.2

### Patch Changes

- 0fe5eca: Ship the **React Compiler**. The published packages are now built with `babel-plugin-react-compiler` (target 18, **production build only** — not the test build), so components and hooks are auto-memoized for fewer wasted re-renders. Tests still run against un-compiled source, so coverage is unaffected; the compiled output adds `react-compiler-runtime` as a small runtime dependency.
- Updated dependencies [0fe5eca]
  - @adapttable/core@0.2.2

## 0.2.1

### Patch Changes

- dd60cf0: docs: each package readme now links the docs site, live demo, and getting-started guide (top links + a Documentation section deep-linking each feature), the `homepage` field points at the docs site, and the root readme gains npm badges. Tailwind/shadcn is reframed as the unstyled adapter path rather than a batteries-included styled adapter.
- Updated dependencies [dd60cf0]
  - @adapttable/core@0.2.1

## 0.2.0

### Minor Changes

- 83610ec: Support React 19 and the latest major of every UI kit.

  - **core / unstyled**: hook and chrome ref types follow React 19's
    `useRef<T>(null) → RefObject<T | null>` change, and the deprecated
    `MutableRefObject` is replaced with `RefObject`. The prop-getters
    (`getTableProps`, `getHeaderCellProps`, `getSortButtonProps`,
    `getCellProps`, `getSearchInputProps`) now return precise element-prop
    interfaces instead of a bare `Record<string, unknown>`, so adapters spread
    them without unsafe casts. React peer stays `^18 || ^19`.
  - **mantine**: adds `@mantine/core` / `@mantine/hooks` `^9` to the peer range
    (now `^7 || ^8 || ^9`); Mantine 9 requires React 19.
  - **mui**: adds `@mui/material` `^8 || ^9` to the peer range. System props
    that v7 removed from `Stack` / `Box` / `Typography` (`alignItems`, `py`,
    `fontWeight`, …) moved into `sx`, which is backward-compatible to v5.
  - **chakra**: rebuilt for Chakra UI **v3** — compound components
    (`Table.Root`, `Menu.Root`, `Popover.Root`, `Drawer.Root`, …),
    `ChakraProvider value={defaultSystem}`, and the v3 prop renames
    (`colorScheme → colorPalette`, `isOpen → open`, …). Peer is now
    `@chakra-ui/react@^3`; Chakra v2 is no longer supported.
  - **antd**: rebuilt for Ant Design **v6** — `Alert` `message → title`,
    `Drawer` `width → size`, `Popover` `styles.body → styles.content`, `Space`
    `direction → orientation`, `Tag` `bordered={false} → variant="filled"`, and
    the logical fixed-column class names. Peer is now `antd@^6`; Ant Design v5 is
    no longer supported.

### Patch Changes

- Updated dependencies [83610ec]
  - @adapttable/core@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [4584081]
  - @adapttable/core@0.1.1

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

### Patch Changes

- Updated dependencies [845ff41]
  - @adapttable/core@0.1.0
