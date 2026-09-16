---
"@adapttable/react": major
---

Introduce the first stable release of `@adapttable/react`, the headless React
binding for the framework-neutral engine in `@adapttable/core`.

- The root provides React hooks and column types; `/features` provides feature
  composition, and `/adapter` provides structural Chrome, slots and builder
  helpers for custom adapters.
- React-specific `computed`, `aggregate`, `buildFormulaColumns`,
  `SummaryRowFn`, `Slot`, `fillSlot` and `ReactMobileCardRenderer` support
  React-rendered values without introducing React into the neutral engine.
- Rendering prepares a private engine candidate and publishes it at commit.
  Abandoned or suspended renders do not publish data or revisions to
  subscribers.
- `useQuerySource` supports `selectorKey` to re-project unchanged fetched pages
  when the selector's inputs change.
- The binding supplies live feature composition and named shell contracts.
  Adapters share cell-display resolution through `EditableCellRenderProps`,
  while the engine owns checklist values and row-reorder digests.

This is a new package, not an upgrade from a previously published
`@adapttable/react`. Existing v2 core consumers should follow the
[v2 migration guide](https://github.com/orwa-mahmoud/adapttable/blob/main/docs/migrate-from-v2.md).
