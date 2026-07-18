# @adapttable/i18n

## 1.1.2

### Patch Changes

- e909bf7: Use an animated GIF for the RTL demo on the npm README (click through to mp4), matching the other packages.
- Updated dependencies [e909bf7]
  - @adapttable/core@1.1.2

## 1.1.1

### Patch Changes

- @adapttable/core@1.1.1

## 1.1.0

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

## 0.2.1

### Patch Changes

- 6ab1391: docs: every package README now leads with a click-to-play demo — a poster (with
  a play button) that links to an mp4 of the table in action — replacing the
  autoplaying GIF. Republishing so the new READMEs land on npm.
- Updated dependencies [6ab1391]
  - @adapttable/core@0.3.1

## 0.2.0

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

### Patch Changes

- Updated dependencies [a90a2c2]
- Updated dependencies [a90a2c2]
  - @adapttable/core@0.3.0

## 0.1.4

### Patch Changes

- Updated dependencies [0fe5eca]
  - @adapttable/core@0.2.2

## 0.1.3

### Patch Changes

- dd60cf0: docs: each package readme now links the docs site, live demo, and getting-started guide (top links + a Documentation section deep-linking each feature), the `homepage` field points at the docs site, and the root readme gains npm badges. Tailwind/shadcn is reframed as the unstyled adapter path rather than a batteries-included styled adapter.
- Updated dependencies [dd60cf0]
  - @adapttable/core@0.2.1

## 0.1.2

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
