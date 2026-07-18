# @adapttable/cli

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
