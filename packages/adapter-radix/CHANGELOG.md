# @adapttable/radix

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

- ef3c0f3: Render `filtersMode="drawer"` as a real side drawer in the Radix adapter.

  Radix Themes ships no Drawer primitive, so the drawer previously fell back to a
  centered Dialog (a modal). It now pins to the inline-end edge at full height and
  slides in from that edge — RTL-correct via logical insets and honoring
  `prefers-reduced-motion` — while keeping the Dialog's backdrop, focus trap, and
  Escape / outside-click dismissal.

- Updated dependencies [a94745e]
  - @adapttable/core@1.0.0

## 0.3.3

### Patch Changes

- 761be36: Internal de-duplication: hoist the logic the Chakra and Radix adapters shared
  verbatim into `@adapttable/core` — the `<DataTable>` orchestration
  (`useDataTableShell`), the auto-filter range-widget logic, and the sticky
  cell-style / row-memo helpers. Each adapter now renders only its own kit's
  controls over the shared state. No behaviour, markup, or public-API change for
  consumers; core stays headless (zero UI-kit imports).
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

## 0.1.1

### Patch Changes

- 6ab1391: docs: every package README now leads with a click-to-play demo — a poster (with
  a play button) that links to an mp4 of the table in action — replacing the
  autoplaying GIF. Republishing so the new READMEs land on npm.
- Updated dependencies [6ab1391]
  - @adapttable/core@0.3.1

## 0.1.0

### Minor Changes

- a90a2c2: New `@adapttable/radix` adapter — a batteries-included Radix Themes data table on
  the headless `@adapttable/core` engine, with sorting, filtering, URL-synced
  state, selection + bulk actions, numbered pagination, column management
  (show/hide, reorder, pin, resize), RTL, and dark mode. Wrap it in Radix's
  `<Theme>` and pass `accentColor` to tint it.

### Patch Changes

- 07db665: Accessibility: give the filter overlay an accessible name — the Chakra and
  Radix filter popovers and the MUI filter drawer now set `aria-label` on their
  `role="dialog"` wrapper, fixing an `aria-dialog-name` violation. Locked in with
  axe assertions across every adapter's filter overlay (popover + drawer).
- Updated dependencies [a90a2c2]
- Updated dependencies [a90a2c2]
  - @adapttable/core@0.3.0
