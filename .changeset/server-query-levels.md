---
"@adapttable/server": minor
"@adapttable/core": minor
---

`parseTableQuery` checks at the level the schema asks for: `columns: "any"` parses and shapes every filter into `shapedFilters`; `filters` — a `{ key: type }` shorthand or the table's own `FilterDef[]` — types each one into `typedFilters`, checks its operator, numbers, dates and static options, and refuses undeclared filters and bad tree conditions. `groupByKeys` reports nested grouping, `pickFilters` scopes filters per user or role, and `splitFilterValues` reads a multi-value filter. A column-list schema returns exactly what it did before. `@adapttable/core/query` exports the filter model a server needs.
