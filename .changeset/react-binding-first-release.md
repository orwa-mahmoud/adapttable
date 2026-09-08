---
"@adapttable/react": major
---

First stable release of `@adapttable/react`, the headless React binding for
the framework-neutral engine in `@adapttable/core`.

The root exports React hooks and column types; `/features` provides feature
composition and `/adapter` provides structural Chrome, slots and builder
helpers. React-specific `computed`, `aggregate`, `buildFormulaColumns`,
`SummaryRowFn`, `Slot`, `fillSlot` and `ReactMobileCardRenderer` support
React-rendered values without introducing React into the neutral engine.

Rendering prepares a private engine candidate and publishes it at commit.
Abandoned or suspended renders do not publish data or revisions to subscribers.
The binding includes `useQuerySource` with `selectorKey` for re-projecting
unchanged fetched pages, live feature composition, and named shell contracts
for custom adapters.

This is a new package, not an upgrade from a previously published React
binding. Existing v2 core consumers should follow the package-import migration.
