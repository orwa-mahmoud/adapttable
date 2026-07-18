# @adapttable/base-ui

## 1.2.1

### Patch Changes

- e909bf7: Refresh adapter npm README demos: animated GIFs (click through to mp4) replace static posters so npm package pages show motion without leaving the page.
- e909bf7: Fix portaled Filters/Columns/Drawer chrome: CSS tokens now apply on portal surfaces so overlays stay opaque above sticky headers, and multi-select chips / selects / drawer title render as real controls.

  Put overlay z-index tokens on Base UI **positioners** too — `transform` on the positioner is the stacking context, so z-index on the inner popup alone still lost to sticky table headers.

  Render multi-select filter options as label-only chips (no nested checkbox boxes).

- Updated dependencies [e909bf7]
  - @adapttable/core@1.1.2

## 1.2.0

### Minor Changes

- ba0d42b: Add `@adapttable/base-ui` — a batteries-included Base UI (`@base-ui/react`) adapter with the same DataTable API as the other kits. The CLI detects `@base-ui/react` and scaffolds this adapter.
