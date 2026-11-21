---
"@adapttable/core": patch
---

A column read through its key splits the key once instead of on every cell, so default cell reads take about half the time. A tree read from a parent-id column indexes its rows once, so 8,040 rows with parents listed last build in 2 ms instead of 181 ms. A table with no cell spans gives every row one shared cell list instead of building one per row. A row patch made by the CommonJS build updates a view held by the ESM build incrementally, and the other way round, instead of re-filtering every row. Folding, unfolding or paging groups keeps the groups and their totals and reads no rows: collapsing one of 100 groups over 50,000 rows takes 1.9 ms instead of 8.4 ms, and a group header and its footer share one list of row ids. A table with no filters feature and no `filterFn` skips the filter pass instead of calling a predicate that keeps every row.
