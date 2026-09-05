---
"@adapttable/react": major
---

First release of the React binding. Hooks, `ColumnDef`, structural Chrome and
the builder tier live here; `@adapttable/core` stays framework-neutral.
`pnpm adapttable migrate-v3` rewrites every moved import, including the
subpaths that moved wholesale.

React faces of the neutral helpers ship with it: `computed`, `aggregate` and
`buildFormulaColumns` return React columns, `SummaryRowFn` types `summaryRow`
and `groupAggregates`, and a custom mobile card receives `ReactNode` field
values instead of `unknown`. `renderCard` is now typed
`ReactMobileCardRenderer` — a card annotated with the neutral
`MobileCardRenderer` needs the React type.
