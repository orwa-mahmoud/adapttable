---
"@adapttable/server": minor
---

`groupByKeys` is opt-in for every schema: `parseTableQuery` lists every grouping key only when the schema sets `groupByKeys: true`. Schemas with `columns: "any"` or declared `filters` now return `groupByKeys` only with the flag; `groupBy` is unchanged.
