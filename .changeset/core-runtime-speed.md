---
"@adapttable/core": patch
---

A column read through its key splits the key once instead of on every cell, so default cell reads take about half the time. A tree read from a parent-id column indexes its rows once, so 8,040 rows with parents listed last build in 2 ms instead of 181 ms. A table with no cell spans gives every row one shared cell list instead of building one per row. A row patch made by the CommonJS build updates a view held by the ESM build incrementally, and the other way round, instead of re-filtering every row.
